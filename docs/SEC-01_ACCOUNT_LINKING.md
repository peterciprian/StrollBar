# SEC-01: social account ownership

## Backend contract

- Ordinary social login authenticates an existing `(provider, providerUserId)`
  identity, never an email match. An email collision returns guidance to sign in
  and explicitly link, reclaim an eligible registration, or use password recovery.
  Inactive accounts are not bypassed by creating another account.
- New provider identities can still sign up. Only an explicit provider
  `emailVerified: true` claims an email; missing or unverified provider email uses
  a synthetic address instead.
  Apple uses its signed `email_verified` claim (boolean or string), not an
  assumption: managed Apple accounts may return false. Facebook Graph's `email`
  field is not an explicit mailbox-verification claim, so Facebook cannot supply
  reclamation/linking proof in this implementation. Existing Facebook identities
  still sign in, and new non-colliding identities can sign up with synthetic email.
  Use a provider with affirmative verified-email proof or mailbox recovery for
  email collisions; do not treat Facebook's person/account verification fields
  as proof of email ownership.
- `POST /auth/social/:provider/link/start-url` requires a valid access JWT and
  `{ currentPassword, redirectUri? }`. The local account must already have verified
  its email. The short-lived signed OAuth state carries explicit link intent,
  account ID, auth version, and a one-way credential fingerprint. The callback
  rechecks these against the live account and requires the provider's verified
  email to match exactly. It cannot transfer an identity from another account.
  Established social-only users must use mailbox password recovery to set a
  password before linking an additional provider.
- `POST /auth/social/:provider/reclaim/start-url` takes `{ email, redirectUri? }`.
  This is an explicit, unauthenticated request to prove ownership, not authority
  to modify an account. No account lookup or mutation happens at this step.
  The callback requires the provider to positively verify that exact email.
- Provider reclamation is limited to active, unverified, ordinary (`simple`)
  local registrations with a local scrypt password hash. Established verified,
  inactive, elevated-role and social-only accounts are not eligible. Rejected
  proof or linking attempts do not change account state or issue tokens.

## Reclamation and recovery

Provider reclamation locks the account and atomically:

1. Replaces the prepared password with an unguessable, non-password credential.
2. Increments `authVersion` and removes the stored refresh token.
3. Removes all existing provider identities for that account.
4. Clears reset and email-verification tokens and their expirations.
5. Marks the email verified and attaches only the proven provider identity.

New sessions are issued only after commit, using the existing credential/version
predicate. Old JWTs, refresh tokens, password logins and stale token issuance
cannot survive reclamation. Prepared profile images are replaced, not trusted.
Concurrent social login rechecks the identity after acquiring the account lock.
Uniqueness conflicts roll back and return account recovery/linking guidance.

Mailbox password recovery is also verified ownership proof. For an unverified
account, consuming the single-use reset token additionally removes prepared
provider links and verification tokens and verifies the email, in the same
transaction as password replacement and session revocation. Recovery for an
already verified account preserves its legitimate provider links. Merely
requesting recovery never reclaims an account. Verification email issuance uses
the current account version so a stale request cannot restore prepared state.

Registration and ordinary password login retain their existing behavior.
Ordinary email verification is not a social link or a reclamation operation.
There is no schema change and no frontend UI addition in this backend ticket.
The new explicit flows can be exposed by a future frontend action; existing
social callbacks already display the returned error/recovery guidance.

## Validation and scope

Focused tests: `cd stroll-bar-backend; npx jest src/modules/auth --runInBand`

Build: `cd stroll-bar-backend; npm run build`

Coverage includes ownership service behavior, unchanged state on rejected
attempts, transactional rollback, credential/session invalidation, reauthentication,
signed callback intent, GET/POST callback redirects, JWT guards and DTO validation.
Service transactions use a deterministic in-memory test double; the controller
tests run a real Nest HTTP application and real JWT strategy. Real PostgreSQL
concurrency and live provider/browser flows require an isolated database and
provider setup and are not simulated as end-to-end coverage.

SEC-05 remains separate: this change does not add browser-bound callback
transactions, state single-use storage, callback token handoff changes, or a new
browser cookie/PKCE transaction protocol.

Provider claim references:
- [Apple identity-token claims](https://developer.apple.com/documentation/signinwithapplejs/authorizationi/id_token)
- [Facebook Graph User email field](https://developers.facebook.com/docs/graph-api/reference/user/)
