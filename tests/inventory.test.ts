import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { NextRequest } from "next/server";
import type { PoolClient } from "pg";

config({ path: [".env.local", ".env"], quiet: true });
if (process.env.TEST_DATABASE_URL)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!process.env.DATABASE_URL)
  throw new Error(
    "Set TEST_DATABASE_URL or DATABASE_URL to a local PostgreSQL database.",
  );
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error("Tests require a local disposable PostgreSQL database.");
const schema = `blinkit_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
process.env.DATABASE_SCHEMA = schema;
process.env.COOKIE_SECURE = "false";
const { initializeDatabase, pool } = await import("../lib/db.ts");
const { GET, POST, PATCH, DELETE } =
  await import("../app/api/[...path]/route.ts");
const handlers = { GET, POST, PATCH, DELETE };
let alice = "";
let bob = "";
let aliceId = 0;
let bobId = 0;

async function call(
  path: string,
  method: keyof typeof handlers = "GET",
  data?: unknown,
  cookie = alice,
  extraHeaders: Record<string, string> = {},
) {
  const request = new NextRequest(`http://localhost:3000/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...extraHeaders,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const response = await handlers[method](request, {
    params: Promise.resolve({ path: path.split("?")[0].split("/") }),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}

async function product(stock = 0) {
  const created = await call("products", "POST", {
    name: "Test milk",
    category: "Dairy",
    price: 65,
  });
  assert.equal(created.status, 201);
  if (stock) {
    const updated = await call(
      `products/${created.data.product.id}/stock`,
      "PATCH",
      { change: stock, requestId: randomUUID() },
    );
    assert.equal(updated.status, 200);
    return updated.data.product;
  }
  return created.data.product;
}

before(async () => {
  await initializeDatabase();
  const a = await call(
    "auth/signup",
    "POST",
    {
      name: "Alice",
      email: "alice@example.test",
      password: "Test-password-123",
    },
    "",
  );
  const b = await call(
    "auth/signup",
    "POST",
    { name: "Bob", email: "bob@example.test", password: "Test-password-123" },
    "",
  );
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  alice = a.cookie;
  aliceId = a.data.user.id;
  bob = b.cookie;
  bobId = b.data.user.id;
});

after(async () => {
  // Only the exact, randomly named schemas owned by this test run are dropped.
  assert.match(schema, /^blinkit_test_[a-f0-9]{16}$/);
  await pool().query(
    `DROP SCHEMA IF EXISTS "${schema}" CASCADE; DROP SCHEMA IF EXISTS "${schema}_legacy_backup" CASCADE;`,
  );
  await pool().end();
});

test("fresh inventory is empty; endpoints require a manager session", async () => {
  assert.deepEqual((await call("products")).data.products, []);
  assert.equal((await call("products", "GET", undefined, "")).status, 401);
  assert.equal(
    (await call("inventory-logs", "GET", undefined, "")).status,
    401,
  );
  assert.equal((await call("auth/me")).data.user.id, aliceId);
  assert.equal((await call("auth/me")).data.user.password_hash, undefined);
});

test("new pooled connections select the inventory schema before any transaction", async () => {
  const clients: PoolClient[] = [];
  try {
    // Holding clients forces the pool to open additional connections.
    for (let i = 0; i < 3; i++) clients.push(await pool().connect());
    for (const client of clients) {
      const result = await client.query(
        "SELECT current_schema() AS active_schema, current_schemas(false)::text[] AS schemas",
      );
      assert.equal(result.rows[0].active_schema, schema);
      assert.deepEqual(result.rows[0].schemas, [schema]);
      const managers = await client.query(
        "SELECT count(*)::int AS n FROM app_users",
      );
      assert.equal(managers.rows[0].n, 2);
    }
  } finally {
    for (const client of clients) client.release();
  }
});

test("two managers' concurrent additions accumulate and have a continuous audit trail", async () => {
  const p = await product(10);
  const results = await Promise.all([
    call(
      `products/${p.id}/stock`,
      "PATCH",
      { change: 7, requestId: randomUUID(), managerId: 9999 },
      alice,
    ),
    call(
      `products/${p.id}/stock`,
      "PATCH",
      { change: 5, requestId: randomUUID() },
      bob,
    ),
  ]);
  assert.deepEqual(
    results.map((result) => result.status),
    [200, 200],
  );
  assert.equal((await call(`products/${p.id}`)).data.product.stock, 22);
  assert.deepEqual(
    results.map((result) => result.data.inventoryLog.manager_id),
    [aliceId, bobId],
  );
  const logs = (
    await pool().query(
      "SELECT * FROM inventory_logs WHERE product_id = $1 ORDER BY id",
      [p.id],
    )
  ).rows;
  assert.equal(logs.length, 3);
  assert.equal(logs[1].old_stock, 10);
  assert.equal(logs[2].old_stock, logs[1].new_stock);
  assert.equal(logs[2].new_stock, 22);
});

