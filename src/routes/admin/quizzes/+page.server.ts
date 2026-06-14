import { getQuizzes, deleteQuiz, duplicateQuiz, toggleQuizStatus } from '$lib/server/quiz-actions';

export async function load() {
	const quizzes = await getQuizzes();
	return { quizzes };
}

export const actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		await deleteQuiz(id);
		return { success: true };
	},
	duplicate: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const result = await duplicateQuiz(id);
		return result;
	},
	toggleStatus: async ({ request }) => {
		const formData = await request.formData();
		const result = await toggleQuizStatus(formData);
		return result;
	}
};
