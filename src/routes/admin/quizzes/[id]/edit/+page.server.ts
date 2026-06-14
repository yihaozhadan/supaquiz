import { getQuizById, updateQuiz } from '$lib/server/quiz-actions';
import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	const quiz = await getQuizById(params.id);
	if (!quiz) {
		redirect(302, '/admin/quizzes');
	}

	return { quiz };
}

export const actions = {
	update: async ({ request }) => {
		const result = await updateQuiz(await request.formData());
		if (!result.success) {
			return result;
		}
		return { success: true, message: 'Quiz updated successfully' };
	}
};
