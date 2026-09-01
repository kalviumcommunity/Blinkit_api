import { Router } from "express";
import { db } from "../prisma/db";

const router = Router();

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

export default router;