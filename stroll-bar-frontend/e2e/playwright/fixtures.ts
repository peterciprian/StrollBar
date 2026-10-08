import { test as base, expect } from '@playwright/test';

const frontendOrigin = 'http://127.0.0.1:4201';

export const test = base.extend({
	page: async ({ page }, use) => {
		await page.route('**/*', async (route) => {
			const url = new URL(route.request().url());
			if (url.hostname === 'stroll-bar-n5zc.onrender.com' && url.pathname.startsWith('/v1/')) {
				await route.fetch({
					url: `http://127.0.0.1:3001${url.pathname}${url.search}`
				}).then((response) => route.fulfill({ response }));
				return;
			}
			if (url.origin === frontendOrigin) {
				await route.continue();
				return;
			}
			await route.abort('blockedbyclient');
		});
		await use(page);
	}
});

export { expect };