test("concurrent removals cannot oversell or create a failed audit entry", async () => {
  const p = await product(10);
  const results = await Promise.all(
    [alice, bob].map((cookie) =>
      call(
        `products/${p.id}/stock`,
        "PATCH",
        { change: -7, requestId: randomUUID() },
        cookie,
      ),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  assert.equal((await call(`products/${p.id}`)).data.product.stock, 3);
  assert.equal(
    (
      await pool().query(
        "SELECT count(*)::int AS n FROM inventory_logs WHERE product_id = $1",
        [p.id],
      )
    ).rows[0].n,
    2,
  );
});

test("retries use a request ID so a successful adjustment is not applied twice", async () => {
  const p = await product();
  const input = { change: 9, requestId: randomUUID() };
  const results = await Promise.all([
    call(`products/${p.id}/stock`, "PATCH", input),
    call(`products/${p.id}/stock`, "PATCH", input),
  ]);
  assert.deepEqual(
    results.map((result) => result.status),
    [200, 200],
  );
  assert.equal(results.filter((result) => result.data.replayed).length, 1);
  assert.equal((await call(`products/${p.id}`)).data.product.stock, 9);
  assert.equal(
    (await call(`products/${p.id}/stock`, "PATCH", input, bob)).status,
    409,
  );
});

test("an audit insert failure rolls back the stock update in the same transaction", async () => {
  const p = await product(12);
  await pool()
    .query(`CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Test audit failure'; END $$;
    CREATE TRIGGER reject_test_audit BEFORE INSERT ON inventory_logs FOR EACH ROW EXECUTE FUNCTION reject_test_audit();`);
  try {
    const result = await call(`products/${p.id}/stock`, "PATCH", {
      change: 2,
      requestId: randomUUID(),
    });
    assert.equal(result.status, 503);
    assert.equal((await call(`products/${p.id}`)).data.product.stock, 12);
  } finally {
    await pool().query(
      "DROP TRIGGER reject_test_audit ON inventory_logs; DROP FUNCTION reject_test_audit();",
    );
  }
});

test("stock bypasses, invalid deltas, bad prices and malformed requests are rejected", async () => {
  const p = await product();
  for (const change of [0, 1.5, "5", null, 2147483648]) {
    assert.equal(
      (
        await call(`products/${p.id}/stock`, "PATCH", {
          change,
          requestId: randomUUID(),
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (await call(`products/${p.id}/stock`, "PATCH", { change: 1 })).status,
    400,
  );
  assert.equal(
    (
      await call(`products/${p.id}`, "PATCH", {
        name: "Milk",
        category: "Dairy",
        price: 2,
        stock: 100,
        version: p.version,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("products", "POST", {
        name: "Milk",
        category: "Dairy",
        price: 2,
        stock: 100,
      })
    ).status,
    400,
  );
  for (const price of [-1, 1.234, "abc"])
    assert.equal(
      (
        await call("products", "POST", {
          name: "Milk",
          category: "Dairy",
          price,
        })
      ).status,
      400,
    );
  assert.equal((await call("products", "POST", [])).status, 400);
  assert.equal((await call(`products/${p.id}`)).data.product.stock, 0);
});

test("stale metadata edits cannot overwrite another manager's changes", async () => {
  const p = await product();
  const updated = await call(`products/${p.id}`, "PATCH", {
    name: "Fresh milk",
    category: "Dairy",
    price: 70,
    version: p.version,
  });
  assert.equal(updated.status, 200);
  assert.equal(
    (
      await call(
        `products/${p.id}`,
        "PATCH",
        {
          name: "Stale name",
          category: "Dairy",
          price: 60,
          version: p.version,
        },
        bob,
      )
    ).status,
    409,
  );
  assert.equal(
    (await call(`products/${p.id}`)).data.product.name,
    "Fresh milk",
  );
});

test("product deletion requires zero stock and preserves the historical product name", async () => {
  const p = await product(5);
  assert.equal(
    (await call(`products/${p.id}`, "DELETE", { version: p.version })).status,
    409,
  );
  const zero = await call(`products/${p.id}/stock`, "PATCH", {
    change: -5,
    requestId: randomUUID(),
  });
  assert.equal(
    (
      await call(`products/${p.id}`, "DELETE", {
        version: zero.data.product.version,
      })
    ).status,
    200,
  );
  assert.equal((await call(`products/${p.id}`)).status, 404);
  const logs = (await call("inventory-logs")).data.logs.filter(
    (log: { product_id: number }) => log.product_id === p.id,
  );
  assert.equal(logs.length, 2);
  assert.equal(logs[0].product_name, "Test milk");
});

test("cross-origin writes are rejected before they mutate data", async () => {
  assert.equal(
    (
      await call(
        "products",
        "POST",
        { name: "Bad", category: "Test", price: 1 },
        alice,
        { Origin: "https://untrusted.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call("auth/logout", "POST", undefined, alice, {
        "Sec-Fetch-Site": "cross-site",
      })
    ).status,
    403,
  );
  assert.equal((await call("auth/me")).status, 200);
});

test("signup normalizes emails; password hashes and session revocation work", async () => {
  assert.equal(
    (
      await call(
        "auth/signup",
        "POST",
        {
          name: "Other",
          email: "ALICE@example.test",
          password: "Test-password-123",
        },
        "",
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await call(
        "auth/login",
        "POST",
        { email: "alice@example.test", password: "incorrect-password" },
        "",
      )
    ).status,
    401,
  );
  const hash = (
    await pool().query("SELECT password_hash FROM app_users WHERE id = $1", [
      aliceId,
    ])
  ).rows[0].password_hash;
  assert.match(hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal((await call("auth/logout", "POST")).status, 200);
  assert.equal((await call("auth/me")).status, 401);
  const login = await call(
    "auth/login",
    "POST",
    { email: "ALICE@example.test", password: "Test-password-123" },
    "",
  );
  assert.equal(login.status, 200);
  alice = login.cookie;
  assert.equal((await call("auth/me")).data.user.id, aliceId);
});
