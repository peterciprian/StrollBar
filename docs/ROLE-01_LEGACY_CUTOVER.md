# ROLE-01: grants and operator-controlled legacy cutover

## Delivery boundary

ROLE-01 adds schema, durable audited manual operations, creation-quota corrections,
and an **opt-in** legacy cutover command. No legacy accounts have been changed by
this implementation. Neither startup nor schema migration runs the cutover or
creates paid grants. No provider, checkout, event ingestion, or billing data is
included.

`paid_grants` represents overlapping CREATOR/PREMIUM grants with a finite UTC
`startsAt`/`expiresAt`, status, source, actor, reason, and creation timestamp.
`audit_events` records creation/revocation and admin/cutover changes in the **same
transaction** as the mutation. Audit failure aborts the operation. Paid plans
cannot contain ADMIN, even through a direct invalid database plan value.

`users.role` is retained for SIMPLE, independent no-expiry ADMIN, and legacy paid
roles awaiting noticed cutover. It is **not** populated from new paid grants.
Generic assignment cannot write CREATOR/PREMIUM or bypass the noticed legacy
cutover. ADMIN assignment/removal never changes grants or adventure purchases.

**ROLE-02 remains required before grants authorize paid capabilities.** It will
evaluate authoritative grants at request time with `startsAt <= now < expiresAt`,
choose PREMIUM over CREATOR for overlaps, retain cancelled grants until paid-through
expiry, and fall back immediately to SIMPLE without grace when no grant remains.
ROLE-01 deliberately does not implement a competing resolver or promote a grant
into an unbounded role. A grant recorded today does not upgrade access in this
release. Do not market or enable a paid-upgrade journey on this release alone.

## Admin API contracts

All operations require a freshly checked, active database ADMIN; token role claims
alone are insufficient for these writes. All successful changes have durable audit
records with the target, actor, operation and previous/new values or grant period.

- `PATCH /users/:userId/role` accepts `{ "role": "admin" }` or
  `{ "role": "simple" }` only. This assigns/removes independent, non-expiring
  ADMIN. Paid roles return 400; legacy paid targets return 409 and must first use
  the noticed cutover. Self-removal is rejected; another active admin must remove
  the privilege. Existing grants are untouched. ROLE-04 owns the separate UI.
- `POST /users/:userId/paid-grants` accepts `plan` (`creator` or `premium`),
  `startsAt`, `expiresAt` (ISO UTC strings ending in `Z`), and a nonblank `reason`.
  Expiry must be finite and after start. Each deliberate submission creates a
  distinct grant; these manual operations are not provider event processing.
  Review the audit/grant ID before retrying an ambiguous network response.
- `POST /users/:userId/paid-grants/:grantId/revoke` accepts a nonblank `reason`.
  Revocation is limited to that target's grant. A retry of an already revoked
  grant is a no-op. No role, ADMIN privilege, other grant, or purchase changes.
  Operator revocation is not a customer cancellation workflow; ROLE-04 owns
  cancellation/expiry notifications and surfaces.

The old admin selector may still offer paid roles until ROLE-04 replaces it; the
backend rejects those permanent assignments explicitly. Use bounded grants, not
the old selector, for paid-plan records.

## Creation quota policy

Count **all non-deleted owned strolls**, including drafts, published, archived and
suspended rows. Current deletion is hard deletion, so a deleted row no longer
counts. PUBLIC is the public category; PRIVATE and UNLISTED share the private
category. Exact limits remain SIMPLE 3/0, CREATOR 20/3, PREMIUM and ADMIN unlimited.
Individual-adventure purchase quotas/entitlements are unchanged.

New drafts default PUBLIC in the API, database, and editor. Changing PUBLIC to
PRIVATE/UNLISTED consumes private quota even for drafts. Creation/category changes
are serialized per owner for ordinary owner mutations. At the limit, neutral edits
are allowed; above any limit, an edit must reduce at least one category's excess
and must not increase another category's excess. A change PRIVATE to UNLISTED is
neutral. Status changes, activation/publication, metadata and stage edits cannot
bypass this rule. Views and deletion remain available, including stage deletion;
no content is deleted or automatically reclassified on downgrade. ADMIN moderation
uses the existing unlimited ADMIN quota.

## Procedure: review, deliver notice, explicitly cut over

These are **operator instructions, not commands executed by this implementation**.
Use approved access to the intended database; never paste credentials into source,
arguments, audit reasons or notice references. Configure explicit `DB_HOST`,
`DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` and applicable verified TLS
settings using the existing secure environment mechanism. Set
`DB_MIGRATIONS_RUN=false`. The operator command always disables synchronization
and automatic migrations regardless of that flag.

1. Deploy the schema through the normal reviewed migration rollout. The schema
   migration creates empty grant/notice tables and changes only the default for
   **new** stroll publicity; it does not change existing users or strolls.
