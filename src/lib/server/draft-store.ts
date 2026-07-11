/**
 * Lightweight in-memory store for in-progress answer drafts.
 * Auto-saved answers are ephemeral (they are only needed to survive a page
 * refresh during a single session) so a plain process-local Map is
 * sufficient; nothing here needs to survive a server restart.
 */

const drafts = new Map<string, Record<string, unknown>>();

function key(quizId: string, participantKey: string): string {
	return `${quizId}::${participantKey}`;
}

export function saveDraft(
	quizId: string,
	participantKey: string,
	answers: Record<string, unknown>
) {
	drafts.set(key(quizId, participantKey), answers);
}

export function getDraft(
	quizId: string,
	participantKey: string
): Record<string, unknown> | undefined {
	return drafts.get(key(quizId, participantKey));
}

export function clearDraft(quizId: string, participantKey: string) {
	drafts.delete(key(quizId, participantKey));
}
