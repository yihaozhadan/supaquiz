import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { question, quiz } from '$lib/server/db/schema';
import { checkQuizAvailability, submitAttempt } from '$lib/server/quiz-attempts';
import { normalizeQuestion } from '$lib/server/quiz-actions';
import { clearQuizSession, getQuizSession } from '$lib/server/quiz-session';
import { clearDraft, getDraft } from '$lib/server/draft-store';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const session = await getQuizSession(cookies, params.id);
	if (!session) redirect(303, `/quiz/${params.id}`);

	const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, params.id) });
	if (!quizData) error(404, 'Quiz not found');

	const availability = await checkQuizAvailability(quizData);
	if (!availability.available) redirect(303, `/quiz/${params.id}`);

	const questions = await db.query.question.findMany({ where: eq(question.quizId, params.id) });
	const questionsById = new Map(questions.map((q) => [q.id, q]));

	const orderedQuestions = session.questionOrder
		.map((id) => questionsById.get(id))
		.filter((q): q is NonNullable<typeof q> => Boolean(q))
		.map((q) => {
			const normalized = normalizeQuestion(q);
			return {
				id: normalized.id,
				type: normalized.type,
				text: normalized.text,
				mediaUrl: normalized.mediaUrl,
				options: normalized.options
					? (normalized.options as { id?: string; text: string }[]).map((o) => ({ id: o.id, text: o.text }))
					: null,
				codeSnippet: normalized.codeSnippet
			};
		});

	const draft = getDraft(params.id, session.participantKey);

	return {
		quiz: {
			id: quizData.id,
			title: quizData.title,
			timeLimitSeconds: quizData.timeLimitSeconds,
			allowBackNavigation: quizData.allowBackNavigation,
			questionDisplayMode: quizData.questionDisplayMode
		},
		questions: orderedQuestions,
		startedAt: session.startedAt,
		draftAnswers: draft ?? {}
	};
};

export const actions: Actions = {
	submit: async ({ request, params, cookies }) => {
		const session = await getQuizSession(cookies, params.id);
		if (!session) return fail(400, { error: 'Session expired. Please start the quiz again.' });

		const formData = await request.formData();
		const answersRaw = formData.get('answers');
		let answers: Record<string, unknown> = {};
		try {
			answers = answersRaw ? JSON.parse(String(answersRaw)) : {};
		} catch {
			return fail(400, { error: 'Invalid submission data' });
		}

		const timeTakenSeconds = Math.max(0, Math.round((Date.now() - session.startedAt) / 1000));

		const result = await submitAttempt({
			quizId: params.id,
			participantKey: session.participantKey,
			intakeFormData: session.intakeFormData,
			answers,
			timeTakenSeconds
		});

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		clearQuizSession(cookies, params.id);
		clearDraft(params.id, session.participantKey);

		redirect(303, `/quiz/${params.id}/results/${result.attempt.id}`);
	}
};
