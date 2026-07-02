import { mkdir, writeFile, unlink, rmdir } from 'fs/promises';
import { join, dirname, sep } from 'path';
import { env } from '$env/dynamic/private';

const DATA_DIR = env.DATA_DIR || './data';
const UPLOADS_DIR = join(DATA_DIR, 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'audio/mpeg',
	'audio/wav',
	'audio/ogg',
	'video/mp4',
	'video/webm',
	'video/ogg'
];

export async function ensureUploadDir() {
	try {
		await mkdir(UPLOADS_DIR, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
}

/**
 * Save an uploaded media file for a quiz question.
 *
 * Files are stored at: `uploads/quizzes/<quizId>/<fileUuid>.<ext>`
 * The quizId grouping keeps related files together without deep UUID nesting.
 * The stored mediaUrl is the path relative to DATA_DIR (with leading slash).
 */
export async function saveQuestionMedia(
	quizId: string,
	file: File
): Promise<string> {
	await ensureUploadDir();

	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		throw new Error('File size exceeds 50MB limit');
	}

	// Validate MIME type
	if (!ALLOWED_MIME_TYPES.includes(file.type)) {
		throw new Error(`File type ${file.type} is not allowed`);
	}

	// Generate UUID filename
	const fileExt = file.name.split('.').pop() || 'bin';
	const fileName = `${crypto.randomUUID()}.${fileExt}`;
	const quizDir = join(UPLOADS_DIR, 'quizzes', quizId);

	await mkdir(quizDir, { recursive: true });
	const filePath = join(quizDir, fileName);

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await writeFile(filePath, buffer);

	// Return relative path for storage in database
	return `/uploads/quizzes/${quizId}/${fileName}`;
}

/**
 * Delete a media file from disk and clean up empty parent directories.
 * Walks upward from the file's parent, removing empty directories until
 * reaching the uploads root or a non-empty directory.
 */
export async function deleteQuestionMedia(mediaUrl: string): Promise<void> {
	const absolutePath = join(DATA_DIR, mediaUrl);

	// Safety: ensure the path is inside UPLOADS_DIR
	const normalizedUploads = join(UPLOADS_DIR);
	if (
		absolutePath !== normalizedUploads &&
		!absolutePath.startsWith(normalizedUploads + sep)
	) {
		console.warn(`Invalid mediaUrl path outside UPLOADS_DIR: ${mediaUrl}`);
		return;
	}

	try {
		await unlink(absolutePath);
	} catch {
		// File may already be gone; continue to clean up empty dirs
	}

	// Clean up empty parent directories up to (but not including) UPLOADS_DIR
	let dir = dirname(absolutePath);
	while (dir !== normalizedUploads && dir.startsWith(normalizedUploads + sep)) {
		try {
			await rmdir(dir); // fails if not empty — that's what we want
		} catch {
			break; // directory not empty, stop cleanup
		}
		dir = dirname(dir);
	}
}

export function getMediaPath(mediaUrl: string): string {
	// Convert stored URL to absolute path if needed
	return join(DATA_DIR, mediaUrl);
}
