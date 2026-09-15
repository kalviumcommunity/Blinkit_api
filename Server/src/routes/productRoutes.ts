import { Router } from "express";
import { db } from "../prisma/db";
import { param } from "@prisma/orm-postgres/relational-core/expression";

const router = Router();

router.post("/products", async (req, res) => {
  try {
    const { name, category, stock, price } = req.body;

    if (!name || !category || stock === undefined || price === undefined) {
      return res.status(400).json({
        message: "name, category, stock and price are required",
      });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({
        message: "stock must be a non-negative integer",
      });
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        message: "price must be a non-negative number",
      });
    }

    const product = await db.orm.public.Products.create({
      name,
      category,
      stock,
      price: numericPrice as any,
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Failed to create product:", error);

    return res.status(500).json({
      message: "Failed to create product",
    });
  }
});



router.get("/products", async (_req, res) => {
  try {
    const products = await db.orm.public.Products.all();

    return res.json({
      products,
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await db.orm.public.Products
      .where({
        id: productId,
      })
      .first();

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json({
      product,
    });
  } catch (error) {
    console.error("Failed to fetch product:", error);

    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const { name, category, stock, price } = req.body;

    const existingProduct = await db.orm.public.Products
      .where({
        id: productId,
      })
      .first();

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) {
        return res.status(400).json({
          message: "stock must be a non-negative integer",
        });
      }

      updateData.stock = stock;
    }

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({
          message: "price must be a non-negative number",
        });
      }

      updateData.price = String(numericPrice);
    }

    const updatedProduct = await db.orm.public.Products
      .where({
        id: productId,
      })
      .update(updateData);

    return res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Failed to update product:", error);

    return res.status(500).json({
      message: "Failed to update product",
    });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const existingProduct = await db.orm.public.Products
      .where({
        id: productId,
      })
      .first();

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await db.orm.public.Products
      .where({
        id: productId,
      })
      .delete();

    return res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete product:", error);

    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
});

router.patch("/products/:id/stock", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { change, managerId } = req.body;


    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({
        message: "Change must be a non-zero integer",
      });
    }

    if (!Number.isInteger(managerId)) {
      return res.status(400).json({
        message: "managerId must be an integer",
      });
    }
    const result = await db.transaction(async (tx) => {
      // First check that the product exists.
      const product = await tx.orm.public.Products
        .where({
          id: productId,
        })
        .first();

      if (!product) {
        const error = new Error("Product not found");
        error.name = "PRODUCT_NOT_FOUND";
        throw error;
      }

      /*
       * ATOMIC STOCK UPDATE
       *
       * PostgreSQL performs:
       *
       *     stock = stock + change
       *
       * directly inside the UPDATE statement.
       *
       * The WHERE condition:
       *
       *     stock >= -change
       *
       * prevents the stock from becoming negative.
       *
       * Example:
       *
       * Current stock = 100
       * Change = -30
       *
       * Condition:
       *
       * 100 >= 30  -> TRUE
       *
       * New stock:
       *
       * 100 + (-30) = 70
       */

      const changeParam = param(change, {
        codecId: "pg/int4@1",
      });

      const updatePlan = tx.sql.public.products
        .update((f, fns) => ({
          stock: fns.raw`${f.stock} + ${changeParam}`.returns(
            "pg/int4@1"
          ),
        }))
        .where((f, fns) =>
          fns.and(
            fns.eq(f.id, productId),
            fns.gte(f.stock, -change)
          )
        )
        .build();

      /*
       * IMPORTANT:
       *
       * In the Prisma RC version installed in your project,
       * tx.execute() gives statement statistics.
       *
       * So we check affectedRows instead of trying to
       * read updatedRows[0].
       */

      const updateStats = await tx.execute(updatePlan);

      if (updateStats.affectedRows === 0) {
        const error = new Error("Stock cannot be negative");
        error.name = "NEGATIVE_STOCK";
        throw error;
      }

      // Read the updated product inside the SAME transaction.
      const updatedProduct = await tx.orm.public.Products
        .where({
          id: productId,
        })
        .first();

      if (!updatedProduct) {
        const error = new Error("Product not found");
        error.name = "PRODUCT_NOT_FOUND";
        throw error;
      }

      // Calculate the old stock from the new stock.
      const newStock = updatedProduct.stock;
      const oldStock = newStock - change;

      // --------------------------------------------------
      // CREATE INVENTORY LOG
      // --------------------------------------------------

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

    // --------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------

    return res.json({
      message: "Stock updated successfully",
      product: result.product,
      inventoryLog: result.inventoryLog,
    });

  } catch (error) {
    console.error("Failed to update stock:", error);

    // Product doesn't exist
    if (
      error instanceof Error &&
      error.name === "PRODUCT_NOT_FOUND"
    ) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Stock would become negative
    if (
      error instanceof Error &&
      error.name === "NEGATIVE_STOCK"
    ) {
      return res.status(400).json({
        message: "Stock cannot be negative",
      });
    }

    // Unexpected server/database error
    return res.status(500).json({
      message: "Failed to update stock",
    });
  }
});

// ======================================================
// GET INVENTORY LOGS
// GET /api/inventory-logs
// ======================================================

router.get("/inventory-logs", async (_req, res) => {
  try {
    const logs = await db.orm.public.InventoryLogs.all();

    return res.json({
      logs,
    });
  } catch (error) {
    console.error("Failed to fetch inventory logs:", error);

    return res.status(500).json({
      message: "Failed to fetch inventory logs",
    });
  }
});

export default router;