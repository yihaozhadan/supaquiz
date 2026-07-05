import { fail, redirect } from '@sveltejs/kit';
import { importQuiz } from '$lib/server/import-export';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file || file.size === 0) {
			return fail(400, { error: 'Please select a quiz JSON file to import' });
		}

		const text = await file.text();
		const result = await importQuiz(text);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		const params = new URLSearchParams({ imported: '1' });
		if (result.warnings.length > 0) {
			params.set('warnings', String(result.warnings.length));
		}
		redirect(303, `/admin/quizzes/${result.quiz.id}/edit?${params.toString()}`);
	}
};
