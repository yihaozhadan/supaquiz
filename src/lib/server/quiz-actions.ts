import { eq, desc, count, and, inArray, asc } from 'drizzle-orm';
import { db } from './db';
import { quiz, question, attempt, questionGroup } from './db/schema';
import {
	quizCreateSchema,
	quizUpdateSchema,
	quizStatusToggleSchema,
	questionCreateSchema,
	questionUpdateSchema,
	questionGroupCreateSchema,
	questionGroupUpdateSchema
} from './validations';
import { saveQuestionMedia, deleteQuestionMedia } from './storage';
import { getEffectiveStatus, validateSchedule } from '$lib/quiz-status';
import { MAX_QUESTIONS_PER_QUIZ, MAX_QUESTION_GROUPS_PER_QUIZ } from '$lib/constants';

/**
 * Normalize the correctAnswer form field into the shape expected by the
 * grading logic: mcq_multi keeps the full array of option ids, while
 * mcq_single/true_false/fitb store a single string value.
 */
function parseCorrectAnswer(type: unknown, raw: string): string | string[] {
	if (type === 'mcq_multi') {
		return JSON.parse(raw);
	}
	if (type === 'mcq_single') {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed[0] ?? '') : parsed;
	}
	return raw;
}

type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'fitb';

/**
 * Tolerate old data where `correct_answer` was double-encoded as a JSON string.
 * Returns the canonical shape: a string for single-value answers, an array for
 * mcq_multi, and a string for true_false/fitb.
 */
export function normalizeCorrectAnswer(type: string, value: unknown): string | string[] {
	if (value == null) return type === 'mcq_multi' ? [] : '';

	let parsed = value;

	// If the value is a string, it may be a JSON-encoded string/array/object.
	// Only parse when it clearly looks like JSON; plain text answers (e.g. fitb
	// or option ids) should be left as-is.
	if (typeof parsed === 'string') {
		const trimmed = parsed.trim();
		if (
			trimmed.startsWith('[') ||
			trimmed.startsWith('{') ||
			(trimmed.startsWith('"') && trimmed.endsWith('"'))
		) {
			try {
				parsed = JSON.parse(trimmed);
			} catch {
				// Leave as-is.
			}
		}
	}

	if (type === ('mcq_multi' as QuestionType)) {
		return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
	}
	if (type === ('mcq_single' as QuestionType)) {
		return Array.isArray(parsed) ? String(parsed[0] ?? '') : String(parsed);
	}

	// true_false and fitb are stored as strings.
	return String(parsed);
}

/**
 * Tolerate old data where `options` was stored as a JSON string, or where
 * options were stored as plain strings.
 */
export function normalizeOptions(
	raw: unknown
): { id: string; text: string; isCorrect: boolean }[] | null {
	if (raw == null) return null;

	let list = raw;
	if (typeof list === 'string') {
		try {
			list = JSON.parse(list);
		} catch {
			return null;
		}
	}

	if (!Array.isArray(list)) return null;

	return list.map((o: any) => {
		if (typeof o === 'string') {
			return { id: o, text: o, isCorrect: false };
		}
		return {
			id: String(o.id || o.text || crypto.randomUUID()),
			text: String(o.text ?? o.id ?? ''),
			isCorrect: Boolean(o.isCorrect)
		};
	});
}

export function normalizeQuestion(q: typeof question.$inferSelect): typeof question.$inferSelect {
	return {
		...q,
		correctAnswer: normalizeCorrectAnswer(q.type, q.correctAnswer),
		options: normalizeOptions(q.options) as typeof question.$inferSelect.options
	};
}

export async function getQuizzes() {
	const quizzes = await db.query.quiz.findMany({
		orderBy: [desc(quiz.createdAt)]
	});

	// Get question and attempt counts separately
	const quizIds = quizzes.map((q) => q.id);
	const questionCounts = await db
		.select({ quizId: question.quizId, count: count() })
		.from(question)
		.where(inArray(question.quizId, quizIds));

	const questionCountMap = new Map(questionCounts.map((qc) => [qc.quizId, qc.count]));

	return quizzes.map((q) => ({
		...q,
		effectiveStatus: getEffectiveStatus(q),
		questionCount: questionCountMap.get(q.id) ?? 0,
		attemptCount: 0,
		activeParticipantCount: 0
	}));
}

