import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from './db';
import { quiz, question } from './db/schema';
import { toggleQuizStatus, createQuestion } from './quiz-actions';
import { eq } from 'drizzle-orm';

// Mock the database
vi.mock('./db', () => ({
	db: {
		query: {
			quiz: {
				findFirst: vi.fn(),
				findMany: vi.fn()
			},
			question: {
				findMany: vi.fn()
			}
		},
		select: vi.fn(),
		from: vi.fn(),
		where: vi.fn(),
		update: vi.fn(),
		set: vi.fn(),
		insert: vi.fn(),
		values: vi.fn(),
		returning: vi.fn(),
		delete: vi.fn()
	}
}));

describe('Quiz Constraints', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Max 5 Active Quizzes', () => {
		it('should allow activation when less than 5 active quizzes', async () => {
			const mockQuiz = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				maxParticipants: 100,
				status: 'draft'
			};

			vi.mocked(db.query.quiz.findFirst).mockResolvedValue(mockQuiz as any);
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ count: 3 }])
				})
			} as any);
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockQuiz])
					})
				})
			} as any);

			const formData = new FormData();
			formData.append('id', '123e4567-e89b-12d3-a456-426614174000');
			formData.append('status', 'active');

			const result = await toggleQuizStatus(formData);

			expect(result.success).toBe(true);
		});

		it('should reject activation when 5 or more active quizzes exist', async () => {
			const mockQuiz = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				maxParticipants: 100,
				status: 'draft'
			};

			vi.mocked(db.query.quiz.findFirst).mockResolvedValue(mockQuiz as any);
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ count: 5 }])
				})
			} as any);

			const formData = new FormData();
			formData.append('id', '123e4567-e89b-12d3-a456-426614174000');
			formData.append('status', 'active');

			const result = await toggleQuizStatus(formData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Maximum 5 active quizzes allowed');
		});

		it('should reject activation when max_participants is not set', async () => {
			const mockQuiz = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				maxParticipants: 0,
				status: 'draft'
			};

			vi.mocked(db.query.quiz.findFirst).mockResolvedValue(mockQuiz as any);
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ count: 2 }])
				})
			} as any);

			const formData = new FormData();
			formData.append('id', '123e4567-e89b-12d3-a456-426614174000');
			formData.append('status', 'active');

			const result = await toggleQuizStatus(formData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('max_participants must be set before activating');
		});
	});

	describe('Max 50 Questions per Quiz', () => {
		it('should allow adding question when less than 50 questions exist', async () => {
			vi.mocked(db.query.question.findMany).mockResolvedValue([]);

			const formData = new FormData();
			formData.append('quizId', '123e4567-e89b-12d3-a456-426614174000');
			formData.append('type', 'mcq_single');
			formData.append('text', 'Test question?');
			formData.append('correctAnswer', JSON.stringify('option1'));
			formData.append('orderIndex', '0');

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: '123e4567-e89b-12d3-a456-426614174001' }])
				})
			} as any);

			const result = await createQuestion(formData);

			expect(result.success).toBe(true);
		});

		it('should reject adding question when 50 questions exist', async () => {
			const mockQuestions = Array.from({ length: 50 }, (_, i) => ({
				id: `123e4567-e89b-12d3-a456-426614174${String(i).padStart(3, '0')}`,
				quizId: '123e4567-e89b-12d3-a456-426614174000'
			}));

			vi.mocked(db.query.question.findMany).mockResolvedValue(mockQuestions as any);

			const formData = new FormData();
			formData.append('quizId', '123e4567-e89b-12d3-a456-426614174000');
			formData.append('type', 'mcq_single');
			formData.append('text', 'Test question?');
			formData.append('correctAnswer', JSON.stringify('option1'));
			formData.append('orderIndex', '50');

			const result = await createQuestion(formData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Maximum 50 questions per quiz');
		});
	});
});
