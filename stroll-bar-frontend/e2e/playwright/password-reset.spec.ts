import { expect, test } from './fixtures';
import type { APIRequestContext, Page, Request } from '@playwright/test';

const frontendOrigin = 'http://127.0.0.1:4201';
const harnessOrigin = 'http://127.0.0.1:3101';
const originalPassword = 'OldPassword!2026';
const replacementPassword = 'RecoveredPassword!2026';
const mailboxResponse = (request: APIRequestContext, email: string) =>
	request.get(`${harnessOrigin}/__e2e/mailbox?email=${encodeURIComponent(email)}`);

test.describe('password reset helper/error layout', () => {
	for (const width of [375, 1280]) {
		test(`keeps conditional text below outlines at ${width}px without a backend`, async ({ page }) => {
			test.setTimeout(45_000);
			await page.setViewportSize({ width, height: 900 });
			// Layout needs only the client and its translations, never the integration database.
			await page.route('**/*', async (route) => {
				const url = new URL(route.request().url());
				if (url.pathname.startsWith('/v1/')) {
					await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' });
				} else if (url.origin === new URL(page.url()).origin || ['127.0.0.1', 'localhost'].includes(url.hostname)) {
					await route.continue();
				} else {
					await route.abort('blockedbyclient');
				}
			});
			await page.goto(`auth/reset-password?token=${'a'.repeat(64)}`);
			const first = page.getByTestId('reset-password-new');
			const second = page.getByTestId('reset-password-confirm');
			const button = page.getByTestId('reset-password-submit').locator('button');
			await expect(first.locator('mat-hint')).toBeVisible();

			async function measure(id: string, messageSelector: string, nextSelector: string, state: string) {
				const field = page.getByTestId(id);
				await expect(field.locator(messageSelector)).toBeVisible();
				const geometry = await field.evaluate((host, { messageSelector, nextSelector }) => {
					const message = host.querySelector<HTMLElement>(messageSelector)!;
					const outline = host.querySelector<HTMLElement>('.mat-mdc-text-field-wrapper')!;
					const next = document.querySelector<HTMLElement>(nextSelector)!;
					const rect = message.getBoundingClientRect();
					const style = getComputedStyle(message);
					const hostRect = host.getBoundingClientRect();
					return {
						outlineGap: rect.top - outline.getBoundingClientRect().bottom,
						nextGap: next.getBoundingClientRect().top - rect.bottom,
						textHeight: rect.height,
						lineHeight: parseFloat(style.lineHeight),
						fontSize: style.fontSize,
						color: style.color,
						danger: getComputedStyle(host).getPropertyValue('--sb-color-danger').trim(),
						insideSubscript: !!message.closest('.mat-mdc-form-field-subscript-wrapper'),
						insideInfix: !!message.closest('.mat-mdc-form-field-infix'),
						fitsHost: rect.left >= hostRect.left && rect.right <= hostRect.right && rect.bottom <= hostRect.bottom,
						overflow: document.documentElement.scrollWidth > window.innerWidth || message.scrollWidth > message.clientWidth
					};
				}, { messageSelector, nextSelector });
				console.log(JSON.stringify({ width, state, ...geometry }));
				expect(geometry.outlineGap).toBeGreaterThanOrEqual(4);
				expect(geometry.nextGap).toBeGreaterThanOrEqual(8);
				expect(geometry.fontSize).toBe('13px');
				expect(geometry.insideInfix).toBe(false);
				expect(geometry.insideSubscript).toBe(messageSelector === 'mat-hint');
				expect(geometry.fitsHost).toBe(true);
				expect(geometry.overflow).toBe(false);
				if (messageSelector === '[role="alert"]') {
					// Resolve the existing token in-browser, independent of hex/rgb token notation.
					const dangerColor = await field.evaluate((host) => {
						const probe = document.createElement('span');
						probe.style.color = 'var(--sb-color-danger)';
						host.append(probe);
						const color = getComputedStyle(probe).color;
						probe.remove();
						return color;
					});
					expect(geometry.color).toBe(dangerColor);
				}
				return geometry;
			}

			const nextField = '[data-testid="reset-password-confirm"] .mat-mdc-text-field-wrapper';
			const nextButton = '[data-testid="reset-password-submit"] button';
			const hint = await measure('reset-password-new', 'mat-hint', nextField, 'initial-hint');
			if (width === 375) expect(hint.textHeight).toBeGreaterThan(hint.lineHeight);
			await expect(page.locator('app-reset-password-page [role="alert"]')).toHaveCount(0);
			await button.click();
			await expect(first.locator('mat-hint')).toHaveCount(0);
			await measure('reset-password-new', '[role="alert"]', nextField, 'required');
			await measure('reset-password-confirm', '[role="alert"]', nextButton, 'confirm-required');

			for (const [password, state] of [['Sh0rt!', 'short'], ['alllowercase1!', 'complexity'], ['Password123!', 'common']]) {
				await first.locator('input').fill(password);
				await first.locator('input').blur();
				await expect(first.locator('mat-hint')).toHaveCount(0);
				await measure('reset-password-new', '[role="alert"]', nextField, state);
			}
			await first.locator('input').fill(replacementPassword);
			await second.locator('input').fill('DifferentPassword!2026');
			await second.locator('input').blur();
			await measure('reset-password-new', 'mat-hint', nextField, 'accepted-hint');
			await measure('reset-password-confirm', '[role="alert"]', nextButton, 'mismatch');
			await second.locator('input').fill(replacementPassword);
			await second.locator('input').blur();
			await expect(page.locator('app-reset-password-page [role="alert"]')).toHaveCount(0);
		});
	}
});

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
