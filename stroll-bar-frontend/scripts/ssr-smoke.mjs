import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT ?? 4310);
const serverUrl = `http://localhost:${port}`;
const routes = ['/', '/explore', '/privacy-policy', '/terms-of-service'];
const serverEntry = fileURLToPath(new URL('../dist/strollbar-frontend/server/server.mjs', import.meta.url));

const server = spawn(process.execPath, [serverEntry], {
	stdio: ['ignore', 'pipe', 'pipe'],
	env: {
		...process.env,
		PORT: String(port),
		NG_ALLOWED_HOSTS: process.env.NG_ALLOWED_HOSTS ?? 'localhost'
	}
});

let output = '';
server.stdout.on('data', (chunk) => {
	output += chunk.toString();
});
server.stderr.on('data', (chunk) => {
	output += chunk.toString();
});

async function waitForServer() {
	const deadline = Date.now() + 30000;
	let lastError;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(serverUrl, { headers: { Host: `localhost:${port}` } });
			if (response.ok) return;
			lastError = new Error(`Server responded with ${response.status}.`);
		} catch (error) {
			lastError = error;
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw lastError ?? new Error('SSR server did not become ready.');
}

try {
	await waitForServer();

	for (const route of routes) {
		const response = await fetch(`${serverUrl}${route}`, { headers: { Host: `localhost:${port}` } });
		if (!response.ok) {
			throw new Error(`${route} returned ${response.status}.`);
		}

		const html = await response.text();
		if (!html.includes('<app-root')) {
			throw new Error(`${route} did not render the Angular app shell.`);
		}
	}

	console.log(`SSR smoke passed for ${routes.join(', ')}.`);
} catch (error) {
	console.error(output);
	console.error(error);
	process.exitCode = 1;
} finally {
	server.kill();
}
