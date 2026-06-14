import { redirect } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// Allow access to login page without authentication
	if (url.pathname === '/admin/login') {
		return {};
	}

	const adminUser = await verifySession(cookies);

	if (!adminUser) {
		throw redirect(303, '/admin/login');
	}

	return {
		admin: adminUser
	};
};
