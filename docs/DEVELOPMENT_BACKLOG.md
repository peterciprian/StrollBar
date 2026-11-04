# StrollBar Development Backlog

**Prepared:** 2026-11-03  
**Purpose:** Prioritized, developer-ready follow-up work from a static, read-only codebase audit, with subsequent implementation status recorded where work has landed. This document does not implement application changes, billing, or roles.

## Executive summary

StrollBar already implements meaningful user journeys: account registration, login and recovery; stroll browsing; creator editing; adventure progress; reviews; achievements; user reporting; and admin functions. The backlog therefore focuses on verified defects and incomplete or underspecified journeys, rather than restating implemented features as missing.

The original audit identified high-severity authorization/account-integrity issues (social account linking and revoked adventure access), protected-data exposure, authentication/session handling issues, and production PostgreSQL TLS without certificate verification. SEC-01 through SEC-06 have since been implemented; these are historical, remediated findings rather than current open backlog items. Focused validation was performed for several changes, while some integration, browser, and live-provider checks remain outstanding as noted in the tickets and linked implementation notes. Separately, the paid-stroll screen uses mock checkout and can unlock without verified payment. Creator publication readiness remains follow-up work; PROD-03 is implemented with optional, skippable riddles and transparent solved/total/unresolved result counts. Search filters do not match their advertised contract.

After immediate correctness and security work, settle remaining product policies before implementing time-bound paid roles. ROLE-00 decisions establish CREATOR and PREMIUM as paid roles, their current quota mapping, SIMPLE fallback, cancellation through paid-through expiry, treatment of over-limit owned strolls, quota counting, verified chargeback outcomes, and initial user/admin surface requirements. ROLE-00 remains partially approved / not fully approved because payment/provider choices and other operational details remain open. Keep ADMIN independently managed and protected from payment and chargeback events. Distinguish recurring paid-role entitlements from individual stroll purchases. Optimize discovery only after measuring it, and treat account closure/export as a policy and reviewed-surface assessment—not as a proven global absence or a compliance finding.

## Audit scope and confidence

The original findings and confidence scores below come from the two supplied audit reports and their static source traces; they describe the repository as examined at audit time, not the current state after later commits. This document is not a second source audit. Implementation and validation notes record subsequent work separately.

- **Original audit mode:** static, read-only.
- **Original audit limits:** no runtime tests, exploit verification, dependency CVE scan, live/cloud/database verification, or fresh source audit was performed for that audit. Later implementation-time checks are described per ticket and are not retroactively attributed to the audit.
- **Repository state:** git status and changed-line attribution were unavailable; no claim is made about pre-existing working-tree changes.
- **Tests:** original audit references to tests identify test surfaces only. Later test results, where known, are recorded in the corresponding completion notes.
- **Performance:** no new benchmark was run. Do not promise numerical gains; confirm any README target before adopting it as a budget.
- **Scope limits:** the observed user controller surface did not show account closure/export, but this does not establish that such a feature is absent elsewhere or imply legal noncompliance.

## Priority and effort definitions

Priority is scheduling urgency, independent of security severity:

- **P0 — Launch blocker / immediate remediation:** address before relying on the affected security or paid-access behavior.
- **P1 — Next delivery:** important correctness, product completion, or prerequisite work after P0 stabilization.
- **P2 — Improvement:** measured optimization, maintainability, documentation, or policy discovery that should be scheduled without displacing urgent fixes.

Effort is a relative planning estimate, not a commitment: **S** small, **M** medium, **L** large, **XL** extra-large. Dependencies below identify true ticket prerequisites; a stated product-decision gate is not an implemented prerequisite ticket.

## Backlog index

| ID | Priority | Category | Effort | Depends on |
|---|---|---|---|---|
| SEC-01 — Completed | P0 | Security / authentication | M | — |
| SEC-02 — Completed | P0 | Security / authorization | M | — |
| SEC-03 — Completed | P0 | Security / media access | M | — |
| SEC-04 — Completed | P0 | Security / data exposure | S | — |
| SEC-05 — Completed | P0 | Security / session handling | M | — |
| SEC-06 — Completed | P0 | Security / database transport | S | — |
| PROD-01 | P0 | Product / individual stroll purchase | XL | — |
| ROLE-00 | P1 | Product decision / paid-role specification | M | — |
| PROD-02 — Completed | P1 | Product / creator publishing | M | — |
| PROD-03 — Completed | P1 | Product / adventure progression | M | — |
| PROD-04 | P1 | Product / browse search contract | M | — |
| ROLE-01 | P1 | Paid roles / entitlement model and migration | L | ROLE-00 |
| ROLE-02 | P1 | Paid roles / effective authorization and expiry | L | ROLE-01 |
| ROLE-03 | P1 | Paid roles / provider billing and events | XL | ROLE-00, ROLE-01 |
| ROLE-04 | P1 | Paid roles / account/admin UI and lifecycle tests | L | ROLE-02, ROLE-03 |
| QA-01 | P1 | Quality / creator-to-traveller E2E | L | PROD-02, PROD-03 |
| PERF-01 | P2 | Performance / discovery and profile queries | M | — |
| MAINT-01 | P2 | Maintainability / derived stage fields | S/M | — |
| MAINT-02 | P2 | Maintainability / ownership and role policy | M | ROLE-00 |
| DX-01 | P2 | Developer experience / docs and API contract | S/M | — |
| PROD-05 | P2 | Product decision / account closure and export assessment | S/M | — |

## Security summary

The findings below preserve the original static-audit descriptions and confidence scores. SEC-01–SEC-06 were subsequently implemented; their risk statements are historical, not assertions that the vulnerabilities remain present.

| # | Status | Severity at audit | File | Lines | Historical finding | Confidence |
|---|---|---|---|---|---|---|
| 1 | Implemented | 🟠 HIGH | [`social-user.service.ts`](../stroll-bar-backend/src/modules/auth/services/social-user.service.ts) | 46–69 | Social email-match flow could link a verified provider identity to an unverified local account while retaining its password, enabling account pre-hijack. | 9/10 |
| 2 | Implemented | 🟠 HIGH | [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts) | 314–330 | Revoked adventures remained accessible to owners and could be restarted; related stroll/stage entitlement checks also accepted revoked records. | 10/10 |
| 3 | Implemented | 🟡 MEDIUM | [`media.service.ts`](../stroll-bar-backend/src/modules/media/media.service.ts) | 302–319 | Persistent media URLs could mint fresh signed download URLs without rechecking current resource visibility or entitlement. | 9/10 |
| 4 | Implemented | 🟡 MEDIUM | [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts) | 249–260 | Stroll detail returned stage entities including server-side `riddleAnswer` to callers allowed to read the stroll. | 10/10 |
| 5 | Implemented | 🟡 MEDIUM | [`social-callback-page.component.ts`](../stroll-bar-frontend/src/app/pages/auth/social-callback-page.component.ts) | 25–34 | Callback installed access/refresh tokens from navigation parameters without binding them to a locally initiated authentication transaction. | 9/10 |
| 6 | Implemented | 🟡 MEDIUM | [`database.config.ts`](../stroll-bar-backend/src/database/database.config.ts) | 30–47 | Configured PostgreSQL TLS modes disabled certificate verification; deployment configuration selected the affected mode. | 9/10 |

## Detailed tickets

### Security and access control

#### SEC-01 — Make social account linking resistant to account pre-hijack

