/**
 * Pure grading logic for quiz questions.
 * Kept free of DB/IO concerns so it can be unit tested in isolation.
 */

export type QuestionType = 'mcq_single' | 'mcq_multi' | 'true_false' | 'fitb';

export interface GradableQuestion {
	id: string;
	type: QuestionType;
	correctAnswer: string | string[];
}

/** Normalize a free-text answer for case-insensitive, whitespace-trimmed comparison. */
function normalizeText(value: string): string {
	return value.trim().toLowerCase();
}

/**
 * Grade a single answer against a question's correct answer definition.
 * - mcq_single / true_false: correctAnswer is a single option id/value (string).
 * - mcq_multi: correctAnswer is an array of option ids/values; the given answer
 *   must match the same set exactly.
 * - fitb: correctAnswer is a string compared case-insensitively after trimming.
 */
export function gradeAnswer(question: GradableQuestion, answer: unknown): boolean {
	switch (question.type) {
		case 'mcq_single':
		case 'true_false': {
			if (typeof answer !== 'string') return false;
			const correct = question.correctAnswer;
			return typeof correct === 'string' && answer === correct;
		}
		case 'mcq_multi': {
			if (!Array.isArray(answer)) return false;
			const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
			if (answer.length !== correct.length) return false;
			const answerSet = new Set(answer);
			return correct.every((c) => answerSet.has(c));
		}
		case 'fitb': {
			if (typeof answer !== 'string') return false;
			const correct = question.correctAnswer;
			return typeof correct === 'string' && normalizeText(answer) === normalizeText(correct);
		}
		default:
			return false;
	}
}

export interface GradingResult {
	score: number;
	totalQuestions: number;
	results: Record<string, boolean>;
}

/**
 * Grade a full set of answers against a quiz's questions.
 * `answers` is keyed by question id; missing answers are graded as incorrect.
 */
export function gradeQuiz(
	questions: GradableQuestion[],
	answers: Record<string, unknown>
): GradingResult {
	const results: Record<string, boolean> = {};
	let score = 0;

	for (const question of questions) {
		const isCorrect = gradeAnswer(question, answers[question.id]);
		results[question.id] = isCorrect;
		if (isCorrect) score += 1;
	}

	return { score, totalQuestions: questions.length, results };
}
