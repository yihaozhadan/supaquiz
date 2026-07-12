import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, access, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join, sep } from 'path';
import { rmSync, existsSync } from 'fs';

let tempDir = '';

vi.mock('$env/dynamic/private', () => ({
	get env() {
		return {
			DATA_DIR: tempDir,
			SESSION_SECRET: 'test-secret',
			DATABASE_URL: ':memory:'
		};
	}
}));

describe('storage cleanup', () => {
	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'supaquiz-'));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
		vi.resetModules();
	});

	describe('deleteQuestionMedia', () => {
		it('deletes a file and removes empty parent directories', async () => {
			const { deleteQuestionMedia } = await import('./storage');
			const filePath = join(tempDir, 'uploads', 'quizzes', 'quiz-1', 'image.png');
			await mkdir(join(tempDir, 'uploads', 'quizzes', 'quiz-1'), { recursive: true });
			await writeFile(filePath, 'data');

			await deleteQuestionMedia('/uploads/quizzes/quiz-1/image.png');

			await expect(access(filePath)).rejects.toThrow();
			expect(existsSync(join(tempDir, 'uploads', 'quizzes', 'quiz-1'))).toBe(false);
		});

		it('removes empty directories up to but not including the uploads root', async () => {
			const { deleteQuestionMedia } = await import('./storage');
			const filePath = join(tempDir, 'uploads', 'quizzes', 'quiz-1', 'image.png');
			await mkdir(join(tempDir, 'uploads', 'quizzes', 'quiz-1'), { recursive: true });
			await writeFile(filePath, 'data');

			await deleteQuestionMedia('/uploads/quizzes/quiz-1/image.png');

			await expect(access(filePath)).rejects.toThrow();
			expect(existsSync(join(tempDir, 'uploads', 'quizzes', 'quiz-1'))).toBe(false);
			expect(existsSync(join(tempDir, 'uploads', 'quizzes'))).toBe(false);
			expect(existsSync(join(tempDir, 'uploads'))).toBe(true);
		});

		it('does not delete sibling files or non-empty parent directories', async () => {
			const { deleteQuestionMedia } = await import('./storage');
			const dir = join(tempDir, 'uploads', 'quizzes', 'quiz-1');
			const targetFile = join(dir, 'image.png');
			const siblingFile = join(dir, 'sibling.png');
			await mkdir(dir, { recursive: true });
			await writeFile(targetFile, 'data');
			await writeFile(siblingFile, 'data');

			await deleteQuestionMedia('/uploads/quizzes/quiz-1/image.png');

			await expect(access(targetFile)).rejects.toThrow();
			await expect(access(siblingFile)).resolves.toBeUndefined();
			expect(existsSync(dir)).toBe(true);
		});

		it('does not throw when the file is already missing', async () => {
			const { deleteQuestionMedia } = await import('./storage');
			await expect(
				deleteQuestionMedia('/uploads/quizzes/quiz-1/missing.png')
			).resolves.toBeUndefined();
		});

		it('rejects paths outside UPLOADS_DIR to prevent traversal', async () => {
			const { deleteQuestionMedia } = await import('./storage');
			const secretFile = join(tempDir, 'secret.txt');
			await writeFile(secretFile, 'secret');

			await deleteQuestionMedia('/../secret.txt');

			expect(existsSync(secretFile)).toBe(true);
		});

		it('rejects absolute paths outside the data directory', async () => {
			const { deleteQuestionMedia } = await import('./storage');
			const secretFile = join(tmpdir(), 'supaquiz-secret.txt');
			await writeFile(secretFile, 'secret');

			await deleteQuestionMedia(secretFile);

			expect(existsSync(secretFile)).toBe(true);
			rmSync(secretFile, { force: true });
		});
	});

	describe('getMediaPath', () => {
		it('returns the absolute path for a media URL', async () => {
			const { getMediaPath } = await import('./storage');
			const mediaPath = getMediaPath('/uploads/quizzes/quiz-1/image.png');
			expect(mediaPath).toBe(join(tempDir, 'uploads', 'quizzes', 'quiz-1', 'image.png'));
		});
	});

	describe('copyQuestionMedia', () => {
		it('copies a media file and returns a new media URL', async () => {
			const { copyQuestionMedia } = await import('./storage');
			const srcDir = join(tempDir, 'uploads', 'quizzes', 'old-quiz');
			await mkdir(srcDir, { recursive: true });
			await writeFile(join(srcDir, 'image.png'), 'data');

			const newUrl = await copyQuestionMedia('/uploads/quizzes/old-quiz/image.png', 'new-quiz');

			expect(newUrl).toMatch(/^\/uploads\/quizzes\/new-quiz\/[\w-]+\.png$/);
			const newPath = join(tempDir, newUrl!);
			expect(existsSync(newPath)).toBe(true);
		});

		it('returns null when the source file is missing', async () => {
			const { copyQuestionMedia } = await import('./storage');
			const result = await copyQuestionMedia('/uploads/quizzes/missing/image.png', 'new-quiz');
			expect(result).toBeNull();
		});
	});
});
