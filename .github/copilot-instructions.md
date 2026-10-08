# Copilot instructions for StrollBar

## Repository shape

StrollBar is an npm-workspaces monorepo containing two applications:

- `stroll-bar-frontend` is an Angular 22 client with Angular Material, server-side rendering, and a service worker. Routes and page-level features are under `src/app`; Hungarian is the default language and English is also supported.
- `stroll-bar-backend` is a NestJS 11 REST API backed by PostgreSQL through TypeORM. Its domain modules cover auth, users, strolls, stages, adventures, media, and related features.

The core user flow is: creators publish a stroll with sequential stages; users discover and unlock it, creating a personal adventure whose progress is tracked stage by stage. Media binaries live in S3-compatible storage; PostgreSQL stores media metadata and references. Redis is an optional cache for public stroll listings.

The backend mounts the API under `/v1`. The Angular `ApiClientService` centralizes typed HTTP calls and response-version handling; domain feature services wrap those calls for components. Authentication is the frontend's NgRx-managed global state; most other screen state is local Angular signals with RxJS for asynchronous work. See `stroll-bar-frontend/src/app/core/docs/DATA_FLOW_PATTERNS.md` for the established data-flow patterns.

GitHub Pages is a static frontend deployment and uses hash-based routing. Preserve this constraint when changing routing or deployment behavior. The backend is deployed separately on Render.

## Build, test, and lint

Run commands from the repository root unless a working directory is specified. Install dependencies with `npm ci` (or `npm install --workspaces` for a workspace install).

### Build

- Backend: `npm run build:backend`
- Frontend: `npm run build:frontend`
- Production frontend: `npm --workspace stroll-bar-frontend run build:production`

### Frontend checks

- Lint (Angular ESLint and design-system checks): `npm --workspace stroll-bar-frontend run lint`
- Jest suite: `npm --workspace stroll-bar-frontend run test`
- One Jest file: `npm --workspace stroll-bar-frontend run test -- --runInBand --runTestsByPath src/app/core/api/api-client.service.spec.ts`
- One Jest test by name: add `--testNamePattern="test name"` to the command above.
- Type-check test sources: `npm --workspace stroll-bar-frontend run test:types`
- Playwright E2E: `npm --workspace stroll-bar-frontend run test:e2e` (install browsers first with `npx playwright install chromium` from `stroll-bar-frontend`).
- SSR smoke test: `npm --workspace stroll-bar-frontend run test:ssr`

### Backend checks

The backend package does not define a lint script. Its Jest unit tests run from `stroll-bar-backend`:

- Unit suite: `npx jest --testPathIgnorePatterns=/test/ --runInBand`
- One Jest file: `npx jest --runInBand --runTestsByPath src/modules/strolls/strolls.service.spec.ts`
- One Jest test by name: add `--testNamePattern="test name"` to the command above.
- E2E suite: `npm run test:e2e` (from `stroll-bar-backend`).
- Migration rollback tests: `npm run test:migrations` (from `stroll-bar-backend`; requires its configured test database).
- Coverage: `npm run test:coverage` (from `stroll-bar-backend`).

Backend local development requires PostgreSQL with migrations applied. Start the repository's PostgreSQL service with `npm run db:up`, migrate with `npm run db:migrate`, and start the API with `npm run start:backend`. The README documents local environment variables and optional storage dependencies.

## Codebase conventions

- Keep backend HTTP controllers focused on routing, guards, DTOs, and delegation; implement domain behavior in the corresponding module service. Validate request DTOs and keep their Swagger metadata consistent with the API.
- Database schema changes must be explicit TypeORM migrations. Do not enable schema synchronization. When adding a migration, register it in `stroll-bar-backend/src/database/database.config.ts` as well as adding the migration file.
- Preserve stage ordering and per-user adventure progress semantics when changing stroll or adventure logic. Authorization must distinguish public stroll reads from owner/admin operations.
- On the frontend, add or update HTTP operations in `core/api/api-client.service.ts` and their request/response types in `core/api/models.ts`; expose domain operations through the appropriate `features/*-feature.service.ts` rather than duplicating HTTP calls in components.
- Keep NgRx focused on authentication/session state. Use signals for component-local loading, error, and view state, and use `computed()` for derived UI state. Handle asynchronous success and error paths explicitly; use the existing API/error interceptors and notification patterns.
- Keep user-facing strings in both `src/assets/i18n/en.json` and `src/assets/i18n/hu.json`. Follow the shared design tokens and components under `src/design` and `src/app/components/atoms` instead of introducing one-off design values or duplicate primitives.
- Frontend unit/component tests use Jest and `*.spec.ts`; browser journeys use Playwright under `stroll-bar-frontend/e2e`. Backend unit tests use Jest `*.spec.ts`; API e2e tests use `*.e2e-spec.ts` under `stroll-bar-backend/test`.
- Formatting follows the root Prettier configuration: tabs, four-space tab width, single quotes, semicolons, and no trailing commas. The root Prettier config also organizes imports.