2. Take/verify a restorable backup and retain the approved target UUID list,
   original roles, owned stroll IDs/counts by category/status, adventure IDs and
   ADMIN assignments in the operator change record. Verify a separate active
   administrator is available for recovery.
3. Inventory in dry-run mode:

   ```powershell
   npm --workspace stroll-bar-backend run roles:legacy -- --operation=preview
   ```

   Review the JSON target host/port/database, legacy target IDs/roles and existing
   notice records. Without bare `--apply`, **every operation is read-only**.
   The command neither sends mail nor infers that delivery occurred.
4. Deliver an approved notice to each selected CREATOR/PREMIUM account outside
   this command. Explain loss of legacy paid capabilities, the scheduled fallback
   to SIMPLE, exact limits and corrective edits, preservation of owned content
   and individual purchases, and the support/recovery path. Retain delivery
   evidence. Do not include SIMPLE or ADMIN users.
5. After confirmed delivery, record the notice, selected user UUIDs, active admin
   actor UUID, and delivery-evidence reference:

   ```powershell
   npm --workspace stroll-bar-backend run roles:legacy -- --operation=notice --users=<uuid1>,<uuid2> --actor=<admin-uuid> --cutover-at=<UTC-ISO-timestamp-ending-Z> --notice-reference=<delivery-record-id> --confirm-db=<exact-DB_NAME> --apply
   ```

   Replace all placeholders; do not copy them literally. The database supplies
   `noticeAt` **at recording**, never an operator-supplied/backdated timestamp.
   Schedule with a margin beyond seven days to avoid execution latency.
   `cutoverAt` must be no earlier than **seven UTC calendar days after
   `noticeAt`**, preserving time of day (168 hours; UTC avoids DST ambiguity).
   Recording after delivery is conservative: the actual notice period is longer.
   Existing notices cannot be overwritten, shortened or silently duplicated.
   A duplicate or invalid target fails the entire batch with no partial changes.
6. Wait until the scheduled time. No scheduler performs the cutover. Re-run
   preview and compare roles, notices, content and ADMIN assignments to the
   approved snapshot. Then an operator explicitly invokes:

   ```powershell
   npm --workspace stroll-bar-backend run roles:legacy -- --operation=cutover --users=<uuid1>,<uuid2> --actor=<admin-uuid> --confirm-db=<exact-DB_NAME> --apply
   ```

   Both the scheduled timestamp and seven-day minimum must have elapsed according
   to database time. The command locks/rechecks the active actor and each target,
   requires the original noticed paid role, writes SIMPLE plus completion/audit
   data atomically, and touches no stroll/adventure/grant records. Any missing,
   early or changed-role target aborts the batch. In particular, a target now
   carrying ADMIN is never downgraded. Review failures manually; do not force
   them by modifying notice history.
7. Verify every completed target is SIMPLE, notice completion and audit counts
   match, owned content/adventures are unchanged, and ADMIN assignments are
   unchanged. Keep the report in the operator change record. Repeating the same
   completed batch is a no-op if targets remain SIMPLE; changed roles fail
   explicitly. New legacy users cannot be added through generic role assignment.

## Rollback and controlled recovery

- Before any notice/grant history exists, the schema migration can be rolled back;
  it restores the prior new-stroll default without modifying existing content or
  users. Once history exists, rollback **refuses to drop it**.
- Before cutover, stop: do not invoke the apply command. A deferred execution is
  safe and cannot shorten notice; unchanged notices remain valid for a later
  operator invocation. Re-notification/rescheduling requires a reviewed follow-up,
  not backdating or deleting history.
- After an erroneous cutover, preserve completed notice/audit data. Create a
  bounded replacement grant with an explicitly approved expiry and incident
  reference using the admin grant endpoint; revoke an erroneous replacement with
  the audited revocation endpoint. Do not restore permanent CREATOR/PREMIUM roles.
  **Paid access recovery requires ROLE-02's resolver release**; recording a grant
  on ROLE-01 alone is not an access restore. If continued paid access/recovery is
  required before then, defer the operator cutover rather than bypassing this
  boundary. Content and individual purchases remain intact throughout.
- Use full backup restore only under the existing database recovery runbook and
  after assessing intervening writes; never run destructive rollback on live data
  as an entitlement recovery mechanism.

## Isolated validation

Integration tests require `ROLE01_TEST_ISOLATED=1` and `ROLE01_TEST_PG_PORT` pointing
to an **explicitly disposable loopback PostgreSQL cluster**, with a dedicated
`role01_test` database-creation user. They create/drop a fresh random `role01_*`
database, override application connection settings, and never connect to the
application database. Without this opt-in, that integration group is skipped.

The cutover timing tests backdate fixture rows only inside that disposable
database to simulate elapsed time. The production command has no backdating option.
The migration rollback smoke test likewise creates/drops its own database; run it
only with `DB_*` explicitly targeting the disposable cluster.
