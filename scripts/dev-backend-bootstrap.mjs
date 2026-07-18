import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

const ROOT = process.cwd();
const POSTGRES_HOST = '127.0.0.1';
const POSTGRES_PORT = 5432;
const CONTAINER_NAME = 'strollbar-postgres';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: options.stdio ?? 'inherit',
      shell: false,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}.\n${stderr || stdout}`));
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function commandExists(command, args) {
  try {
    await run(command, args, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function ensureDockerPostgres() {
  const hasDocker = await commandExists('docker', ['version', '--format', '{{.Server.Version}}']);

  if (!hasDocker) {
    throw new Error(
      'PostgreSQL is not reachable on 127.0.0.1:5432 and Docker is not installed.\n' +
      'Install PostgreSQL locally or install Docker Desktop, then rerun `npm run dev:backend:bootstrap`.'
    );
  }

  console.log('Starting PostgreSQL container...');
  await run('docker', ['compose', '-f', 'docker-compose.postgres.yml', 'up', '-d']);

  console.log('Waiting for PostgreSQL container health...');
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const result = await run('docker', ['inspect', '-f', '{{.State.Health.Status}}', CONTAINER_NAME], { stdio: 'pipe' });
      const status = result.stdout.trim();

      if (status === 'healthy') {
        console.log('PostgreSQL container is healthy.');
        return;
      }
    } catch {
      // Container may not be ready for inspect yet.
    }

    await wait(2000);
  }

  throw new Error('PostgreSQL container did not become healthy in time. Check `npm run db:logs`.');
}

async function ensurePostgres() {
  const reachable = await isPortOpen(POSTGRES_HOST, POSTGRES_PORT);

  if (reachable) {
    console.log('PostgreSQL is already reachable on 127.0.0.1:5432.');
    return;
  }

  await ensureDockerPostgres();

  const readyAfterDocker = await isPortOpen(POSTGRES_HOST, POSTGRES_PORT);
  if (!readyAfterDocker) {
    throw new Error('PostgreSQL is still not reachable after starting Docker container.');
  }
}

async function main() {
  await ensurePostgres();

  console.log('Running database migrations...');
  await run('npm', ['run', 'db:migrate']);

  console.log('Starting backend in watch mode...');
  const backend = spawn('npm', ['run', 'start:backend'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  backend.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