export async function getQuizById(id: string) {
	const quizData = await db.query.quiz.findFirst({
		where: eq(quiz.id, id)
	});

	if (!quizData) return null;

	// Get questions and groups separately
	const [questions, groups] = await Promise.all([
		db.query.question.findMany({
			where: eq(question.quizId, id),
			orderBy: [question.orderIndex]
		}),
		db.query.questionGroup.findMany({
			where: eq(questionGroup.quizId, id),
			orderBy: [asc(questionGroup.orderIndex), asc(questionGroup.name)]
		})
	]);

	return {
		...quizData,
		questions: questions.map(normalizeQuestion),
		groups
	};
}

export async function listQuestionGroups(quizId: string) {
	return db.query.questionGroup.findMany({
		where: eq(questionGroup.quizId, quizId),
		orderBy: [asc(questionGroup.orderIndex), asc(questionGroup.name)]
	});
}

function parseGroupId(raw: unknown): string | null | undefined {
	if (raw === undefined) return undefined;
	const value = String(raw).trim();
	return value === '' ? null : value;
}

/** Groups must belong to the same quiz as the question they are assigned to. */
async function validateGroupAssignment(
	quizId: string,
	groupId: string | null | undefined
): Promise<string | null> {
	if (groupId == null) return null;
	const group = await db.query.questionGroup.findFirst({
		where: eq(questionGroup.id, groupId)
	});
	if (!group || group.quizId !== quizId) return null;
	return groupId;
}

export async function createQuestionGroup(formData: FormData) {
	const data = Object.fromEntries(formData);
	const parsed = questionGroupCreateSchema.safeParse({
		quizId: data.quizId,
		name: typeof data.name === 'string' ? data.name.trim() : data.name,
		pickCount: data.pickCount ? Number(data.pickCount) : null
	});

	if (!parsed.success) {
		return { success: false, error: 'Invalid data' };
	}

	const existing = await db.query.questionGroup.findMany({
		where: eq(questionGroup.quizId, parsed.data.quizId)
	});

	if (existing.length >= MAX_QUESTION_GROUPS_PER_QUIZ) {
		return {
			success: false,
			error: `A quiz can have at most ${MAX_QUESTION_GROUPS_PER_QUIZ} groups`
		};
	}

	const newGroup = await db
		.insert(questionGroup)
		.values({ ...parsed.data, orderIndex: existing.length })
		.returning();

	return { success: true, group: newGroup[0] };
}

export async function updateQuestionGroup(formData: FormData) {
	const data = Object.fromEntries(formData);
	const parsed = questionGroupUpdateSchema.safeParse({
		id: data.id,
		name: typeof data.name === 'string' ? data.name.trim() : data.name,
		pickCount: data.pickCount === '' || data.pickCount == null ? null : Number(data.pickCount)
	});

	if (!parsed.success) {
		return { success: false, error: 'Invalid data' };
	}

	const updated = await db
		.update(questionGroup)
		.set({ name: parsed.data.name, pickCount: parsed.data.pickCount })
		.where(eq(questionGroup.id, parsed.data.id))
		.returning();

	return { success: true, group: updated[0] };
}

export async function deleteQuestionGroup(id: string) {
	// Foreign keys are not enforced at runtime, so unassign questions
	// explicitly — deleting a group must not delete its questions.
	await db.update(question).set({ groupId: null }).where(eq(question.groupId, id));
	await db.delete(questionGroup).where(eq(questionGroup.id, id));
	return { success: true };
}

