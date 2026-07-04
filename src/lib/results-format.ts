/**
 * Pure helpers for formatting attempt summaries as CSV/JSON.
 * Kept in a shared (non-server) module so they can be imported from
 * client components without pulling in the database.
 */

export interface AttemptSummary {
	id: string;
	quizId: string;
	participantName: string;
	participantEmail: string;
	intakeFormData: unknown;
	answers: unknown;
	score: number;
	totalQuestions: number;
	timeTakenSeconds: number;
	submittedAt: Date | string;
}

function escapeCsv(value: string | number): string {
	const str = String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Convert an array of attempt summaries to a CSV string.
 * Columns: Participant, Email, Score, Total, Percentage, Time (s), Submitted At.
 */
export function attemptsToCsv(attempts: AttemptSummary[]): string {
	const headers = [
		'Participant',
		'Email',
		'Score',
		'Total',
		'Percentage',
		'Time (s)',
		'Submitted At'
	];

	const rows = attempts.map((a) => {
		const percentage =
			a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 1000) / 10 : 0;
		return [
			a.participantName,
			a.participantEmail,
			a.score,
			a.totalQuestions,
			percentage,
			a.timeTakenSeconds,
			new Date(a.submittedAt).toISOString()
		]
			.map(escapeCsv)
			.join(',');
	});

	return [headers.join(','), ...rows].join('\n');
}

export function attemptsToJson(attempts: AttemptSummary[]): string {
	const serializable = attempts.map((a) => ({
		id: a.id,
		quizId: a.quizId,
		participantName: a.participantName,
		participantEmail: a.participantEmail,
		intakeFormData: a.intakeFormData,
		answers: a.answers,
		score: a.score,
		totalQuestions: a.totalQuestions,
		timeTakenSeconds: a.timeTakenSeconds,
		submittedAt: new Date(a.submittedAt).toISOString()
	}));
	return JSON.stringify(serializable, null, 2);
}
