import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { admin } from './db/schema';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_EXPIRY_HOURS = 24;

function getSecretKey() {
	const secret = env.SESSION_SECRET;
	if (!secret) throw new Error('SESSION_SECRET is not set');
	return new TextEncoder().encode(secret);
}

export async function createSession(username: string, cookies: Cookies) {
	const secret = getSecretKey();
	const token = await new SignJWT({ username })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_EXPIRY_HOURS}h`)
		.sign(secret);

	cookies.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		path: '/admin',
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: SESSION_EXPIRY_HOURS * 60 * 60
	});
}

export async function verifySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!token) return null;

	try {
		const secret = getSecretKey();
		const { payload } = await jwtVerify(token, secret);
		const username = payload.username as string;

		const adminRecord = await db.query.admin.findFirst({
			where: eq(admin.username, username)
		});

		return adminRecord;
	} catch (error) {
		return null;
	}
}

export function deleteSession(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/admin' });
}
