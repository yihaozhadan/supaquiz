import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession, verifySession, deleteSession } from './auth';
import type { Cookies } from '@sveltejs/kit';

// Mock environment variables
process.env.SESSION_SECRET = 'test-secret-key-for-testing';

describe('Session Helpers', () => {
	let mockCookies: any;

	beforeEach(() => {
		mockCookies = {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn()
		};
	});

	describe('createSession', () => {
		it('should create a session cookie with valid JWT', async () => {
			await createSession('testuser', mockCookies);

			expect(mockCookies.set).toHaveBeenCalledWith(
				'admin_session',
				expect.any(String),
				expect.objectContaining({
					httpOnly: true,
					path: '/admin',
					sameSite: 'lax'
				})
			);
		});

		it('should set cookie with correct expiry', async () => {
			await createSession('testuser', mockCookies);

			expect(mockCookies.set).toHaveBeenCalledWith(
				'admin_session',
				expect.any(String),
				expect.objectContaining({
					maxAge: 24 * 60 * 60 // 24 hours in seconds
				})
			);
		});
	});

	describe('verifySession', () => {
		it('should return null when no session cookie exists', async () => {
			mockCookies.get.mockReturnValue(undefined);

			const result = await verifySession(mockCookies);

			expect(result).toBeNull();
		});

		it('should return null for invalid token', async () => {
			mockCookies.get.mockReturnValue('invalid-token');

			const result = await verifySession(mockCookies);

			expect(result).toBeNull();
		});

		it('should return null for malformed token', async () => {
			mockCookies.get.mockReturnValue('not-a-jwt');

			const result = await verifySession(mockCookies);

			expect(result).toBeNull();
		});
	});

	describe('deleteSession', () => {
		it('should delete the session cookie', () => {
			deleteSession(mockCookies);

			expect(mockCookies.delete).toHaveBeenCalledWith('admin_session', {
				path: '/admin'
			});
		});
	});
});
