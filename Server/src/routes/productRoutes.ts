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

    // Find the product
    const product = await db.orm.public.Products
      .where({ id: productId })
      .first();

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // Calculate new stock
    const oldStock = product.stock;
    const newStock = oldStock + change;

    // Prevent negative stock
    if (newStock < 0) {
      return res.status(400).json({
        message: "Stock cannot be negative",
      });
    }

    // Update the product
    const updatedProduct = await db.orm.public.Products
      .where({ id: productId })
      .update({
        stock: newStock,
      });

    // Create inventory log
    const inventoryLog = await db.orm.public.InventoryLogs.create({
      productId,
      managerId,
      change,
      oldStock,
      newStock,
    });

    res.json({
      message: "Stock updated successfully",
      product: updatedProduct,
      inventoryLog,
    });

  } catch (error) {
    console.error("Failed to update stock:", error);

    res.status(500).json({
      message: "Failed to update stock",
    });
  }
});


export default router;