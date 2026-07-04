import { describe, it, expect } from 'vitest';
import { attemptsToCsv, attemptsToJson, type AttemptSummary } from './results-format';

function makeAttempt(overrides: Partial<AttemptSummary> = {}): AttemptSummary {
	return {
		id: 'att-1',
		quizId: 'quiz-1',
		participantName: 'Alice',
		participantEmail: 'alice@example.com',
		intakeFormData: [],
		answers: {},
		score: 4,
		totalQuestions: 5,
		timeTakenSeconds: 120,
		submittedAt: new Date('2026-01-15T10:30:00.000Z'),
		...overrides
	};
}

describe('results-format', () => {
	describe('attemptsToCsv', () => {
		it('includes header row and one row per attempt', () => {
			const csv = attemptsToCsv([makeAttempt(), makeAttempt({ id: 'att-2' })]);
			const lines = csv.split('\n');
			expect(lines).toHaveLength(3);
			expect(lines[0]).toBe(
				'Participant,Email,Score,Total,Percentage,Time (s),Submitted At'
			);
		});

		it('computes percentage rounded to one decimal', () => {
			const csv = attemptsToCsv([makeAttempt({ score: 1, totalQuestions: 3 })]);
			const lines = csv.split('\n');
			// 1/3 = 33.333... -> 33.3
			expect(lines[1]).toContain(',33.3,');
		});

		it('handles zero total questions without dividing by zero', () => {
			const csv = attemptsToCsv([makeAttempt({ score: 0, totalQuestions: 0 })]);
			const lines = csv.split('\n');
			expect(lines[1]).toContain(',0,');
		});

		it('escapes values containing commas and quotes', () => {
			const csv = attemptsToCsv([
				makeAttempt({ participantName: 'Doe, John', participantEmail: 'j"a"m@example.com' })
			]);
			const lines = csv.split('\n');
			// Comma -> quoted; quotes -> doubled and quoted
			expect(lines[1].startsWith('"Doe, John",')).toBe(true);
			expect(lines[1]).toContain('"j""a""m@example.com"');
		});

		it('returns only header for empty input', () => {
			const csv = attemptsToCsv([]);
			expect(csv).toBe('Participant,Email,Score,Total,Percentage,Time (s),Submitted At');
		});
	});

	describe('attemptsToJson', () => {
		it('produces valid JSON with expected fields', () => {
			const json = attemptsToJson([makeAttempt()]);
			const parsed = JSON.parse(json);
			expect(parsed).toHaveLength(1);
			expect(parsed[0]).toMatchObject({
				id: 'att-1',
				participantName: 'Alice',
				participantEmail: 'alice@example.com',
				score: 4,
				totalQuestions: 5,
				timeTakenSeconds: 120,
				submittedAt: '2026-01-15T10:30:00.000Z'
			});
		});

		it('returns an array for empty input', () => {
			const json = attemptsToJson([]);
			expect(JSON.parse(json)).toEqual([]);
		});
	});
});