export async function createQuiz(formData: FormData) {
	const data = Object.fromEntries(formData);

	// Convert string numbers to actual numbers
	const processedData = {
		...data,
		timeLimitSeconds: data.timeLimitSeconds ? Number(data.timeLimitSeconds) : undefined,
		maxAttempts:
			data.maxAttempts === ''
				? null
				: data.maxAttempts !== undefined
					? Number(data.maxAttempts)
					: undefined,
		maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : null,
		questionsPerAttempt: data.questionsPerAttempt ? Number(data.questionsPerAttempt) : null,
		shuffleQuestions: data.shuffleQuestions === 'on',
		allowBackNavigation: data.allowBackNavigation === 'on',
		isVisibleAfterExpiry:
			data.isVisibleAfterExpiry === 'on'
				? true
				: data.isVisibleAfterExpiry === undefined
					? undefined
					: false,
		questionDisplayMode: data.questionDisplayMode || 'one_at_a_time',
		intakeFormSchema: data.intakeFormSchema ? JSON.parse(data.intakeFormSchema as string) : [],
		activateAt: data.activateAt ? new Date(data.activateAt as string) : null,
		expireAt: data.expireAt ? new Date(data.expireAt as string) : null
	};

	console.log('Quiz creation data:', JSON.stringify(processedData, null, 2));

	const parsed = quizCreateSchema.safeParse(processedData);

	if (!parsed.success) {
		console.log('Validation errors:', JSON.stringify(parsed.error.flatten(), null, 2));
		return { success: false, error: 'Invalid data' };
	}

	const scheduleError = validateSchedule(parsed.data.activateAt, parsed.data.expireAt);
	if (scheduleError) {
		return { success: false, error: scheduleError };
	}

	const newQuiz = await db.insert(quiz).values(parsed.data).returning();

	return { success: true, quiz: newQuiz[0] };
}

export async function updateQuiz(formData: FormData) {
	const data = Object.fromEntries(formData);

	// Convert string numbers to actual numbers
	const processedData = {
		...data,
		timeLimitSeconds: data.timeLimitSeconds ? Number(data.timeLimitSeconds) : undefined,
		maxAttempts:
			data.maxAttempts === '' ? null : data.maxAttempts ? Number(data.maxAttempts) : undefined,
		maxParticipants:
			data.maxParticipants === ''
				? null
				: data.maxParticipants
					? Number(data.maxParticipants)
					: undefined,
		questionsPerAttempt:
			data.questionsPerAttempt === ''
				? null
				: data.questionsPerAttempt
					? Number(data.questionsPerAttempt)
					: undefined,
		shuffleQuestions: data.shuffleQuestions === 'on',
		allowBackNavigation: data.allowBackNavigation === 'on',
		isVisibleAfterExpiry:
			data.isVisibleAfterExpiry === 'on'
				? true
				: data.isVisibleAfterExpiry === undefined
					? undefined
					: false,
		questionDisplayMode: data.questionDisplayMode || undefined,
		intakeFormSchema: data.intakeFormSchema
			? JSON.parse(data.intakeFormSchema as string)
			: undefined,
		// An empty field clears the date; an absent key leaves it unchanged.
		activateAt:
			data.activateAt === undefined
				? undefined
				: data.activateAt
					? new Date(data.activateAt as string)
					: null,
		expireAt:
			data.expireAt === undefined
				? undefined
				: data.expireAt
					? new Date(data.expireAt as string)
					: null
	};

	const parsed = quizUpdateSchema.safeParse(processedData);

	if (!parsed.success) {
		return { success: false, error: 'Invalid data' };
	}

	const { id, ...updateData } = parsed.data;

	// Validate the activation window against the merged result so a partial
	// update (e.g. only expireAt submitted) is checked against stored values.
	if (updateData.activateAt !== undefined || updateData.expireAt !== undefined) {
		const current = await db.query.quiz.findFirst({
			where: eq(quiz.id, id),
			columns: { activateAt: true, expireAt: true }
		});
		const scheduleError = validateSchedule(
			updateData.activateAt !== undefined ? updateData.activateAt : (current?.activateAt ?? null),
			updateData.expireAt !== undefined ? updateData.expireAt : (current?.expireAt ?? null)
		);
		if (scheduleError) {
			return { success: false, error: scheduleError };
		}
	}

	const updatedQuiz = await db
		.update(quiz)
		.set({
			...updateData,
			updatedAt: new Date()
		})
		.where(eq(quiz.id, id))
		.returning();

	return { success: true, quiz: updatedQuiz[0] };
}

