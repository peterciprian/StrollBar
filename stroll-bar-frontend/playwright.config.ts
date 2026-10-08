import { defineConfig, devices } from '@playwright/test';

const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export default defineConfig({
	testDir: './e2e/playwright',
	fullyParallel: true,
	forbidOnly: !!environment['CI'],
	retries: environment['CI'] ? 2 : 0,
	reporter: environment['CI'] ? 'github' : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4201/',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	workers: 1,
	globalSetup: './e2e/playwright/build-e2e-frontend.mjs'
});
