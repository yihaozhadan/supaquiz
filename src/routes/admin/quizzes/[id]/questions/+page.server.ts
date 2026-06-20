import { getQuizById, createQuestion, updateQuestion, deleteQuestion } from '$lib/server/quiz-actions';
import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	const quiz = await getQuizById(params.id);
	if (!quiz) {
		redirect(302, '/admin/quizzes');
	}

	return { quiz };
}

export const actions = {
	create: async ({ request }) => {
		const result = await createQuestion(await request.formData());
		if (!result.success) {
			return result;
		}
		return { success: true, message: 'Question created successfully' };
	},
	update: async ({ request }) => {
		const result = await updateQuestion(await request.formData());
		if (!result.success) {
			return result;
		}
		return { success: true, message: 'Question updated successfully' };
	},
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		await deleteQuestion(id);
		return { success: true, message: 'Question deleted successfully' };
	}
};
