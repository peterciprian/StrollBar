import { expect, test } from './fixtures';
import type { APIRequestContext, Page, Request } from '@playwright/test';

const frontendOrigin = 'http://127.0.0.1:4201';
const harnessOrigin = 'http://127.0.0.1:3101';
const originalPassword = 'OldPassword!2026';
const replacementPassword = 'RecoveredPassword!2026';
const mailboxResponse = (request: APIRequestContext, email: string) =>
	request.get(`${harnessOrigin}/__e2e/mailbox?email=${encodeURIComponent(email)}`);

type TestAccount = { email: string; password: string };
type CapturedResetEmail = { subject: string; textContent: string; htmlContent: string };

async function createAccount(request: APIRequestContext): Promise<TestAccount> {
	const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const account = { email: `password-reset-${suffix}@example.test`, password: originalPassword };
	const response = await request.post(`${harnessOrigin}/__e2e/account`, { data: account });
	expect(response.status(), await response.text()).toBe(201);
	return account;
}

async function login(page: Page, account: TestAccount, password = account.password): Promise<void> {
	await page.goto('auth/login');
	await page.locator('input[autocomplete="email"]').fill(account.email);
	await page.locator('input[autocomplete="current-password"]').fill(password);
	await page.locator('form button[type="submit"]').click();
	await expect.poll(() => page.evaluate(() => localStorage.getItem('strollbar_access_token'))).not.toBeNull();
	await page.goto('auth/login');
}

async function submitResetRequest(page: Page, email: string): Promise<void> {
	await page.getByTestId('forgot-password-email').locator('input').fill(email);
	await page.getByTestId('forgot-password-submit').locator('button').click();
	await expect(page.getByTestId('forgot-password-sent-title')).toBeVisible();
}

async function waitForResetEmail(request: APIRequestContext, email: string): Promise<CapturedResetEmail> {
	let status = 0;
	await expect.poll(async () => {
		const response = await mailboxResponse(request, email);
		status = response.status();
		return status;
	}, { timeout: 10_000 }).toBe(200);
	const response = await mailboxResponse(request, email);
	return (await response.json()) as CapturedResetEmail;
}

