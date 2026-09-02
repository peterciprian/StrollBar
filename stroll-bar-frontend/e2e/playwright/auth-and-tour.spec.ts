import { expect, test } from '@playwright/test';

test.describe('critical browser flows', () => {
	test('registration form enforces the password policy', async ({ page }) => {
		await page.goto('/#/auth/register');
		await page.getByLabel(/username/i).fill('browser-walker');
		await page.getByLabel(/email/i).fill('browser-walker@example.com');
		await page.getByLabel(/password/i).fill('password123');
		await expect(page.getByRole('button', { name: /register/i })).toBeDisabled();
		await page.getByLabel(/password/i).fill('StrollBrowser!2026');
		await expect(page.getByRole('button', { name: /register/i })).toBeEnabled();
	});

	test('public tour browser renders and supports search', async ({ page }) => {
		await page.goto('/#/explore');
		await expect(page.getByRole('heading', { name: /explore/i })).toBeVisible();
		const search = page.getByRole('textbox').first();
		await search.fill('Budapest');
		await expect(search).toHaveValue('Budapest');
	});
});
