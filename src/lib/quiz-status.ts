/**
 * Quiz lifecycle statuses.
 *
 * Stored statuses live in the `quiz.status` column; `scheduled` is a derived
 * status only — a published quiz whose activation date is still in the future.
 * `expired` can be both stored (manually set / legacy) and derived (the
 * `expireAt` window has passed).
 */
export type StoredQuizStatus = 'draft' | 'active' | 'expired' | 'archived' | 'scheduled';
export type EffectiveQuizStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'archived';

export interface QuizSchedule {
	activateAt: Date | string | number | null;
	expireAt: Date | string | number | null;
}

function toTime(value: Date | string | number | null | undefined): number | null {
	if (value == null || value === '') return null;
	const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
	return Number.isNaN(t) ? null : t;
}

/**
 * Resolve the status that should be shown/enforced right now.
 *
 * - `draft` and `archived` are manual, stored states and always win.
 * - A stored `expired` stays expired (a quiz only leaves it via draft/publish).
 * - Published quizzes (`active`, or a legacy stored `scheduled`) become
 *   `expired` once `expireAt` has passed, `scheduled` while `activateAt` is in
 *   the future, and `active` inside the window.
 */
export function getEffectiveStatus(
	quiz: { status: string } & QuizSchedule,
	now: number = Date.now()
): EffectiveQuizStatus {
	if (quiz.status === 'draft') return 'draft';
	if (quiz.status === 'archived') return 'archived';
	if (quiz.status === 'expired') return 'expired';

	const expireAt = toTime(quiz.expireAt);
	if (expireAt !== null && expireAt <= now) return 'expired';

	const activateAt = toTime(quiz.activateAt);
	if (activateAt !== null && activateAt > now) return 'scheduled';

	return 'active';
}

/**
 * Validate an activation window. Returns an error message or null when valid.
 * `expireAt` must be strictly after `activateAt` so a quiz cannot be scheduled
 * into a window that is already expired (or never opens).
 */
export function validateSchedule(
	activateAt: Date | string | number | null | undefined,
	expireAt: Date | string | number | null | undefined
): string | null {
	const start = toTime(activateAt);
	const end = toTime(expireAt);
	if (start !== null && end !== null && end <= start) {
		return 'Expiration date must be after the activation date';
	}
	return null;
}

export const QUIZ_STATUS_LABELS: Record<EffectiveQuizStatus, string> = {
	draft: 'Draft',
	scheduled: 'Scheduled',
	active: 'Active',
	expired: 'Expired',
	archived: 'Archived'
};
