import { db } from '$lib/server/db';
import { quiz, attempt } from '$lib/server/db/schema';
import { count, desc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [totalQuizzes] = await db.select({ value: count() }).from(quiz);

	const [activeQuizzes] = await db
		.select({ value: count() })
		.from(quiz)
		.where(eq(quiz.status, 'active'));

	const [totalAttempts] = await db.select({ value: count() }).from(attempt);

	const statusRows = await db
		.select({ status: quiz.status, value: count() })
		.from(quiz)
		.groupBy(quiz.status);

	const statusCounts = { draft: 0, active: 0, expired: 0 };
	for (const row of statusRows) {
		statusCounts[row.status as keyof typeof statusCounts] = row.value;
	}

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
		try {
			const formData = JSON.parse(a.intakeFormData as string) as Array<{
				field: string;
				value: string;
			}>;
			const nameField = formData.find(
				(f) => f.field === 'name' || f.field === 'Name' || f.field === 'fullName'
			);
			if (nameField?.value) participantName = nameField.value;
		} catch {
			// ignore parse errors
		}
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
