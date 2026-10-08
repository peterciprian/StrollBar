import { expect, test } from './fixtures';

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
		await page.goto('auth/register');
		await page.getByLabel(/felhasználónév/i).fill('browser-walker');
		await page.getByLabel(/e-mail/i).fill('browser-walker@example.com');
		await page.getByLabel(/jelszó/i).fill('password123');
		await page.getByLabel(/jelszó/i).blur();
		await expect(page.getByText(/ez a jelszó túl gyakori/i)).toBeVisible();
		await page.getByLabel(/jelszó/i).fill('StrollBrowser!2026');
		await expect(page.getByRole('button', { name: /regisztráció/i })).toBeEnabled();
	});

	test('public stroll browser renders and supports search', async ({ page }) => {
		await page.goto('explore');
		const search = page.getByRole('textbox', { name: /túrák és kerületek keresése/i });
		await expect(search).toBeVisible();
		await search.fill('Budapest');
		await expect(search).toHaveValue('Budapest');
	});

	test('home stroll card opens that stroll selected in explore', async ({ page }) => {
		await page.route('**/v1/strolls*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'success',
					data: {
						items: [{
							id: '00000000-0000-4000-8000-000000000001',
							name: 'E2E Featured Walk',
							authorId: 'e2e-author',
							labels: [],
							description: 'Featured stroll for an isolated browser test.',
							publicityFlag: 'public',
							length: 2.5,
							stageCount: 3,
							ratingAverage: 0,
							ratingCount: 0
						}],
						page: 1,
						limit: 3,
						total: 1
					},
					meta: { requestId: 'e2e', timestamp: new Date().toISOString(), version: 'v2' }
				})
			});
		});
		await page.route('**/v1/strolls/*/reviews', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'success',
					data: { items: [], ratingAverage: 0, ratingCount: 0 },
					meta: { requestId: 'e2e', timestamp: new Date().toISOString(), version: 'v2' }
				})
			});
		});
		await page.goto('./');
		const card = page.locator('app-stroll-card').first();
		await expect(card).toBeVisible();
		const strollName = await card.locator('.stroll-card__title').innerText();
		await card.locator('.stroll-card').click();

		await expect(page).toHaveURL(/\/explore\?strollId=[^&]+/);
		await expect(page.locator('.stroll-browser__right h1')).toHaveText(strollName);
	});
});
