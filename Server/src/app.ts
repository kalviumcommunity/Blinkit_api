import express from "express";
import cors from "cors";
import productRoutes from "./routes/productRoutes";
const { authRouter, requireAuth } = require("./auth.js");

const app = express();

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin && req.headers.origin !== clientOrigin) {
    return res.status(403).json({ message: "Request origin is not allowed." });
  }
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/", (_req, res) => {
  res.json({
    message: "Blinkit API is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api", requireAuth, productRoutes);
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON request." });
  console.error("Request failed:", error.message);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

export default app;
