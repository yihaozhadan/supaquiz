import type { PageServerLoad } from './$types';
import { getPublicQuizzes } from '$lib/server/public-quizzes';

export const load: PageServerLoad = async () => {
	const quizzes = await getPublicQuizzes(6);

	return { quizzes };
};
