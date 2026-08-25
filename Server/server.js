const pool = require("./src/config/db");

async function testDatabase() {
    try {
        const result = await pool.query("SELECT current_database()");
        console.log("Connected to:", result.rows[0].current_database);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    } finally {
        await pool.end();
    }
}

testDatabase();