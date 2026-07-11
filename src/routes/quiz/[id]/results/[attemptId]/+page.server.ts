import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { question, quiz } from '$lib/server/db/schema';
import { getAttemptById, resolveParticipantKey, type IntakeFormField } from '$lib/server/quiz-attempts';
import { normalizeQuestion } from '$lib/server/quiz-actions';
import { getParticipantId } from '$lib/server/quiz-session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const attemptData = await getAttemptById(params.attemptId);
	if (!attemptData || attemptData.quizId !== params.id) error(404, 'Attempt not found');

	const participantId = getParticipantId(cookies);
	if (!participantId) error(401, 'Participant session required');

	const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, params.id) });
	if (!quizData) error(404, 'Quiz not found');

	function safeParse<T>(value: unknown): T | null {
		if (value == null || value === '') return null;
		if (typeof value === 'string') {
			try {
				return JSON.parse(value);
			} catch {
				return null;
			}
		}
		return value as T;
	}

	const intakeFormSchema = safeParse<IntakeFormField[]>(quizData.intakeFormSchema) ?? [];
	const intakeFormData = safeParse<Record<string, unknown>>(attemptData.intakeFormData) ?? {};

	const expectedParticipantKey = resolveParticipantKey(intakeFormSchema, intakeFormData, participantId);

	if (expectedParticipantKey !== attemptData.participantKey) {
		error(403, 'You are not authorized to view this attempt');
	}

	const revealAnswers = quizData.revealAnswersAfter === 'immediate';

	let questions: {
		id: string;
		text: string;
		type: string;
		options: { id?: string; text: string }[] | null;
		correctAnswer: string | string[];
		explanation: string | null;
	}[] = [];

	if (revealAnswers) {
		const raw = await db.query.question.findMany({
			where: eq(question.quizId, params.id),
			orderBy: [question.orderIndex]
		});
		questions = raw.map((q) => {
			const normalized = normalizeQuestion(q);
			return {
				id: normalized.id,
				text: normalized.text,
				type: normalized.type,
				options: normalized.options as { id?: string; text: string }[] | null,
				correctAnswer: normalized.correctAnswer as string | string[],
				explanation: normalized.explanation
			};
		});
	}

	const percentage =
		attemptData.totalQuestions > 0
			? Math.round((attemptData.score / attemptData.totalQuestions) * 100)
			: 0;

	return {
		quizTitle: quizData.title,
		attempt: {
			score: attemptData.score,
			totalQuestions: attemptData.totalQuestions,
			timeTakenSeconds: attemptData.timeTakenSeconds,
			answers: attemptData.answers as Record<string, unknown>
		},
		percentage,
		revealAnswers,
		questions
	};
};
