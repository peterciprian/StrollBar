const liveApiHost = 'stroll-bar-n5zc.onrender.com';
const localApiOrigin = 'http://127.0.0.1:3001';
const originalFetch = globalThis.fetch.bind(globalThis);

function responseFor(data) {
	return new Response(JSON.stringify({
		status: 'success',
		data,
		meta: { requestId: 'e2e-ssr', timestamp: new Date().toISOString(), version: 'v2' }
	}), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}

globalThis.fetch = async (input, init) => {
	const request = input instanceof Request ? input : null;
	const url = new URL(request?.url ?? input);
	const method = request?.method ?? init?.method ?? 'GET';
	if (url.hostname === liveApiHost && url.pathname.startsWith('/v1/')) {
		if (method === 'GET' && url.pathname === '/v1/strolls') {
			return responseFor({
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
			});
		}
		if (method === 'GET' && /\/v1\/strolls\/[^/]+\/reviews$/.test(url.pathname)) {
			return responseFor({ items: [], ratingAverage: 0, ratingCount: 0 });
		}
		const localUrl = `${localApiOrigin}${url.pathname}${url.search}`;
		return originalFetch(new Request(localUrl, request ?? init));
	}
	if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '::1') {
		return originalFetch(input, init);
	}
	throw new Error(`Blocked external SSR network request in E2E: ${url.origin}${url.pathname}`);
};
