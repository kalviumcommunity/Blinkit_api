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
