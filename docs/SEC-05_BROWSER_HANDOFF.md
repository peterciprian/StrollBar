# SEC-05: browser-bound social authentication handoff

## Protocol and invariants

1. The initiating tab generates a 256-bit random verifier using Web Crypto.
   It keeps the verifier, a ten-minute deadline, and its validated return path
   in `sessionStorage`, never in a navigable URL or shared `localStorage`.
2. Initiation sends only `browserChallenge = BASE64URL(SHA256(verifier))`.
   The backend persists the challenge and the existing explicit account intent,
   returns `{ url, transactionId }`, and signs the unpredictable transaction ID
   into the provider state. The tab saves that ID before navigating.
3. GET and Apple form-POST provider callbacks verify the signed state, provider,
   persisted transaction, and expiry. An atomic conditional update claims the
   callback once, before provider I/O. Old stateless states fail closed.
   Cancellation also consumes a valid transaction.
4. A successful provider callback stores the verified profile and only a SHA256
   hash of a fresh 256-bit handoff code. It redirects with `code` and
   `transactionId`, **not access or refresh tokens**. The handoff expires in
   60 seconds and never outlives the original ten-minute transaction.
5. The frontend callback rejects legacy token parameters, errors, duplicate or
   missing handoff parameters, absent local proof, mismatched transactions, and
   locally expired proof. It removes callback parameters from browser history.
   SSR does not process the callback; only the browser has the tab-local proof.
6. `POST /auth/social/exchange` takes `{ code, transactionId, verifier }`.
   A single PostgreSQL `DELETE ... RETURNING` checks both expirations, the code
   hash, callback completion, transaction ID, and S256 challenge. Only the
   winning exchange can proceed to account authorization and token issuance,
   even across workers or concurrent requests. Invalid proof does not consume
   a valid transaction. A consumed transaction cannot be retried after a network
   failure; start again.
7. Account authorization still uses the unchanged SEC-01 `SocialUserService`
   and its persisted initiation intent, **not intent from callback navigation**.
   Email collisions, current-password/verified-account linking, reclamation
   eligibility, locking, auth-version invalidation, and credential predicates
   are unchanged. These account operations now run only after browser proof.
   API recovery/linking guidance remains visible; URL-supplied error text is
   never treated as trusted guidance.
8. Tokens are installed only from a successful exchange response. Local proof
   is consumed before making that request. Failed proof never clears tokens,
   dispatches session expiry, or fetches a replacement user. The exchange is an
   anonymous auth endpoint in the interceptor, so its 401 cannot refresh or
   invalidate an existing session.

Expired database transactions (including their short-lived provider profiles)
are removed on the next initiation. The indexed expiration predicates enforce
expiry independently of cleanup. Logs identify protocol boundaries without
recording codes, verifiers, signed states, profiles, or credentials.

## Deployment and API compatibility

- Apply migration `1754200000000-social-transactions` before deploying the new
  backend. Its table is shared persistent storage, not a per-process cache.
  The migration supports rollback by dropping only this new table.
- Deploy frontend and backend together. All initiation endpoints now require
  a browser S256 challenge. Link/reclaim JSON bodies add `browserChallenge`;
  their existing authentication and reauthentication requirements still apply.
  Old clients and in-flight stateless callbacks must restart rather than
  falling back to bearer credentials in URLs.
- The frontend uses the application's document base URI and path router for
  `/auth/social/callback`. Configure `AUTH_FRONTEND_REDIRECT_URL` as a path URL,
  for example `https://strollbar.app/auth/social/callback`, not a legacy hash
  route. Redirect-origin restrictions and provider callback URLs are unchanged.
- Web Crypto needs HTTPS (or localhost); unavailable crypto or session storage
  fails initiation without changing the existing session.
- This ticket does not enable the currently hidden social buttons or add
  linking/reclamation UI. It does not change SEC-01 account ownership policy.

## Validation

Executed successfully:

- Backend auth tests: `cd stroll-bar-backend; npx jest src/modules/auth --runInBand`
  (6 suites, 122 tests)
- Backend test type-check: `npx tsc -p tsconfig.spec.json --noEmit`
- Backend build: `npm --workspace stroll-bar-backend run build`
- Focused frontend feature, callback component, API client, auth interceptor,
  refresh, and guard Jest tests (6 suites, 57 tests);
  `npm --workspace stroll-bar-frontend run test:types`
- Frontend production and Playwright development/SSR builds
- New Playwright spec type-check, including its fixtures

Additional provider-free integration coverage:

- `stroll-bar-backend/test/social-transactions.e2e-spec.ts` uses real isolated
  PostgreSQL and a mocked provider, testing atomic concurrent callback/exchange,
  replay, wrong-browser/code proof, expiration, and unchanged existing sessions.
  Use the existing `TEST_DB_*` isolation contract and
  `npx jest --config test/jest-e2e.json social-transactions --runInBand`.
- `stroll-bar-frontend/e2e/playwright/social-callback.spec.ts` uses the real API
  and disposable database with provider proof supplied only by the loopback
  test server. It covers legitimate initiation, replay, attacker URLs in fresh
  and authenticated browsers, mismatched verifier, and expired/replayed codes.
  Because social buttons are currently hidden, it invokes their existing login
  handler through Angular's development-only debug API.

Playwright was attempted but could not start its database: Docker Desktop's
Linux-engine pipe was unavailable. The PostgreSQL integration suite and browser
journeys therefore remain unexecuted in this environment; unit mocks are not
claimed as database concurrency or browser validation. An initial parallel
Playwright build hit Windows resource exhaustion; retrying with
`NG_BUILD_MAX_WORKERS=2` built successfully and reached the Docker blocker.
No live provider or production database was used.

Protocol reference: [RFC 7636, S256 challenge and verifier](https://www.rfc-editor.org/rfc/rfc7636).
