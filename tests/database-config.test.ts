import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "pg";
import {
  databaseConnectionOptions,
  databaseFailureDetails,
} from "../lib/db.ts";

test("a copied Render external URL enables verified TLS in the PostgreSQL driver", () => {
  const client = new Client(
    databaseConnectionOptions(
      "postgresql://manager:example-password@dpg-example-a.oregon-postgres.render.com/inventory",
    ),
  );
  assert.deepEqual(client.ssl, { rejectUnauthorized: true });
});

test("local and Render internal URLs keep their existing transport configuration", () => {
  for (const hostname of [
    "127.0.0.1",
    "localhost",
    "dpg-example-a",
    "db.example.test",
  ]) {
    const options = databaseConnectionOptions(
      `postgresql://manager:example-password@${hostname}/inventory`,
    );
    assert.equal(Object.hasOwn(options, "ssl"), false);
  }
});

test("explicit verified TLS and URL-encoded credentials are preserved", () => {
  const connectionString =
    "postgresql://manager:p%40ss%3Aword@dpg-example-a.oregon-postgres.render.com/inventory?sslmode=verify-full&application_name=blinkit";
  const options = databaseConnectionOptions(connectionString);
  assert.equal(options.connectionString, connectionString);
  const client = new Client(options);
  assert.deepEqual(client.ssl, {});
  assert.equal(client.password, "p@ss:word");
});

test("connection diagnostics distinguish TLS, access rules and bad passwords without logging secrets", () => {
  const examples = [
    {
      code: "28000",
      message:
        'no pg_hba.conf entry for host "192.0.2.1", user "private-user", database "private-db", no encryption',
      expected: /unencrypted/,
    },
    { code: "28000", message: "No SNI information found", expected: /SNI/ },
    {
      code: "28000",
      message:
        'no pg_hba.conf entry for host "192.0.2.1", user "private-user", database "private-db", SSL encryption',
      expected: /access rules/,
    },
    {
      code: "28P01",
      message: 'password authentication failed for user "private-user"',
      expected: /username or password/,
    },
    {
      code: "ENOTFOUND",
      message: "getaddrinfo ENOTFOUND private-db",
      expected: /hostname/,
    },
    {
      code: "DEPTH_ZERO_SELF_SIGNED_CERT",
      message: "self-signed certificate",
      expected: /certificate/,
    },
  ];
  for (const { code, message, expected } of examples) {
    const result = databaseFailureDetails({
      code,
      message,
      detail: "example-password",
    });
    assert.equal(result.code, code);
    assert.match(result.reason, expected);
    assert.doesNotMatch(
      JSON.stringify(result),
      /private-user|private-db|192\.0\.2\.1|example-password/,
    );
  }
  assert.deepEqual(
    databaseFailureDetails(null),
    databaseFailureDetails(new Error("secret-value")),
  );
});
