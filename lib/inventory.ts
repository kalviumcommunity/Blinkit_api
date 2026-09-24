import { transaction } from "./db.ts";
import type { InventoryLog, Product } from "./types.ts";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function integer(
  value: unknown,
  name: string,
  min = 1,
  max = 2147483647,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new ApiError(
      400,
      `${name} must be a whole number between ${min} and ${max}.`,
    );
  }
  return value;
}

export function productDetails(body: Record<string, unknown>) {
  const { name, category, price } = body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 100
  ) {
    throw new ApiError(
      400,
      "Enter a product name and category, each up to 100 characters.",
    );
  }
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 99999999.99 ||
    Math.abs(price * 100 - Math.round(price * 100)) > 0.00001
  ) {
    throw new ApiError(
      400,
      "Enter a valid nonnegative price with up to two decimal places.",
    );
  }
  return { name: name.trim(), category: category.trim(), price };
}

export async function changeStock(
  productId: number,
  managerId: number,
  change: unknown,
  requestId: unknown,
) {
  const delta = integer(change, "Stock change", -2147483647);
  if (delta === 0)
    throw new ApiError(400, "Stock change must be different from zero.");
  if (
    typeof requestId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    throw new ApiError(400, "A valid requestId is required.");
  }
  return transaction(async (client) => {
    // Lock the request key first: retries must never apply an adjustment twice.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [requestId],
    );
    const previous = await client.query<InventoryLog>(
      "SELECT * FROM inventory_logs WHERE request_id = $1",
      [requestId],
    );
    if (previous.rows[0]) {
      const log = previous.rows[0];
      if (
        log.product_id !== productId ||
        log.manager_id !== managerId ||
        log.change !== delta
      ) {
        throw new ApiError(
          409,
          "This request ID was already used for another update.",
        );
      }
      const current = await client.query<Product>(
        "SELECT * FROM products WHERE id = $1",
        [productId],
      );
      if (!current.rows[0])
        throw new ApiError(
          404,
          "This product was deleted after the adjustment.",
        );
      return { product: current.rows[0], inventoryLog: log, replayed: true };
    }
    // The next manager waits here and reads the committed stock, never a stale total.
    const result = await client.query<Product>(
      "SELECT * FROM products WHERE id = $1 FOR UPDATE",
      [productId],
    );
    const product = result.rows[0];
    if (!product)
      throw new ApiError(404, "Product not found. Refresh your inventory.");
    const next = product.stock + delta;
    if (next < 0)
      throw new ApiError(
        409,
        `Only ${product.stock} units are available. Refresh and try a smaller reduction.`,
      );
    if (next > 2147483647)
      throw new ApiError(400, "This adjustment exceeds the maximum stock.");
    const updated = await client.query<Product>(
      "UPDATE products SET stock = $2, version = version + 1, updated_at = NOW() WHERE id = $1 RETURNING *",
      [productId, next],
    );
    const logged = await client.query<InventoryLog>(
      `INSERT INTO inventory_logs
      (product_id, product_name, manager_id, change, old_stock, new_stock, request_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        productId,
        product.name,
        managerId,
        delta,
        product.stock,
        next,
        requestId,
      ],
    );
    return {
      product: updated.rows[0],
      inventoryLog: logged.rows[0],
      replayed: false,
    };
  });
}
