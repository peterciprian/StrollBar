import { expect, test } from './fixtures';
import type { APIRequestContext, Page } from '@playwright/test';

const apiOrigin = 'http://127.0.0.1:3001';
const harnessOrigin = 'http://127.0.0.1:3101';
const password = 'StrollE2E!2026';

type TestAccount = { email: string; password: string };
type ApiEnvelope<T> = { data: T };
type AdventureDetail = {
	adventure: { id: string; progressStatus: string };
	currentStage: { id: string; name: string; hasRiddle?: boolean; riddleAnswer?: string } | null;
};

async function createAccount(request: APIRequestContext): Promise<TestAccount> {
	const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const account = { email: `creator-traveller-${suffix}@example.test`, password };
	const response = await request.post(`${harnessOrigin}/__e2e/account`, { data: account });
	expect(response.status()).toBe(201);
	return account;
}

async function selectOption(page: Page, label: string, option: string): Promise<void> {
	await page.getByLabel(label).click();
	await page.getByRole('option', { name: option, exact: true }).click();
}

async function responseData<T>(response: { json(): Promise<unknown> }): Promise<T> {
	return ((await response.json()) as ApiEnvelope<T>).data;
}

test.describe('QA-01 free creator-to-traveller journey', () => {
	test('creates, publishes, discovers, unlocks, solves and completes a stroll', async ({ page, request }) => {
		const account = await createAccount(request);
		await page.addInitScript(() => localStorage.setItem('strollbar-language', 'en'));

		await page.goto('auth/login');
		await page.locator('input[autocomplete="email"]').fill(account.email);
		await page.locator('input[autocomplete="current-password"]').fill(account.password);
		await page.locator('form button[type="submit"]').click();
		await expect.poll(() => page.evaluate(() => localStorage.getItem('strollbar_access_token'))).not.toBeNull();
		const accessToken = await page.evaluate(() => localStorage.getItem('strollbar_access_token'));
		if (!accessToken) throw new Error('The creator test account did not receive an access token after login.');

		const strollName = `QA-01 Walk ${Date.now()}`;
		await page.goto('creator/strolls/new');
		await page.getByLabel('Stroll Name').fill(strollName);
		await page.getByLabel('Description').fill('A free browser journey with two answerable stages.');
		await selectOption(page, 'Visibility', 'Public');
		await selectOption(page, 'Status', 'Published');
		await page.getByRole('button', { name: 'Create stroll' }).click();
		await expect(page.getByRole('alert')).toContainText('Add at least one stage.');

		await page.getByRole('button', { name: 'Add new stage' }).click();
		await page.getByLabel('Stage Title').fill('First riddle stop');
		await page.getByLabel('Street Address').fill('1 E2E Way');
		await page.getByLabel('Story / Description').fill('Optionally solve the first riddle.');
		await page.getByLabel('Correct Answer').fill('blue door');

		await page.getByRole('button', { name: 'Add new stage' }).click();
		await page.getByLabel('Stage Title').fill('Final riddle stop');
		await page.getByLabel('Street Address').fill('2 E2E Way');
		await page.getByLabel('Story / Description').fill('Optionally solve the final riddle.');
		await page.getByLabel('Correct Answer').fill('silver key');
		await page.locator('.stroll-editor-page__feedback').getByRole('button', { name: 'Save changes' }).click();
		await expect(page.locator('.stroll-editor-page__feedback')).toContainText('Changes saved.');

		await selectOption(page, 'Status', 'Published');
		await page.locator('.stroll-editor-page__feedback').getByRole('button', { name: 'Save changes' }).click();
		await expect(page.locator('.stroll-editor-page__feedback')).toContainText('Changes saved.');
		const strollId = page.url().match(/\/creator\/strolls\/([^/?]+)/)?.[1];
		expect(strollId).toBeTruthy();

		await page.goto('explore');
		const strollCard = page.locator('app-stroll-card').filter({ hasText: strollName });
		await expect(strollCard).toBeVisible();
		await strollCard.locator('.stroll-card').click();
		await expect(page.locator('.stroll-browser__right h1')).toHaveText(strollName);
		await page.getByRole('button', { name: /start adventure/i }).click();
		await expect(page.getByText('No payment will be processed and no card will be charged.')).toBeVisible();
		await page.getByRole('button', { name: 'Mock payment and start' }).click();

		await expect(page).toHaveURL(/\/adventure\/[^/]+$/);
		await expect(page.locator('.adventure__header h1')).toHaveText('First riddle stop');
		const adventureId = page.url().match(/\/adventure\/([^/]+)$/)?.[1];
		expect(adventureId).toBeTruthy();

		const headers = { Authorization: `Bearer ${accessToken}` };
		const nextStage = await request.post(`${apiOrigin}/v1/adventures/${adventureId}/navigate`, {
			headers,
			data: { direction: 'next' }
		});
		expect(nextStage.ok()).toBe(true);

		const afterNavigation = await request.get(`${apiOrigin}/v1/adventures/${adventureId}`, { headers });
		expect(afterNavigation.status()).toBe(200);
		const advancedDetail = await responseData<AdventureDetail>(afterNavigation);
		expect(advancedDetail.currentStage?.name).toBe('Final riddle stop');
		expect(advancedDetail.currentStage?.hasRiddle).toBe(true);
		expect(advancedDetail.currentStage).not.toHaveProperty('riddleAnswer');

		const previousStage = await request.post(`${apiOrigin}/v1/adventures/${adventureId}/navigate`, {
			headers,
			data: { direction: 'previous' }
		});
		expect(previousStage.ok()).toBe(true);

		const backAtRiddle = await request.get(`${apiOrigin}/v1/adventures/${adventureId}`, { headers });
		expect(backAtRiddle.status()).toBe(200);
		const restoredDetail = await responseData<AdventureDetail>(backAtRiddle);
		expect(restoredDetail.currentStage?.name).toBe('First riddle stop');
		expect(restoredDetail.currentStage?.hasRiddle).toBe(true);
		expect(restoredDetail.currentStage).not.toHaveProperty('riddleAnswer');

		await page.reload();
		await expect(page.locator('.adventure__header h1')).toHaveText('First riddle stop');

		await page.getByLabel('Your answer').fill('not the answer');
		await page.getByRole('button', { name: /submit answer/i }).click();
		await expect(page.locator('.adventure__feedback')).toContainText("That's not quite right");
		await expect(page.locator('.adventure__header h1')).toHaveText('First riddle stop');

		await page.getByLabel('Your answer').fill('blue door');
		await page.getByRole('button', { name: /submit answer/i }).click();
		await expect(page.locator('.adventure__header h1')).toHaveText('Final riddle stop');
		await page.getByLabel('Your answer').fill('silver key');
		await page.getByRole('button', { name: /submit answer/i }).click();
		await expect(page).toHaveURL(/\/adventure\/[^/]+\/result$/);

		const completed = await request.get(`${apiOrigin}/v1/adventures/${adventureId}`, { headers });
		expect(completed.status()).toBe(200);
		const completedDetail = await responseData<AdventureDetail>(completed);
		expect(completedDetail.adventure.progressStatus).toBe('completed');
	});
});
