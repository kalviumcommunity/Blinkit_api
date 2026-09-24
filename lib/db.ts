import { Pool, type PoolClient } from "pg";

const globals = globalThis as unknown as {
  blinkitPool?: Pool;
  blinkitSchemaReady?: Promise<void>;
};

export function schemaName() {
  const schema = process.env.DATABASE_SCHEMA || "blinkit";

  if (
    !/^[a-z][a-z0-9_]{0,49}$/.test(schema) ||
    ["public", "information_schema"].includes(schema) ||
    schema.startsWith("pg_")
  ) {
    throw new Error(
      "DATABASE_SCHEMA must be a separate lowercase schema name, such as blinkit.",
    );
  }

  return schema;
}

export function pool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Set DATABASE_URL in .env.local before starting the application.",
    );
  }

  return (globals.blinkitPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  }));
}

export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `SET search_path TO "${schemaName()}", public`,
    );

    const value = await work(client);

    await client.query("COMMIT");

    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  const schema = schemaName();

  globals.blinkitSchemaReady ??= transaction(async (client) => {
    // Serialize first-run setup across workers.
    // Old tables in public are left untouched.
    await client.query("SELECT pg_advisory_xact_lock(204924, 1)");

    const existing = await client.query(
      "SELECT 1 FROM information_schema.schemata WHERE schema_name = $1",
      [schema],
    );

    if (!existing.rowCount) {
      const backup = `${schema}_legacy_backup`;

      // Keep a backup of any old public tables before creating the new schema.
      await client.query(
        `CREATE SCHEMA IF NOT EXISTS "${backup}"`,
      );

      for (const table of [
        "products",
        "inventory_logs",
        "app_users",
        "app_sessions",
      ]) {
        const old = await client.query(
          "SELECT to_regclass($1) AS name",
          [`public.${table}`],
        );

        if (old.rows[0].name) {
          await client.query(
            `CREATE TABLE IF NOT EXISTS "${backup}"."${table}" AS TABLE public."${table}"`,
          );
        }
      }

      await client.query(`CREATE SCHEMA "${schema}"`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL CHECK (length(trim(name)) > 0),
        email VARCHAR(254) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL
          REFERENCES app_users(id)
          ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS session_expiry
        ON app_sessions(expires_at);

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL
          CHECK (length(trim(name)) > 0),
        category VARCHAR(100) NOT NULL
          CHECK (length(trim(category)) > 0),
        price NUMERIC(10,2) NOT NULL
          CHECK (price >= 0),
        stock INTEGER NOT NULL DEFAULT 0
          CHECK (stock >= 0),
        version INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        manager_id INTEGER NOT NULL
          REFERENCES app_users(id),
        change INTEGER NOT NULL
          CHECK (change != 0),
        old_stock INTEGER NOT NULL
          CHECK (old_stock >= 0),
        new_stock INTEGER NOT NULL
          CHECK (new_stock >= 0),
        request_id UUID UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CHECK (
          new_stock::bigint =
          old_stock::bigint + change::bigint
        )
      );

      CREATE INDEX IF NOT EXISTS logs_created
        ON inventory_logs(created_at DESC, id DESC);

      CREATE INDEX IF NOT EXISTS logs_product
        ON inventory_logs(product_id);
    `);
  }).catch((error) => {
    globals.blinkitSchemaReady = undefined;
    throw error;
  });

  await globals.blinkitSchemaReady;
}