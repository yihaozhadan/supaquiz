import { error } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';
import { exportQuiz } from '$lib/server/import-export';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
	const adminUser = await verifySession(cookies);
	if (!adminUser) {
		throw error(401, 'Unauthorized');
	}

	const exportData = await exportQuiz(params.id);
	if (!exportData) {
		throw error(404, 'Quiz not found');
	}

	const slug = exportData.quiz.title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
	const filename = `${slug || 'quiz'}.json`;

	return new Response(JSON.stringify(exportData, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
