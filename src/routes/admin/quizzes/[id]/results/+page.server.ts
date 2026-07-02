import { redirect, fail } from '@sveltejs/kit';
import { getQuizById } from '$lib/server/quiz-actions';
import {
	getAttemptsByQuiz,
	getAttemptMetrics,
	deleteAttempts
} from '$lib/server/result-actions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const quizData = await getQuizById(params.id);
	if (!quizData) {
		redirect(302, '/admin/quizzes');
	}

	const [attempts, metrics] = await Promise.all([
		getAttemptsByQuiz(params.id),
		getAttemptMetrics(params.id)
	]);

	return { quiz: quizData, attempts, metrics };
};

export const actions: Actions = {
	bulkDelete: async ({ request, params }) => {
		try {
			const formData = await request.formData();
			const ids = formData.getAll('ids') as string[];
			if (ids.length === 0) {
				return fail(400, { error: 'No attempts selected' });
			}
			const result = await deleteAttempts(params.id, ids);
			return { success: true, message: `${result.deleted} attempt(s) deleted successfully` };
		} catch (error) {
			console.error('Error deleting attempts:', error);
			return fail(500, { error: 'Failed to delete attempts. Please try again.' });
		}
	}
};
