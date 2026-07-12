import { eq, desc, count, and, inArray } from 'drizzle-orm';
import { db } from './db';
import { quiz, question, attempt } from './db/schema';
import {
	quizCreateSchema,
	quizUpdateSchema,
	quizStatusToggleSchema,
	questionCreateSchema,
	questionUpdateSchema
} from './validations';
import { saveQuestionMedia, deleteQuestionMedia } from './storage';

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

	// Get questions separately
	const questions = await db.query.question.findMany({
		where: eq(question.quizId, id),
		orderBy: [question.orderIndex]
	});

	return {
		...quizData,
		questions: questions.map(normalizeQuestion)
	};
}

export async function createQuiz(formData: FormData) {
	const data = Object.fromEntries(formData);

	// Convert string numbers to actual numbers
	const processedData = {
		...data,
		timeLimitSeconds: data.timeLimitSeconds ? Number(data.timeLimitSeconds) : undefined,
		maxAttempts: Number(data.maxAttempts),
		maxParticipants: Number(data.maxParticipants),
		shuffleQuestions: data.shuffleQuestions === 'on',
		allowBackNavigation: data.allowBackNavigation === 'on',
		isVisibleAfterExpiry:
			data.isVisibleAfterExpiry === 'on'
				? true
				: data.isVisibleAfterExpiry === undefined
					? undefined
					: false,
		questionDisplayMode: data.questionDisplayMode || 'one_at_a_time',
		intakeFormSchema: data.intakeFormSchema ? JSON.parse(data.intakeFormSchema as string) : []
	};

	console.log('Quiz creation data:', JSON.stringify(processedData, null, 2));

	const parsed = quizCreateSchema.safeParse(processedData);

	if (!parsed.success) {
		console.log('Validation errors:', JSON.stringify(parsed.error.flatten(), null, 2));
		return { success: false, error: 'Invalid data' };
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
		maxAttempts: data.maxAttempts ? Number(data.maxAttempts) : undefined,
		maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
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
		activateAt: data.activateAt ? new Date(data.activateAt as string) : undefined,
		expireAt: data.expireAt ? new Date(data.expireAt as string) : undefined
	};

	const parsed = quizUpdateSchema.safeParse(processedData);

	if (!parsed.success) {
		return { success: false, error: 'Invalid data' };
	}

	const { id, ...updateData } = parsed.data;

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

	// Duplicate questions
	if (originalQuiz.questions && originalQuiz.questions.length > 0) {
		const questionValues = originalQuiz.questions.map((q: any) => ({
			quizId: newQuiz[0].id,
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

		// Check max_participants is set
		if (!currentQuiz.maxParticipants || currentQuiz.maxParticipants <= 0) {
			return { success: false, error: 'max_participants must be set before activating' };
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

	// Check max 50 questions per quiz
	const quizQuestions = await db.query.question.findMany({
		where: eq(question.quizId, parsed.data.quizId)
	});

	if (quizQuestions.length >= 50) {
		return { success: false, error: 'Maximum 50 questions per quiz' };
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
		if (updatedQuestion[0].mediaUrl) {
			await deleteQuestionMedia(updatedQuestion[0].mediaUrl);
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
			if (updatedQuestion[0].mediaUrl) {
				await deleteQuestionMedia(updatedQuestion[0].mediaUrl);
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

	return { success: true, question: updatedQuestion[0] };
}

export async function deleteQuestion(id: string) {
	await db.delete(question).where(eq(question.id, id));
	return { success: true };
}

export async function reorderQuestions(quizId: string, questionIds: string[]) {
	const updates = questionIds.map((id, index) =>
		db.update(question).set({ orderIndex: index }).where(eq(question.id, id))
	);

	await Promise.all(updates);
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
