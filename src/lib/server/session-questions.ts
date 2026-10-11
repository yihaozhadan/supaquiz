import { eq } from 'drizzle-orm';
import { db } from './db';
import { question, quiz } from './db/schema';
import { selectQuestionOrder } from '$lib/question-selection';
import type { QuizSessionPayload } from './quiz-session';

/**
 * In-memory store for the ordered question ids served per quiz session.
 * Question lists for large pools would exceed the ~4KB cookie limit, so the
 * session JWT carries only a session id and the served order lives here.
 * Entries are ephemeral: after a restart the order is transparently
 * re-sampled on next access.
 */
const sessionQuestions = new Map<string, string[]>();
const MAX_SESSIONS = 10_000;

export function saveSessionQuestions(sessionId: string, questionIds: string[]) {
	if (sessionQuestions.size >= MAX_SESSIONS && !sessionQuestions.has(sessionId)) {
		const oldest = sessionQuestions.keys().next().value;
		if (oldest) sessionQuestions.delete(oldest);
	}
	sessionQuestions.set(sessionId, questionIds);
}

export function getSessionQuestions(sessionId: string): string[] | undefined {
	return sessionQuestions.get(sessionId);
}

export function clearSessionQuestions(sessionId: string) {
	sessionQuestions.delete(sessionId);
}

/**
 * Resolve the ordered question ids served for a session. Prefers the order
 * embedded in the session JWT (sessions created before the server-side store
 * existed), then the store. If the in-memory entry is gone — e.g. after a
 * server restart — the order is re-sampled from the current quiz
 * configuration and re-saved so the rest of the session stays consistent.
 */
export async function resolveSessionQuestions(session: QuizSessionPayload): Promise<string[]> {
	if (session.questionOrder?.length) return session.questionOrder;
	if (session.sessionId) {
		const stored = getSessionQuestions(session.sessionId);
		if (stored) return stored;
	}

	const quizData = await db.query.quiz.findFirst({ where: eq(quiz.id, session.quizId) });
	if (!quizData) return [];

	const questions = await db.query.question.findMany({
		where: eq(question.quizId, session.quizId),
		orderBy: [question.orderIndex]
	});
	const order = selectQuestionOrder(
		questions.map((q) => q.id),
		{ shuffle: quizData.shuffleQuestions, subsetSize: quizData.questionsPerAttempt }
	);
	if (session.sessionId) saveSessionQuestions(session.sessionId, order);
	return order;
}
