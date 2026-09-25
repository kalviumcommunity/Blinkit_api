# Verification — 24 September 2026

## Automated checks

- `npm run typecheck`: passed.
- `npm run lint`: passed with no errors or warnings.
- `npm run build`: passed; `/` is the page and `/api/[...path]` serves the backend.
- `npm test`: **10 integration tests passed** against real PostgreSQL 18. Each run uses a unique temporary schema and cleans it up afterward.
- Dependency installation audit: **0 vulnerabilities** reported.

## Integration coverage

1. Empty inventory and authentication on all inventory endpoints.
2. Concurrent additions by **two distinct managers**: 10 + 7 + 5 = 22, both manager IDs recorded, continuous before/after audit chain.
3. Concurrent removals: only one of two −7 requests against 10 succeeds; final stock is 3 with no failed-change audit entry.
4. Concurrent retries of the same request UUID apply only once. Another manager cannot reuse it.
5. An intentionally failed audit insert rolls back the stock update in the same transaction.
6. Direct stock replacement, invalid quantities, invalid prices, and malformed requests are rejected.
7. Stale metadata edits return a conflict and cannot overwrite another manager.
8. Deletion requires zero stock and preserves the historical product name and audit records.
9. Cross-origin mutations are rejected.
10. Normalized email uniqueness, password hashing, login, and session revocation.

## Browser verification

Verified in the Codex browser against the actual Next.js app on port 3000:

- Signup opens the empty workspace with the new manager ID.
- Creating a product displays zero stock.
- Its individual Update button adds 10 units and shows a success message.
- Stock history displays the correct manager ID, +10 change, 0 → 10 quantity, and timestamp.
- Removing 11 from a visible stock of 10 shows inline feedback and leaves stock unchanged.
- Logout returns to the account form; login restores the workspace.
- The account screen and inventory were visually inspected at the browser's normal narrow viewport. The inventory table scrolls horizontally within its panel.

The temporary UI test account, product, and stock log were removed after verification. The delivered inventory, account list, and history are empty.

## Data preservation

Verified local `public` and `blinkit_legacy_backup` both contain 6 historical logs and 4 manager accounts. The original local products table was empty. Original public tables were not reset. The old project directories are preserved under `legacy/`.

The supplied remote database returned `ENOTFOUND` and could not be tested or backed up. Its saved connection configuration is retained in `.env.previous`; the running application uses the installed local PostgreSQL instance.

## Environment notes

The Windows execution sandbox could not initialize the TypeScript runner's OS user lookup. The app and integration tests ran successfully outside that sandbox using the same documented npm commands. Initial PostgreSQL startup recovered the previously interrupted local cluster; it is now accepting connections.

## Render installation fix

Render's `npm ci` failure was reproduced locally. The lockfile omitted `@emnapi/core` and `@emnapi/runtime` peer dependencies and had an incompatible `@emnapi/wasi-threads` entry. Regenerating the lockfile with npm 11.19.1 restored these entries without changing the direct dependencies in `package.json`.

- A clean `npm ci --include=dev` installation with npm 11.19.1 passed in an isolated Windows project copy.
- `npm run build` passed using that freshly installed dependency tree, including TypeScript checks and page generation.
- An `npm ci --include=dev --dry-run --ignore-scripts --os=linux --cpu=x64 --libc=glibc` check with npm 11.19.1 passed from a separate folder containing only the two package manifests. This verifies Linux dependency resolution; it is not a build executed on Linux or Render.

Keep Render's build command as `npm ci --include=dev && npm run build` and its start command as `npm run start:production`. Deploy the latest commit on `codex/nextjs-inventory` after the lockfile fix is pushed.

## Vercel / Render database connection — 25 September 2026

The supplied Vercel logs show the earlier deployment failing with `ENOTFOUND` and the deployment using the external database URL failing with PostgreSQL `28000`. This confirms hostname resolution was fixed and PostgreSQL then rejected connection authorization. The original logs contain no PostgreSQL message, so they do not prove whether the rejection was caused by TLS or access rules.

External Render database URLs now default to verified TLS. Explicit URL SSL settings still take precedence. Server logs classify connection failures using fixed descriptions without logging connection strings, passwords, or raw PostgreSQL error messages.

- All **15 tests passed** after integrating remote commit `89020db`: 4 connection/diagnostic checks and 11 real-PostgreSQL integration tests. Each pooled connection now awaits schema setup, and transactions do not fall back to legacy public tables.
- A new integration regression holds three connections open and verifies that each selects only the inventory schema before any transaction.
- The connection tests exercise the installed PostgreSQL driver's TLS configuration, explicit verified TLS, encoded credentials, and secret-free diagnostic output. They do not connect to Render.
- Production build, including TypeScript validation, passed.
- ESLint passed for the changed TypeScript files.

The deployed connection must be checked through `/api/health` after deploying this change with the external Render URL in Vercel's Production environment.