export async function deleteQuiz(id: string) {
	await db.delete(quiz).where(eq(quiz.id, id));
	return { success: 'Quiz deleted successfully' };
}

export async function duplicateQuiz(id: string) {
	const originalQuiz = (await getQuizById(id)) as {
		questions: any[];
		groups: { id: string; name: string; pickCount: number | null; orderIndex: number }[];
		[key: string]: any;
	} | null;
	if (!originalQuiz) {
		return { success: false, error: 'Quiz not found' };
	}

	const newQuiz = await db
		.insert(quiz)
		.values({
			title: `${originalQuiz.title} (Copy)`,
			description: originalQuiz.description,
			password: originalQuiz.password,
			timeLimitSeconds: originalQuiz.timeLimitSeconds,
			shuffleQuestions: originalQuiz.shuffleQuestions,
			questionsPerAttempt: originalQuiz.questionsPerAttempt,
			maxAttempts: originalQuiz.maxAttempts,
			maxParticipants: originalQuiz.maxParticipants,
			allowBackNavigation: originalQuiz.allowBackNavigation,
			questionDisplayMode: originalQuiz.questionDisplayMode,
			revealAnswersAfter: originalQuiz.revealAnswersAfter,
			isPublic: originalQuiz.isPublic,
			isVisibleAfterExpiry: originalQuiz.isVisibleAfterExpiry,
			intakeFormSchema: originalQuiz.intakeFormSchema,
			status: 'draft',
			activateAt: originalQuiz.activateAt,
			expireAt: originalQuiz.expireAt
		})
		.returning();

	// Duplicate groups first so question.groupId can be remapped
	const groupIdMap = new Map<string, string>();
	if (originalQuiz.groups && originalQuiz.groups.length > 0) {
		const newGroupIds = originalQuiz.groups.map(() => crypto.randomUUID());
		await db.insert(questionGroup).values(
			originalQuiz.groups.map((g, i) => ({
				id: newGroupIds[i],
				quizId: newQuiz[0].id,
				name: g.name,
				pickCount: g.pickCount,
				orderIndex: g.orderIndex
			}))
		);
		originalQuiz.groups.forEach((g, i) => groupIdMap.set(g.id, newGroupIds[i]));
	}

	// Duplicate questions
	if (originalQuiz.questions && originalQuiz.questions.length > 0) {
		const questionValues = originalQuiz.questions.map((q: any) => ({
			quizId: newQuiz[0].id,
			groupId: q.groupId ? (groupIdMap.get(q.groupId) ?? null) : null,
			type: q.type,
			text: q.text,
			mediaUrl: q.mediaUrl,
			options: q.options ?? null,
			correctAnswer: q.correctAnswer,
			explanation: q.explanation,
			codeSnippet: q.codeSnippet,
			orderIndex: q.orderIndex
		}));

		await db.insert(question).values(questionValues);
	}

	return { success: 'Quiz duplicated successfully', quiz: newQuiz[0] };
}

export async function toggleQuizStatus(formData: FormData) {
	const data = Object.fromEntries(formData);
	const parsed = quizStatusToggleSchema.safeParse(data);

	if (!parsed.success) {
		return { success: false, error: 'Invalid data' };
	}

	const { id, status } = parsed.data;

	// Check constraints before activating
	if (status === 'active') {
		const currentQuiz = await getQuizById(id);
		if (!currentQuiz) {
			return { success: false, error: 'Quiz not found' };
		}

		// Check max 5 active quizzes globally
		const activeCount = await db
			.select({ count: count() })
			.from(quiz)
			.where(eq(quiz.status, 'active'));

		if (activeCount[0].count >= 5) {
			return { success: false, error: 'Maximum 5 active quizzes allowed' };
		}
	}

	const updatedQuiz = await db
		.update(quiz)
		.set({ status, updatedAt: new Date() })
		.where(eq(quiz.id, id))
		.returning();

	return { success: true, quiz: updatedQuiz[0] };
}

