import { Router } from "express";
import { db } from "../prisma/db";

const router = Router();


// GET all products
router.get("/products", async (_req, res) => {
  try {
    const products = await db.orm.public.Products.all();

    res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});


// UPDATE product stock
router.patch("/products/:id/stock", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { change, managerId } = req.body;

    // Validate product ID
    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    // Validate stock change
    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({
        message: "Change must be a non-zero integer",
      });
    }

    // Validate manager ID
    if (!Number.isInteger(managerId)) {
      return res.status(400).json({
        message: "managerId must be an integer",
      });
    }

    // Run stock update and inventory log inside one transaction
    const result = await db.transaction(async (tx) => {

      // Read the current product inside the transaction
      const product = await tx.orm.public.Products
        .where({ id: productId })
        .first();

      // Product does not exist
      if (!product) {
        const error = new Error("Product not found");
        error.name = "PRODUCT_NOT_FOUND";
        throw error;
      }

      const oldStock = product.stock;
      const newStock = oldStock + change;

      // Prevent negative stock
      if (newStock < 0) {
        const error = new Error("Stock cannot be negative");
        error.name = "NEGATIVE_STOCK";
        throw error;
      }

      /*
       * Concurrency protection:
       *
       * Only update the product if its stock is still equal
       * to the value that we originally read.
       *
       * If another request changed the stock first,
       * this update will return null instead of overwriting it.
       */
      const updatedProduct = await tx.orm.public.Products
        .where({
          id: productId,
          stock: oldStock,
        })
        .update({
          stock: newStock,
        });

      // Another request changed the stock first
      if (!updatedProduct) {
        const error = new Error(
          "Stock was changed by another request. Please try again."
        );

        error.name = "CONCURRENCY_CONFLICT";
        throw error;
      }

      // Create inventory log in the same transaction
      const inventoryLog =
        await tx.orm.public.InventoryLogs.create({
          productId,
          managerId,
          change,
          oldStock,
          newStock,
        });

      return {
        product: updatedProduct,
        inventoryLog,
      };
    });

    res.json({
      message: "Stock updated successfully",
      product: result.product,
      inventoryLog: result.inventoryLog,
    });

  } catch (error) {
    console.error("Failed to update stock:", error);

    // Product not found
    if (
      error instanceof Error &&
      error.name === "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Negative stock
    if (
      error instanceof Error &&
      error.name === "NEGATIVE_STOCK"
    ) {
      return res.status(400).json({
        message: "Stock cannot be negative",
      });
    }

    // Concurrency conflict
    if (
      error instanceof Error &&
      error.name === "CONCURRENCY_CONFLICT"
    ) {
      return res.status(409).json({
        message:
          "Stock was changed by another request. Please try again.",
      });
    }

    // Other database/server errors
    return res.status(500).json({
      message: "Failed to update stock",
    });
  }
});


export default router;