import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

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

export async function saveQuestionMedia(
	quizId: string,
	questionId: string,
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

	// Generate UUIDv7 filename
	const fileExt = file.name.split('.').pop() || 'bin';
	const fileName = `${crypto.randomUUID()}.${fileExt}`;
	const quizDir = join(UPLOADS_DIR, 'quizzes', quizId, 'questions', questionId);

	await mkdir(quizDir, { recursive: true });
	const filePath = join(quizDir, fileName);

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await writeFile(filePath, buffer);

	// Return relative path for storage in database
	return `/uploads/quizzes/${quizId}/questions/${questionId}/${fileName}`;
}

export async function deleteQuestionMedia(mediaUrl: string): Promise<void> {
	// This would delete the file from disk
	// For now, we'll implement a placeholder
	// In production, you'd want to use fs.unlink and handle errors
	console.log(`Would delete file: ${mediaUrl}`);
}

export function getMediaPath(mediaUrl: string): string {
	// Convert stored URL to absolute path if needed
	return join(DATA_DIR, mediaUrl);
}
