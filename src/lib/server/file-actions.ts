import { readdir, stat, unlink, rmdir } from 'fs/promises';
import type { Dirent } from 'fs';
import { join, relative, dirname, sep, posix } from 'path';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { quiz, question } from './db/schema';
import { eq, inArray } from 'drizzle-orm';
import { EXT_TO_MIME, type FileKind } from './mime-types';

const DATA_DIR = env.DATA_DIR || './data';
const UPLOADS_DIR = join(DATA_DIR, 'uploads');

export interface FileEntry {
	/** Path relative to DATA_DIR, using POSIX separators (e.g. `uploads/quizzes/<id>/...`). */
	relativePath: string;
	/** URL-safe path for the admin raw endpoint (without leading slash). */
	urlPath: string;
	name: string;
	/** Absolute filesystem path. */
	absolutePath: string;
	size: number;
	/** Last modification time (ms since epoch). */
	uploadedAt: Date;
	kind: FileKind;
	/** MIME type inferred from extension. */
	mimeType: string;
	/** Quiz id parsed from the upload path, if present. */
	quizId: string | null;
	/** Question id parsed from the upload path, if present. */
	questionId: string | null;
	/** True when no question.mediaUrl references this file. */
	orphaned: boolean;
}

export interface QuizOption {
	id: string;
	title: string;
}

function extOf(filename: string): string {
	const idx = filename.lastIndexOf('.');
	return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : '';
}

function classify(ext: string): { mime: string; kind: FileKind } {
	return EXT_TO_MIME[ext] ?? { mime: 'application/octet-stream', kind: 'other' };
}

/** Recursively walk a directory and yield absolute file paths. */
async function walk(dir: string): Promise<string[]> {
	let entries: Dirent[];
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch (err) {
		console.error(`Failed to read directory ${dir}:`, err);
		return [];
	}

	const results: string[] = [];
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await walk(full)));
		} else if (entry.isFile()) {
			results.push(full);
		}
	}
	return results;
}

function toPosix(p: string): string {
	return p.split(sep).join(posix.sep);
}

/**
 * List all uploaded files, enriched with quiz/question associations and orphan status.
 * Orphaned = no `question.mediaUrl` references the file's relative path.
 */
export async function listFiles(): Promise<FileEntry[]> {
	const [filePaths, questions, quizzes] = await Promise.all([
		walk(UPLOADS_DIR),
		db.select().from(question),
		db.select({ id: quiz.id, title: quiz.title }).from(quiz)
	]);

	// Build a set of referenced relative paths (POSIX, relative to DATA_DIR).
	const referenced = new Set<string>();
	for (const q of questions) {
		if (!q.mediaUrl) continue;
		// mediaUrl is stored as `/uploads/...`; normalize to relative POSIX path.
		const normalized = q.mediaUrl.replace(/^\/+/, '');
		referenced.add(normalized);
	}

	const quizTitleMap = new Map(quizzes.map((q) => [q.id, q.title]));

	const entries: FileEntry[] = [];
	for (const abs of filePaths) {
		const relToData = toPosix(relative(DATA_DIR, abs));
		const relToUploads = toPosix(relative(UPLOADS_DIR, abs));
		const name = relToUploads.split(posix.sep).pop() ?? relToUploads;
		const ext = extOf(name);
		const { mime, kind } = classify(ext);

		let info: { quizId: string; questionId: string | null; fileName: string } | null = null;
		// Parse quiz/question IDs from the upload path.
		// New flat structure: quizzes/<quizId>/<file>
		// Old nested structure: quizzes/<quizId>/questions/<questionId>/<file>
		const parts = relToUploads.split(posix.sep);
		if (
			parts.length === 3 &&
			parts[0] === 'quizzes'
		) {
			info = { quizId: parts[1], questionId: null, fileName: parts[2] };
		} else if (
			parts.length === 5 &&
			parts[0] === 'quizzes' &&
			parts[2] === 'questions'
		) {
			info = { quizId: parts[1], questionId: parts[3], fileName: parts[4] };
		}

		let stats;
		try {
			stats = await stat(abs);
		} catch {
			continue;
		}

		entries.push({
			relativePath: relToData,
			urlPath: relToData,
			name,
			absolutePath: abs,
			size: stats.size,
			uploadedAt: stats.mtime,
			kind,
			mimeType: mime,
			quizId: info?.quizId ?? null,
			questionId: info?.questionId ?? null,
			orphaned: !referenced.has(relToData)
		});
	}

	// Newest first
	entries.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
	return entries;
}

/** Lightweight quiz list for filter dropdown. */
export async function getQuizOptions(): Promise<QuizOption[]> {
	const quizzes = await db.select({ id: quiz.id, title: quiz.title }).from(quiz);
	return quizzes;
}

/** Resolve quiz titles for a set of quiz ids. */
export async function getQuizTitlesFor(
	entries: FileEntry[]
): Promise<Map<string, string>> {
	const ids = new Set<string>();
	for (const e of entries) if (e.quizId) ids.add(e.quizId);
	if (ids.size === 0) return new Map();
	const quizzes = await db
		.select({ id: quiz.id, title: quiz.title })
		.from(quiz)
		.where(inArray(quiz.id, [...ids]));
	return new Map(quizzes.map((q) => [q.id, q.title]));
}

/**
 * Delete a single file by its relative path (relative to DATA_DIR).
 * Validates the path stays within UPLOADS_DIR to prevent traversal.
 * Removes empty parent directories after deletion.
 */
export async function deleteFile(relativePath: string): Promise<void> {
	const target = join(DATA_DIR, relativePath);
	const normalizedUploads = join(UPLOADS_DIR);
	const normalizedTarget = join(target); // Normalize to resolve .. and .

	if (
		normalizedTarget !== normalizedUploads &&
		!normalizedTarget.startsWith(normalizedUploads + sep)
	) {
		throw new Error('Invalid file path');
	}

	try {
		await unlink(target);
	} catch {
		// File may already be gone; continue to clean up empty dirs
	}

	// Clean up empty parent directories up to (but not including) UPLOADS_DIR.
	// rmdir fails on non-empty directories, which stops the walk correctly.
	let dir = dirname(target);
	while (dir !== normalizedUploads && dir.startsWith(normalizedUploads + sep)) {
		try {
			await rmdir(dir);
		} catch {
			break; // directory not empty, stop cleanup
		}
		dir = dirname(dir);
	}
}

/** Resolve the absolute path for a raw file request, with traversal protection. */
export function resolveRawPath(relativePath: string): string | null {
	const target = join(DATA_DIR, relativePath);
	const normalizedUploads = join(UPLOADS_DIR);
	const normalizedTarget = join(target); // Normalize to resolve .. and .
	if (
		normalizedTarget !== normalizedUploads &&
		!normalizedTarget.startsWith(normalizedUploads + sep)
	) {
		return null;
	}
	return target;
}
