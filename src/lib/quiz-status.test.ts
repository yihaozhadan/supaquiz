import { describe, it, expect } from 'vitest';
import { getEffectiveStatus, validateSchedule } from './quiz-status';

const NOW = new Date('2026-06-15T12:00:00').getTime();
const FUTURE = new Date('2026-07-01T00:00:00');
const PAST = new Date('2026-05-01T00:00:00');

describe('getEffectiveStatus', () => {
	it('returns draft and archived regardless of the schedule', () => {
		expect(getEffectiveStatus({ status: 'draft', activateAt: FUTURE, expireAt: null }, NOW)).toBe(
			'draft'
		);
		expect(getEffectiveStatus({ status: 'archived', activateAt: null, expireAt: PAST }, NOW)).toBe(
			'archived'
		);
	});

	it('returns scheduled when a published quiz has a future activation date', () => {
		expect(getEffectiveStatus({ status: 'active', activateAt: FUTURE, expireAt: null }, NOW)).toBe(
			'scheduled'
		);
	});

	it('returns expired once the expiration date has passed', () => {
		expect(getEffectiveStatus({ status: 'active', activateAt: null, expireAt: PAST }, NOW)).toBe(
			'expired'
		);
	});

	it('returns active inside the activation window', () => {
		expect(getEffectiveStatus({ status: 'active', activateAt: PAST, expireAt: FUTURE }, NOW)).toBe(
			'active'
		);
		expect(getEffectiveStatus({ status: 'active', activateAt: null, expireAt: null }, NOW)).toBe(
			'active'
		);
	});

	it('keeps a stored expired status expired', () => {
		expect(getEffectiveStatus({ status: 'expired', activateAt: null, expireAt: null }, NOW)).toBe(
			'expired'
		);
	});

	it('treats a stored scheduled status like a published quiz', () => {
		expect(
			getEffectiveStatus({ status: 'scheduled', activateAt: FUTURE, expireAt: null }, NOW)
		).toBe('scheduled');
		expect(getEffectiveStatus({ status: 'scheduled', activateAt: PAST, expireAt: null }, NOW)).toBe(
			'active'
		);
	});

	it('accepts ISO strings for the dates', () => {
		expect(
			getEffectiveStatus(
				{ status: 'active', activateAt: FUTURE.toISOString(), expireAt: null },
				NOW
			)
		).toBe('scheduled');
	});
});

describe('validateSchedule', () => {
	it('accepts an empty or partial window', () => {
		expect(validateSchedule(null, null)).toBeNull();
		expect(validateSchedule(FUTURE, null)).toBeNull();
		expect(validateSchedule(null, FUTURE)).toBeNull();
	});

	it('accepts end after start', () => {
		expect(validateSchedule(PAST, FUTURE)).toBeNull();
	});

	it('rejects end before or equal to start', () => {
		expect(validateSchedule(FUTURE, PAST)).toBe(
			'Expiration date must be after the activation date'
		);
		expect(validateSchedule(FUTURE, FUTURE)).toBe(
			'Expiration date must be after the activation date'
		);
	});
});
