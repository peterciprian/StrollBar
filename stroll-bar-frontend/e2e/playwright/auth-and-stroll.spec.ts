import { expect, test } from '@playwright/test';

test.describe('critical browser flows', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			window.grecaptcha = {
				ready: (callback: () => void) => callback(),
				execute: async () => 'playwright-recaptcha-token'
			};
		});
	});

	test('registration form enforces the password policy', async ({ page }) => {
		await page.goto('/auth/register');
		await page.getByLabel(/felhasználónév/i).fill('browser-walker');
		await page.getByLabel(/e-mail/i).fill('browser-walker@example.com');
		await page.getByLabel(/jelszó/i).fill('password123');
		await page.getByLabel(/jelszó/i).blur();
		await expect(page.getByText(/ez a jelszó túl gyakori/i)).toBeVisible();
		await page.getByLabel(/jelszó/i).fill('StrollBrowser!2026');
		await expect(page.getByRole('button', { name: /regisztráció/i })).toBeEnabled();
	});

	test('public stroll browser renders and supports search', async ({ page }) => {
		await page.goto('/explore');
		const search = page.getByRole('textbox', { name: /túrák és kerületek keresése/i });
		await expect(search).toBeVisible();
		await search.fill('Budapest');
		await expect(search).toHaveValue('Budapest');
	});

	test('home stroll card opens that stroll selected in explore', async ({ page }) => {
		await page.goto('/');
		const card = page.locator('app-stroll-card').first();
		await expect(card).toBeVisible();
		const strollName = await card.locator('.stroll-card__title').innerText();
		await card.locator('.stroll-card').click();

		await expect(page).toHaveURL(/\/explore\?strollId=[^&]+/);
		await expect(page.locator('.stroll-browser__right h1')).toHaveText(strollName);
	});
});
