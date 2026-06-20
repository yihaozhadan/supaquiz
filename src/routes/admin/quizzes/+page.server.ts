import { getQuizzes, deleteQuiz, duplicateQuiz, toggleQuizStatus } from '$lib/server/quiz-actions';

export async function load() {
	const quizzes = await getQuizzes();
	return { quizzes };
}

export const actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		return await deleteQuiz(id);
	},
	duplicate: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		return await duplicateQuiz(id);
	},
	toggleStatus: async ({ request }) => {
		const formData = await request.formData();
		const result = await toggleQuizStatus(formData);
		return result;
	}
};
