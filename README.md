# Blinkit_api

## Run locally

Use Node.js 24 and PostgreSQL 15 or newer. Run the commands below from this directory (the one containing `Server` and `client`).

1. In `Server`, run `npm ci`. Copy `.env.example` to `.env` if it does not already exist and set `DATABASE_URL` to a working PostgreSQL connection string. Keep credentials out of Git.
2. For a **new empty local database**, run `psql "$DATABASE_URL" -f scripts/local-schema.sql` from `Server` (in PowerShell, use `$env:DATABASE_URL` after setting it in that terminal). Skip this when connecting to an existing inventory database. Auth tables are created automatically on API startup; the database user needs permission to create tables.
3. In `Server`, run `npm start` (port 5000).
4. In another terminal, enter `client`, run `npm ci`, then `npm run dev` (port 3000).
5. Open http://localhost:3000/signup and create your account. Signup signs you in; future visits use `/login`. Log out using the sidebar.

The browser uses a same-origin `/api` proxy. Set `client/.env.local` with `API_SERVER_URL` only if the API uses another address. Set `CLIENT_ORIGIN` in `Server/.env` if changing the frontend origin. Restart the relevant server after changing environment variables. `NEXT_PUBLIC_API_URL` is no longer used.

Passwords are salted and hashed with scrypt. Sessions are stored in PostgreSQL, expire after seven days, and use HttpOnly/SameSite cookies. Production cookies require HTTPS with `NODE_ENV=production`. Inventory endpoints enforce authentication, and stock logs derive the manager ID from the session.

This is a shared inventory workspace: every registered account can manage the same inventory. Email verification, password recovery, invitation-only signup, and administrator roles are not implemented.

## Verification

- Client: `npm run lint` and `npm run build`.
- Server: `npx tsc --noEmit`.
- Against an API connected to a **disposable local database only**, run `npm test` in `Server`. This creates test users and stock history, deletes its test product, and checks auth, API protection, stock attribution, negative-stock prevention, and concurrent updates. It leaves test accounts/history in the disposable database. Set `TEST_API_URL` to test through the frontend proxy, e.g. `http://localhost:3000/api`.

See `TESTING.md` for the local test results and remaining issues.


# Blinkit Inventory Backend

Backend API for managing products, stock, and inventory logs using Node.js, Express, PostgreSQL, and Prisma.

## Completed Features

- Product CRUD APIs
- Stock update API
- Atomic and concurrency-safe stock updates
- Negative stock prevention
- Automatic inventory logging
- Inventory Logs GET API
- PostgreSQL database integration

## Main APIs

- `POST /api/products`
- `GET /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `PATCH /api/products/:id/stock`
- `GET /api/inventory-logs`

## Tech Stack

Node.js • Express • TypeScript • PostgreSQL • Prisma
Credits to -: Sanskriti kant (Database)
                Devesh (Frontend)
                Deepak (overall)
