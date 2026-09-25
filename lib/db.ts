import { Pool, type PoolClient, type PoolConfig } from "pg";

const globals = globalThis as unknown as {
  blinkitPool?: Pool;
  blinkitSchemaReady?: Promise<void>;
};

export function databaseConnectionOptions(
  connectionString: string,
): PoolConfig {
  const hostname = new URL(connectionString).hostname;
  return {
    connectionString,
    // Render's public endpoints require TLS. Keep certificate verification on.
    // pg still honors explicit SSL parameters in the connection URL.
    ...(hostname.endsWith(".render.com")
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  };
}

export function databaseFailureDetails(error: unknown) {
  const failure = error as { code?: unknown; message?: unknown } | null;
  const code =
    typeof failure?.code === "string" && /^[A-Z0-9_]+$/.test(failure.code)
      ? failure.code
      : "UNKNOWN";
  const message = typeof failure?.message === "string" ? failure.message : "";
  let reason =
    "Unexpected server error; inspect the database and deployment configuration.";
  if (code === "28000") {
    if (
      /no encryption|ssl off|ssl (?:is )?required|tls (?:is )?required/i.test(
        message,
      )
    )
      reason =
        "PostgreSQL rejected an unencrypted connection. Enable TLS for the external database URL.";
    else if (/no sni|sni information/i.test(message))
      reason =
        "PostgreSQL requires TLS with the full external hostname for SNI.";
    else if (/pg_hba\.conf/i.test(message))
      reason =
        "PostgreSQL rejected this host/user/database combination. Check external access rules and connection credentials.";
    else
      reason =
        "PostgreSQL rejected connection authorization. Check the database role and external access rules.";
  } else if (code === "28P01") {
    reason = "PostgreSQL rejected the database username or password.";
  } else if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    reason =
      "The database hostname could not be resolved. Vercel requires the external database hostname.";
  } else if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code)) {
    reason =
      "The database TLS certificate could not be verified. Check the hostname and certificate configuration.";
  } else if (code === "ECONNREFUSED" || code === "ETIMEDOUT") {
    reason =
      "The database connection was refused or timed out. Check availability and network access.";
  }
  // Only fixed descriptions are logged: never raw SQL errors or connection URLs.
  return { code, reason };
}

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
    ...databaseConnectionOptions(process.env.DATABASE_URL),
    // Await setup for every new connection, including non-transactional reads.
    onConnect: async (client) => {
      await client.query("SELECT set_config('search_path', $1, false)", [
        schemaName(),
      ]);
    },
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

    await client.query(`SET LOCAL search_path TO "${schemaName()}"`);

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
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${backup}"`);

      for (const table of [
        "products",
        "inventory_logs",
        "app_users",
        "app_sessions",
      ]) {
        const old = await client.query("SELECT to_regclass($1) AS name", [
          `public.${table}`,
        ]);

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
