import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, access, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
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

vi.mock('./db', () => ({
	db: {
		select: vi.fn(),
		from: vi.fn(),
		where: vi.fn(),
		insert: vi.fn(),
		values: vi.fn(),
		returning: vi.fn()
	}
}));

describe('file-actions', () => {
	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'supaquiz-'));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
		vi.resetModules();
	});

	describe('deleteFile', () => {
		it('deletes a file by relative path and removes empty parent directories', async () => {
			const { deleteFile } = await import('./file-actions');
			const filePath = join(tempDir, 'uploads', 'quizzes', 'quiz-1', 'image.png');
			await mkdir(join(tempDir, 'uploads', 'quizzes', 'quiz-1'), { recursive: true });
			await writeFile(filePath, 'data');

			await deleteFile('uploads/quizzes/quiz-1/image.png');

			await expect(access(filePath)).rejects.toThrow();
			expect(existsSync(join(tempDir, 'uploads', 'quizzes', 'quiz-1'))).toBe(false);
		});

		it('removes empty directories up to but not including the uploads root', async () => {
			const { deleteFile } = await import('./file-actions');
			const filePath = join(tempDir, 'uploads', 'quizzes', 'quiz-1', 'image.png');
			await mkdir(join(tempDir, 'uploads', 'quizzes', 'quiz-1'), { recursive: true });
			await writeFile(filePath, 'data');

			await deleteFile('uploads/quizzes/quiz-1/image.png');

			await expect(access(filePath)).rejects.toThrow();
			expect(existsSync(join(tempDir, 'uploads', 'quizzes', 'quiz-1'))).toBe(false);
			expect(existsSync(join(tempDir, 'uploads', 'quizzes'))).toBe(false);
			expect(existsSync(join(tempDir, 'uploads'))).toBe(true);
		});

		it('does not delete sibling files or non-empty parent directories', async () => {
			const { deleteFile } = await import('./file-actions');
			const dir = join(tempDir, 'uploads', 'quizzes', 'quiz-1');
			const targetFile = join(dir, 'image.png');
			const siblingFile = join(dir, 'sibling.png');
			await mkdir(dir, { recursive: true });
			await writeFile(targetFile, 'data');
			await writeFile(siblingFile, 'data');

			await deleteFile('uploads/quizzes/quiz-1/image.png');

			await expect(access(targetFile)).rejects.toThrow();
			await expect(access(siblingFile)).resolves.toBeUndefined();
			expect(existsSync(dir)).toBe(true);
		});

		it('does not throw when the file is already missing', async () => {
			const { deleteFile } = await import('./file-actions');
			await expect(deleteFile('uploads/quizzes/quiz-1/missing.png')).resolves.toBeUndefined();
		});

		it('rejects paths outside UPLOADS_DIR to prevent traversal', async () => {
			const { deleteFile } = await import('./file-actions');
			const secretFile = join(tempDir, 'secret.txt');
			await writeFile(secretFile, 'secret');

			await expect(deleteFile('../secret.txt')).rejects.toThrow('Invalid file path');

			expect(existsSync(secretFile)).toBe(true);
		});

		it('rejects absolute paths outside the uploads directory', async () => {
			const { deleteFile } = await import('./file-actions');
			const secretFile = join(tmpdir(), 'supaquiz-file-actions-secret.txt');
			await writeFile(secretFile, 'secret');

			await expect(deleteFile(secretFile)).rejects.toThrow('Invalid file path');

			expect(existsSync(secretFile)).toBe(true);
			rmSync(secretFile, { force: true });
		});

		it('normalizes relative paths to ensure they stay inside uploads', async () => {
			const { deleteFile } = await import('./file-actions');
			const secretFile = join(tempDir, 'secret.txt');
			await writeFile(secretFile, 'secret');

			await expect(deleteFile('uploads/../../secret.txt')).rejects.toThrow('Invalid file path');

			expect(existsSync(secretFile)).toBe(true);
		});
	});

	describe('resolveRawPath', () => {
		it('returns an absolute path for a valid relative path inside uploads', async () => {
			const { resolveRawPath } = await import('./file-actions');
			const result = resolveRawPath('uploads/quizzes/quiz-1/image.png');
			expect(result).toBe(join(tempDir, 'uploads', 'quizzes', 'quiz-1', 'image.png'));
		});

		it('returns null for paths outside UPLOADS_DIR', async () => {
			const { resolveRawPath } = await import('./file-actions');
			expect(resolveRawPath('../secret.txt')).toBeNull();
			expect(resolveRawPath('/etc/passwd')).toBeNull();
		});

		it('normalizes dotted paths before validation', async () => {
			const { resolveRawPath } = await import('./file-actions');
			expect(resolveRawPath('uploads/../../secret.txt')).toBeNull();
		});
	});
});
