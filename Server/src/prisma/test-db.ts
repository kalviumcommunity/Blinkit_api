import { db } from "./db";

async function testDatabase() {
  try {
    const products = await db.orm.public.Products.all();

    console.log("Products from PostgreSQL:");
    console.log(products);
  } catch (error) {
    console.error("Prisma query failed:", error);
  }
}

testDatabase();