require("dotenv").config();
require("tsx/cjs");

const { default: app } = require("./src/app.ts");

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});