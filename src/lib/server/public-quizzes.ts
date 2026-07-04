import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from './db';
import { attempt, question, quiz } from './db/schema';

export interface PublicQuizSummary {
	id: string;
	title: string;
	description: string;
	questionCount: number;
	timeLimitSeconds: number | null;
	attemptCount: number;
	isPasswordProtected: boolean;
	status: 'draft' | 'active' | 'expired';
	activateAt: Date | null;
	expireAt: Date | null;
	createdAt: Date;
}

/**
 * Fetch active, public quizzes for display on the homepage and browse page.
 * Attaches question and attempt counts computed via separate aggregate queries.
 */
export async function getPublicQuizzes(limit?: number): Promise<PublicQuizSummary[]> {
	const quizzes = await db.query.quiz.findMany({
		where: and(eq(quiz.status, 'active'), eq(quiz.isPublic, true)),
		orderBy: [desc(quiz.createdAt)],
		limit
	});

	if (quizzes.length === 0) return [];

	const quizIds = quizzes.map((q) => q.id);

	const [questionCounts, attemptCounts] = await Promise.all([
		db
			.select({ quizId: question.quizId, count: count() })
			.from(question)
			.where(inArray(question.quizId, quizIds))
			.groupBy(question.quizId),
		db
			.select({ quizId: attempt.quizId, count: count() })
			.from(attempt)
			.where(inArray(attempt.quizId, quizIds))
			.groupBy(attempt.quizId)
	]);

	const questionCountMap = new Map(questionCounts.map((qc) => [qc.quizId, qc.count]));
	const attemptCountMap = new Map(attemptCounts.map((ac) => [ac.quizId, ac.count]));

	return quizzes.map((q) => ({
		id: q.id,
		title: q.title,
		description: q.description,
		questionCount: questionCountMap.get(q.id) ?? 0,
		timeLimitSeconds: q.timeLimitSeconds,
		attemptCount: attemptCountMap.get(q.id) ?? 0,
		isPasswordProtected: Boolean(q.password),
		status: q.status,
		activateAt: q.activateAt,
		expireAt: q.expireAt,
		createdAt: q.createdAt
	}));
}