**Priority / effort:** P0 / M  
**Evidence:** [`social-user.service.ts`](../stroll-bar-backend/src/modules/auth/services/social-user.service.ts#L46-L69) matches by email and links the provider identity while preserving the existing local password. Registration creates active unverified users and password login does not require verification: [`auth.service.ts`](../stroll-bar-backend/src/modules/auth/auth.service.ts#L45-L100).

**Original finding (audit-time):** A person could register another person’s email with a password; when the mailbox owner later authenticated with a provider returning that email, the provider identity could be attached to the prepared account. The original password remained a route back into the same account. This was a high-confidence static finding; the attack was not executed.

**Scope:** Define account-linking and unverified-account reclamation semantics. Require explicit authenticated linking for established accounts. For an eligible unverified registration, use a verified ownership proof and invalidate the prepared password, sessions, provider links, and recovery state as appropriate. Do not silently link solely on email equality. Preserve safe signup behavior and give the user an actionable conflict/recovery result.

**Dependencies:** None.

**Acceptance criteria / validation:**
- A matching email alone never silently links a provider identity to an established account.
- An unverified local account cannot retain its original password/session as an alternate login after a verified-owner reclamation flow completes.
- Existing-account linking requires reauthentication and an explicit user action; unauthenticated or mismatched attempts fail without changing account state.
- Add backend service tests for existing verified account, unverified registration, mismatched provider email, failed proof, and successful explicit link; add callback/browser coverage if the current auth harness supports it.
- Relevant surfaces: auth service and social-user service tests; inspect the registration, password login, recovery, and provider callback paths together. Run the focused backend test command defined by the project scripts when available; no command is asserted here because the audit report did not establish it.

**Completion / validation:** Implemented in [`social-user.service.ts`](../stroll-bar-backend/src/modules/auth/services/social-user.service.ts), [`auth.service.ts`](../stroll-bar-backend/src/modules/auth/auth.service.ts), and their auth specs. The focused backend auth suite (`npx jest src/modules/auth --runInBand`) and backend build passed, as recorded in [SEC-01 implementation notes](SEC-01_ACCOUNT_LINKING.md). Coverage includes ownership/reclamation, failed attempts, transaction rollback, session invalidation, callback intent, and guards; PostgreSQL concurrency and live provider/browser flows were not established by those checks. This note does not claim every original acceptance criterion was independently verified.

#### SEC-02 — Enforce revoked adventure state on every protected path

**Priority / effort:** P0 / M  
**Evidence:** [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts#L314-L330) and revocation path [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts#L445-L463); restart transition [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts#L161-L168). Related checks: [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L416-L424), [`stages.service.ts`](../stroll-bar-backend/src/modules/stages/stages.service.ts#L185-L193).

**Original finding (audit-time):** The shared adventure helper authorized by ownership/admin status rather than active entitlement. `start` could restore `IN_PROGRESS`; stroll and stage checks also matched revoked adventure records. Revocation therefore did not reliably remove the content/progression access an administrator intended to revoke.

**Scope:** Centralize the active-entitlement predicate used by adventure details, stage reads, stroll reads, media authorization, progression, and result paths. Reject prohibited transitions atomically. Decide whether an explicit historical view is allowed; if so, make it a separate, non-progressing representation with a narrowly defined field set. Preserve administrator access for support without turning that into user entitlement.

**Dependencies:** None. Do not defer this fix to paid-role policy consolidation.

**Acceptance criteria / validation:**
- For a revoked adventure, direct detail/stage/content reads and start, navigate, answer, and result operations reject access or return only a separately approved historical representation.
- No request can change a revoked record back to active progress through ordinary user operations.
- Exercise both existing and newly revoked records; verify linked stroll/stage reads no longer count revoked adventures as entitlement.
- Add regression tests at adventure, stroll, stage, and media authorization boundaries. Include a concurrent revoke/read or revoke/start case demonstrating that the state check and transition cannot race to restore access.
- Relevant surfaces: `adventures.service.spec.ts` and the corresponding stroll/stage service specs; controller/API integration tests for direct requests. Existing test presence does not imply they pass.

**Completion / validation:** Implemented in [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts), [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts), and [`stages.service.ts`](../stroll-bar-backend/src/modules/stages/stages.service.ts). Regression coverage was added/updated in the [adventure](../stroll-bar-backend/src/modules/adventures/adventures.service.spec.ts), [stroll](../stroll-bar-backend/src/modules/strolls/strolls.service.spec.ts), and [stage](../stroll-bar-backend/src/modules/stages/stages.service.spec.ts) specs, including revoked-state and progression behavior. The commit records the implementation; this backlog does not assert that every listed acceptance criterion or every concurrency/integration scenario was run.

#### SEC-03 — Reauthorize protected media before issuing a new signed URL

**Priority / effort:** P0 / M  
**Evidence:** [`media.service.ts`](../stroll-bar-backend/src/modules/media/media.service.ts#L302-L319); download route has no authentication guard: [`media.controller.ts`](../stroll-bar-backend/src/modules/media/media.controller.ts#L29-L35).

**Original finding (audit-time):** The endpoint accepted a persistent encoded object key and issued a fresh signed download URL after existence/upload-state checks, without verifying the requester or current visibility/entitlement of its linked resource. Previously learned URLs could therefore keep minting access after circumstances changed.

**Scope:** Resolve the media record and its parent resource; authorize against current public-preview policy, stroll visibility, and current adventure entitlement before signing. Keep deliberately public profile/preview media on an explicit public path. Preserve the fact that already-issued storage URLs remain usable until their configured expiry; this work only controls new URL issuance.

**Dependencies:** None. Coordinate the entitlement predicate with SEC-02, but do not wait for future paid-role implementation.

**Acceptance criteria / validation:**
- A retained protected media URL does not mint a new signed URL anonymously or for a formerly entitled viewer after revocation/restriction.
- Authorized active viewers can obtain a signed URL; deliberately public preview/profile media follows an explicit tested policy.
- Unknown media, upload-failed media, deleted parent resources, and authorization failures return safe errors without object-key disclosure.
- Add media service and controller/API tests for each access class and for revocation between initial access and a later URL request.
- Relevant surfaces: media service/controller tests and storage signer mock; no cloud-side verification was performed in this audit.

**Completion / validation:** Implemented in [`media.service.ts`](../stroll-bar-backend/src/modules/media/media.service.ts) and [`media.controller.ts`](../stroll-bar-backend/src/modules/media/media.controller.ts). Regression coverage was added/updated in the [media service](../stroll-bar-backend/src/modules/media/media.service.spec.ts) and [controller](../stroll-bar-backend/src/modules/media/media.controller.spec.ts) specs for authorization and signing boundaries. Cloud-side behavior and completion of every original acceptance scenario are not claimed here.

#### SEC-04 — Remove riddle answers from non-editor stroll detail responses

**Priority / effort:** P0 / S  
**Evidence:** [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L249-L260) returns stages unchanged. Existing non-owner sanitization is in [`stages.service.ts`](../stroll-bar-backend/src/modules/stages/stages.service.ts#L40-L42) and [`stage-sanitizer.util.ts`](../stroll-bar-backend/src/common/utils/stage-sanitizer.util.ts#L3-L8).

**Original finding (audit-time):** A readable stroll detail included full stage entities, including `riddleAnswer`; the separate stages endpoint stripped it for non-owner/non-admin responses. Endpoint-specific handling had left a response path that revealed answers.

**Scope:** Use an explicit response projection/sanitization policy for all stage-bearing read paths. Include answer fields only in authorized owner/admin editing responses. Avoid serializing persistence entities directly into public/player responses.

**Dependencies:** None.

**Acceptance criteria / validation:**
- Anonymous, ordinary-user, and entitled-player detail responses omit `riddleAnswer`; owner/admin editing responses include it only where the editing contract requires it.
- Test public and restricted strolls, authorized and unauthorized users, and both response-envelope versions.
- Add a regression assertion that serialized detail responses contain no answer field or value for non-editors.
- Relevant surfaces: stroll detail service/controller tests and the existing stage sanitizer tests.

**Completion / validation:** Implemented in [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts) using the stage sanitization policy. Regression coverage was added/updated in the [stroll service](../stroll-bar-backend/src/modules/strolls/strolls.service.spec.ts), [stroll controller](../stroll-bar-backend/src/modules/strolls/strolls.controller.spec.ts), and [stage sanitizer](../stroll-bar-backend/src/common/utils/stage-sanitizer.util.spec.ts) specs. This records implementation and test coverage, not a claim that every response-envelope/role combination in the acceptance list was independently exercised.

#### SEC-05 — Bind social callback completion to the initiating browser transaction

**Priority / effort:** P0 / M  
**Evidence:** [`social-callback-page.component.ts`](../stroll-bar-frontend/src/app/pages/auth/social-callback-page.component.ts#L25-L34) installs credentials read from callback parameters. Backend OAuth state is signed but not bound to the initiating browser: [`auth.service.ts`](../stroll-bar-backend/src/modules/auth/auth.service.ts#L102-L153).

**Original finding (audit-time):** A callback URL containing an attacker’s tokens could replace the session in a victim browser without proof that the browser initiated the corresponding login. This is session confusion: it does not by itself grant access to the victim’s pre-existing account, but can cause later user activity to land in an attacker-controlled account.

**Scope:** Replace bearer credentials in navigable callback parameters with a short-lived, single-use authorization-code handoff bound to the initiating browser transaction. Validate state/transaction binding on the backend, exchange the code, and consume it once. Ensure callback failures do not mutate an existing session.

**Dependencies:** None.

**Acceptance criteria / validation:**
- Attacker-prepared callback URLs opened in fresh and already-authenticated browsers cannot install the attacker’s session.
- A legitimate initiated flow succeeds exactly once; replay, expired code, missing state, and mismatched-browser transaction fail without replacing credentials.
- Add frontend callback tests and backend OAuth transaction tests; browser-test the legitimate and tampered flows where the existing E2E harness permits.
- Relevant surfaces: auth service tests, callback component tests, and Playwright auth journey. No runtime exploit test was performed during the audit.

**Completion / validation:** Implemented in the backend [auth service](../stroll-bar-backend/src/modules/auth/auth.service.ts) and the frontend [callback component](../stroll-bar-frontend/src/app/pages/auth/social-callback-page.component.ts), API, and auth-session handling; see [SEC-05 protocol and validation notes](SEC-05_BROWSER_HANDOFF.md), the [callback component spec](../stroll-bar-frontend/src/app/pages/auth/social-callback-page.component.spec.ts), [backend transaction integration spec](../stroll-bar-backend/test/social-transactions.e2e-spec.ts), and [Playwright callback spec](../stroll-bar-frontend/e2e/playwright/social-callback.spec.ts). Focused backend/frontend unit, type, and build checks listed in the protocol notes passed. The PostgreSQL integration and browser Playwright suites could not run because Docker Desktop's Linux-engine pipe was unavailable, and no live provider flow was run. Those checks do not establish that every original acceptance criterion passed.

#### SEC-06 — Require PostgreSQL TLS certificate validation in production

**Priority / effort:** P0 / S  
**Evidence:** [`database.config.ts`](../stroll-bar-backend/src/database/database.config.ts#L30-L47) sets `rejectUnauthorized: false` for `DB_SSL=true`, `DB_SSL=require`, and other unrecognized non-empty values. Deployment selects the affected mode: [`render.yaml`](../render.yaml#L26-L27).

**Original finding (audit-time):** TLS encrypted traffic but did not authenticate the database endpoint when certificate verification was disabled. A network-path or name-resolution attacker could impersonate the database endpoint. This was a static configuration finding; no live deployment/interception test was performed.

**Scope:** Define explicit supported modes, require chain and hostname verification for production, load the intended provider CA as needed, and fail closed on unknown values. Keep local development setup explicit and isolated from production defaults.

**Dependencies:** None.

**Acceptance criteria / validation:**
- Intended trusted server certificate succeeds; self-signed, untrusted, expired, and wrong-host certificates fail.
- Unknown or malformed TLS configuration fails startup rather than silently disabling verification.
- Production configuration enables verification and does not rely on a boolean alias that maps to `rejectUnauthorized: false`.
- Add configuration tests with certificate fixtures/mocks and validate deployment environment settings. No live/cloud database validation was done for this audit.

**Completion / validation:** Implemented in [`database.config.ts`](../stroll-bar-backend/src/database/database.config.ts), its [configuration specs](../stroll-bar-backend/src/database/database.config.spec.ts), and [Render settings](../render.yaml); see [SEC-06 deployment and validation notes](SEC-06_DATABASE_TLS.md). TLS configuration tests with local certificate fixtures and the backend build passed. No live Render/Aiven validation was performed, and an operator must still provision the genuine provider CA before deployment; passing local tests does not fulfill that operational step.

### Product journeys and policy

#### PROD-01 — Replace mock paid-stroll checkout with verified individual purchases

**Priority / effort:** P0 / XL  
**Evidence:** Explore flow presents mock payment, then unlocks/starts: [`stroll-browser.component.ts`](../stroll-bar-frontend/src/app/pages/explore/stroll-browser.component.ts#L202-L230), [`mock-payment-dialog.component.ts`](../stroll-bar-frontend/src/app/pages/explore/mock-payment-dialog.component.ts#L15-L38), and user-facing disclaimer [`en.json`](../stroll-bar-frontend/src/assets/i18n/en.json#L363-L369). Backend unlock creates an adventure without a payment confirmation: [`adventures.controller.ts`](../stroll-bar-backend/src/modules/adventures/adventures.controller.ts) and [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts#L40-L83).

**Current behavior and impact:** A paid stroll can appear purchasable through a mock flow that does not charge or validate a provider payment, while the ordinary unlock operation creates access. The current UI must not be presented as a real paid transaction.

**Scope:** This is a future implementation ticket, not authorization to add billing in this documentation task. After provider and purchase policy decisions, implement a provider-confirmed purchase for one stroll, user, and price; issue entitlement only after verified confirmation. Keep this product distinct from recurring paid roles. Define free unlocks, duplicate purchases, cancellation/failure, refunds, disputes, and admin-comped access. Do not trust a client redirect or client-provided “paid” flag.

**Dependencies:** None as a ticket prerequisite; provider selection and purchase/refund policy are explicit decision gates before implementation. This ticket is not a prerequisite for immediate security remediation.

**Acceptance criteria / validation:**
- Provider-confirmed payment for the intended user/stroll is required before paid access is issued.
- Failed/cancelled checkout and forged client callbacks do not unlock; duplicate/replayed confirmations do not create duplicate purchase records or adventures.
- Free strolls retain a clear no-payment path. Refund, dispute, and comped-access outcomes follow documented policy.
- Backend tests cover verified, failed, cancelled, duplicate, reordered, and mismatched-user/stroll outcomes; browser E2E covers checkout return and adventure start.
- Relevant surfaces: adventure unlock service/controller tests, payment integration tests with provider sandbox/mock, and Playwright checkout journey. No provider is selected in the audited codebase.

#### ROLE-00 — Approve paid-role product and entitlement specification

**Priority / effort:** P1 / M  
**Evidence:** User role is a single non-expiring enum [`user.entity.ts`](../stroll-bar-backend/src/modules/users/entities/user.entity.ts#L5-L6) and role field [`user.entity.ts`](../stroll-bar-backend/src/modules/users/entities/user.entity.ts#L59); admin assignment [`users.controller.ts`](../stroll-bar-backend/src/modules/users/users.controller.ts#L50-L57), [`users.service.ts`](../stroll-bar-backend/src/modules/users/users.service.ts#L108-L130); quota selection [`user-quotas.ts`](../stroll-bar-backend/src/common/utils/user-quotas.ts#L9-L21).

**Current behavior and impact:** The code has manual permanent roles and role-based quotas, but no subscription expiry/lifecycle. A paid-role implementation without policy decisions could accidentally grant admin power, expire existing users, or use stale/client-controlled capabilities.

**Scope — specification only; partial decisions recorded, not fully approved:** Record the decisions and unresolved policies below. **CREATOR and PREMIUM are both paid roles.** The current quota mapping is defined by [`user-quotas.ts`](../stroll-bar-backend/src/common/utils/user-quotas.ts#L9-L21): creation quotas are SIMPLE 3 public / 0 private, CREATOR 20 public / 3 private, and PREMIUM unlimited public/private; purchase quotas are SIMPLE 10 public / unlimited private, and CREATOR/PREMIUM unlimited public/private. Preserve these exact definitions. “Private” includes both PRIVATE and UNLISTED strolls. These are separate creation and individual-purchase quotas, not a promise that a role purchase includes any stroll. Count every owned stroll, including drafts, against its quota grouped by publicity category. The meaning of deleted/archived records for quota counting remains open. No provider/payment integration or trial is in scope now. Preserve **SIMPLE** as baseline and **ADMIN** as a separate manual privilege; payment and chargeback events must never grant, remove, suspend, or otherwise affect ADMIN. For overlapping active paid grants, use the more valuable grant / higher applicable quota; under current quotas PREMIUM dominates CREATOR. Cancellation remains active through the paid-through expiry date/time; failed renewal falls back to SIMPLE at the end of the paid-through period, with no grace period. Existing CREATOR/PREMIUM users are approved to move to SIMPLE now as policy; this document does not perform or authorize an application/data migration.

On downgrade, preserve owned strolls. Permit corrective edits that move an over-limit account toward compliance; block edits that maintain or increase its over-limit state. Do not infer additional restrictions on viewing or deletion. For a verified chargeback, suspend the disputed grant while the dispute is pending; restore it if the user wins, and revoke it if the chargeback is upheld. Do not affect ADMIN or unrelated purchases. For user/admin surfaces, provide a Settings page for users and admins showing effective plan, quota usage, and fallback date. Create a Plans view explaining quotas and a button that initiates the upgrade process; its behavior while payment/provider work is deferred remains unspecified. In the admin user list, the role-change action occurs in a modal with role and expiration-date selection; which roles the modal may change remains open. No warning notices for now; send an email on expiration and cancellation with change details. The timing/content details of cancellation email dispatch remain open. No provider/payment integration, provider selection, or trial is in scope now.

**Dependencies:** None.

**Acceptance criteria / validation:**
- The specification records the decisions above and labels every remaining decision as unresolved or proposed, not approved; it does not claim ROLE-00 is fully approved.
- Subscription entitlements and individual stroll purchases are documented as distinct products.
- The specification prohibits payment or chargeback events from affecting ADMIN and avoids reliance on client role claims or scheduled jobs for authorization.
- Remaining policy approval is recorded by the product/engineering decision owners before dependent implementation proceeds; provider/payment work is not authorized by the current decisions. ROLE-00 remains partially approved / not fully approved.

#### PROD-02 — Enforce publish readiness in the backend

**Priority / effort:** P1 / M  
**Evidence:** Product rules [`RULES.md`](../RULES.md#L147-L154) require a name, description, at least one stage, and per-stage descriptive and location data. `activeStatus` is accepted by [`update-stroll.dto.ts`](../stroll-bar-backend/src/modules/strolls/dto/update-stroll.dto.ts#L60-L62); status assignment lacks publish-readiness validation in [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L263-L306).

**Original behavior and impact:** A stroll could be marked published before satisfying documented minimum readiness. Frontend-only checks would remain bypassable by direct API calls.

**Approved product policy (2026-11-03):** Invalid draft edits remain allowed. If an edit makes a published stroll invalid, save that edit and automatically return the stroll to draft (option B); do not reject the edit. An explicit attempt to publish an invalid draft fails with field-specific feedback. A stage location is valid when it has either a nonblank address or a complete, in-range latitude/longitude pair.

**Implementation:** Added shared readiness checks for stroll name/description, at least one stage, each stage name/description, and location. Explicit publication and published creation/import are rejected before persistence when invalid. Published metadata changes that invalidate readiness save as draft; create/update/delete/reorder stage mutations likewise save and automatically demote invalid published strolls, with browse-cache invalidation. Draft DTOs allow incomplete text so creators can continue editing drafts. The editor saves new strolls as draft, saves stage edits before an explicit publish request, displays localized field errors and automatic-unpublish feedback in English and Hungarian, and preserves draft editing. Structured API errors retain readiness issue codes and fields. Updated [`RULES.md`](../RULES.md), API/controller documentation, and [`mvp.yaml`](openapi/mvp.yaml).

**Dependencies:** None.

**Completion / validation:**
- Publishing rejects blank name/description, zero stages, blank per-stage name/description, and missing/invalid location with field-specific issue codes. A nonblank address and a complete valid coordinate pair are both accepted alternatives.
- Valid drafts publish. Draft content remains editable. Invalid explicitly published create/update/import requests fail before saving published state. Invalidating edits to published strolls save as drafts across metadata and stage create/update/delete/reorder surfaces.
- Backend targeted command: `Set-Location stroll-bar-backend; npx jest --runInBand src/modules/strolls/strolls.service.spec.ts src/modules/stages/stages.service.spec.ts src/modules/strolls/stroll-readiness.util.spec.ts src/modules/strolls/strolls.controller.spec.ts src/common/filters/structured-exception.filter.spec.ts` — **5 suites, 81 tests passed**.
- Frontend editor command: `npm --workspace stroll-bar-frontend test -- --runInBand src/app/pages/creator/stroll-editor-page.component.spec.ts` — **1 suite, 3 tests passed**, covering draft-first publish sequencing, field-specific readiness display, and automatic-unpublish feedback.
- Typecheck: `npm --workspace stroll-bar-frontend run test:types` — **passed**.
- Builds: `npm --workspace stroll-bar-backend run build` and `npm --workspace stroll-bar-frontend run build` — **passed**.
- Documentation checks: English/Hungarian translation JSON and `docs/openapi/mvp.yaml` parsed successfully with Node (`JSON.parse` and `js-yaml`). `git diff --cached --check -- . ':(exclude)docs/DEVELOPMENT_BACKLOG.md'` passes; the already-untracked backlog contains unrelated trailing spaces in existing sections, which were preserved rather than rewriting PROD-03/PROD-04 or other unrelated content.
- Remaining validation: no readiness-specific HTTP/controller integration test against the API or browser E2E was run; service tests use repository mocks and the editor behavior is covered at component level. The existing stroll controller HTTP suite was included but exercises detail serialization, not publishing. No live deployment validation was performed.

#### PROD-03 — Optional riddles and accurate adventure results — Completed

**Priority / effort:** P1 / M  
**Evidence:** The adventure UI and service expose independent navigation, answer submission, and result endpoints: [`adventure.component.html`](../stroll-bar-frontend/src/app/pages/progress/adventure.component.html), [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts), and [`adventures.controller.ts`](../stroll-bar-backend/src/modules/adventures/adventures.controller.ts).

**Approved product policy:** Users may proceed through every stage and finish without solving riddles. Results report solved riddle stages / total riddle stages and unresolved riddle stages; stages without riddles are excluded. There is no extra score penalty, completion restriction, or badge exclusion for unresolved riddles. Backward navigation remains available.

**Implementation:** Navigation remains available independently of answer submission. The answer endpoint now accepts only the current stage when it has a nonblank riddle answer and rejects submissions after completion. Safe `hasRiddle` metadata is returned without exposing the answer to players, and the progress page only displays its answer form for riddle stages. Result counts deduplicate correct attempts by riddle stage, exclude no-riddle stages, preserve the legacy `correctAnswerCount` and `totalStageCount` fields, and add solved/total/unresolved riddle counts. Reaching the final stage and requesting the result completes the adventure; completion timestamps are preserved across repeated result requests. English/Hungarian UI strings, product rules, and the OpenAPI contract were updated.

**Dependencies:** None.

**Completion / validation:**
- Backend service tests cover no-riddle and non-current answer rejection, deduplicated solved counts, exclusion of no-riddle stages, zero-riddle results, next/previous navigation, finishing with an unresolved riddle, and stable repeated result reads. Existing owner/revocation, lock, and answer-sanitization tests remain part of the targeted suite.
- Backend targeted command: `Set-Location stroll-bar-backend; npx jest --runInBand --runTestsByPath src/modules/adventures/adventures.service.spec.ts` — **1 suite, 32 tests passed**. Related adventure/stage/stroll command: `Set-Location stroll-bar-backend; npx jest --runInBand --runTestsByPath src/modules/adventures/adventures.service.spec.ts src/modules/stages/stages.service.spec.ts src/modules/strolls/strolls.service.spec.ts` — **3 suites, 81 tests passed**.
- Frontend targeted command: `npm --workspace stroll-bar-frontend test -- --runInBand --runTestsByPath src/app/pages/progress/adventure.component.spec.ts src/app/pages/progress/adventure-result-page.component.spec.ts` — **2 suites, 3 tests passed**. `npm --workspace stroll-bar-frontend run test:types` — **passed**.
- Builds: `npm run build:backend` and `npm run build:frontend` — **passed**.
- Documentation/localization syntax: Node `js-yaml` parse of `docs/openapi/mvp.yaml` and `JSON.parse` of English and Hungarian translation files — **passed**.
- Remaining validation: no browser E2E, live database/API integration, deployment check, or full repository test suite was run. Backend service tests use repository mocks; the UI behavior is covered by targeted component tests.

#### PROD-04 — Make browse search and filters match a documented contract

**Priority / effort:** P1 / M  
**Evidence:** DTO advertises `city`: [`list-strolls-query.dto.ts`](../stroll-bar-backend/src/modules/strolls/dto/list-strolls-query.dto.ts#L23-L28), but list applies name-prefix and labels only: [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L59-L68). Search is name-only, while client filters loaded results by name: [`stroll-browser.component.ts`](../stroll-bar-frontend/src/app/pages/explore/stroll-browser.component.ts#L94). No stroll-level city field was found; stages have addresses.

**Current behavior and impact:** Advertised query parameters may be ignored and search does not cover the expected name/description/district scope. Users and API consumers cannot infer consistent matching behavior.

**Scope:** Decide supported fields, city/address semantics, matching mode (prefix/partial), case/diacritic behavior if relevant, and pagination semantics. Implement the supported contract consistently across UI, DTO, backend query and OpenAPI documentation; remove unsupported parameters rather than accepting no-op filters.

**Dependencies:** None.

**Acceptance criteria / validation:**
- Every documented query parameter affects results or is removed/rejected with a clear contract.
- Search fields and city/address behavior are documented and consistent between browser and API.
- Tests cover empty query, name/description matches as selected, supported city/address cases, labels, pagination boundaries, and unsupported parameters.
- Relevant surfaces: stroll list service/controller tests, DTO validation/OpenAPI output, and explore search component/E2E. Product decision required on city semantics.

#### ROLE-01 — Model paid entitlements and execute a controlled legacy-role migration

**Priority / effort:** P1 / L  
**Evidence:** Current role and manual assignment surfaces: [`user.entity.ts`](../stroll-bar-backend/src/modules/users/entities/user.entity.ts#L5-L6), [`users.service.ts`](../stroll-bar-backend/src/modules/users/users.service.ts#L108-L130).

**Current behavior and impact:** A single permanent user role cannot represent multiple time-bounded grants, provider periods, cancellation, overlap, or audit history. Reusing the role column for subscriptions risks losing the separate admin privilege or changing existing users unexpectedly.

**Scope:** After remaining ROLE-00 policy approval, add an entitlement/grant model with plan/capabilities, status, UTC `startsAt`/`expiresAt`, and audit history; add provider references or event/idempotency data only if a later approved provider design requires them. Preserve ADMIN as a distinct manual privilege, unaffected by payment or chargeback events. The approved legacy-role policy is to move existing CREATOR/PREMIUM users to SIMPLE; design and execute that controlled migration only in this ticket, with notice/timing, verification, and rollback/recovery defined before execution. This backlog update has not performed the migration. Preserve owned content on downgrade. Count all owned strolls, including drafts, against the applicable creation quota grouped by publicity category, using the exact current definitions in `user-quotas.ts`; deleted/archived-record counting semantics remain unresolved. Permit corrective edits that move an over-limit account toward compliance, and reject edits that maintain or increase its over-limit state. Expiration must not revoke a separately purchased adventure unless that policy is independently decided.

**Dependencies:** ROLE-00 approved specification.

**Acceptance criteria / validation:**
- Schema represents overlapping grants and preserves their source/audit data without conflating ADMIN with paid entitlements.
- Migration targets SIMPLE for existing CREATOR/PREMIUM assignments and is tested against representative SIMPLE, CREATOR, PREMIUM, and ADMIN records; rollback or controlled recovery is documented and tested where feasible. This ticket does not silently imply that migration has already run.
- Existing owned content is preserved through downgrade. All owned strolls, including drafts, count by publicity category against exact source quota definitions. Corrective edits toward compliance are permitted; edits maintaining or increasing over-limit state are rejected. Validate create/activate/publish and other applicable operations against effective quotas.
- Migration is safe to rerun or fails clearly without partial corruption; test data verifies no payment-derived ADMIN grant is possible.
- Relevant surfaces: database migration tests, user/entitlement entity tests, and migration review. No source migration filename is presumed.

#### ROLE-02 — Compute effective capabilities on the server and enforce exact expiry

**Priority / effort:** P1 / L  
**Evidence:** Role-derived quotas currently read the user role: [`user-quotas.ts`](../stroll-bar-backend/src/common/utils/user-quotas.ts#L9-L21); JWT strategy reloads user data per request: [`jwt.strategy.ts`](../stroll-bar-backend/src/modules/auth/strategies/jwt.strategy.ts#L28-L41).

**Current behavior and impact:** No time-bound effective entitlement exists. A stale role or client/UI cache could outlive a subscription unless authorization is recalculated from authoritative state.

**Scope:** Implement server-side effective-capability evaluation using the approved SIMPLE baseline and grant policy. An entitlement is active exactly when **`startsAt <= now < expiresAt` UTC**. At the exact expiry instant it is inactive. When active grants overlap, select the more valuable/higher-quota applicable grant; PREMIUM dominates CREATOR under current quotas. Cancellation remains active through paid-through expiry; failed renewal falls back to SIMPLE at period end, with no grace. Use request-time authoritative state; a scheduler may reconcile/report state but is not the authorization mechanism. Define how `currentUser`, tokens, API response caching, and UI refresh avoid stale capabilities. Apply the exact creation quotas in `user-quotas.ts` to all owned strolls, including drafts, grouped by publicity category. Permit corrective edits that move over-limit accounts toward compliance and reject edits maintaining or increasing over-limit state. Preserve individual stroll purchase entitlements separately.

**Dependencies:** ROLE-01.

**Acceptance criteria / validation:**
- Tests at before-start, exact-start, immediately-before-expiry, exact-expiry, and after-expiry boundaries use a controllable clock and UTC.
- Overlapping grants select the more valuable/higher quota grant (PREMIUM over CREATOR under current quotas); absence of active grants returns SIMPLE baseline; ADMIN remains independently effective.
- Delayed/missing reconciliation job does not extend access. Stale token claims, forged client role values, and stale UI/cache data cannot authorize a protected server operation.
- Tests cover state reads, exact quota counts including drafts, category grouping, and create/activate/edit/publish operations at and above plan limits, including corrective edits versus edits maintaining/increasing over-limit state. Deleted/archived quota semantics require product resolution. Relevant surfaces: entitlement/capability unit tests, auth strategy, quota and service integration tests.

#### ROLE-03 — Integrate provider-confirmed subscription lifecycle and idempotent event processing

**Priority / effort:** P1 / XL  
**Evidence:** No subscription processor, entitlement lifecycle, webhook, expiry, or billing-management journey was found; current manual assignment is documented in [`users.service.ts`](../stroll-bar-backend/src/modules/users/users.service.ts#L108-L130). No provider is selected in the audited codebase.

**Current behavior and impact:** There is no verified recurring payment lifecycle from which paid-role grants can safely be issued or expired.

**Scope:** Deferred. No payment/provider work is approved now, and no provider, prices, or billing cadence are specified. Revisit only after explicit future approval of a provider and the remaining lifecycle policies, plus the ROLE-01 data model. If approved later, integrate verified subscription checkout and signed events; renew only from provider-confirmed periods; process duplicate, reordered, delayed, and concurrent events transactionally/idempotently; reconcile provider/local drift; and keep secrets out of source/logs. Implement recorded lifecycle decisions: cancellation remains active through paid-through expiry; failed renewal falls back to SIMPLE at period end with no grace; on a verified chargeback suspend only the disputed grant while pending, restore it if the user wins, and revoke it if upheld. ADMIN and unrelated purchases must remain unaffected. This ticket concerns subscriptions only, not individual stroll purchases (PROD-01).

**Dependencies:** Future explicit ROLE-00 approval of provider/payment work and lifecycle policies; ROLE-01 schema. Not authorized by the current partial decisions.

**Acceptance criteria / validation:**
- If provider work is later approved, invalid signatures, replayed events, fabricated periods, and mismatched customer/account references do not grant or extend entitlement.
- If provider work is later approved, duplicate/reordered/concurrent deliveries converge to provider-confirmed state without duplicate grants or lost updates; transactional rollback is tested.
- If provider work is later approved, renewal uses verified provider periods; cancellation is effective at paid-through expiry and failed renewal falls back to SIMPLE at period end with no grace. Verified chargeback tests cover disputed-grant suspension, restoration on user win, and revocation when upheld, without affecting ADMIN or unrelated purchases.
- If provider work is later approved, provider outage or delayed jobs do not grant stale access; reconciliation detects and safely resolves drift.
- Provider sandbox/mock, secret-safe logging/configuration, and concurrent event tests are gated on future provider approval. No provider-specific implementation is authorized or assumed now.

#### ROLE-04 — Provide paid-role account/admin lifecycle surfaces and end-to-end coverage

**Priority / effort:** P1 / L  
**Evidence:** Admin role assignment screen exists: [`admin-user-list.component.ts`](../stroll-bar-frontend/src/app/pages/admin/admin-user-list/admin-user-list.component.ts); role updates are exposed via [`users.controller.ts`](../stroll-bar-backend/src/modules/users/users.controller.ts#L50-L57).

**Current behavior and impact:** Admin role assignment exists, but no reviewed subscription status/expiry/cancellation account journey or lifecycle UI was identified. A generic role selector risks confusing paid subscription state with manual support/admin actions.

**Scope:** Implement the recorded surfaces only after relevant backend decisions and implementation: a Settings page for users and admins showing effective plan, quota usage, and fallback date; a Plans view explaining quotas and a button initiating the upgrade process; and the admin user-list role-change action in a modal with role and expiration-date selection. The button's behavior while payment/provider work is deferred and which roles the admin modal may change remain unresolved; do not imply payment or subscribe behavior is implemented. No warning notices for now; send an email on expiration and cancellation with change details. Cancellation-email timing/content details remain open. Keep ADMIN controls separate and protected; payment/chargeback cannot affect ADMIN. Add lifecycle tests and clear recovery/error states for approved behavior. Do not claim any UI or email exists until implemented.

**Dependencies:** ROLE-02; ROLE-03 only if provider/payment work is later approved and implemented. UI policy approval is required before product-facing lifecycle actions.

**Acceptance criteria / validation:**
- Settings for users and admins shows effective plan, quota usage, and fallback date; Plans explains quotas and has an upgrade-process button. Do not implement or claim provider checkout from that button without later approval. The upgrade-button behavior remains an open decision while payments are deferred.
- Admin user-list role-change action opens a modal with role and expiration-date selection; the permitted role choices remain an open policy decision. Paid entitlements remain distinct from ADMIN; payment and chargeback events cannot affect ADMIN; unauthorized role changes fail.
- No warning notices are sent; expiration and cancellation emails include change details. Cancellation email timing/content details remain unresolved.
- UI refreshes after entitlement changes and does not claim active access after server-side expiry.
- E2E covers approved role-state display, expiry to SIMPLE, admin preservation, and legacy migration result. Verify expiration/cancellation emails contain change details and that no warning notices are sent; cancellation-email timing/content is a remaining decision. Subscribe, renewal, and billing-provider journeys are excluded unless separately approved later; do not infer an implemented cancellation journey.
- Relevant surfaces: account/admin Angular component tests, backend authorization tests, and Playwright role-lifecycle tests; billing lifecycle tests only after future provider approval. Exact routes/API files are not presumed to exist.

#### PROD-05 — Decide and assess account closure and data export

**Priority / effort:** P2 / S/M  
**Evidence:** Reviewed self-service user controller surface includes listing, profile update, role update, and public profile: [`users.controller.ts`](../stroll-bar-backend/src/modules/users/users.controller.ts#L24-L64). No self-service closure/export endpoint was found in that reviewed surface.

**Current behavior and impact:** The reviewed surface does not establish whether account closure or export is an intended journey. Data relationships (strolls, reviews, adventures, audit history, and any future payment records) make implementation semantics a product decision.

**Scope:** First decide whether users may close/deactivate accounts and request an export. Map data retention, anonymization, ownership transfer, public-content behavior, audit records, adventure rights, and payment-record handling. Assess the broader product surface before concluding feature presence. This ticket is investigation and policy, not a claim of global absence or legal noncompliance.

**Dependencies:** None.

**Acceptance criteria / validation:**
- Product decision records supported journeys, identity reauthentication, retention/deletion/anonymization treatment by data class, and effects on owned/public strolls and purchases.
- Reviewed-surface assessment is documented with evidence and explicit scope; it does not infer noncompliance from absence in one controller.
- If implementation is approved, create a separately scoped implementation ticket with observable deletion/export acceptance tests; do not silently expand this assessment ticket into implementation.

### Performance, maintainability, quality, and developer experience

#### PERF-01 — Measure discovery/profile query cost and define cache semantics before optimizing

**Priority / effort:** P2 / M  
**Evidence:** Profile stats materialize qualifying stroll IDs and then perform separate unlock/completion counts: [`users.service.ts`](../stroll-bar-backend/src/modules/users/users.service.ts#L24-L62). Popular sorting uses correlated adventure count: [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L87-L95). Public list cache is ten minutes and unlock does not invalidate it: [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L42-L48), [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L83).

**Current behavior and impact:** The query shape may cause avoidable work at scale; cached `most_popular` results can lag unlock changes until TTL. The audit contains no benchmark, so the magnitude and appropriate optimization are unverified.

**Scope:** Capture baseline query timings and representative `EXPLAIN` plans for profile stats and browse/popularity at representative data volumes. Confirm the README’s exact p95 browse target before treating it as a budget; if no target is approved, define a measurement-based budget-setting task. Document popularity semantics (which adventure states count, freshness expectation). Make aggregate-query or cache/invalidation changes only where measurements and product semantics support them.

**Dependencies:** None.

**Acceptance criteria / validation:**
- Record dataset shape, query plan, timing method, and cache state so another developer can repeat measurements.
- Popularity semantics and cache freshness/invalidation behavior are explicit and tested (including unlock, revoke, and relevant status changes).
- Any query rewrite is behaviorally equivalent under representative cases and has before/after measurements; do not assert an unmeasured improvement.
- Relevant surfaces: user/stroll service tests, database query plans, and repeatable benchmark harness. No performance target value is invented in this backlog.

#### MAINT-01 — Make stage-derived stroll field refresh consistent

**Priority / effort:** P2 / S/M  
**Evidence:** Stage create/update/reorder/delete recalculate length, while create/delete separately update `stageCount`: [`stages.service.ts`](../stroll-bar-backend/src/modules/stages/stages.service.ts#L46-L65), [`stages.service.ts`](../stroll-bar-backend/src/modules/stages/stages.service.ts#L76-L108), [`stages.service.ts`](../stroll-bar-backend/src/modules/stages/stages.service.ts#L111-L156).

**Current behavior and impact:** Derived fields are updated across several mutation paths; inconsistent refresh rules can leave stale count/length after future changes.

**Scope:** Consolidate the explicit derived-field refresh policy used by stage mutations, following existing service patterns. Keep computation deterministic and transactionally aligned with the stage mutation. Do not broaden into unrelated data-model redesign.

**Dependencies:** None.

**Acceptance criteria / validation:**
- After create, update, reorder, and delete, `stageCount` and length match persisted stages.
- Coordinate-less or incomplete-location stages follow an explicit, tested length policy; empty stroll behavior is covered.
- Failed mutation leaves both stage data and derived fields consistent.
- Relevant surfaces: stage service specs for each mutation path and transaction/error cases.

#### MAINT-02 — Consolidate ownership/role policy after policy semantics are approved

**Priority / effort:** P2 / M  
**Evidence:** Separate role and ownership checks are present in [`users.service.ts`](../stroll-bar-backend/src/modules/users/users.service.ts#L133), [`adventures.service.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.ts#L457), [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L356-L368), and stages service policy paths.

**Current behavior and impact:** Repeated checks can drift, especially as paid grants and ADMIN separation are introduced. Centralizing before role semantics are decided would encode assumptions prematurely.

**Scope:** Once ROLE-00 defines baseline, paid capabilities, administrator exceptions, and ownership boundaries, identify genuinely shared policy. Extract a small explicit policy function/service only where checks have the same semantics; retain domain-specific checks where they differ. Do not create a generic authorization framework without evidence.

**Dependencies:** ROLE-00 approved policy only. This work does not block SEC-01 through SEC-06.

**Acceptance criteria / validation:**
- A written policy matrix covers anonymous/user/owner/entitled/admin and revoked states for representative resource actions.
- Shared checks have focused unit tests and representative service integration tests; domain-specific differences remain visible.
- Existing access behavior is preserved except for separately approved fixes, and regressions are covered.
- Relevant surfaces: user, stroll, stage, and adventure service specs.

#### QA-01 — Cover the creator-to-traveller journey end to end

**Priority / effort:** P1 / L  
**Evidence:** Existing service tests include [`strolls.service.spec.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.spec.ts) and [`adventures.service.spec.ts`](../stroll-bar-backend/src/modules/adventures/adventures.service.spec.ts). Existing browser E2E covers registration policy, search input, and featured card: [`auth-and-stroll.spec.ts`](../stroll-bar-frontend/e2e/playwright/auth-and-stroll.spec.ts).

**Current behavior and impact:** The audited browser tests do not cover the complete creator draft → stages → publish → discover → unlock → progress/complete journey. Critical server/UI boundaries can regress independently without a user-visible flow test.

**Scope:** Extend the existing isolated E2E harness for free/core journey: create a draft, add stages, verify failed publish validation, publish, discover, unlock, progress through a riddle without bypass, and complete. Add paid purchase and paid-role E2E only after PROD-01 and ROLE-04 semantics/provider are implemented.

**Dependencies:** PROD-02 and PROD-03 for their corrected behavior. Other steps can be developed incrementally, but the end-to-end acceptance flow depends on both.

**Acceptance criteria / validation:**
- A browser test exercises creator through traveller completion using isolated test data and deterministic cleanup.
- Failed publish is visible and recoverable; direct API progression cannot bypass an unsolved riddle.
- Test assertions verify observable API/UI behavior, not implementation details or timing assumptions.
- Existing E2E scenarios remain separately identifiable; execute through the project’s documented Playwright test surface when available.

#### DX-01 — Reconcile route/product documentation and API contracts

**Priority / effort:** P2 / S/M  
**Evidence:** Route map says guards should be added while routes use `authGuard`, `adminGuard`, and `emailVerifiedGuard`: [`route-map.md`](../stroll-bar-frontend/src/app/route-map.md#L36), [`app.routes.ts`](../stroll-bar-frontend/src/app/app.routes.ts#L44-L76). Product rules characterize rating sorts as future while DTO/service implement `top_rated`: [`RULES.md`](../RULES.md#L139), [`list-strolls-query.dto.ts`](../stroll-bar-backend/src/modules/strolls/dto/list-strolls-query.dto.ts), [`strolls.service.ts`](../stroll-bar-backend/src/modules/strolls/strolls.service.ts#L87-L95). Frontend API shapes are maintained separately from backend DTOs per product audit.

**Current behavior and impact:** Stale route/product documentation and manually maintained API shapes can mislead contributors and permit contract drift.

**Scope:** Update route and product docs to distinguish implemented, partial, and planned behavior accurately. Select a proportionate API contract strategy: generated types or contract tests against backend API schema. Avoid adding a generator unless the project can maintain it.

**Dependencies:** None.

**Acceptance criteria / validation:**
- Route documentation matches guards and route behavior; product rules distinguish existing from planned sort behavior.
- Documented search/API behavior reflects PROD-04’s selected contract when that decision is made.
- If generated types are adopted, generation is deterministic and CI detects drift; if not, contract tests compare key request/response shapes.
- Relevant surfaces: route docs, RULES, backend API schema/OpenAPI, frontend API clients/types, and documentation/contract test pipeline.

## Paid-role specification and phased implementation

**Status: SPECIFICATION ONLY in this task.** No roles, billing, provider integration, migrations, UI, or application code are implemented by authoring this backlog. ROLE-00 decisions are partially recorded below, but ROLE-00 is not fully approved: unresolved policies remain and no provider/payment work is authorized. ROLE-01 through ROLE-04 remain future tickets gated by the relevant approvals.

### Required model and invariants

1. **Separate products:** recurring subscription/paid-role entitlements are not individual stroll purchases. A subscription must not implicitly unlock a stroll; an individually purchased stroll must not imply a paid role.
2. **Baseline and administrator:** SIMPLE remains the baseline. ADMIN remains a separately managed administrative privilege. Payment, cancellation, refund, chargeback, provider events, expiry, and plan overlap must never grant, remove, suspend, or otherwise affect ADMIN.
3. **Plan mapping and quota counting (decision recorded):** CREATOR and PREMIUM are both paid roles. Current quotas in [`user-quotas.ts`](../stroll-bar-backend/src/common/utils/user-quotas.ts#L9-L21) are the capability baseline: creation—SIMPLE 3 public / 0 private, CREATOR 20 public / 3 private, PREMIUM unlimited public/private; purchase—SIMPLE 10 public / unlimited private, CREATOR and PREMIUM unlimited public/private. “Private” includes PRIVATE and UNLISTED. These are separate quota dimensions; a paid role does not itself purchase a stroll. Count all owned strolls, including drafts, against creation quota grouped by publicity category. Deleted/archived-record quota semantics remain unresolved. Apply the source-of-truth quota definitions rather than duplicating or inventing different limits. Do not infer additional capabilities or an ordinal hierarchy beyond these decisions.
4. **Time boundary:** A grant is active exactly when **`startsAt <= now < expiresAt` in UTC**. At `now == expiresAt`, it is expired. Authorization uses authoritative server/request-time state. A scheduled job is reconciliation only, never the sole expiry enforcement.
5. **Overlapping grants (decision recorded):** Select the more valuable/higher applicable quota grant, rather than unioning ambiguous grants; PREMIUM dominates CREATOR under current quotas. Multiple grants must not create ambiguous authorization.
6. **Current state and freshness:** Define how current-user responses, token claims, frontend state, and caches refresh after payment, cancellation, verified chargeback outcomes, and expiry. Client-controlled roles never authorize server actions; stale UI must not override server decisions.
7. **Renewals and event safety:** Renew only from verified provider-confirmed periods. Event handling must be signature-verified, idempotent, transactional, and safe for duplicate, reordered, delayed, and concurrent delivery. Persist event identity and provide reconciliation for provider/local drift.
8. **Cancellation and payment outcomes (partial decision):** Cancellation remains active through paid-through expiry. Failed renewal falls back to SIMPLE at the end of the paid-through period, with no grace. On a verified chargeback, suspend the disputed grant while pending; restore it if the user wins, and revoke it if upheld. Do not affect ADMIN or unrelated purchases. No warning notices for now; send an email on expiration and cancellation with change details. The timing/content details of cancellation email dispatch remain open. No trial is offered/assumed, and no provider/payment work is approved now.
9. **Legacy migration (decision recorded):** Existing CREATOR/PREMIUM users are approved to move to SIMPLE now. This is a product policy, not a performed migration. The migration ticket must define execution, notice/timing, verification, and rollback/recovery; do not claim existing records have changed.
10. **Downgrade and owned content (decision recorded):** Preserve owned strolls. Permit corrective edits that move an over-limit account toward compliance; block edits maintaining or increasing over-limit state. Count drafts as owned strolls for quota. Do not infer additional restrictions on viewing/deleting. Expiration must not automatically revoke separately purchased adventure rights unless that policy is separately decided.
11. **Secrets and escalation:** Provider secrets stay in secret storage and are not logged. Never trust client role claims, unsigned callbacks, or unverified provider periods. Admin role changes remain separately authorized and audited.
12. **Scheduling:** A job may reconcile state, notify users, or flag drift, but delayed/missing jobs must not extend authorization past the UTC expiry boundary.

### Phases and ticket gates

1. **Policy decision — ROLE-00 (partially approved / not fully approved):** CREATOR/PREMIUM paid status, exact current quota mapping and draft counting, SIMPLE fallback, cancellation/failed-renewal timing and no grace, over-limit edit treatment, verified chargeback outcomes, overlap precedence, initial UI/email requirements, no trial/provider work now, legacy users moving to SIMPLE as policy, and ADMIN separation are recorded. Resolve remaining open questions and record explicit approval before dependent implementation. Do not invent provider, prices, or billing cadence.
2. **Data foundation — ROLE-01:** after remaining relevant policy approval, model time-bounded grants and audit history; preserve ADMIN; separately plan and execute the approved controlled legacy-role migration to SIMPLE. Encode recorded quota counting and corrective-edit policy; resolve deleted/archived quota semantics before implementation. No migration has been performed here.
3. **Authorization — ROLE-02:** calculate effective server capabilities, exact expiry, overlap, quota and cache/current-user freshness. Cancellation stays active until paid-through expiry; failed renewal falls back to SIMPLE at period end with no grace. Count all owned strolls, including drafts, by publicity category. Permit corrective edits toward compliance and reject edits maintaining/increasing over-limit state. Keep authorization correct without relying on jobs.
4. **Provider lifecycle — ROLE-03 (deferred):** no provider/payment work now. Reopen only after future explicit approval and decisions; if approved, subscription checkout/events only, renew from verified periods, apply the recorded cancellation/failure/chargeback outcomes, process events idempotently/transactionally, and reconcile drift. ADMIN and unrelated purchases remain unaffected by chargebacks.
5. **User/admin experience — ROLE-04:** implement the recorded Settings, Plans, admin role-change modal, and expiration/cancellation email requirements only after relevant backend work. No warning notices for now. Resolve which roles the modal may change, upgrade-button behavior while payments are deferred, and cancellation-email timing/content. Add lifecycle E2E for approved behavior. No UI or email is implemented by this backlog update.

The phases do not supersede P0 security work. SEC-02/SEC-03 have been implemented without waiting for ROLE-01 or broader policy consolidation.

### Required role lifecycle test matrix

- Time boundaries: before start, exact start, immediately before expiry, exact expiry, and after expiry using a controllable UTC clock.
- State transitions: initial grant, renewal, cancellation active through paid-through expiry, failed renewal and SIMPLE fallback at period end with no grace, and exact expiry. No provider event cases are implemented now.
- Event delivery: no provider/event processing in the current scope. If ROLE-03 is later approved, cover duplicate, reordered, delayed, invalid-signature, replay, provider outage/recovery, reconciliation, and concurrent duplicate events.
- Authorization: forged client role, stale token/current-user/cache state, delayed scheduler, and expired entitlement request.
- Overlap and privilege: overlapping grants choose the more valuable/higher quota grant (PREMIUM over CREATOR currently); SIMPLE fallback; ADMIN remains unchanged and is never affected by payment or chargeback events.
- Migration and content: each existing role class, controlled rollback/recovery for the approved CREATOR/PREMIUM-to-SIMPLE migration, preserved owned data, quota counts including drafts grouped by publicity category, and create/activate/edit/publish checks at exact plan limits. Verify corrective edits toward compliance succeed while edits maintaining/increasing over-limit state fail. Resolve deleted/archived quota semantics before testing those cases.
- Chargebacks and communication: verified pending dispute suspends only the disputed grant; user win restores it, upheld chargeback revokes it; ADMIN and unrelated purchases remain unchanged. No warning notices; expiration and cancellation emails include change details. Resolve cancellation-email dispatch timing/content before implementation.
- Concurrency: entitlement state changes and transaction rollback without duplicate or partially applied state; provider-event race cases only if ROLE-03 is later approved.

## Recommended delivery sequence

1. **Completed security remediations:** SEC-01 through SEC-06 addressed revocation, account linking, answer disclosure, media URL authorization, callback transaction binding, and production TLS verification. Consult each completion note for validation boundaries; PostgreSQL/browser E2E and live-provider/deployment checks were not all available. These fixes did not wait on paid-role design.
2. **Stop misleading paid access:** PROD-01 is P0 because mock checkout currently lacks payment confirmation. Until the selected provider/policy is ready, ensure product presentation does not imply a real charge or secure paid unlock. Keep this separate from subscription-role work.
3. **Correct core journey rules:** PROD-02 publish readiness and PROD-03 progression enforcement; then use QA-01 to validate the creator-to-traveller path.
4. **Settle discovery contract:** decide city/address and search semantics, implement PROD-04, then align DX-01 docs/contracts to observed behavior.
5. **Decision gate for paid roles:** ROLE-00 records partial decisions but remains partially approved / not fully approved. Resolve deleted/archived quota semantics, permitted roles in the admin modal, upgrade-button behavior while payments are deferred, cancellation-email timing/content, and provider/payment decisions before dependent implementation. No prices, billing cadence, or trial is specified; provider/payment work is deferred.
6. **Implement approved non-provider role phases only after policy approval:** ROLE-01 then ROLE-02, including the planned but not yet performed move of existing CREATOR/PREMIUM users to SIMPLE. ROLE-03 is not in current scope and requires separate future approval. ROLE-04 follows approved policy and relevant backend work. No implementation or migration has been performed by this documentation update. Maintain separate handling for individual stroll purchase PROD-01.
7. **Measure and improve:** run PERF-01 baseline and define cache freshness/popularity semantics before optimization. Schedule MAINT-01 as a focused deterministic cleanup.
8. **Consolidate and clarify:** MAINT-02 only after approved role semantics; DX-01 reconciles docs/API contracts; PROD-05 records account closure/export policy and assessment without asserting a global absence.

## Unresolved decisions

- **Individual stroll purchase:** provider, price source, refund/dispute behavior, duplicate purchase semantics, admin comping, and free-unlock behavior.
- **Paid roles:** provider selection, price and billing cadence; deleted/archived stroll quota semantics; which roles the admin role-change modal may assign; the Plans upgrade button's behavior while payments are deferred; cancellation-email dispatch timing/content; and any further admin/support-grant policy. No provider/payment work or trial is in scope now. CREATOR/PREMIUM paid status, exact quota mapping, counting drafts by publicity category, cancellation through paid-through expiry, failed-renewal SIMPLE fallback at period end with no grace, corrective-edit behavior, verified-chargeback outcomes, required Settings/Plans/admin-modal surfaces, and expiration/cancellation emails (without warning notices) are recorded decisions. ROLE-00 remains partially approved / not fully approved; no implementation or migration has occurred.
- **Adventure progression:** how stages without riddles advance.
- **Browse:** what fields search covers, how city relates to stage addresses, and prefix/partial matching and pagination behavior.
- **Account data:** whether closure/deactivation and export are product journeys, and retention/anonymization treatment across content, reviews, adventures, audit, and payment data.
- **Performance:** whether the README p95 browse target remains approved/current, representative workload, cache freshness expectation, and measurement budget. No numerical target is set here.

## Validation limits

The original assessment recorded here was a static audit, not a runtime or exploit assessment. No tests were run for that audit; later implementation-time checks and their limitations are recorded under SEC-01–SEC-06. No dependency vulnerability/CVE scan was run. Live cloud deployment, database connectivity, actual provider CA provisioning, and production data were not verified; see SEC-05/SEC-06 for specific validation limits. Git status/diff and pre-existing changes could not be established at audit time. Confidence scores apply only to the six historical static security traces shown above; product and performance findings likewise require implementation-time tests and measurement. Revalidate remaining backlog assumptions against current code and product decisions before implementing any open ticket.
