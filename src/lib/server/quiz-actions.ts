import { eq, desc, count, and } from 'drizzle-orm';
import { db } from './db';
import { quiz, question, attempt } from './db/schema';
import {
	quizCreateSchema,
	quizUpdateSchema,
	quizStatusToggleSchema,
	questionCreateSchema,
	questionUpdateSchema
} from './validations';
import { fail } from '@sveltejs/kit';

export async function getQuizzes() {
	const quizzes = await db.query.quiz.findMany({
		orderBy: [desc(quiz.createdAt)]
	});

	// Get question and attempt counts separately
	const quizIds = quizzes.map((q) => q.id);
	const questionCounts = await db
		.select({ quizId: question.quizId, count: count() })
		.from(question)
		.where(eq(question.quizId, quizIds[0] || '')); // Simplified for now

	return quizzes.map((q) => ({
		...q,
		questionCount: 0, // Will be calculated properly after fixing relations
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
		questions
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
		intakeFormSchema: data.intakeFormSchema ? JSON.parse(data.intakeFormSchema as string) : []
	};

	const parsed = quizCreateSchema.safeParse(processedData);

	if (!parsed.success) {
		return fail(400, { errors: parsed.error.flatten().fieldErrors });
	}

	const newQuiz = await db
		.insert(quiz)
		.values({
			...parsed.data,
			intakeFormSchema: JSON.stringify(parsed.data.intakeFormSchema)
		})
		.returning();

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
		intakeFormSchema: data.intakeFormSchema ? JSON.parse(data.intakeFormSchema as string) : undefined
	};

	const parsed = quizUpdateSchema.safeParse(processedData);

	if (!parsed.success) {
		return fail(400, { errors: parsed.error.flatten().fieldErrors });
	}

	const { id, ...updateData } = parsed.data;

	const updatedQuiz = await db
		.update(quiz)
		.set({
			...updateData,
			intakeFormSchema: JSON.stringify(updateData.intakeFormSchema || []),
			updatedAt: new Date()
		})
		.where(eq(quiz.id, id))
		.returning();

	return { success: true, quiz: updatedQuiz[0] };
}

export async function deleteQuiz(id: string) {
	await db.delete(quiz).where(eq(quiz.id, id));
	return { success: true };
}

export async function duplicateQuiz(id: string) {
	const originalQuiz = await getQuizById(id) as {
		questions: any[];
		[key: string]: any;
	} | null;
	if (!originalQuiz) {
		return fail(404, { error: 'Quiz not found' });
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
			revealAnswersAfter: originalQuiz.revealAnswersAfter,
			intakeFormSchema: JSON.stringify(originalQuiz.intakeFormSchema),
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
			options: q.options ? JSON.stringify(q.options) : null,
			correctAnswer: JSON.stringify(q.correctAnswer),
			explanation: q.explanation,
			orderIndex: q.orderIndex
		}));

		await db.insert(question).values(questionValues);
	}

	return { success: true, quiz: newQuiz[0] };
}

export async function toggleQuizStatus(formData: FormData) {
	const data = Object.fromEntries(formData);
	const parsed = quizStatusToggleSchema.safeParse(data);

	if (!parsed.success) {
		return fail(400, { errors: parsed.error.flatten().fieldErrors });
	}

	const { id, status } = parsed.data;

	// Check constraints before activating
	if (status === 'active') {
		const currentQuiz = await getQuizById(id);
		if (!currentQuiz) {
			return fail(404, { error: 'Quiz not found' });
		}

		// Check max 5 active quizzes globally
		const activeCount = await db
			.select({ count: count() })
			.from(quiz)
			.where(eq(quiz.status, 'active'));

		if (activeCount[0].count >= 5) {
			return fail(400, { error: 'Maximum 5 active quizzes allowed' });
		}

		// Check max_participants is set
		if (!currentQuiz.maxParticipants || currentQuiz.maxParticipants <= 0) {
			return fail(400, { error: 'max_participants must be set before activating' });
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

	// Convert string numbers to actual numbers
	const processedData = {
		...data,
		orderIndex: Number(data.orderIndex),
		options: data.options ? JSON.parse(data.options as string) : undefined,
		correctAnswer: data.correctAnswer ? JSON.parse(data.correctAnswer as string) : undefined
	};

	const parsed = questionCreateSchema.safeParse(processedData);

	if (!parsed.success) {
		return fail(400, { errors: parsed.error.flatten().fieldErrors });
	}

	// Check max 50 questions per quiz
	const quizQuestions = await db.query.question.findMany({
		where: eq(question.quizId, parsed.data.quizId)
	});

	if (quizQuestions.length >= 50) {
		return fail(400, { error: 'Maximum 50 questions per quiz' });
	}

	const newQuestion = await db
		.insert(question)
		.values({
			...parsed.data,
			options: parsed.data.options ? JSON.stringify(parsed.data.options) : null,
			correctAnswer: JSON.stringify(parsed.data.correctAnswer)
		})
		.returning();

	return { success: true, question: newQuestion[0] };
}

export async function updateQuestion(formData: FormData) {
	const data = Object.fromEntries(formData);

	// Convert string numbers to actual numbers
	const processedData = {
		...data,
		orderIndex: data.orderIndex ? Number(data.orderIndex) : undefined,
		options: data.options ? JSON.parse(data.options as string) : undefined,
		correctAnswer: data.correctAnswer ? JSON.parse(data.correctAnswer as string) : undefined
	};

	const parsed = questionUpdateSchema.safeParse(processedData);

	if (!parsed.success) {
		return fail(400, { errors: parsed.error.flatten().fieldErrors });
	}

	const { id, ...updateData } = parsed.data;

	const updatedQuestion = await db
		.update(question)
		.set({
			...updateData,
			options: updateData.options ? JSON.stringify(updateData.options) : null,
			correctAnswer: JSON.stringify(updateData.correctAnswer)
		})
		.where(eq(question.id, id))
		.returning();

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
