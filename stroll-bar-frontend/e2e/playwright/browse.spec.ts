import { expect, test } from './fixtures';

const strolls = Array.from({ length: 45 }, (_, index) => ({
	id: `browse-${index + 1}`,
	name: `Walk ${index + 1}`,
	description: index === 44 ? 'A hidden BUDAPEST story' : 'A riverside walk',
	authorId: 'owner',
	labels: [],
	category: 'ENTERTAINMENT',
	length: 1,
	stageCount: 2,
	ratingAverage: 0,
	ratingCount: 0,
	publicityFlag: 'public'
}));

test.describe('PROD-04 browse search and numbered pages', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('**/v1/**', async (route) => {
			const url = new URL(route.request().url());
			let data: unknown;
			if (url.pathname === '/v1/strolls') {
				expect(url.searchParams.has('category')).toBe(false);
				const search = (url.searchParams.get('search') ?? '').toLowerCase();
				const matches = strolls.filter((stroll, index) =>
					[stroll.name, stroll.description, index === 43 ? 'Budapest, Castle Street' : ''].some((text) =>
						text.toLowerCase().includes(search)
					)
				);
				const current = Number(url.searchParams.get('page') ?? 1);
				const limit = Number(url.searchParams.get('limit') ?? 20);
				data = { items: matches.slice((current - 1) * limit, current * limit), page: current, limit, total: matches.length };
			} else if (url.pathname.endsWith('/reviews')) {
				data = { items: [], ratingAverage: 0, ratingCount: 0 };
			} else if (url.pathname === '/v1/strolls/off-page') {
				data = { stroll: { ...strolls[0], id: 'off-page', name: 'Selected off-page walk' }, stages: [] };
			} else {
				await route.abort();
				return;
			}
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'success',
					data,
					meta: { requestId: 'prod-04-e2e', timestamp: new Date().toISOString(), version: 'v2' }
				})
			});
		});
	});

	test('requests numbered/next/previous pages and keeps category filtering page-local', async ({ page }) => {
		await page.goto('explore');
		await expect(page.locator('app-stroll-card')).toHaveCount(20);
		const pagination = page.locator('.stroll-browser__pagination');
		await expect(pagination.locator('.stroll-browser__page')).toHaveText(['1', '2', '3']);
		await expect(pagination.locator('sb-button').first().getByRole('button')).toBeDisabled();
		await pagination.locator('.stroll-browser__page').filter({ hasText: /^3$/ }).click();
		await expect(page.locator('app-stroll-card')).toHaveCount(5);
		await expect(page.locator('.stroll-card__title').first()).toHaveText('Walk 41');
		await expect(pagination.locator('sb-button').last().getByRole('button')).toBeDisabled();
		await pagination.locator('sb-button').first().getByRole('button').click();
		await expect(page.locator('.stroll-card__title').first()).toHaveText('Walk 21');
		await pagination.locator('sb-button').last().getByRole('button').click();
		await expect(page.locator('.stroll-card__title').first()).toHaveText('Walk 41');
		await page.getByRole('radio').nth(2).click();
		await expect(pagination.locator('[aria-current="page"]')).toHaveText('1');
		await expect(page.locator('app-stroll-card')).toHaveCount(0);
		await expect(pagination.locator('.stroll-browser__page')).toHaveText(['1', '2', '3']);
		await expect(pagination.locator('.stroll-browser__page-summary')).toContainText('45');
	});

	test('searches beyond loaded results and shows server matches whose names do not contain the term', async ({ page }) => {
		await page.goto('explore');
		await expect(page.locator('.stroll-card__title').first()).toHaveText('Walk 1');
		const request = page.waitForRequest((call) => {
			const url = new URL(call.url());
			return url.pathname === '/v1/strolls' && url.searchParams.get('search') === 'bUdApEsT' && url.searchParams.get('page') === '1';
		});
		await page.locator('sb-search-field input').fill('bUdApEsT');
		await request;
		await expect(page.locator('.stroll-card__title')).toHaveText(['Walk 44', 'Walk 45']);
		await expect(page.locator('.stroll-browser__page')).toHaveText(['1']);
		await page.locator('sb-search-field input').fill('no matching text');
		await expect(page.locator('app-stroll-card')).toHaveCount(0);
		await expect(page.locator('.stroll-browser__page-summary')).toContainText('0');
	});

	test('preserves deep-linked off-page selection without injecting it into pages or totals', async ({ page }) => {
		await page.goto('explore?strollId=off-page');
		await expect(page.locator('.stroll-browser__right h1')).toHaveText('Selected off-page walk');
		await expect(page.locator('app-stroll-card')).toHaveCount(20);
		await expect(page.locator('.stroll-card__title')).not.toContainText(['Selected off-page walk']);
		await page.locator('.stroll-browser__page').filter({ hasText: /^2$/ }).click();
		await expect(page.locator('.stroll-card__title').first()).toHaveText('Walk 21');
		await expect(page.locator('.stroll-browser__right h1')).toHaveText('Selected off-page walk');
		await expect(page.locator('.stroll-browser__page-summary')).toContainText('45');
		await expect(page).toHaveURL(/strollId=off-page/);
	});
});
