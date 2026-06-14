import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && ./scripts/preview-test.sh', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}'
});
