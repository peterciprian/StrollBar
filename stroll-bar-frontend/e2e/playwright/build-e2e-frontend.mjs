import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startLocalStack } from './start-local-stack.mjs';

const frontendDirectory = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const repositoryDirectory = resolve(frontendDirectory, '..');
const angularCli = resolve(repositoryDirectory, 'node_modules/@angular/cli/bin/ng.js');

export default async function buildE2EFrontend() {
	const result = spawnSync(process.execPath, [
		angularCli, 'build', '--configuration', 'development', '--base-href', '/'
	], { cwd: frontendDirectory, env: { ...process.env, CI: 'true' }, stdio: 'inherit', windowsHide: true });
	if (result.status !== 0) {
		throw new Error(`Angular E2E CSR build failed with exit code ${result.status}.`);
	}
	const shell = resolve(frontendDirectory, 'dist/strollbar-frontend/browser/index.csr.html');
	const server = resolve(frontendDirectory, 'dist/strollbar-frontend/server/server.mjs');
	if (!existsSync(shell) || !existsSync(server)) {
		throw new Error(`Angular E2E build must produce both browser and SSR outputs: ${shell}, ${server}.`);
	}
	return startLocalStack();
}
