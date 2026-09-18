require("dotenv").config();
require("tsx/cjs");

const { default: app } = require("./src/app.ts");
const { connectDatabase } = require("./src/prisma/db.ts");

const PORT = process.env.PORT || 5000;

// Start server
async function startServer() {
  try {
    // Connect to PostgreSQL first
    await connectDatabase();

    console.log("Database connected successfully");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
}

startServer();