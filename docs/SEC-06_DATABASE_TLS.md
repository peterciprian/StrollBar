# SEC-06: PostgreSQL TLS verification

## Configuration contract

The API and TypeORM migration CLI share `database.config.ts`.

| Setting | Behavior |
| --- | --- |
| `DB_SSL=verify-full` | TLS with certificate-chain, validity and `DB_HOST` identity verification. |
| `DB_SSL=true` or `require` | Compatibility aliases for **the same verified TLS**; never encryption-only. |
| `DB_SSL=false` or unset | Plaintext, allowed only outside `NODE_ENV=production` for local PostgreSQL. |
| Other values (including an explicitly empty value) | Configuration error; startup fails. |
| `DB_SSL_CA_FILE` | Optional path to a PEM CA bundle; must be readable and contain only currently valid CA certificates. Empty paths, malformed bundles and CA settings with TLS disabled fail startup. |

Modes are case-insensitive but whitespace is not silently stripped. Production
must explicitly enable TLS. There is no insecure TLS mode. Without a CA file,
Node's default trust roots apply; with a file, that bundle supplies the trust
anchors. Certificate/hostname failures terminate the connection, with no plaintext
or non-verifying fallback. Do not use `NODE_TLS_REJECT_UNAUTHORIZED=0` or connection
URL SSL parameters as a workaround. Keep `DB_HOST` equal to the provider's actual
service hostname, not a URL or an unverified DNS alias.

## Current deployment: Render application, Aiven PostgreSQL

The existing database environment uses an Aiven PostgreSQL service. Aiven's
[Node.js connection instructions](https://aiven.io/docs/products/postgresql/howto/connect-node)
require the service CA downloaded from its service overview, passed as `ssl.ca`
with `rejectUnauthorized: true`. A generic/public CA bundle, a guessed chain, or
an arbitrary certificate copied from a network connection is not a substitute.

**Before deploying this change:**

1. In the authenticated Aiven console, open the intended PostgreSQL service's
   overview and download its CA certificate. Confirm the service and hostname
   match the deployment's `DB_HOST`. Use the provider's trusted control plane
   to obtain/confirm the CA, not an unauthenticated endpoint.
2. In Render, open the backend service's **Environment → Secret Files** and add
   `aiven-ca.pem` containing the actual downloaded PEM certificate/bundle.
   Render mounts it at `/etc/secrets/aiven-ca.pem`; see
   [Render secret-file documentation](https://render.com/docs/configure-environment-variables#secret-files).
   Secret file contents are deliberately not in the Blueprint or repository.
3. Apply the Blueprint settings: `NODE_ENV=production`, `DB_SSL=verify-full`,
   `DB_SSL_CA_FILE=/etc/secrets/aiven-ca.pem`. Existing services must also have
   the secret file added manually; applying YAML alone does not provision it.
4. Deploy and check `/v1/health/db` and startup/connection logs. A missing file
   fails configuration; an incorrect CA or hostname fails the handshake. Fix
   the CA/hostname rather than disabling verification.
5. On provider CA rotation, obtain the replacement through the same trusted
   channel, update the Render secret file, redeploy, and recheck health. During
   an announced overlap, a PEM bundle can contain both currently valid CAs.

No live Render/Aiven validation or CA retrieval was performed as part of this
change. Deployment requires operator access to provision the genuine service CA.
If the provider changes, select its documented trust anchors and update the
Blueprint path deliberately; for a publicly trusted endpoint the CA setting
can be removed (verification remains enabled).

## Local development and migrations

Local Docker/native PostgreSQL does not enable TLS: use `DB_SSL=false`, omit
`DB_SSL_CA_FILE`, and use `NODE_ENV=development` or `test`, as in `.env.example`.
An existing ignored `.env.development` that connects to Aiven with `require`
now needs `DB_SSL_CA_FILE` pointing to the downloaded service CA too.
For production migration commands, export the same verified TLS settings and
make the CA file available in that process; the migration CLI shares this policy.

## Validation

From the repository root:

```text
npm exec --workspace stroll-bar-backend -- jest src/database/database.config.spec.ts --runInBand
npm run build:backend
```

Tests use local TLS handshakes and synthetic certificate fixtures, not a cloud
database: trusted chain succeeds; self-signed, untrusted, expired and wrong-host
certificates fail. They also check malformed/unknown settings, production
plaintext rejection, migration options and the Render production settings.
`src/database/fixtures/tls.json` contains a deliberately public **test-only**
EC private key and certificates. Valid fixtures span 2020–2120; the expired
leaf spans 2000–2001. The test CA's private key was discarded. Never install
these fixtures as application/provider credentials or production trust anchors.

Implementation references:
[node-postgres SSL](https://node-postgres.com/features/ssl),
[Node TLS](https://nodejs.org/api/tls.html),
[Node X509Certificate](https://nodejs.org/api/crypto.html#class-x509certificate).
