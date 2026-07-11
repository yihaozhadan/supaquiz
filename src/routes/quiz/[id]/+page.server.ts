import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { question, quiz } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import {
	checkQuizAvailability,
	countAttemptsForParticipant,
	resolveParticipantKey,
	verifyQuizPassword,
	type IntakeFormField
} from '$lib/server/quiz-attempts';
import {
	createQuizSession,
	getOrCreateParticipantId,
	isPasswordVerified,
	markPasswordVerified
} from '$lib/server/quiz-session';
import type { Actions, PageServerLoad } from './$types';

async function loadQuizMeta(id: string) {
	const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, id) });
	if (!quizData) return null;
	const questionCount = await db
		.select({ count: count() })
		.from(question)
		.where(eq(question.quizId, id));
	return { ...quizData, questionCount: questionCount[0].count };
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	const quizData = await loadQuizMeta(params.id);
	if (!quizData) error(404, 'Quiz not found');

	const availability = await checkQuizAvailability(quizData);
	const passwordRequired = Boolean(quizData.password);
	const passwordVerified = passwordRequired ? isPasswordVerified(cookies, quizData.id) : true;

	return {
		quiz: {
			id: quizData.id,
			title: quizData.title,
			description: quizData.description,
			questionCount: quizData.questionCount,
			timeLimitSeconds: quizData.timeLimitSeconds,
			maxAttempts: quizData.maxAttempts,
			intakeFormSchema: quizData.intakeFormSchema as IntakeFormField[]
		},
		availability,
		passwordRequired,
		passwordVerified
	};
};

export const actions: Actions = {
	password: async ({ request, params, cookies }) => {
		const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, params.id) });
		if (!quizData) error(404, 'Quiz not found');

		const formData = await request.formData();
		const password = String(formData.get('password') ?? '');

		if (!verifyQuizPassword(quizData.password, password)) {
			return fail(400, { passwordError: 'Incorrect password' });
		}

		markPasswordVerified(cookies, quizData.id);
		return { passwordOk: true };
	},

	intake: async ({ request, params, cookies }) => {
		const quizData = await loadQuizMeta(params.id);
		if (!quizData) error(404, 'Quiz not found');

		if (quizData.password && !isPasswordVerified(cookies, quizData.id)) {
			return fail(403, { intakeError: 'Password verification required' });
		}

		const availability = await checkQuizAvailability(quizData);
		if (!availability.available) {
			return fail(400, { intakeError: 'This quiz is not currently available' });
		}

		const formData = await request.formData();
		const intakeFormSchema = quizData.intakeFormSchema as IntakeFormField[];
		const intakeFormData: Record<string, unknown> = {};

		for (const field of intakeFormSchema) {
			const value = String(formData.get(field.name) ?? '').trim();
			if (field.required && !value) {
				return fail(400, { intakeError: `${field.name} is required` });
			}
			if (value) intakeFormData[field.name] = value;
		}

		const participantId = getOrCreateParticipantId(cookies);
		const participantKey = resolveParticipantKey(intakeFormSchema, intakeFormData, participantId);

		const attemptsSoFar = await countAttemptsForParticipant(quizData.id, participantKey);
		if (attemptsSoFar >= quizData.maxAttempts) {
			return fail(400, { intakeError: 'You have reached the maximum number of attempts for this quiz' });
		}

		const questions = await db.query.question.findMany({
			where: eq(question.quizId, quizData.id),
			orderBy: [question.orderIndex]
		});

		let questionOrder = questions.map((q) => q.id);
		if (quizData.shuffleQuestions) {
			questionOrder = [...questionOrder];
			for (let i = questionOrder.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[questionOrder[i], questionOrder[j]] = [questionOrder[j], questionOrder[i]];
			}
		}

		await createQuizSession(cookies, {
			quizId: quizData.id,
			participantKey,
			intakeFormData,
			questionOrder,
			startedAt: Date.now()
		});

		redirect(303, `/quiz/${quizData.id}/take`);
	}
};
