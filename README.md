# StrollBar Workspace

## Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL 16+ for local backend development

Recommended local path:
- Docker Desktop with Docker Compose support

## Install
Run from workspace root:

npm install --workspaces

## Run backend

npm run start:backend

Backend starts on http://localhost:3000 with API prefix /v1.
Health endpoint: http://localhost:3000/v1/health

## Local PostgreSQL

Backend development now defaults to PostgreSQL via [backend/.env.development](backend/.env.development).

Expected local database settings:

- host: `127.0.0.1`
- port: `5432`
- database: `strollbar`
- username: `postgres`
- password: `postgres`

### Option A: Docker

Start PostgreSQL from the workspace root:

`npm run db:up`

Watch the database logs until it is healthy:

`npm run db:logs`

Run backend migrations:

`npm run db:migrate`

If you need to stop the container:

`npm run db:down`

If you need a clean database reset:

`npm run db:reset`

Then bring it back up and re-run migrations:

`npm run db:up`

`npm run db:migrate`

Equivalent raw Docker command if you prefer:

docker compose -f docker-compose.postgres.yml up -d

### Option B: Native PostgreSQL install

If you install PostgreSQL directly on Windows:

1. Install PostgreSQL 16+
2. Create a database named `strollbar`
3. Ensure a role/user exists:
	- username: `postgres`
	- password: `postgres`
4. Ensure PostgreSQL is listening on `127.0.0.1:5432`
5. Keep [backend/.env.development](backend/.env.development) aligned with those values, or update the file if you choose different credentials
6. Run migrations from the workspace root:

`npm run db:migrate`

### Backend startup sequence

Once PostgreSQL is up and migrations are applied:

1. `npm run start:backend`
2. Open `http://localhost:3000/v1/health`
3. Open `http://localhost:3000/docs`

### One-command backend bootstrap

If PostgreSQL is already running locally, or Docker is installed and can start it for you, use:

`npm run dev:backend:bootstrap`

What it does:

1. checks whether PostgreSQL is reachable on `127.0.0.1:5432`
2. if not reachable, tries to start [docker-compose.postgres.yml](docker-compose.postgres.yml)
3. waits for the `strollbar-postgres` container to become healthy
4. runs backend migrations
5. starts the backend in watch mode

If neither native PostgreSQL nor Docker is available, the script exits with a clear error explaining what is missing.

### Expected health behavior

- `database.status` should report `up`
- `storage.status` will only report `up` once your S3-compatible storage env vars point to a reachable bucket

### Current environment note

This session could not execute the PostgreSQL bring-up itself because:

- `docker` is not installed in this environment
- `psql` is not installed in this environment
- no PostgreSQL server was reachable on `127.0.0.1:5432`

Verification result on this machine:

- `psql`: missing
- `docker`: missing
- PostgreSQL Windows service: missing
- port `5432`: closed

So the workspace is prepared for local PostgreSQL, but you still need to start the actual database on your machine.

## Media upload policy

Media presign requests are validated against env-configured MIME and file-size rules before the upload URL is issued.

Relevant backend env vars:

- `MEDIA_ALLOWED_IMAGE_MIME_TYPES`
- `MEDIA_ALLOWED_VIDEO_MIME_TYPES`
- `MEDIA_MAX_IMAGE_SIZE_BYTES`
- `MEDIA_MAX_VIDEO_SIZE_BYTES`
- `S3_PRESIGN_EXPIRES_SECONDS`

## Run frontend

npm run start:frontend

Frontend starts on Angular dev server (default http://localhost:4200).

## Build

npm run build:backend
npm run build:frontend
