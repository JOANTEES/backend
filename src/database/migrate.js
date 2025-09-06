const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const statements = [
    // Users table additive columns
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;",

    // Bookings table and indexes
    `CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      event_title VARCHAR(255) NOT NULL,
      event_type VARCHAR(100),
      date DATE NOT NULL,
      time VARCHAR(10),
      duration INTEGER,
      location VARCHAR(255),
      price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
      payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','partial')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    "CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);",
    "CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);",

    // Payments table (Paystack-friendly)
    `CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
      currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
      method VARCHAR(50) NOT NULL DEFAULT 'paystack',
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
      provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
      provider_reference VARCHAR(255),
      paystack_reference VARCHAR(255),
      transaction_id VARCHAR(255),
      authorization_code VARCHAR(255),
      customer_email VARCHAR(255),
      metadata JSONB,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,
    "CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);",
    "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);",
  ];

  try {
    console.log("\n➡️  Running database migrations...");
    for (const sql of statements) {
      await pool.query(sql);
    }
    console.log("✅ Migrations applied successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