test.describe('password reset browser integration', () => {
	test('logs in, resets from a captured email link, invalidates sessions and replays safely', async ({ page, request }) => {
		const account = await createAccount(request);
		let refreshRequests = 0;
		const resetAuthorizationHeaders: (string | undefined)[] = [];
		page.on('request', (browserRequest: Request) => {
			const url = new URL(browserRequest.url());
			if (url.pathname.endsWith('/auth/refresh')) refreshRequests += 1;
			if (url.pathname.endsWith('/auth/password-reset/confirm')) {
				void browserRequest.allHeaders().then((headers) => resetAuthorizationHeaders.push(headers.authorization));
			}
		});

		await login(page, account);
		await expect(page.getByTestId('login-forgot-password-link')).toBeVisible();
		await expect.poll(() => page.evaluate(() => localStorage.getItem('strollbar_access_token'))).not.toBeNull();

		await page.goto('auth/reset-password');
		await expect(page.getByTestId('reset-password-missing')).toBeVisible();
		await page.goto('auth/reset-password?token=malformed');
		await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
		await page.goto(`auth/reset-password?token=${'f'.repeat(64)}`);
		await expect(page.getByTestId('reset-password-form')).toBeVisible();
		await page.getByTestId('reset-password-new').locator('input').fill(replacementPassword);
		await page.getByTestId('reset-password-confirm').locator('input').fill(replacementPassword);
		await page.getByTestId('reset-password-submit').locator('button').click();
		await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
		expect(resetAuthorizationHeaders).toEqual([undefined]);
		expect(refreshRequests).toBe(0);

		await page.getByTestId('reset-password-request-new-link').click();
		await expect(page.getByTestId('forgot-password-title')).toBeVisible();
		await submitResetRequest(page, account.email);
		const capturedEmail = await waitForResetEmail(request, account.email);
		const resetLink = capturedEmail.textContent.match(/https?:\/\/\S+/)?.[0];
		expect(resetLink).toBeTruthy();
		const link = new URL(resetLink!);
		expect(link.pathname).toBe('/auth/reset-password');
		expect(link.searchParams.get('token')).toMatch(/^[a-f0-9]{64}$/);
		expect(capturedEmail.htmlContent).toContain(`href="${resetLink}"`);

		await page.goto(resetLink!);
		await expect(page.getByTestId('reset-password-form')).toBeVisible();
		await expect(page).toHaveURL(`${frontendOrigin}/auth/reset-password`);
		expect(page.url()).not.toMatch(/[?&]token=|#.*token=/);

		await page.getByTestId('reset-password-new').locator('input').fill(replacementPassword);
		await page.getByTestId('reset-password-confirm').locator('input').fill('DifferentPassword!2026');
		await page.getByTestId('reset-password-submit').locator('button').click();
		await expect(page.getByTestId('reset-password-form')).toBeVisible();
		expect(resetAuthorizationHeaders).toHaveLength(1);

		await page.getByTestId('reset-password-confirm').locator('input').fill(replacementPassword);
		await page.getByTestId('reset-password-submit').locator('button').click();
		await expect(page.getByTestId('reset-password-success-title')).toBeVisible();
		await expect.poll(() => page.evaluate(() => ({
			access: localStorage.getItem('strollbar_access_token'),
			refresh: localStorage.getItem('strollbar_refresh_token')
		}))).toEqual({ access: null, refresh: null });
		expect(refreshRequests).toBe(0);
		expect(resetAuthorizationHeaders).toEqual([undefined, undefined]);

		await page.getByTestId('reset-password-go-to-login').click();
		await page.locator('input[autocomplete="email"]').fill(account.email);
		await page.locator('input[autocomplete="current-password"]').fill(originalPassword);
		await page.locator('form button[type="submit"]').click();
		await expect(page.locator('app-login-page sb-alert')).toBeVisible();
		await expect.poll(() => page.evaluate(() => localStorage.getItem('strollbar_access_token'))).toBeNull();

		await page.locator('input[autocomplete="current-password"]').fill(replacementPassword);
		await page.locator('form button[type="submit"]').click();
		await expect.poll(() => page.evaluate(() => localStorage.getItem('strollbar_access_token'))).not.toBeNull();

		await page.goto(resetLink!);
		await expect(page.getByTestId('reset-password-form')).toBeVisible();
		await page.getByTestId('reset-password-new').locator('input').fill('ReplayAttempt!2026');
		await page.getByTestId('reset-password-confirm').locator('input').fill('ReplayAttempt!2026');
		await page.getByTestId('reset-password-submit').locator('button').click();
		await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
		expect(refreshRequests).toBe(0);
		expect(resetAuthorizationHeaders).toEqual([undefined, undefined, undefined]);
	});

	test('rejects an expired captured link and offers the request-new path', async ({ page, request }) => {
		const account = await createAccount(request);
		await login(page, account);
		await page.getByTestId('login-forgot-password-link').click();
		await submitResetRequest(page, account.email);
		const capturedEmail = await waitForResetEmail(request, account.email);
		const resetLink = capturedEmail.textContent.match(/https?:\/\/\S+/)?.[0];
		expect(resetLink).toBeTruthy();

		const expiration = await request.post(`${harnessOrigin}/__e2e/expire-reset`, { data: { email: account.email } });
		expect(expiration.status(), await expiration.text()).toBe(200);
		await page.goto(resetLink!);
		await expect(page.getByTestId('reset-password-form')).toBeVisible();
		await page.getByTestId('reset-password-new').locator('input').fill(replacementPassword);
		await page.getByTestId('reset-password-confirm').locator('input').fill(replacementPassword);
		await page.getByTestId('reset-password-submit').locator('button').click();
		await expect(page.getByTestId('reset-password-invalid')).toBeVisible();
		await expect(page.getByTestId('reset-password-request-new-link')).toBeVisible();
	});
});
