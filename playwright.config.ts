import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && ./scripts/preview-e2e.sh',
		port: 4173,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI,
		env: {
			DATABASE_URL: './data/supaquiz-test.db',
			ADMIN_USER: 'admin',
			ADMIN_PASS_HASH: 'JGFyZ29uMmlkJHY9MTkkbT02NTUzNix0PTMscD00JEI1NkdoMHVNVUQ2dnQ2Z0hOcGtWRUEkWEZRV3RqdFg2YkV6ejJHclZ2SHpYVWRXWmd3Qk5XbzQrVHR1SnlReTEzUQ==',
			SESSION_SECRET: 'test-secret-key-for-e2e-testing',
			PORT: '4173',
			DATA_DIR: './data',
			MAX_FILE_SIZE: '52428800'
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});
