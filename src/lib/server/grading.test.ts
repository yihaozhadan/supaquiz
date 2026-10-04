import { describe, it, expect } from 'vitest';
import { gradeAnswer, gradeQuiz } from './grading';

describe('gradeAnswer', () => {
	it('grades mcq_single correctly', () => {
		const question = { id: 'q1', type: 'mcq_single' as const, correctAnswer: 'opt-2' };
		expect(gradeAnswer(question, 'opt-2')).toBe(true);
		expect(gradeAnswer(question, 'opt-1')).toBe(false);
		expect(gradeAnswer(question, undefined)).toBe(false);
	});

	it('grades true_false correctly', () => {
		const question = { id: 'q1', type: 'true_false' as const, correctAnswer: 'true' };
		expect(gradeAnswer(question, 'true')).toBe(true);
		expect(gradeAnswer(question, 'false')).toBe(false);
	});

	it('grades mcq_multi correctly regardless of order', () => {
		const question = { id: 'q1', type: 'mcq_multi' as const, correctAnswer: ['a', 'b'] };
		expect(gradeAnswer(question, ['b', 'a'])).toBe(true);
		expect(gradeAnswer(question, ['a'])).toBe(false);
		expect(gradeAnswer(question, ['a', 'b', 'c'])).toBe(false);
		expect(gradeAnswer(question, 'a')).toBe(false);
	});

	it('grades fitb case-insensitively and trims whitespace', () => {
		const question = { id: 'q1', type: 'fitb' as const, correctAnswer: 'Paris' };
		expect(gradeAnswer(question, 'paris')).toBe(true);
		expect(gradeAnswer(question, '  PARIS  ')).toBe(true);
		expect(gradeAnswer(question, 'London')).toBe(false);
	});
});

describe('gradeQuiz', () => {
	it('scores multiple questions and reports missing answers as incorrect', () => {
		const questions = [
			{ id: 'q1', type: 'mcq_single' as const, correctAnswer: 'a' },
			{ id: 'q2', type: 'fitb' as const, correctAnswer: 'answer' },
			{ id: 'q3', type: 'true_false' as const, correctAnswer: 'true' }
		];
		const result = gradeQuiz(questions, { q1: 'a', q2: 'wrong' });

		expect(result.score).toBe(1);
		expect(result.totalQuestions).toBe(3);
		expect(result.results).toEqual({ q1: true, q2: false, q3: false });
	});
});
