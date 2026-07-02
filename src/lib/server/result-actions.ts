import { and, avg, eq, inArray, max, min, count, desc } from 'drizzle-orm';
import { db } from './db';
import { attempt } from './db/schema';
import {
	attemptsToCsv,
	attemptsToJson,
	type AttemptSummary
} from '$lib/results-format';

export type { AttemptSummary };
export { attemptsToCsv, attemptsToJson };

export interface AttemptMetrics {
	totalAttempts: number;
	averageScore: number;
	highestScore: number;
	lowestScore: number;
}

/**
 * Parse participant name/email from the intake form data JSON.
 * The intake form data is stored as a JSON array of { field, value } entries,
 * or as a plain object keyed by field name. Both shapes are tolerated.
 */
function parseIntake(
	intakeFormData: unknown
): { name: string; email: string; raw: unknown } {
	if (intakeFormData == null) {
		return { name: 'Anonymous', email: '', raw: null };
	}

	let record: Record<string, unknown> = {};
	if (Array.isArray(intakeFormData)) {
		for (const entry of intakeFormData) {
			if (entry && typeof entry === 'object' && 'field' in entry && 'value' in entry) {
				const field = String((entry as Record<string, unknown>).field).toLowerCase();
				record[field] = (entry as Record<string, unknown>).value;
			}
		}
	} else if (typeof intakeFormData === 'object') {
		record = intakeFormData as Record<string, unknown>;
	}

	const nameKeys = ['name', 'fullname', 'full_name', 'participantname'];
	const emailKeys = ['email', 'e-mail', 'mail'];

	let name = '';
	for (const key of nameKeys) {
		if (record[key] != null && String(record[key]).trim()) {
			name = String(record[key]).trim();
			break;
		}
	}

	let email = '';
	for (const key of emailKeys) {
		if (record[key] != null && String(record[key]).trim()) {
			email = String(record[key]).trim();
			break;
		}
	}

	return { name: name || 'Anonymous', email, raw: intakeFormData };
}

function mapAttempt(row: typeof attempt.$inferSelect): AttemptSummary {
	const parsed = parseIntake(row.intakeFormData);
	return {
		id: row.id,
		quizId: row.quizId,
		participantName: parsed.name,
		participantEmail: parsed.email,
		intakeFormData: parsed.raw,
		answers: row.answers,
		score: row.score,
		totalQuestions: row.totalQuestions,
		timeTakenSeconds: row.timeTakenSeconds,
		submittedAt: row.submittedAt
	};
}

export async function getAttemptsByQuiz(quizId: string): Promise<AttemptSummary[]> {
	const rows = await db
		.select()
		.from(attempt)
		.where(eq(attempt.quizId, quizId))
		.orderBy(desc(attempt.submittedAt));

	return rows.map(mapAttempt);
}

export async function getAttemptMetrics(quizId: string): Promise<AttemptMetrics> {
	try {
		const [totals] = await db
			.select({
				total: count(),
				avgScore: avg(attempt.score),
				maxScore: max(attempt.score),
				minScore: min(attempt.score)
			})
			.from(attempt)
			.where(eq(attempt.quizId, quizId));

		return {
			totalAttempts: totals?.total ?? 0,
			averageScore: totals?.avgScore != null ? Math.round(Number(totals.avgScore) * 100) / 100 : 0,
			highestScore: totals?.maxScore != null ? Number(totals.maxScore) : 0,
			lowestScore: totals?.minScore != null ? Number(totals.minScore) : 0
		};
	} catch (error) {
		console.error('Error fetching attempt metrics:', error);
		return {
			totalAttempts: 0,
			averageScore: 0,
			highestScore: 0,
			lowestScore: 0
		};
	}
}

export async function deleteAttempts(quizId: string, attemptIds: string[]) {
	if (attemptIds.length === 0) {
		return { success: true as const, deleted: 0 };
	}
	return await db.transaction(async (tx) => {
		const [countResult] = await tx
			.select({ count: count() })
			.from(attempt)
			.where(and(eq(attempt.quizId, quizId), inArray(attempt.id, attemptIds)));
		const deletedCount = countResult?.count ?? 0;
		await tx
			.delete(attempt)
			.where(and(eq(attempt.quizId, quizId), inArray(attempt.id, attemptIds)));
		return { success: true as const, deleted: deletedCount };
	});
}
