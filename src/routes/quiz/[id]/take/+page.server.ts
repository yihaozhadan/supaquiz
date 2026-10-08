import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { question, quiz } from '$lib/server/db/schema';
import {
	checkQuizAvailability,
	gradePreviewAttempt,
	submitAttempt
} from '$lib/server/quiz-attempts';
import { normalizeQuestion } from '$lib/server/quiz-actions';
import { clearQuizSession, getQuizSession } from '$lib/server/quiz-session';
import { clearDraft, getDraft } from '$lib/server/draft-store';
import { savePreviewAttempt } from '$lib/server/preview-store';
import { verifySession } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const session = await getQuizSession(cookies, params.id);
	const previewParam = url.searchParams.get('preview') === '1' ? '?preview=1' : '';
	if (!session) redirect(303, `/quiz/${params.id}${previewParam}`);

	const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, params.id) });
	if (!quizData) error(404, 'Quiz not found');

	// Preview sessions (admins only) bypass availability so drafts and
	// scheduled quizzes can be exercised before publishing.
	if (session.preview) {
		if (!(await verifySession(cookies))) redirect(303, `/quiz/${params.id}`);
	} else {
		const availability = await checkQuizAvailability(quizData);
		if (!availability.available) redirect(303, `/quiz/${params.id}`);
	}

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
					? (normalized.options as { id?: string; text: string }[]).map((o) => ({
							id: o.id,
							text: o.text
						}))
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
		preview: session.preview === true,
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

		if (session.preview) {
			if (!(await verifySession(cookies))) {
				return fail(403, { error: 'Preview requires an admin session' });
			}

			const result = await gradePreviewAttempt(params.id, answers);
			if (!result.success) {
				return fail(400, { error: result.error });
			}

			const previewId = `preview-${crypto.randomUUID()}`;
			savePreviewAttempt({
				id: previewId,
				quizId: params.id,
				participantKey: session.participantKey,
				intakeFormData: session.intakeFormData,
				answers,
				score: result.grading.score,
				totalQuestions: result.grading.totalQuestions,
				timeTakenSeconds,
				submittedAt: new Date()
			});

			clearQuizSession(cookies, params.id);
			clearDraft(params.id, session.participantKey);

			redirect(303, `/quiz/${params.id}/results/${previewId}`);
		}

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
