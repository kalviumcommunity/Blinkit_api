# Local verification — 24 September 2026

## Implemented and fixed

- Added `/signup` and `/login`, inline validation/errors, password visibility, loading states, and sidebar logout/account identity.
- Added PostgreSQL-backed sessions and scrypt password hashes; protected all inventory endpoints. Logout revokes the session; expired sessions cannot access the API.
- Replaced the hardcoded manager ID with the authenticated account ID.
- Switched browser API calls to a same-origin Next.js proxy and added useful connection errors.
- Fixed invalid stock quantities, overlapping stock edits in the active pages, and the dashboard rollback when only the history refresh failed.
- Fixed three existing lint errors and the missing CORS TypeScript declarations.
- Updated Next.js to 16.3.6 and applied compatible security fixes. Frontend audit now reports zero vulnerabilities.
- Added setup instructions, environment examples, a fresh local inventory schema, and an API smoke test.

## Verified

- `client`: ESLint and production build pass.
- `Server`: TypeScript check passes.
- API smoke tests pass against isolated PostgreSQL on `127.0.0.1:55432`: invalid/valid signup, duplicate email normalization, wrong/correct password, session identity, logout/revocation, origin rejection, anonymous access rejection, stock attribution, stock changes, negative-stock rollback, concurrent decrements, product deletion, and history retrieval.
- Browser: signup → dashboard, visible signed-in identity, logout → login, incorrect-password message, and successful login → dashboard.
- The API smoke suite also passes through the production Next.js `/api` proxy on port 3000. Database inspection confirms all test-account passwords are stored as salted hashes.

## Remaining issues / scope

- The supplied `Server/.env` database hostname returned `ENOTFOUND`, including with unrestricted network access. Its credentials were neither displayed nor modified. A correct/reachable provider URL is still needed to use that database; no existing remote data was changed or tested.
- Local verification used an isolated database named `blinkit_test`. Accounts created there do not exist in the provider database. The local database is ignored by Git.
- Backend `npm audit` still reports 13 findings (8 high, 5 moderate) in the Prisma CLI development-tool dependency tree. Its proposed forced fix switches from Prisma 8 RC to Prisma 7 and would require a separate migration. The experimental CLI also reports conflicting peer versions. Do not apply `npm audit fix --force` blindly.
- Registration currently grants access to the shared inventory. There are no administrator roles, invitations, email verification, or password recovery. Add those before opening registration to untrusted users. Login throttling is in memory for this single-server setup; multiple servers need shared throttling and deployment-specific proxy configuration.
- The existing generic product PATCH endpoint permits stock replacement without adding an inventory log. Use the dedicated `/products/:id/stock` endpoint for audited stock changes. Broader CRUD validation (e.g. blank names/invalid prices) also needs tightening.
- Older unused dashboard/API files remain in the repository; the active frontend lives in `client/src/app`, and the active backend starts at `Server/server.js` → `Server/src/app.ts`.

The API automatically creates only the new `app_users` and `app_sessions` tables on startup. Existing inventory tables and historical manager IDs are not migrated.