export async function createQuestion(formData: FormData) {
	const data = Object.fromEntries(formData);
	const mediaFile = formData.get('media') as File | null;

	// Convert string numbers to actual numbers
	const processedData: Record<string, unknown> = {
		...data,
		orderIndex: Number(data.orderIndex),
		groupId: parseGroupId(data.groupId),
		mediaUrl:
			typeof data.mediaUrl === 'string' && data.mediaUrl.trim() !== ''
				? data.mediaUrl.trim()
				: undefined,
		options: data.options ? JSON.parse(data.options as string) : undefined,
		codeSnippet: data.codeSnippet ? (data.codeSnippet as string) : undefined
	};

	// Handle correctAnswer based on question type
	if (data.correctAnswer) {
		processedData.correctAnswer = parseCorrectAnswer(data.type, data.correctAnswer as string);
	}

	const parsed = questionCreateSchema.safeParse(processedData);

	if (!parsed.success) {
		return { success: false, error: 'Invalid data' };
	}

	if (parsed.data.groupId) {
		const validGroupId = await validateGroupAssignment(parsed.data.quizId, parsed.data.groupId);
		if (!validGroupId) {
			return { success: false, error: 'Invalid question group' };
		}
	}

	// Check question pool size limit
	const quizQuestions = await db.query.question.findMany({
		where: eq(question.quizId, parsed.data.quizId)
	});

	if (quizQuestions.length >= MAX_QUESTIONS_PER_QUIZ) {
		return { success: false, error: `Maximum ${MAX_QUESTIONS_PER_QUIZ} questions per quiz` };
	}

	const newQuestion = await db
		.insert(question)
		.values({
			...parsed.data,
			options: parsed.data.options ?? null
		})
		.returning();

	// Handle media upload after the question exists so we can use its id
	if (mediaFile && mediaFile.size > 0 && mediaFile.name) {
		try {
			const mediaUrl = await saveQuestionMedia(parsed.data.quizId, mediaFile);
			const updated = await db
				.update(question)
				.set({ mediaUrl })
				.where(eq(question.id, newQuestion[0].id))
				.returning();
			return { success: true, question: updated[0] };
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to save media file'
			};
		}
	}

	return { success: true, question: newQuestion[0] };
}

