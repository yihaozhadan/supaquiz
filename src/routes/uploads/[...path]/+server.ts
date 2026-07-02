import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { join, sep } from 'path';
import { MIME_MAP } from '$lib/server/mime-types';
import type { RequestHandler } from './$types';

const DATA_DIR = env.DATA_DIR || './data';
const UPLOADS_DIR = join(DATA_DIR, 'uploads');

export const GET: RequestHandler = async ({ params }) => {
	// Build the absolute path and verify it stays within UPLOADS_DIR
	const target = join(UPLOADS_DIR, params.path);
	const normalizedTarget = join(target); // Normalize to resolve .. and .
	if (
		normalizedTarget !== UPLOADS_DIR &&
		!normalizedTarget.startsWith(UPLOADS_DIR + sep)
	) {
		throw error(404, 'Not found');
	}

	try {
		const data = await readFile(target);
		const ext = target.split('.').pop()?.toLowerCase() ?? '';
		const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
		return new Response(data, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch {
		throw error(404, 'File not found');
	}
};
