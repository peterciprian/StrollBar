import { createHash, randomBytes } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const api = 'http://127.0.0.1:3001/v1';
const harness = 'http://127.0.0.1:3101';
const frontend = 'http://127.0.0.1:4201';
const transactionKey = 'strollbar.socialTransaction';
const tokens = (page: Page) => page.evaluate(() => ({
	access: localStorage.getItem('strollbar_access_token'),
	refresh: localStorage.getItem('strollbar_refresh_token')
}));

async function prepareHandoff(request: APIRequestContext) {
	const verifier = randomBytes(32).toString('hex');
	const response = await request.get(`${api}/auth/social/google/start-url`, { params: {
		browserChallenge: createHash('sha256').update(verifier).digest('base64url'),
		redirectUri: `${frontend}/auth/social/callback`
	} });
	expect(response.ok()).toBe(true);
	const start = await response.json();
	const provider = await request.get(start.url, { maxRedirects: 0 });
	const callback = await request.get(provider.headers()['location'], { maxRedirects: 0 });
	const url = callback.headers()['location'];
	expect(url).not.toContain('accessToken');
	expect(url).not.toContain('refreshToken');
	return { url, verifier, transactionId: start.transactionId as string };
}

async function seedExistingSession(page: Page, request: APIRequestContext) {
	const email = `sec05-${randomBytes(8).toString('hex')}@example.test`;
	const password = 'BrowserSession!2026';
	expect((await request.post(`${harness}/__e2e/account`, { data: { email, password } })).ok()).toBe(true);
	const response = await request.post(`${api}/auth/login`, { data: { email, password } });
	expect(response.ok()).toBe(true);
	const session = await response.json();
	await page.evaluate((session) => {
		localStorage.setItem('strollbar_access_token', session.accessToken);
		localStorage.setItem('strollbar_refresh_token', session.refreshToken);
	}, session);
	return tokens(page);
}

test.describe('SEC-05 social handoff (real API/database, local provider proof)', () => {
	test('legitimate browser initiation installs credentials once; replay preserves the installed session', async ({ page }) => {
		await page.route(`${harness}/__e2e/social/authorize**`, (route) => route.continue());
		await page.route(`${api}/auth/social/google/callback**`, (route) => route.continue());
		await page.goto('auth/login?returnUrl=%2Fexplore');
		await expect(page.locator('app-login-page')).toBeVisible();
		await page.waitForFunction(() => {
			const element = document.querySelector('app-login-page');
			const debug = (window as unknown as { ng?: { getComponent(element: Element): unknown } }).ng;
			return !!element && !!debug?.getComponent(element);
		});
		const callback = page.waitForResponse((response) => response.url().startsWith(`${api}/auth/social/google/callback`));
		const exchange = page.waitForResponse((response) => response.url().includes('/auth/social/exchange'));
		// Social buttons are intentionally hidden in the current UI. Invoke their existing handler
		// via Angular's development-only debug API; no production test hook or provider credentials.
		await page.evaluate(() => {
			const debug = (window as unknown as {
				ng: { getComponent(element: Element): { onSocialLogin(provider: string): void } };
			}).ng;
			debug.getComponent(document.querySelector('app-login-page')!).onSocialLogin('google');
		});
		const callbackUrl = (await callback).headers()['location'];
		expect((await exchange).status()).toBe(201);
		await expect(page).toHaveURL(/\/explore$/);
		const installed = await tokens(page);
		expect(installed.access).toBeTruthy();
		expect(await page.evaluate((key) => sessionStorage.getItem(key), transactionKey)).toBeNull();
		await page.goto(callbackUrl);
		await expect(page).toHaveURL(/\/auth\/login$/);
		expect(await tokens(page)).toEqual(installed);
	});

	for (const authenticated of [false, true]) {
		test(`attacker-prepared legacy and handoff URLs cannot install credentials (${authenticated ? 'existing session' : 'fresh browser'})`, async ({ page, request }) => {
			await page.goto('auth/login');
			const before = authenticated ? await seedExistingSession(page, request) : await tokens(page);
			let exchanges = 0;
			page.on('request', (request) => { if (request.url().includes('/auth/social/exchange')) exchanges++; });
			const attacker = await prepareHandoff(request);
			for (const url of [
				`${frontend}/auth/social/callback?accessToken=attacker&refreshToken=attacker`,
				attacker.url,
				`${frontend}/auth/social/callback?code=${'a'.repeat(64)}`
			]) {
				await page.goto(url);
				await expect(page).toHaveURL(/\/auth\/login$/);
				expect(await tokens(page)).toEqual(before);
			}
			expect(exchanges).toBe(0);
		});
	}

	for (const failure of ['wrong-browser', 'expired', 'replayed'] as const) {
		test(`${failure} exchange preserves existing credentials, including HTTP 401 handling`, async ({ page, request }) => {
			await page.goto('auth/login');
			const before = await seedExistingSession(page, request);
			const flow = await prepareHandoff(request);
			if (failure === 'expired') {
				expect((await request.post(`${harness}/__e2e/social/expire`, { data: { transactionId: flow.transactionId } })).ok()).toBe(true);
			}
			if (failure === 'replayed') {
				const code = new URL(flow.url).searchParams.get('code');
				expect((await request.post(`${api}/auth/social/exchange`, {
					data: { code, transactionId: flow.transactionId, verifier: flow.verifier }
				})).status()).toBe(201);
			}
			await page.evaluate(({ flow, transactionKey, failure }) => {
				sessionStorage.setItem(transactionKey, JSON.stringify({
					transactionId: flow.transactionId, expiresAt: Date.now() + 60_000, returnUrl: '/explore',
					verifier: failure === 'wrong-browser' ? 'f'.repeat(64) : flow.verifier
				}));
			}, { flow, transactionKey, failure });
			const exchange = page.waitForResponse((response) => response.url().includes('/auth/social/exchange'));
			await page.goto(flow.url);
			expect((await exchange).status()).toBe(401);
			await expect(page).toHaveURL(/\/auth\/login$/);
			expect(await tokens(page)).toEqual(before);
		});
	}
});
