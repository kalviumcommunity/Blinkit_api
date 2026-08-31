import express from "express";
import productRoutes from "./routes/productRoutes";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Blinkit API is running",
  });
});

app.use("/api", productRoutes);

export default app;