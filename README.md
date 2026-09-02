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

The general API rate limit is 100 requests per minute per client by default and can be
changed with `API_RATE_LIMIT`. Authentication endpoints use stricter route-specific limits.

Production requires an explicitly managed `JWT_SECRET`; the backend has no fallback secret.
OAuth requests default to a 10-second timeout and three attempts. S3 requests default to a
30-second timeout and three attempts; these can be tuned with `OAUTH_REQUEST_TIMEOUT_MS`,
`OAUTH_REQUEST_RETRY_ATTEMPTS`, `S3_REQUEST_TIMEOUT_MS`, and `S3_RETRY_ATTEMPTS`.

The PostgreSQL pool defaults to a maximum of 50 connections, a minimum of 2 idle
connections, a 30-second idle timeout, a 10-second connection timeout, and a 30-second
statement timeout. Tune these with `DB_POOL_MAX`, `DB_POOL_MIN`,
`DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS`, and `DB_STATEMENT_TIMEOUT_MS`.

Set `REDIS_URL` to enable the distributed stroll-list cache. Public stroll listings use a
10-minute cache-aside TTL, fall back to PostgreSQL when Redis is unavailable, and are
invalidated after stroll writes. Cache reads and misses are counted for operational metrics.

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

## Verification email delivery

The backend sends verification links over SMTP after password registration and when an unverified user requests a resend. Configure:

- `EMAIL_DELIVERY_ENABLED=true`
- `EMAIL_VERIFICATION_URL`, for example `https://example.com/#/auth/verify-email`
- `SMTP_HOST` and `SMTP_PORT`
- `SMTP_SECURE=true` for implicit TLS (normally port 465), or `false` for STARTTLS (normally port 587)
- `SMTP_USER` and `SMTP_PASSWORD` when the server requires authentication
- `SMTP_FROM`, for example `StrollBar <no-reply@example.com>`

The health endpoint reports SMTP reachability when delivery is enabled. Failed SMTP sends are
retried with 1-second and 4-second backoff before returning a temporary-unavailable response;
users can request another verification email from Account settings.

Requests receive an `x-request-id` response header. Backend request and exception logs are
JSON records containing that ID, HTTP method, path, status, duration, and error stack when
available, which can be ingested by ELK, Splunk, or a hosted log service.

Security audit events are stored in the append-only PostgreSQL `audit_events` table. Administrators
can query them at `GET /v1/audit/events`; records are retained for 365 days by default and are
purged by the scheduled retention task. Configure `AUDIT_RETENTION_DAYS` and
`AUDIT_RETENTION_INTERVAL_MS` as needed.

Rate limits: general API traffic defaults to 100 requests/minute per user or client IP.
Authentication routes use route-specific limits: login/register 5/minute, refresh 5/minute,
password-reset request 3/minute, and verification resend 3/minute. Responses expose
`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, and `Retry-After` when throttled.

Existing `v1` clients retain their current response shapes. Clients that send
`Accept: application/vnd.strollbar.v2+json` receive the versioned envelope
`{ status, data, meta }` for success and `{ status, error, meta }` for failures; the Angular
client requests and unwraps this format centrally. Prefix searches use `term%` semantics for
index-friendly database queries.

For local development without SMTP, keep delivery disabled and set `AUTH_EXPOSE_VERIFICATION_TOKEN=true`. Never expose verification tokens in production.

## Run frontend

npm run start:frontend

Frontend starts on Angular dev server (default http://localhost:4200).

## Build

npm run build:backend
npm run build:frontend
