import {
	getQuizById,
	updateQuiz,
	toggleQuizStatus,
	moveQuestion,
	deleteQuestion,
	createQuestion,
	updateQuestion
} from '$lib/server/quiz-actions';
import { redirect, fail } from '@sveltejs/kit';

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
	},
	publish: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		const updateResult = await updateQuiz(formData);
		if (!updateResult.success) {
			return updateResult;
		}

		const toggleFormData = new FormData();
		toggleFormData.append('id', id);
		toggleFormData.append('status', 'active');
		const toggleResult = await toggleQuizStatus(toggleFormData);
		if (!toggleResult.success) {
			return toggleResult;
		}
		return { success: true, message: 'Quiz published successfully' };
	},
	createQuestion: async ({ request }) => {
		const result = await createQuestion(await request.formData());
		if (!result.success) {
			return fail(400, { error: result.error });
		}
		return { success: true, message: 'Question created successfully' };
	},
	updateQuestion: async ({ request }) => {
		const result = await updateQuestion(await request.formData());
		if (!result.success) {
			return fail(400, { error: result.error });
		}
		return { success: true, message: 'Question updated successfully' };
	},
	moveQuestion: async ({ request }) => {
		const formData = await request.formData();
		const questionId = formData.get('questionId') as string;
		const direction = formData.get('direction') as 'up' | 'down';
		const result = await moveQuestion(questionId, direction);
		if (!result.success) {
			return result;
		}
		return { success: true, message: 'Question moved successfully' };
	},
	deleteQuestion: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		await deleteQuestion(id);
		return { success: true, message: 'Question deleted successfully' };
	}
};
