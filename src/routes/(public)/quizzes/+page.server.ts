import type { PageServerLoad } from './$types';
import { getPublicQuizzesPaged } from '$lib/server/public-quizzes';
import { error } from '@sveltejs/kit';

const VALID_STATUSES = ['active', 'all'] as const;
const VALID_SORTS = ['newest', 'oldest', 'most_popular', 'alphabetical'] as const;
const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q') ?? undefined;
	const status = url.searchParams.get('status') ?? 'active';
	const sort = url.searchParams.get('sort') ?? 'newest';
	const page = Number(url.searchParams.get('page') ?? '1');

	if (!VALID_STATUSES.includes(status as any)) {
		error(400, 'Invalid status filter');
	}
	if (!VALID_SORTS.includes(sort as any)) {
		error(400, 'Invalid sort option');
	}
	if (!Number.isInteger(page) || page < 1) {
		error(400, 'Invalid page number');
	}

	const result = await getPublicQuizzesPaged({
		query,
		status: status as 'active' | 'all',
		sort: sort as 'newest' | 'oldest' | 'most_popular' | 'alphabetical',
		page,
		pageSize: PAGE_SIZE
	});

	return {
		...result,
		query,
		status,
		sort,
		page,
		pageSize: PAGE_SIZE
	};
};
