import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import {
  databaseFailureDetails,
  initializeDatabase,
  pool,
  transaction,
} from "@/lib/db";
import {
  ApiError,
  changeStock,
  integer,
  productDetails,
} from "@/lib/inventory";
import type { Manager } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const scrypt = promisify(scryptCallback);
const cookieName = "blinkit_inventory_session";
const sessionSeconds = 7 * 24 * 60 * 60;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const attempts = new Map<string, { count: number; expires: number }>();
type Context = { params: Promise<{ path: string[] }> };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function body(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send a JSON request.");
  if (Number(request.headers.get("content-length")) > 8192)
    throw new ApiError(413, "Request is too large.");
  const text = await request.text();
  if (text.length > 8192) throw new ApiError(413, "Request is too large.");
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new ApiError(400, "Send a valid JSON object.");
  }
}

async function requireManager(request: NextRequest): Promise<Manager> {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) throw new ApiError(401, "Sign in to manage inventory.");
  const result = await pool().query<Manager>(
    `SELECT u.id, u.name, u.email FROM app_users u
    JOIN app_sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hash(token)],
  );
  if (!result.rows[0])
    throw new ApiError(401, "Your session expired. Please sign in again.");
  return result.rows[0];
}

async function session(client: PoolClient, user: Manager, oldToken?: string) {
  const token = randomBytes(32).toString("hex");
  await client.query(
    "DELETE FROM app_sessions WHERE expires_at <= NOW() OR token_hash = $1",
    [hash(oldToken || "")],
  );
  await client.query(
    "INSERT INTO app_sessions(token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [hash(token), user.id, new Date(Date.now() + sessionSeconds * 1000)],
  );
  return token;
}

function withCookie(
  response: NextResponse,
  token: string,
  maxAge = sessionSeconds,
) {
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure:
      process.env.COOKIE_SECURE === "true" ||
      (process.env.COOKIE_SECURE === undefined &&
        process.env.NODE_ENV === "production"),
  });
  return response;
}

async function handle(request: NextRequest, context: Context) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const method = request.method;
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      // Behind Render's proxy, request.url can contain the internal host/port.
      // Use the platform's configured public URL, never client-forwarded headers.
      const expectedOrigin = new URL(
        process.env.RENDER_EXTERNAL_URL || request.url,
      ).origin;
      if (
        request.headers.get("sec-fetch-site") === "cross-site" ||
        (origin && origin !== expectedOrigin)
      ) {
        throw new ApiError(403, "Requests must come from this application.");
      }
    }
    await initializeDatabase();
    if (route === "health" && method === "GET") {
      await pool().query("SELECT 1");
      return json({ status: "ok", database: "connected" });
    }
    if (["auth/signup", "auth/login"].includes(route) && method === "POST") {
      const now = Date.now();
      for (const [key, attempt] of attempts)
        if (attempt.expires <= now) attempts.delete(key);
      // Single-process development throttle. Deploy behind a trusted rate-limiting proxy.
      const key =
        request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
      const attempt = attempts.get(key) || { count: 0, expires: now + 60000 };
      attempts.set(key, attempt);
      if (++attempt.count > 30)
        throw new ApiError(429, "Too many attempts. Try again in a minute.");
      const input = await body(request);
      const { email, password, name } = input;
      if (
        typeof email !== "string" ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 128
      ) {
        throw new ApiError(
          400,
          "Enter a valid email and a password of 8–128 characters.",
        );
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (route === "auth/signup") {
        if (
          typeof name !== "string" ||
          !name.trim() ||
          name.trim().length > 100
        )
          throw new ApiError(400, "Enter your name (up to 100 characters).");
        const salt = randomBytes(16).toString("hex");
        const derived = (await scrypt(password, salt, 64)) as Buffer;
        const created = await transaction(async (client) => {
          const result = await client.query<Manager>(
            "INSERT INTO app_users(name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
            [
              name.trim(),
              normalizedEmail,
              `${salt}:${derived.toString("hex")}`,
            ],
          );
          const user = result.rows[0];
          return {
            user,
            token: await session(
              client,
              user,
              request.cookies.get(cookieName)?.value,
            ),
          };
        });
        return withCookie(json({ user: created.user }, 201), created.token);
      }
      const result = await pool().query<Manager & { password_hash: string }>(
        "SELECT * FROM app_users WHERE email = $1",
        [normalizedEmail],
      );
      const user = result.rows[0];
      const [salt, stored] = user
        ? user.password_hash.split(":")
        : ["missing-account", "00".repeat(64)];
      const derived = (await scrypt(password, salt, 64)) as Buffer;
      const storedBuffer = Buffer.from(stored, "hex");
      if (
        storedBuffer.length !== derived.length ||
        !timingSafeEqual(derived, storedBuffer) ||
        !user
      )
        throw new ApiError(401, "Email or password is incorrect.");
      const publicUser: Manager = {
        id: user.id,
        name: user.name,
        email: user.email,
      };
      const token = await transaction((client) =>
        session(client, publicUser, request.cookies.get(cookieName)?.value),
      );
      return withCookie(json({ user: publicUser }), token);
    }
    if (route === "auth/logout" && method === "POST") {
      const token = request.cookies.get(cookieName)?.value;
      if (token)
        await pool().query("DELETE FROM app_sessions WHERE token_hash = $1", [
          hash(token),
        ]);
      return withCookie(json({ message: "Signed out." }), "", 0);
    }
    const manager = await requireManager(request);
    if (route === "auth/me" && method === "GET") return json({ user: manager });
    if (route === "products" && method === "GET") {
      const result = await pool().query(
        "SELECT * FROM products ORDER BY id DESC",
      );
      return json({ products: result.rows });
    }
    if (route === "products" && method === "POST") {
      const input = await body(request);
      if ("stock" in input && input.stock !== 0)
        throw new ApiError(
          400,
          "Products start at zero. Use the stock button to add units with an audit log.",
        );
      const { name, category, price } = productDetails(input);
      const result = await pool().query(
        "INSERT INTO products(name, category, price) VALUES ($1, $2, $3) RETURNING *",
        [name, category, price],
      );
      return json({ product: result.rows[0] }, 201);
    }
    if (path[0] === "products" && /^\d+$/.test(path[1] || "")) {
      const id = integer(Number(path[1]), "Product ID");
      if (path.length === 3 && path[2] === "stock" && method === "PATCH") {
        const input = await body(request);
        return json(
          await changeStock(id, manager.id, input.change, input.requestId),
        );
      }
      if (path.length === 2 && method === "GET") {
        const result = await pool().query(
          "SELECT * FROM products WHERE id = $1",
          [id],
        );
        if (!result.rows[0]) throw new ApiError(404, "Product not found.");
        return json({ product: result.rows[0] });
      }
      if (path.length === 2 && ["PATCH", "DELETE"].includes(method)) {
        const input = await body(request);
        const version = integer(input.version, "Product version", 0);
        return await transaction(async (client) => {
          const result = await client.query(
            "SELECT * FROM products WHERE id = $1 FOR UPDATE",
            [id],
          );
          const current = result.rows[0];
          if (!current) throw new ApiError(404, "Product not found.");
          if (current.version !== version)
            throw new ApiError(
              409,
              "Another manager updated this product. Refresh before editing.",
            );
          if (method === "DELETE") {
            if (current.stock !== 0)
              throw new ApiError(
                409,
                "Reduce stock to zero before deleting. The stock history will be kept.",
              );
            await client.query("DELETE FROM products WHERE id = $1", [id]);
            return json({
              message: "Product deleted. Stock history preserved.",
            });
          }
          if ("stock" in input)
            throw new ApiError(
              400,
              "Use the dedicated stock endpoint so every change is logged.",
            );
          const { name, category, price } = productDetails(input);
          const updated = await client.query(
            "UPDATE products SET name = $2, category = $3, price = $4, version = version + 1, updated_at = NOW() WHERE id = $1 RETURNING *",
            [id, name, category, price],
          );
          return json({ product: updated.rows[0] });
        });
      }
    }
    if (route === "inventory-logs" && method === "GET") {
      const beforeValue = request.nextUrl.searchParams.get("before");
      const before =
        beforeValue === null
          ? 2147483647
          : integer(Number(beforeValue), "Log cursor");
      const result = await pool().query(
        `SELECT l.*, u.name AS manager_name FROM inventory_logs l
        JOIN app_users u ON u.id = l.manager_id WHERE l.id < $1 ORDER BY l.id DESC LIMIT 100`,
        [before],
      );
      return json({
        logs: result.rows,
        nextCursor: result.rows.length === 100 ? result.rows.at(-1).id : null,
      });
    }
    throw new ApiError(404, "Endpoint not found.");
  } catch (error) {
    if (error instanceof ApiError)
      return json({ message: error.message }, error.status);
    const code = (error as { code?: string }).code;
    if (code === "23505")
      return json(
        {
          message: "An account with this email already exists. Please sign in.",
        },
        409,
      );
    console.error("API request failed:", databaseFailureDetails(error));
    return json(
      { message: "The database is unavailable. Please try again shortly." },
      503,
    );
  }
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
