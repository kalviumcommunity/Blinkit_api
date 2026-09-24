require("dotenv").config();
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Copy Server/.env.example to Server/.env and configure PostgreSQL.");
  process.exit(1);
}
require("tsx/cjs");

const { default: app } = require("./src/app.ts");
const { connectDatabase } = require("./src/prisma/db.ts");
const { initializeAuth } = require("./src/auth.js");

const PORT = process.env.PORT || 5000;

// Start server
async function startServer() {
  try {
    // Connect to PostgreSQL first
    await connectDatabase();
    await initializeAuth();

    console.log("Database connected successfully");

    // Start Express server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
}

startServer();
