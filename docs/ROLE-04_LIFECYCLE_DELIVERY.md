# ROLE-04 lifecycle delivery

## Contract

- Paid grants and their one-per-grant expiry events commit together. The delivery migration also backfills missing expiry events for existing active/cancelled grants, including already-due grants.
- **Cancel** records `cancelledAt`, leaves the grant's exact expiry unchanged, queues one confirmation in the same transaction, and attempts delivery immediately **after commit**. Failure does not undo cancellation: the scheduled job retries it. Both account self-service and the admin dialog expose Cancel.
- **Revoke** is an independent, reasoned, admin-only operation that removes that grant's access immediately. It is not cancellation. A revoked/suspended grant's unsent expiry notice is skipped. No warning mail is generated.
- Every authorization request still evaluates `[startsAt, expiresAt)` directly. Delivery state, the scheduler, and provider availability never extend access. ADMIN assignment/removal is separately audited and non-expiring.
- EN/HU messages use the user's preferred language at first dispatch, name the affected plan and UTC event time, and confirm retention of owned strolls/purchased content. Cancellation also gives the exact access-through time. SIMPLE is the fallback **only without another active paid grant or independent ADMIN assignment**. Messages name the effective plan at the affected grant's expiry based on recorded grants, rather than falsely claiming that an overlapping PREMIUM/CREATOR grant or ADMIN ends.
- Rendered content and recipient are stored before sending and reused for retries. Event uniqueness, `FOR UPDATE SKIP LOCKED`, a five-minute lease and per-claim UUID fencing prevent ordinary duplicate/concurrent processing and recover abandoned claims.
- The outbox event UUID is also Brevo's idempotency key (Brevo requires a UUID). A documented HTTP 400 `duplicate_parameter` acknowledgment is treated as an already accepted send. Other failures retry automatically: 30s exponential backoff capped at ten minutes; no attempt limit or TTL quarantine.
- **At-least-once, not exactly-once:** provider acceptance and a local receipt cannot commit atomically. A lost response/receipt followed by recovery after Brevo's **30-minute** dedupe window can send a duplicate. This risk is explicitly accepted. Never delete/reinsert an event or change its UUID to replay it.

## Scheduled job and deployment

`render.yaml` declares `strollbar-role-lifecycle`, an independent Render cron service:

```text
schedule: */10 * * * *        # UTC, every ten minutes
command: npm run roles:dispatch
```

The CLI starts a minimal Nest application context with database and email dependencies, not the web application, JWT authorization, S3, or an HTTP endpoint. Migrations are disabled in this job. Each run drains due events with ten concurrent delivery attempts, an eight-minute drain budget and the existing ten-second provider request timeout. Normal dispatch is therefore comfortably inside the approved **one-hour after expiry** target, including web-service sleep. Failed sends become due for a later run; an abandoned claim is reclaimable after five minutes. Render serializes scheduled runs; database leases also protect immediate request dispatch versus scheduled dispatch.

Deploy the backend migration before enabling the cron service. In Render, the repository/deployment operator must:

1. Apply the Blueprint cron service and its paid Starter cron plan; production scheduling was **not** enabled from this development session.
2. Share the existing database and Brevo sender/API-key environment values through the declared `fromService` references. Upload the Aiven CA secret file to the **cron service too** at `/etc/secrets/aiven-ca.pem`. Database TLS remains verifying; no TLS downgrade is introduced.
3. Keep `EMAIL_DELIVERY_ENABLED=true`; a disabled sender is a retryable failure, never a successful receipt.
4. Configure failed-job notifications and watch `role_mail_job_complete`, `role_mail_retry_scheduled`, and `role_mail_job_budget_exhausted`. Alert on pending/processing expiry events approaching **30 minutes** late and escalate before **60 minutes**. An outage, invalid credentials, sustained overload, or a provider failure cannot honestly guarantee delivery; restore the dependency and run the same job, preserving event IDs.

