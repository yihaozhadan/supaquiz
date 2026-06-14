import { redirect, fail } from '@sveltejs/kit';
import { verifySession, createSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { admin } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import type { Actions, PageServerLoad } from './$types';

// Rate limiting: 5 attempts per 15 minutes per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const record = rateLimitMap.get(ip);

	if (!record || now > record.resetTime) {
		rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
		return true;
	}

	if (record.count >= RATE_LIMIT_MAX) {
		return false;
	}

	record.count++;
	return true;
}

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();

		if (!checkRateLimit(ip)) {
			return fail(429, { error: 'Too many login attempts. Please try again later.' });
		}

		const formData = await request.formData();
		const username = formData.get('username') as string;
		const password = formData.get('password') as string;

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required' });
		}

		const adminRecord = await db.query.admin.findFirst({
			where: eq(admin.username, username)
		});

		if (!adminRecord) {
			return fail(401, { error: 'Invalid credentials' });
		}

		const isValid = await argon2.verify(adminRecord.passwordHash, password);

		if (!isValid) {
			return fail(401, { error: 'Invalid credentials' });
		}

		await createSession(username, cookies);
		throw redirect(303, '/admin');
	}
};

export const load: PageServerLoad = async ({ cookies }) => {
	const adminUser = await verifySession(cookies);
	if (adminUser) {
		throw redirect(303, '/admin');
	}
	return {};
};
