# Blinkit Inventory

A fresh Next.js + TypeScript application with PostgreSQL, manager accounts, independent stock buttons, optimistic feedback, and an audit trail. The frontend and backend run together on port 3000.

## Start here

Open a terminal in **this root folder**, then run:

```powershell
npm start
```

Open **http://localhost:3000** and create your manager account. Add a product, then use its **Add / Remove → Update** controls to change stock. New products start at zero. Every nonzero adjustment creates a history entry with the signed-in manager's ID.

**`start.ts` is the single startup file.** It loads `.env.local`, starts the configured local PostgreSQL cluster when needed, initializes the schema, and launches Next.js. Next.js serves the UI and `/api/*` backend in one process. No second terminal or separate Express server is needed. Next.js still uses a few source files for pages, routes, and database code.

Dependencies are installed on this machine. On another machine, install Node.js 22+ and PostgreSQL 15+, then:

```powershell
npm ci
Copy-Item .env.example .env.local
# Edit DATABASE_URL in .env.local to point to an existing PostgreSQL database.
npm start
```

The database must already exist; the app creates its tables and schemas. The PostgreSQL role needs permission to create schemas and tables. `PGDATA` and `PGBIN` are optional settings for an already initialized local cluster, not required for an externally managed database. They are configured for this machine. PostgreSQL remains running after the app closes.

## Database and preserved work

The supplied remote PostgreSQL hostname returned `ENOTFOUND` on 24 September 2026, including outside the network sandbox. Its original connection details are preserved in **`.env.previous`**, and the original server environment file is also in the archived project. No remote records were modified or verified.

The working local configuration uses the already installed PostgreSQL 18 instance on `127.0.0.1:55432`, database `blinkit_test`:

| Schema                  | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `blinkit`               | Fresh app tables: products, managers, sessions, and stock history |
| `blinkit_legacy_backup` | One-time row snapshots of the four old public tables              |
| `public`                | Original tables, preserved unchanged                              |

The backup contains the existing local records: 0 products, 6 stock logs, and 4 manager accounts, plus the old session records. Backups preserve rows; they are not complete schema/constraint exports. The original tables remain available with their original structure.

The app starts with an empty inventory and no seeded managers. Normal restarts preserve all new data. To connect to a corrected remote database, update `DATABASE_URL`, remove the optional local `PGDATA` / `PGBIN` settings, and restart. A new `DATABASE_SCHEMA` creates a fresh workspace and snapshots the recognized old public tables on first setup. Nothing is automatically deleted.

The two previous project copies, including the old Git repository and credentials, are preserved under **`legacy/`**. They are excluded from TypeScript checks, linting, and the new app. The active project is this folder, not a subfolder of `legacy`.

## How concurrent updates work

The browser sends a **delta** such as `+10` or `-3`, never a replacement stock total. The API derives the manager ID from the session cookie. In one PostgreSQL transaction it:

1. Deduplicates the request using a UUID, so retrying a timed-out request cannot add stock twice.
2. Locks the product using `SELECT … FOR UPDATE`.
3. Reads the latest committed quantity and rejects negative stock.
4. Updates the quantity and inserts the audit record.
5. Commits both changes together, or rolls both back.

Two managers adding 7 and 5 units to a stock of 10 leave **22** units. Two managers each removing 7 from 10 produce one success and one conflict, leaving **3** units.

The UI updates the affected row immediately, shows a saving state, and reconciles with the committed result. On failure it rolls back only that row and refreshes from the database. Other products remain independently usable. Inventory refreshes every eight seconds while the inventory view is visible, and when the window regains focus. History has a Refresh button and cursor-based loading of older entries.

Product metadata uses a version check to reject stale edits. Direct stock replacement is rejected. Products can be deleted only at zero stock, and their historical names and logs remain available.

## Files

```text
start.ts                  One startup entry point
app/page.tsx              Typed UI: accounts, inventory, stock buttons, history
app/globals.css           Responsive styles
app/layout.tsx            Page shell and metadata
app/api/[...path]/route.ts All API endpoints and session handling
lib/db.ts                 PostgreSQL pool, transactions, schema and backup setup
lib/inventory.ts          Validation and concurrency-safe stock adjustments
lib/types.ts              Shared TypeScript data types
tests/inventory.test.ts   Isolated PostgreSQL integration tests
.env.local                Active private database configuration (ignored)
.env.previous             Original private configuration (ignored)
legacy/                   Previous project copies (ignored)
```

## Checks and production

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run start:production
```

`npm start` and `npm run dev` start development mode. Production mode requires `npm run build` first and still uses the same `start.ts` launcher. Stop the development server before starting production on the same port.

Tests create a uniquely named temporary schema on a local PostgreSQL connection and remove only their own schemas afterward. They do not reset your inventory. `TEST_DATABASE_URL` can point to a separate local test database. See `TESTING.md` for verification results.

Passwords use salted scrypt hashes. Sessions use HttpOnly/SameSite cookies and expire after seven days. This is a shared team/demo workspace: anyone who registers can manage the inventory. Use `COOKIE_SECURE=true` behind HTTPS. Invitation-only access, password recovery, and distributed login throttling are outside this assignment.

## API reference

| Method               | Path                              | Purpose                                           |
| -------------------- | --------------------------------- | ------------------------------------------------- |
| POST                 | `/api/auth/signup`                | Create a manager and session                      |
| POST                 | `/api/auth/login`                 | Sign in                                           |
| POST                 | `/api/auth/logout`                | Revoke the session                                |
| GET                  | `/api/auth/me`                    | Current manager                                   |
| GET / POST           | `/api/products`                   | List / create products                            |
| GET / PATCH / DELETE | `/api/products/:id`               | Read / edit details / delete a zero-stock product |
| PATCH                | `/api/products/:id/stock`         | Adjust stock with `{ change, requestId }`         |
| GET                  | `/api/inventory-logs?before=<id>` | Latest 100 log entries or an older page           |
| GET                  | `/api/health`                     | Database connectivity                             |

All inventory endpoints require a manager session. Metadata edits and deletion require the product's current `version`. Creating a product requires `name`, `category`, and `price`; its initial stock is always zero.
