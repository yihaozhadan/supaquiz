import { db } from '$lib/server/db';
import { quiz, attempt } from '$lib/server/db/schema';
import { count, desc, eq } from 'drizzle-orm';
import { getEffectiveStatus, type EffectiveQuizStatus } from '$lib/quiz-status';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [totalQuizzes] = await db.select({ value: count() }).from(quiz);

	const [totalAttempts] = await db.select({ value: count() }).from(attempt);

	// Statuses like scheduled/expired are derived from the activation window,
	// so counts must be computed per-quiz rather than grouped by stored status.
	const statusRows = await db
		.select({ status: quiz.status, activateAt: quiz.activateAt, expireAt: quiz.expireAt })
		.from(quiz);

	const statusCounts: Record<EffectiveQuizStatus, number> = {
		draft: 0,
		scheduled: 0,
		active: 0,
		expired: 0,
		archived: 0
	};
	for (const row of statusRows) {
		statusCounts[getEffectiveStatus(row)]++;
	}
	const activeQuizzes = { value: statusCounts.active };

	const recentAttempts = await db
		.select({
			id: attempt.id,
			quizId: attempt.quizId,
			quizTitle: quiz.title,
			intakeFormData: attempt.intakeFormData,
			score: attempt.score,
			totalQuestions: attempt.totalQuestions,
			timeTakenSeconds: attempt.timeTakenSeconds,
			submittedAt: attempt.submittedAt
		})
		.from(attempt)
		.innerJoin(quiz, eq(attempt.quizId, quiz.id))
		.orderBy(desc(attempt.submittedAt))
		.limit(5);

	const mappedAttempts = recentAttempts.map((a) => {
		let participantName = 'Anonymous';
		const formData = a.intakeFormData as Record<string, unknown>;
		const nameKey = Object.keys(formData ?? {}).find(
			(key) => key.toLowerCase() === 'name' || key.toLowerCase() === 'fullname'
		);
		const nameValue = nameKey ? formData[nameKey] : undefined;
		if (typeof nameValue === 'string' && nameValue.trim()) participantName = nameValue;
		return {
			id: a.id,
			quizId: a.quizId,
			quizTitle: a.quizTitle,
			participantName,
			score: a.score,
			totalQuestions: a.totalQuestions,
			timeTakenSeconds: a.timeTakenSeconds,
			submittedAt: a.submittedAt
		};
	});

	return {
		totalQuizzes: totalQuizzes.value,
		activeQuizzes: activeQuizzes.value,
		totalAttempts: totalAttempts.value,
		statusCounts,
		recentAttempts: mappedAttempts
	};
};
