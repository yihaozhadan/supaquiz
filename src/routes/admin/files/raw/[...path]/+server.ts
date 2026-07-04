import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';
import { resolveRawPath } from '$lib/server/file-actions';
import { MIME_MAP } from '$lib/server/mime-types';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const adminUser = await verifySession(cookies);
	if (!adminUser) {
		throw error(401, 'Unauthorized');
	}

	const relativePath = `uploads/${params.path}`;
	const abs = resolveRawPath(relativePath);
	if (!abs) {
		throw error(404, 'Not found');
	}

	try {
		const data = await readFile(abs);
		// Infer content type from extension
		const ext = abs.split('.').pop()?.toLowerCase() ?? '';
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
