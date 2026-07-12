import { and, asc, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
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

export interface PublicQuizPage {
	quizzes: PublicQuizSummary[];
	total: number;
}

const DEFAULT_PAGE_SIZE = 12;

function buildSummary(row: {
	id: string;
	title: string;
	description: string;
	timeLimitSeconds: number | null;
	password: string | null;
	status: 'draft' | 'active' | 'expired';
	activateAt: Date | null;
	expireAt: Date | null;
	createdAt: Date;
	questionCount: number;
	attemptCount: number;
}): PublicQuizSummary {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		questionCount: row.questionCount,
		timeLimitSeconds: row.timeLimitSeconds,
		attemptCount: row.attemptCount,
		isPasswordProtected: Boolean(row.password),
		status: row.status,
		activateAt: row.activateAt,
		expireAt: row.expireAt,
		createdAt: row.createdAt
	};
}

/**
 * Fetch active, public quizzes for display on the homepage.
 * Attaches question and attempt counts computed via separate aggregate queries.
 */
export async function getPublicQuizzes(limit?: number): Promise<PublicQuizSummary[]> {
	const quizzes = await db.query.quiz.findMany({
		where: and(
			eq(quiz.isPublic, true),
			or(
				eq(quiz.status, 'active'),
				and(eq(quiz.status, 'expired'), eq(quiz.isVisibleAfterExpiry, true))
			)
		),
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

	return quizzes.map((q) =>
		buildSummary({
			id: q.id,
			title: q.title,
			description: q.description,
			timeLimitSeconds: q.timeLimitSeconds,
			password: q.password,
			status: q.status,
			activateAt: q.activateAt,
			expireAt: q.expireAt,
			createdAt: q.createdAt,
			questionCount: questionCountMap.get(q.id) ?? 0,
			attemptCount: attemptCountMap.get(q.id) ?? 0
		})
	);
}

/**
 * Fetch a paginated, filterable, sortable list of public quizzes for the browse page.
 * Attaches question and attempt counts via subquery joins so sorting by popularity is possible.
 */
export async function getPublicQuizzesPaged(options: {
	query?: string;
	status?: 'active' | 'all' | 'expired';
	sort?: 'newest' | 'oldest' | 'most_popular' | 'alphabetical';
	page?: number;
	pageSize?: number;
}): Promise<PublicQuizPage> {
	const {
		query,
		status = 'active',
		sort = 'newest',
		page = 1,
		pageSize = DEFAULT_PAGE_SIZE
	} = options;
	const offset = Math.max(0, page - 1) * pageSize;

	const filters: SQL<unknown>[] = [eq(quiz.isPublic, true)];
	if (status === 'active') {
		filters.push(eq(quiz.status, 'active'));
	} else if (status === 'expired') {
		filters.push(
			and(eq(quiz.status, 'expired'), eq(quiz.isVisibleAfterExpiry, true)) as SQL<unknown>
		);
	} else if (status === 'all') {
		filters.push(
			or(
				eq(quiz.status, 'active'),
				and(eq(quiz.status, 'expired'), eq(quiz.isVisibleAfterExpiry, true)) as SQL<unknown>
			) as SQL<unknown>
		);
	}

	if (query?.trim()) {
		const term = `%${query.trim().toLowerCase()}%`;
		filters.push(
			sql`(lower(${quiz.title}) like ${term} or lower(${quiz.description}) like ${term})`
		);
	}

	const questionCountSubquery = db.$with('question_counts').as(
		db
			.select({ quizId: question.quizId, questionCount: count().as('questionCount') })
			.from(question)
			.groupBy(question.quizId)
	);

	const attemptCountSubquery = db.$with('attempt_counts').as(
		db
			.select({ quizId: attempt.quizId, attemptCount: count().as('attemptCount') })
			.from(attempt)
			.groupBy(attempt.quizId)
	);

	let orderBy;
	switch (sort) {
		case 'oldest':
			orderBy = [asc(quiz.createdAt)];
			break;
		case 'most_popular':
			orderBy = [
				desc(sql`coalesce(${attemptCountSubquery.attemptCount}, 0)`),
				desc(quiz.createdAt)
			];
			break;
		case 'alphabetical':
			orderBy = [asc(sql`lower(${quiz.title})`)];
			break;
		case 'newest':
		default:
			orderBy = [desc(quiz.createdAt)];
	}

	const rows = await db
		.with(questionCountSubquery, attemptCountSubquery)
		.select({
			id: quiz.id,
			title: quiz.title,
			description: quiz.description,
			timeLimitSeconds: quiz.timeLimitSeconds,
			password: quiz.password,
			status: quiz.status,
			activateAt: quiz.activateAt,
			expireAt: quiz.expireAt,
			createdAt: quiz.createdAt,
			questionCount: sql<number>`coalesce(${questionCountSubquery.questionCount}, 0)`.mapWith(
				Number
			),
			attemptCount: sql<number>`coalesce(${attemptCountSubquery.attemptCount}, 0)`.mapWith(Number)
		})
		.from(quiz)
		.leftJoin(questionCountSubquery, eq(quiz.id, questionCountSubquery.quizId))
		.leftJoin(attemptCountSubquery, eq(quiz.id, attemptCountSubquery.quizId))
		.where(and(...filters))
		.orderBy(...orderBy)
		.limit(pageSize)
		.offset(offset);

	const totalResult = await db
		.select({ total: count() })
		.from(quiz)
		.where(and(...filters));

	return {
		quizzes: rows.map(buildSummary),
		total: totalResult[0].total
	};
}
