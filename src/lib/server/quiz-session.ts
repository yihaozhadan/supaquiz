import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const PARTICIPANT_ID_COOKIE = 'participant_id';
const PASSWORD_GATE_COOKIE_PREFIX = 'quiz_pw_ok_';
const QUIZ_SESSION_COOKIE_PREFIX = 'quiz_session_';
const SESSION_EXPIRY_HOURS = 12;

const cookieSecure = env.COOKIE_SECURE === 'true';

function getSecretKey() {
	const secret = env.SESSION_SECRET;
	if (!secret) throw new Error('SESSION_SECRET is not set');
	return new TextEncoder().encode(secret);
}

/** Read the existing anonymous participant id without creating a new cookie. */
export function getParticipantId(cookies: Cookies): string | undefined {
	return cookies.get(PARTICIPANT_ID_COOKIE) ?? undefined;
}

/** A long-lived anonymous identifier used to key attempts when no email is collected. */
export function getOrCreateParticipantId(cookies: Cookies): string {
	let id = cookies.get(PARTICIPANT_ID_COOKIE);
	if (!id) {
		id = crypto.randomUUID();
		cookies.set(PARTICIPANT_ID_COOKIE, id, {
			httpOnly: true,
			path: '/',
			secure: false,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});
	}
	return id;
}

export function markPasswordVerified(cookies: Cookies, quizId: string) {
	cookies.set(`${PASSWORD_GATE_COOKIE_PREFIX}${quizId}`, '1', {
		httpOnly: true,
		path: `/quiz/${quizId}`,
		secure: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 6
	});
}

export function isPasswordVerified(cookies: Cookies, quizId: string): boolean {
	return cookies.get(`${PASSWORD_GATE_COOKIE_PREFIX}${quizId}`) === '1';
}

export interface QuizSessionPayload {
	quizId: string;
	participantKey: string;
	intakeFormData: Record<string, unknown>;
	questionOrder: string[];
	startedAt: number;
}

/**
 * Create a signed JWT cookie representing an in-progress attempt: the intake
 * data, the (possibly shuffled) question order, and the start time used to
 * compute time taken. Kept in a cookie rather than server-side state so the
 * app remains stateless between requests.
 */
export async function createQuizSession(cookies: Cookies, payload: QuizSessionPayload) {
	const secret = getSecretKey();
	const token = await new SignJWT({ ...payload })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(`${SESSION_EXPIRY_HOURS}h`)
		.sign(secret);

	cookies.set(`${QUIZ_SESSION_COOKIE_PREFIX}${payload.quizId}`, token, {
		httpOnly: true,
		path: `/quiz/${payload.quizId}`,
		secure: false,
		sameSite: 'lax',
		maxAge: SESSION_EXPIRY_HOURS * 60 * 60
	});
}

export async function getQuizSession(
	cookies: Cookies,
	quizId: string
): Promise<QuizSessionPayload | null> {
	const token = cookies.get(`${QUIZ_SESSION_COOKIE_PREFIX}${quizId}`);
	if (!token) return null;

	try {
		const secret = getSecretKey();
		const { payload } = await jwtVerify(token, secret);
		return payload as unknown as QuizSessionPayload;
	} catch {
		return null;
	}
}

export function clearQuizSession(cookies: Cookies, quizId: string) {
	cookies.delete(`${QUIZ_SESSION_COOKIE_PREFIX}${quizId}`, { path: `/quiz/${quizId}` });
}
