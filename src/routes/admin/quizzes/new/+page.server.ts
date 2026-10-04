import { createQuiz } from '$lib/server/quiz-actions';
import { redirect } from '@sveltejs/kit';

export async function load() {
	return {};
}

export const actions = {
	default: async ({ request }) => {
		const result = await createQuiz(await request.formData());
		if (result.success && result.quiz) {
			redirect(302, `/admin/quizzes/${result.quiz.id}/edit`);
		}
		return result;
	}
};
