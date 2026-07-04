import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	deleteSession(cookies);
	throw redirect(303, '/admin/login');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		deleteSession(cookies);
		throw redirect(303, '/admin/login');
	}
};
