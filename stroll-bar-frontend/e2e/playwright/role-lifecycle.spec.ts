import { expect, test } from './fixtures';
import type { APIRequestContext, Page } from '@playwright/test';

const api = 'http://127.0.0.1:3001/v1';
const harness = 'http://127.0.0.1:3101/__e2e';
const password = 'RoleLifecycle!2026';

async function account(request: APIRequestContext, role = 'simple', language = 'en') {
	const email = `role04-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
	const result = await request.post(`${harness}/account`, { data: { email, password, role, language } });
	expect(result.status()).toBe(201);
	return (await result.json()) as { id: string; email: string };
}

async function login(page: Page, email: string) {
	await page.addInitScript(() => localStorage.setItem('strollbar-language', 'en'));
	await page.goto('auth/login');
	await page.locator('input[autocomplete="email"]').fill(email);
	await page.locator('input[autocomplete="current-password"]').fill(password);
	await page.locator('form button[type="submit"]').click();
	await expect.poll(() => page.evaluate(() => localStorage.getItem('strollbar_access_token'))).not.toBeNull();
}

test('ROLE-04 grant, self Cancel, expiry, overlap and ADMIN separation', async ({ browser, page, request }) => {
	const admin = await account(request, 'admin');
	const walker = await account(request);
	await login(page, admin.email);
	// The API is used to establish an overlap; the grant dialog itself is exercised below.
	const adminToken = await page.evaluate(() => localStorage.getItem('strollbar_access_token'));
	const headers = { Authorization: `Bearer ${adminToken}`, Accept: 'application/vnd.strollbar.v2+json' };
	const creator = await request.post(`${api}/users/${walker.id}/paid-grants`, {
		headers,
		data: {
			plan: 'creator',
			startsAt: new Date(Date.now() - 60000).toISOString(),
			expiresAt: new Date(Date.now() + 7200000).toISOString(),
			reason: 'E2E overlap'
		}
	});
	expect(creator.status()).toBe(201);

	await page.goto('admin/user-list');
	const row = page.locator('tr').filter({ hasText: walker.email });
	await row.getByRole('button', { name: 'Manage paid plan' }).click();
	const dialog = page.locator('mat-dialog-container');
	await dialog.locator('select[name="plan"]').selectOption('premium');
	await dialog.locator('textarea[name="reason"]').fill('E2E premium grant');
	// Premium ends before Creator so Settings must name Creator, not Simple, as the next effective plan.
	const expiry = new Date(Date.now() + 3600000);
	const local = new Date(expiry.getTime() - expiry.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
	await dialog.locator('input[name="expiresAt"]').fill(local);
	await dialog.getByRole('button', { name: 'Grant plan', exact: true }).click();
	await expect(dialog).not.toBeVisible();
	const grantsResponse = await request.get(`${api}/users/${walker.id}/paid-grants`, { headers });
	const grants = (await grantsResponse.json()).data as { id: string; plan: string }[];
	const premium = grants.find((grant) => grant.plan === 'premium')!;

	const userContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4201/' });
	const userPage = await userContext.newPage();
	// Same external-network prohibition as the shared fixture.
	await userPage.route('**/*', async (route) => {
		const url = new URL(route.request().url());
		if (url.hostname === 'stroll-bar-n5zc.onrender.com' && url.pathname.startsWith('/v1/')) {
			await route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:3001${url.pathname}${url.search}` }) });
		} else if (url.origin === 'http://127.0.0.1:4201') await route.continue();
		else await route.abort('blockedbyclient');
	});
	try {
		await login(userPage, walker.email);
		await userPage.goto('settings/plan');
		await expect(userPage.locator('#plan-name')).toHaveText('Premium');
		await expect(userPage.locator('.plan-summary')).toContainText('CREATOR');
		await userPage
			.locator('.quota-section p')
			.filter({ hasText: 'Premium' })
			.getByRole('button', { name: 'Cancel at paid-through expiry' })
			.click();
		await expect(userPage.getByText('Cancelled — access remains until this expiry')).toBeVisible();
		await expect(userPage.locator('#plan-name')).toHaveText('Premium');
		const mail = await request.get(`${harness}/mailbox`, { params: { email: walker.email, kind: 'role' } });
		const cancellation = await mail.json();
		expect(cancellation.subject).toContain('cancelled');
		expect(cancellation.textContent).toContain('CREATOR');
		expect(cancellation.textContent).toContain('SIMPLE');
		expect(cancellation.textContent).toContain('retained');
		expect((await request.post(`${harness}/roles/expire`, { data: { grantId: premium.id } })).ok()).toBe(true);
		await userPage.reload();
		await expect(userPage.locator('#plan-name')).toHaveText('Creator');
		const expiryMail = await request.get(`${harness}/mailbox`, { params: { email: walker.email, kind: 'role' } });
		expect((await expiryMail.json()).subject).toContain('PREMIUM expired');

		await page.goto('admin/user-list');
		await row.getByRole('button', { name: 'Manage paid plan' }).click();
		await dialog.locator('textarea[name="revokeReason"]').fill('Immediate admin removal');
		await dialog.getByRole('button', { name: 'Revoke immediately', exact: true }).click();
		await expect(dialog).not.toBeVisible();
		await userPage.reload();
		await expect(userPage.locator('#plan-name')).toHaveText('Simple');

		// Expiring an admin's paid grant never removes the independent assignment.
		const adminGrant = await request.post(`${api}/users/${admin.id}/paid-grants`, {
			headers,
			data: {
				plan: 'premium',
				startsAt: new Date(Date.now() - 60000).toISOString(),
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				reason: 'ADMIN stays independent'
			}
		});
		const adminGrantId = (await adminGrant.json()).data.id as string;
		await request.post(`${harness}/roles/expire`, { data: { grantId: adminGrantId } });
		await page.goto('settings/plan');
		await expect(page.locator('#plan-name')).toHaveText('Admin');
	} finally {
		await userContext.close();
	}
});