export async function updateQuestion(formData: FormData) {
	const data = Object.fromEntries(formData);
	const mediaFile = formData.get('media') as File | null;
	const removeMedia = formData.get('removeMedia') === 'on';

	// Convert string numbers to actual numbers
	const processedData: Record<string, unknown> = {
		...data,
		orderIndex: data.orderIndex ? Number(data.orderIndex) : undefined,
		groupId: parseGroupId(data.groupId),
		mediaUrl:
			typeof data.mediaUrl === 'string' && data.mediaUrl.trim() !== ''
				? data.mediaUrl.trim()
				: undefined,
		options: data.options ? JSON.parse(data.options as string) : undefined,
		codeSnippet: data.codeSnippet ? (data.codeSnippet as string) : undefined
	};

	// Handle correctAnswer based on question type
	if (data.correctAnswer) {
		processedData.correctAnswer = parseCorrectAnswer(data.type, data.correctAnswer as string);
	}

	const parsed = questionUpdateSchema.safeParse(processedData);

	if (!parsed.success) {
		return { success: false, error: 'Invalid data' };
	}

	const { id, quizId, ...updateData } = parsed.data;

	// Capture the previous mediaUrl before the update so a replaced or removed
	// uploaded file can be deleted from disk.
	const previousQuestion = await db.query.question.findFirst({
		where: eq(question.id, id)
	});
	const previousMediaUrl = previousQuestion?.mediaUrl ?? null;

	if (updateData.groupId) {
		const targetQuizId = quizId ?? previousQuestion?.quizId;
		const validGroupId = targetQuizId
			? await validateGroupAssignment(targetQuizId, updateData.groupId)
			: null;
		if (!validGroupId) {
			return { success: false, error: 'Invalid question group' };
		}
	}

	const updatedQuestion = await db
		.update(question)
		.set({
			...updateData,
			options: updateData.options ?? null
		})
		.where(eq(question.id, id))
		.returning();

	// Handle media replacement / removal
	if (removeMedia) {
		if (previousMediaUrl) {
			await deleteQuestionMedia(previousMediaUrl);
		}
		const cleared = await db
			.update(question)
			.set({ mediaUrl: null })
			.where(eq(question.id, id))
			.returning();
		return { success: true, question: cleared[0] };
	}

	if (mediaFile && mediaFile.size > 0 && mediaFile.name) {
		try {
			if (previousMediaUrl) {
				await deleteQuestionMedia(previousMediaUrl);
			}
			const targetQuizId = quizId || updatedQuestion[0].quizId;
			const mediaUrl = await saveQuestionMedia(targetQuizId, mediaFile);
			const withMedia = await db
				.update(question)
				.set({ mediaUrl })
				.where(eq(question.id, id))
				.returning();
			return { success: true, question: withMedia[0] };
		} catch (err) {
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to save media file'
			};
		}
	}

	// If mediaUrl was changed to a different value (e.g. switched to an
	// externally hosted URL), delete the previously uploaded file so it does
	// not linger on disk. deleteQuestionMedia ignores non-uploads paths.
	if (
		updateData.mediaUrl !== undefined &&
		updateData.mediaUrl !== previousMediaUrl &&
		previousMediaUrl
	) {
		await deleteQuestionMedia(previousMediaUrl);
	}

	return { success: true, question: updatedQuestion[0] };
}

export async function deleteQuestion(id: string) {
	await db.delete(question).where(eq(question.id, id));
	return { success: true };
}

/**
 * Rewrites the flat question order and group assignments in one pass. The
 * incoming list must cover every question in the quiz exactly once; each
 * entry carries the id of the group it now belongs to (null = ungrouped).
 */
export async function reorderQuestions(
	quizId: string,
	items: { id: string; groupId: string | null }[]
) {
	const [questions, groups] = await Promise.all([
		db.query.question.findMany({ where: eq(question.quizId, quizId) }),
		db.query.questionGroup.findMany({ where: eq(questionGroup.quizId, quizId) })
	]);

	const validIds = new Set(questions.map((q) => q.id));
	const validGroupIds = new Set(groups.map((g) => g.id));
	if (
		items.length !== questions.length ||
		new Set(items.map((it) => it.id)).size !== items.length ||
		items.some(
			(it) => !validIds.has(it.id) || (it.groupId != null && !validGroupIds.has(it.groupId))
		)
	) {
		return { success: false, error: 'Invalid question order' };
	}

	await Promise.all(
		items.map((it, index) =>
			db
				.update(question)
				.set({ orderIndex: index, groupId: it.groupId ?? null })
				.where(eq(question.id, it.id))
		)
	);
	return { success: true };
}

export async function moveQuestion(questionId: string, direction: 'up' | 'down') {
	const currentQuestion = await db.query.question.findFirst({
		where: eq(question.id, questionId)
	});
	if (!currentQuestion) {
		return { success: false, error: 'Question not found' };
	}

	const adjacentQuestion = await db.query.question.findFirst({
		where: and(
			eq(question.quizId, currentQuestion.quizId),
			direction === 'up'
				? eq(question.orderIndex, currentQuestion.orderIndex - 1)
				: eq(question.orderIndex, currentQuestion.orderIndex + 1)
		)
	});

	if (!adjacentQuestion) {
		return { success: false, error: 'Cannot move question further' };
	}

	await db
		.update(question)
		.set({ orderIndex: adjacentQuestion.orderIndex })
		.where(eq(question.id, currentQuestion.id));
	await db
		.update(question)
		.set({ orderIndex: currentQuestion.orderIndex })
		.where(eq(question.id, adjacentQuestion.id));

	return { success: true };
}
