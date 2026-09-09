import { Router } from "express";

import { db } from "../prisma/db";

const router = Router();

// =====================================================
// CREATE PRODUCT
// POST /api/products
// =====================================================

router.post("/products", async (req, res) => {
  try {
    const { name, category, price, stock } = req.body;

    // Validate required fields
    if (
      typeof name !== "string" ||
      typeof category !== "string" ||
      (typeof price !== "number" && typeof price !== "string")
    ) {
      return res.status(400).json({
        message: "name, category and price are required",
      });
    }

    // Stock is optional, default to 0
    const productStock = stock ?? 0;

    if (!Number.isInteger(productStock) || productStock < 0) {
      return res.status(400).json({
        message: "stock must be a non-negative integer",
      });
    }

    const productData = {
      name,
      category,
      price: String(price),
      stock: productStock,
    };

    const product =
      await db.orm.public.Products.create(productData as any);

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

// =====================================================
// GET ALL PRODUCTS
// GET /api/products
// =====================================================

router.get("/products", async (_req, res) => {
  try {
    const products = await db.orm.public.Products.all();

    return res.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);

    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});

// =====================================================
// GET ONE PRODUCT
// GET /api/products/:id
// =====================================================

router.get("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    // Validate product ID
    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await db.orm.public.Products
      .where({ id: productId })
      .first();

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);

    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
});

// =====================================================
// UPDATE PRODUCT
// PATCH /api/products/:id
// =====================================================

router.patch("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    // Validate product ID
    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const { name, category, price, stock } = req.body;

    // Make sure at least one field is provided
    if (
      name === undefined &&
      category === undefined &&
      price === undefined &&
      stock === undefined
    ) {
      return res.status(400).json({
        message: "At least one field is required",
      });
    }

    // Validate name
    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({
        message: "name must be a string",
      });
    }

    // Validate category
    if (category !== undefined && typeof category !== "string") {
      return res.status(400).json({
        message: "category must be a string",
      });
    }

    // Validate price
    if (
      price !== undefined &&
      typeof price !== "number" &&
      typeof price !== "string"
    ) {
      return res.status(400).json({
        message: "price must be a number or string",
      });
    }

    // Validate stock
    if (
      stock !== undefined &&
      (!Number.isInteger(stock) || stock < 0)
    ) {
      return res.status(400).json({
        message: "stock must be a non-negative integer",
      });
    }

    // Check product exists
    const existingProduct = await db.orm.public.Products
      .where({ id: productId })
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

    if (price !== undefined) {
      updateData.price = String(price);
    }

    if (stock !== undefined) {
      updateData.stock = stock;
    }

    const updatedProduct = await db.orm.public.Products
      .where({ id: productId })
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

// =====================================================
// DELETE PRODUCT
// DELETE /api/products/:id
// =====================================================

router.delete("/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    // Validate product ID
    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    // Check product exists
    const existingProduct = await db.orm.public.Products
      .where({ id: productId })
      .first();

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await db.orm.public.Products
      .where({ id: productId })
      .delete();

    return res.json({
      message: "Product deleted successfully",
      product: existingProduct,
    });
  } catch (error) {
    console.error("Failed to delete product:", error);

    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
});

// =====================================================
// UPDATE PRODUCT STOCK
// PATCH /api/products/:id/stock
// =====================================================

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
      // Read current product
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
       * IMPORTANT:
       * This is the current stock-update logic from your file.
       * We will make this atomic/concurrency-safe separately
       * so two simultaneous requests cannot overwrite each other.
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

      // Create inventory log in same transaction
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

    return res.json({
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