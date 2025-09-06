const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function initializeDatabase() {
  try {
    console.log("🗄️  Starting database initialization...");

    // Read the schema file
    const schemaPath = path.join(__dirname, "../../database/schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    // Execute the schema
    await pool.query(schemaSQL);

    console.log("✅ Database schema created successfully!");
    console.log("📊 Tables created: users, products, orders, order_items");
    console.log("👤 Sample admin user: admin@joantee.com");
    console.log("🛍️  Sample products added");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("🎉 Database setup complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Database setup failed:", error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
