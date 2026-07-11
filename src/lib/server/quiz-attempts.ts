import { and, count, countDistinct, eq } from 'drizzle-orm';
import { db } from './db';
import { attempt, question, quiz } from './db/schema';
import { normalizeCorrectAnswer, normalizeQuestion, normalizeOptions } from './quiz-actions';
import { gradeQuiz, type GradableQuestion } from './grading';

export interface IntakeFormField {
	name: string;
	type: 'text' | 'email' | 'number' | 'select';
	required: boolean;
}

export type QuizAvailability =
	| { available: true }
	| { available: false; reason: 'not_found' | 'not_started' | 'expired' | 'full' | 'inactive' };

/** Fetch a quiz along with its questions, ordered for display. */
export async function getQuizForTaking(id: string) {
	const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, id) });
	if (!quizData) return null;

	const questions = await db.query.question.findMany({
		where: eq(question.quizId, id),
		orderBy: [question.orderIndex]
	});

	return { ...quizData, questions: questions.map(normalizeQuestion) };
}

/**
 * Lazily evaluate whether a quiz can currently be accessed by participants.
 * Activation/expiration and participant caps are checked on every request
 * rather than via a background job.
 */
export async function checkQuizAvailability(quizData: {
	id: string;
	status: 'draft' | 'active' | 'expired';
	activateAt: Date | null;
	expireAt: Date | null;
	maxParticipants: number;
}): Promise<QuizAvailability> {
	if (quizData.status !== 'active') {
		return { available: false, reason: 'inactive' };
	}

	const now = Date.now();
	if (quizData.activateAt && quizData.activateAt.getTime() > now) {
		return { available: false, reason: 'not_started' };
	}
	if (quizData.expireAt && quizData.expireAt.getTime() < now) {
		return { available: false, reason: 'expired' };
	}

	const attemptCount = await db
		.select({ count: countDistinct(attempt.participantKey) })
		.from(attempt)
		.where(eq(attempt.quizId, quizData.id));

	if (attemptCount[0].count >= quizData.maxParticipants) {
		return { available: false, reason: 'full' };
	}

	return { available: true };
}

/** Compare a submitted password against the quiz's stored password. */
export function verifyQuizPassword(storedPassword: string | null, submitted: string): boolean {
	if (!storedPassword) return true;
	return submitted.trim() === storedPassword;
}

/**
 * Determine the key used to track a participant across attempts.
 * Prefers the value of an "email" intake field (case-insensitive, trimmed);
 * falls back to a per-browser fingerprint cookie value otherwise.
 */
export function resolveParticipantKey(
	intakeFormSchema: IntakeFormField[],
	intakeFormData: Record<string, unknown>,
	fallbackParticipantId: string
): string {
	const emailField = intakeFormSchema.find((f) => f.type === 'email');
	if (emailField) {
		const value = intakeFormData[emailField.name];
		if (typeof value === 'string' && value.trim()) {
			return value.trim().toLowerCase();
		}
	}
	return fallbackParticipantId;
}

export async function countAttemptsForParticipant(
	quizId: string,
	participantKey: string
): Promise<number> {
	const result = await db
		.select({ count: count() })
		.from(attempt)
		.where(and(eq(attempt.quizId, quizId), eq(attempt.participantKey, participantKey)));
	return result[0].count;
}

export interface SubmitAttemptInput {
	quizId: string;
	participantKey: string;
	intakeFormData: Record<string, unknown>;
	answers: Record<string, unknown>;
	timeTakenSeconds: number;
}

/**
 * Grade and persist a quiz attempt. Re-validates availability and the
 * max-attempts constraint server-side so a stale client session cannot
 * bypass them.
 */
export async function submitAttempt(input: SubmitAttemptInput) {
	const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, input.quizId) });
	if (!quizData) {
		return { success: false as const, error: 'Quiz not found' };
	}

	const availability = await checkQuizAvailability(quizData);
	if (!availability.available) {
		return { success: false as const, error: 'This quiz is no longer accepting submissions' };
	}

	const attemptsSoFar = await countAttemptsForParticipant(input.quizId, input.participantKey);
	if (attemptsSoFar >= quizData.maxAttempts) {
		return { success: false as const, error: 'Maximum attempts reached for this quiz' };
	}

	const questions = await db.query.question.findMany({ where: eq(question.quizId, input.quizId) });
	const gradable: GradableQuestion[] = questions.map((q) => ({
		id: q.id,
		type: q.type,
		correctAnswer: normalizeCorrectAnswer(q.type, q.correctAnswer)
	}));

	const grading = gradeQuiz(gradable, input.answers);

	const inserted = await db
		.insert(attempt)
		.values({
			quizId: input.quizId,
			participantKey: input.participantKey,
			intakeFormData: input.intakeFormData,
			answers: input.answers,
			score: grading.score,
			totalQuestions: grading.totalQuestions,
			timeTakenSeconds: input.timeTakenSeconds
		})
		.returning();

	return {
		success: true as const,
		attempt: inserted[0],
		revealAnswersAfter: quizData.revealAnswersAfter
	};
}

export async function getAttemptById(id: string) {
	return db.query.attempt.findFirst({ where: eq(attempt.id, id) });
}
