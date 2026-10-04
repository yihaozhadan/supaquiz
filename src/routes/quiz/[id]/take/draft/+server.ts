import { json } from '@sveltejs/kit';
import { getQuizSession } from '$lib/server/quiz-session';
import { saveDraft } from '$lib/server/draft-store';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, cookies }) => {
	const session = await getQuizSession(cookies, params.id);
	if (!session) return json({ success: false, error: 'Session expired' }, { status: 401 });

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object' || !('answers' in body)) {
		return json({ success: false, error: 'Invalid payload' }, { status: 400 });
	}

	saveDraft(params.id, session.participantKey, body.answers as Record<string, unknown>);
	return json({ success: true });
};
