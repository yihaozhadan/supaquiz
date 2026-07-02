import { fail } from '@sveltejs/kit';
import { listFiles, getQuizOptions, getQuizTitlesFor, deleteFile } from '$lib/server/file-actions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const [files, quizzes] = await Promise.all([listFiles(), getQuizOptions()]);
	const quizTitleMap = await getQuizTitlesFor(files);

	return {
		files: files.map((f) => ({
			relativePath: f.relativePath,
			urlPath: f.urlPath,
			name: f.name,
			size: f.size,
			uploadedAt: f.uploadedAt,
			kind: f.kind,
			mimeType: f.mimeType,
			quizId: f.quizId,
			questionId: f.questionId,
			orphaned: f.orphaned,
			quizTitle: f.quizId ? quizTitleMap.get(f.quizId) ?? null : null
		})),
		quizzes
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		try {
			const formData = await request.formData();
			const relativePath = formData.get('relativePath') as string | null;
			if (!relativePath) {
				return fail(400, { error: 'Missing file path' });
			}
			await deleteFile(relativePath);
			return { success: true, message: 'File deleted successfully' };
		} catch (error) {
			console.error('Error deleting file:', error);
			const message = error instanceof Error ? error.message : 'Failed to delete file';
			return fail(500, { error: message });
		}
	}
};