Job exit code is nonzero for startup/database failure, retryable delivery failures, or an exhausted drain budget. Leased work survives termination. Inspect overdue expiry work using the original grant expiry, **not** retry `availableAt`:

```sql
SELECT o.id, o.status, o."attemptCount", o."availableAt", o."leaseUntil", g."expiresAt"
FROM role_lifecycle_outbox o
JOIN paid_grants g ON g.id = o."grantId"
WHERE o."eventType" = 'paid_grant_expiry'
  AND o.status IN ('pending', 'processing')
  AND g."expiresAt" <= now() - interval '30 minutes'
ORDER BY g."expiresAt";
```

Logs and stored errors omit recipient addresses, provider response bodies and credentials. Do not remove durable receipts/history during rollback; the migration refuses rollback once used. No provider checkout/renewal, ROLE-03 implementation, or legacy cutover is part of this feature.

## Validation (2026-11-04)

Docker was unavailable. A disposable PostgreSQL 18.6 instance was installed **outside the repository**, bound locally on port 55434 and used only with explicitly named `strollbar_test_*` databases. No application/production database or live mail provider was used.

- Backend: `npm run build:backend`; `npx tsc -p stroll-bar-backend/tsconfig.json --noEmit --rootDir .`.
- Focused backend Jest: `role04.integration`, `role-lifecycle-dispatcher.service`, `role-assignments.service`, `user-entitlement.service`, `effective-role.service`, `role-lifecycle-message`, `email.service` — **7 suites / 60 tests passed**. Integration opt-in: `ROLE04_TEST_ISOLATED=1` plus explicit `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USERNAME`, `TEST_DB_PASSWORD`, `TEST_DB_NAME`. The test helper refuses nonlocal hosts and unsafe database names.
- Migration rollback: `npx jest src/database/migration-rollback.spec.ts --runInBand` against explicitly configured local test PostgreSQL — **1 suite / 1 test passed**. ROLE-04 integration also verifies upgrade backfill, transactional rollback, and refusal to discard durable history.
- Frontend focused Jest: Settings plan, Plans page, paid-grants dialog, API client, app routes — **5 suites / 24 tests passed**.
- Browser: `npm --workspace stroll-bar-frontend run test:e2e -- role-lifecycle.spec.ts` — **1 Chromium test passed**, using the real Angular/Nest/PostgreSQL stack and a local captured mailbox. Covers admin dialog grant creation, overlap wording, account Cancel, immediate confirmation, expiry fallback, immediate admin Revoke, and ADMIN preservation.
- The browser harness defaults to disposable Docker PostgreSQL. To use an already-running isolated local instance, set `E2E_EXTERNAL_TEST_DB=true` and all five explicit `TEST_DB_*` variables; the harness enforces local host/test-name restrictions and does not create/drop the external database.
- `npm run build:frontend`, frontend `test:types`, frontend `lint` (Angular ESLint plus design-system check), changed ROLE-04 source/config Prettier checks, translation JSON/cron YAML parsing and `git diff --check` passed. The backend has no existing ESLint task; backend lint validation uses Prettier on the changed lifecycle sources plus full TypeScript checking.
- Live Render activation and real Brevo/inbox delivery were intentionally not attempted. The duplicate-risk contract is tested, not a claim of stronger provider guarantees. No legacy-cutover suite or cutover command was executed.

References consulted: [Nest standalone applications](https://docs.nestjs.com/standalone-applications), [TypeORM locking](https://typeorm.io/docs/query-builder/select-query-builder/), [Render cron scheduling/single-run behavior](https://render.com/docs/cronjobs), [Render Blueprint specification](https://render.com/docs/blueprint-spec), [Brevo deduplication contract](https://developers.brevo.com/docs/heterogenous-versions-batch-emails), [Angular template control flow](https://angular.dev/guide/templates/control-flow).
