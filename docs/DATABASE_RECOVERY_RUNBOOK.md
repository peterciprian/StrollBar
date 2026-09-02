# Database Recovery Runbook

## Before production migrations

1. Confirm the target commit and the pending migration list with `npm run migration:run -- --dryrun` where supported by the TypeORM CLI.
2. Create and verify a PostgreSQL backup using the managed provider's point-in-time backup or `pg_dump`.
3. Record the backup identifier, migration names, operator, and start time in the incident/change record.
4. Apply migrations during the approved deployment window. Migrations are non-synchronizing and must be forward-compatible.

## Roll back a failed migration

1. Stop application traffic or put the service in maintenance mode if the failed migration can leave partial writes.
2. Preserve the migration error and database logs.
3. Restore the latest verified backup into an isolated database and verify application connectivity.
4. If the migration was recorded as applied and its `down()` path has been tested, run `npm run migration:revert` once per migration in reverse chronological order.
5. Never run `migration:revert` against production without an approved backup and incident record.
6. Deploy the previous application version only after the schema is compatible with it.
7. Verify health, authentication, writes, and read paths before reopening traffic.

## Recovery objectives

- Restore point: use PostgreSQL point-in-time recovery when available; otherwise use the pre-migration backup.
- Data-loss target: zero avoidable loss. Do not use destructive SQL to force a migration through.
- Practice: perform a restore drill monthly in a disposable database and record the result.

## Automated rollback smoke test

The migration test suite runs every migration `up()` and `down()` against a disposable PostgreSQL database in CI. It must pass before deployment. The test database is never used for application data.
