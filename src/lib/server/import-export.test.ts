import { describe, it, expect, beforeEach, vi } from 'vitest';

const insertedQuizzes: Record<string, unknown>[] = [];
const insertedQuestions: Record<string, unknown>[] = [];

vi.mock('./db', () => ({
	db: {
		insert: vi.fn(),
		query: {
			quiz: { findFirst: vi.fn() },
			question: { findMany: vi.fn() }
		}
	}
}));

vi.mock('./storage', () => ({
	copyQuestionMedia: vi.fn()
}));

import { db } from './db';
import { copyQuestionMedia } from './storage';
import { importQuiz, exportQuiz } from './import-export';
import { getQuizById } from './quiz-actions';

vi.mock('./quiz-actions', () => ({
	getQuizById: vi.fn()
}));

describe('Quiz Import/Export', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		insertedQuizzes.length = 0;
		insertedQuestions.length = 0;
	});

	describe('exportQuiz', () => {
		it('returns null when quiz not found', async () => {
			vi.mocked(getQuizById).mockResolvedValue(null);
			const result = await exportQuiz('missing-id');
			expect(result).toBeNull();
		});

		it('serializes quiz fields and questions', async () => {
			vi.mocked(getQuizById).mockResolvedValue({
				id: 'quiz-1',
				title: 'My Quiz',
				description: 'Desc',
				password: null,
				timeLimitSeconds: null,
				shuffleQuestions: false,
				maxAttempts: 1,
				maxParticipants: 10,
				allowBackNavigation: true,
				revealAnswersAfter: 'immediate',
				intakeFormSchema: [],
				isPublic: true,
				status: 'draft',
				questions: [
					{
						id: 'q1',
						quizId: 'quiz-1',
						type: 'true_false',
						text: 'Is this true?',
						mediaUrl: null,
						options: null,
						correctAnswer: 'true',
						explanation: null,
						codeSnippet: null,
						orderIndex: 0
					}
				]
			} as any);

			const result = await exportQuiz('quiz-1');

			expect(result?.version).toBe(1);
			expect(result?.quiz.title).toBe('My Quiz');
			expect(result?.questions).toHaveLength(1);
			expect(result?.questions[0].text).toBe('Is this true?');
			// Quiz/question ids and status should not be present in export
			expect((result?.quiz as any).id).toBeUndefined();
			expect((result?.questions[0] as any).id).toBeUndefined();
		});
	});

	describe('importQuiz', () => {
		it('rejects invalid JSON', async () => {
			const result = await importQuiz('not json');
			expect(result.success).toBe(false);
		});

		it('rejects JSON that does not match the export schema', async () => {
			const result = await importQuiz(JSON.stringify({ foo: 'bar' }));
			expect(result.success).toBe(false);
		});

		it('imports a valid export, creating a draft quiz and its questions', async () => {
			vi.mocked(db.insert).mockImplementation(
			((table: any) => ({
				values: vi.fn((values: any) => {
					if (Array.isArray(values)) {
						insertedQuestions.push(...values);
						return { returning: vi.fn().mockResolvedValue(values) };
					}
					insertedQuizzes.push(values);
					return {
						returning: vi.fn().mockResolvedValue([{ ...values, id: 'new-quiz-id' }])
					};
				})
			}) as any)
		);

			const exportData = {
				version: 1,
				quiz: {
					title: 'Roundtrip Quiz',
					description: 'Desc',
					password: null,
					timeLimitSeconds: null,
					shuffleQuestions: false,
					maxAttempts: 1,
					maxParticipants: 10,
					allowBackNavigation: true,
					revealAnswersAfter: 'immediate',
					intakeFormSchema: [],
					isPublic: true
				},
				questions: [
					{
						type: 'mcq_single',
						text: 'Pick one',
						mediaUrl: null,
						options: [
							{ text: 'A', isCorrect: true },
							{ text: 'B', isCorrect: false }
						],
						correctAnswer: 'A',
						explanation: null,
						codeSnippet: null,
						orderIndex: 0
					}
				]
			};

			const result = await importQuiz(JSON.stringify(exportData));

			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.quiz.id).toBe('new-quiz-id');
			expect(result.warnings).toHaveLength(0);
			expect(insertedQuizzes[0]).toMatchObject({ title: 'Roundtrip Quiz', status: 'draft' });
			expect(insertedQuestions[0]).toMatchObject({ quizId: 'new-quiz-id', text: 'Pick one' });
		});

		it('warns when a referenced media file is missing', async () => {
			vi.mocked(copyQuestionMedia).mockResolvedValue(null);
			vi.mocked(db.insert).mockImplementation(
			((table: any) => ({
				values: vi.fn((values: any) => {
					if (Array.isArray(values)) {
						insertedQuestions.push(...values);
						return { returning: vi.fn().mockResolvedValue(values) };
					}
					insertedQuizzes.push(values);
					return {
						returning: vi.fn().mockResolvedValue([{ ...values, id: 'new-quiz-id' }])
					};
				})
			}) as any)
		);

			const exportData = {
				version: 1,
				quiz: {
					title: 'Quiz With Media',
					description: 'Desc',
					password: null,
					timeLimitSeconds: null,
					shuffleQuestions: false,
					maxAttempts: 1,
					maxParticipants: 10,
					allowBackNavigation: true,
					revealAnswersAfter: 'immediate',
					intakeFormSchema: [],
					isPublic: true
				},
				questions: [
					{
						type: 'fitb',
						text: 'Fill in',
						mediaUrl: '/uploads/quizzes/old-id/some.png',
						options: null,
						correctAnswer: 'answer',
						explanation: null,
						codeSnippet: null,
						orderIndex: 0
					}
				]
			};

			const result = await importQuiz(JSON.stringify(exportData));

			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.warnings).toHaveLength(1);
			expect(insertedQuestions[0].mediaUrl).toBeNull();
		});
	});
});
