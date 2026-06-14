import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SvelteKit's $env/dynamic/private module
vi.mock('$env/dynamic/private', () => ({
	env: {
		SESSION_SECRET: 'test-secret-key-for-testing',
		DATABASE_URL: ':memory:'
	}
}));
