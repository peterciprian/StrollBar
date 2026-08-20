# StrollBar Workspace

StrollBar is a gamified city-tour app: users follow curated walking "strolls," solve
riddles station by station, and unlock achievements. The workspace is an npm-workspaces
monorepo with two apps:

- `stroll-bar-frontend` — Angular 22 + Angular Material client (tour browser, active
  adventure/navigation view, admin tour & station management, user dashboard, and an
  account settings page). Supports Hungarian (default) and English via `@ngx-translate`.
- `stroll-bar-backend` — NestJS 11 API (auth, strolls, stages, adventures, achievements,
  media uploads) backed by PostgreSQL and S3-compatible object storage.

## Deployments

- **Frontend**: auto-deployed to GitHub Pages on every push to `master` via
  [.github/workflows/gh-pages.yml](.github/workflows/gh-pages.yml).
  Live at `https://peterciprian.github.io/StrollBar/`. Uses hash-based routing
  (`withHashLocation()`) since GitHub Pages is static hosting only.
- **Backend**: deployed to [Render](https://render.com) using the
  [render.yaml](render.yaml) Blueprint (Node web service, free plan). Connect the repo
  in the Render dashboard as a Blueprint instance and fill in the secret env vars
  (DB credentials, S3 keys) there — they are intentionally left out of `render.yaml`.
  Once deployed, Swagger UI is at `https://https://stroll-bar-n5zc.onrender.com/v1/docs`.
- **CI**: [.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml) builds the
  backend and runs its unit + e2e tests (against a throwaway Postgres service container)
  on every push to `master`.

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

Backend development defaults to PostgreSQL via [stroll-bar-backend/.env.development](stroll-bar-backend/.env.development).
This file (and every other `.env*` file except `.env.example`) is gitignored — never commit
real credentials to it.

Expected local database settings (if you point `.env.development` at a local DB instead of
a hosted one):

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
5. Keep [stroll-bar-backend/.env.development](stroll-bar-backend/.env.development) aligned with those values, or update the file if you choose different credentials
6. Run migrations from the workspace root:

`npm run db:migrate`

### Backend startup sequence

Once PostgreSQL is up and migrations are applied:

1. `npm run start:backend`
2. Open `http://localhost:3000/v1/health`
3. Open `http://localhost:3000/v1/docs`

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
