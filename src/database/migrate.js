const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const statements = [
    // --- Initial Setup ---
    "CREATE EXTENSION IF NOT EXISTS citext;",
    // Users table additive columns
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;",

    // Products table additive columns
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_special_delivery BOOLEAN DEFAULT false;",

    // --- Refactor Cart to Order-Level Delivery (Robust Script) ---

    // 1. Create the new 'carts' table. 'IF NOT EXISTS' makes it safe to re-run.
    "CREATE TABLE IF NOT EXISTS carts (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE, delivery_method VARCHAR(20) DEFAULT 'delivery' CHECK (delivery_method IN ('pickup', 'delivery')), delivery_zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",

    // 2. Add 'cart_id' to 'cart_items' if it doesn't exist.
    "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE;",

    // 3. Conditionally migrate data ONLY IF the old 'user_id' column still exists on cart_items.
    `DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cart_items' AND column_name='user_id') THEN
            -- For each user in the old cart_items, create a single corresponding cart.
            INSERT INTO carts (user_id)
            SELECT DISTINCT user_id FROM cart_items
            ON CONFLICT (user_id) DO NOTHING;

            -- Link all of a user's cart items to their new single cart.
            UPDATE cart_items ci SET cart_id = (SELECT id FROM carts c WHERE c.user_id = ci.user_id)
            WHERE ci.cart_id IS NULL;
        END IF;
    END $$;`,

    // 4. Safely drop the old columns from 'cart_items' if they exist.
    "ALTER TABLE cart_items DROP COLUMN IF EXISTS delivery_method;",
    "ALTER TABLE cart_items DROP COLUMN IF EXISTS delivery_zone_id;",

    // --- Final Step ---
    // The user_id column is the last one to be dropped after its data has been migrated.
    "ALTER TABLE cart_items DROP COLUMN IF EXISTS user_id;",

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

    // Customer Management Tables
    `CREATE TABLE IF NOT EXISTS customer_segments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      criteria JSONB NOT NULL,
      customer_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS loyalty_programs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(20) NOT NULL CHECK (type IN ('quarterly', 'annual', 'custom')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      tiers JSONB NOT NULL,
      rewards JSONB NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS communication_campaigns (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('email', 'sms')),
      subject VARCHAR(255),
      content TEXT NOT NULL,
      target_segment VARCHAR(255),
      target_customers TEXT[],
      scheduled_date TIMESTAMP,
      sent_date TIMESTAMP,
      status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
      open_rate DECIMAL(5,2),
      click_rate DECIMAL(5,2),
      delivery_rate DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS customer_preferences (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      sizes TEXT[],
      colors TEXT[],
      brands TEXT[],
      categories TEXT[],
      price_min DECIMAL(10,2),
      price_max DECIMAL(10,2),
      email_notifications BOOLEAN DEFAULT true,
      sms_notifications BOOLEAN DEFAULT false,
      push_notifications BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS customer_loyalty (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      loyalty_points INTEGER DEFAULT 0,
      loyalty_tier VARCHAR(20) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
      total_spent DECIMAL(10,2) DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      average_order_value DECIMAL(10,2) DEFAULT 0,
      last_purchase_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS customer_addresses (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      street VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      zip_code VARCHAR(20) NOT NULL,
      country VARCHAR(100) NOT NULL,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS customer_tags (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      tag VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS customer_notes (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS customer_activity (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'login', 'email_open', 'email_click', 'sms_sent', 'loyalty_earned', 'loyalty_redeemed')),
      description TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS purchase_history (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      order_date TIMESTAMP NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'pending', 'cancelled', 'refunded')),
      payment_method VARCHAR(50),
      shipping_address JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS purchase_history_items (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER REFERENCES purchase_history(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255) NOT NULL,
      size VARCHAR(20),
      color VARCHAR(50),
      price DECIMAL(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // Create indexes for customer management tables
    "CREATE INDEX IF NOT EXISTS idx_customer_segments_name ON customer_segments(name);",
    "CREATE INDEX IF NOT EXISTS idx_loyalty_programs_active ON loyalty_programs(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_communication_campaigns_status ON communication_campaigns(status);",
    "CREATE INDEX IF NOT EXISTS idx_customer_preferences_customer_id ON customer_preferences(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_loyalty_customer_id ON customer_loyalty(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_activity_customer_id ON customer_activity(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_activity_type ON customer_activity(type);",
    "CREATE INDEX IF NOT EXISTS idx_purchase_history_customer_id ON purchase_history(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_purchase_history_order_date ON purchase_history(order_date);",
    "CREATE INDEX IF NOT EXISTS idx_purchase_history_items_purchase_id ON purchase_history_items(purchase_id);",

    // Shopping Cart Tables
    `CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      size VARCHAR(20),
      color VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id, size, color)
    );`,

    // Delivery Zones Table
    `CREATE TABLE IF NOT EXISTS delivery_zones (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      delivery_fee DECIMAL(10,2) NOT NULL CHECK (delivery_fee >= 0),
      estimated_days VARCHAR(50) NOT NULL,
      coverage_areas TEXT[],
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // --- Indexes for Cart and Delivery ---
    "CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);",
    "CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);",
    "CREATE INDEX IF NOT EXISTS idx_delivery_zones_name ON delivery_zones(name);",
    "CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);",

    // Application Settings Table
    `CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
      free_shipping_threshold DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
      large_order_quantity_threshold INTEGER NOT NULL DEFAULT 10,
      large_order_delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
      pickup_address TEXT,
      currency_symbol VARCHAR(5) NOT NULL DEFAULT '$',
      currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT single_row_check CHECK (id = 1)
    );`,

    // Insert default settings if the table is empty
    `INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`,
  ];

  try {
    console.log("\n➡️  Running database migrations...");

    const client = await pool.connect();
    try {
      for (const statement of statements) {
        // Skip empty or comment-only lines
        if (!statement.trim() || statement.trim().startsWith("--")) {
          continue;
        }

        const logStatement = statement.split("\n")[0].substring(0, 80) + "...";
        console.log(`\nExecuting: ${logStatement}`);

        try {
          await client.query(statement);
          console.log(`✅ SUCCESS`);
        } catch (err) {
          console.error(`❌ FAILED`);
          console.error("   Error details:", err.message);
          console.error("   Full Statement:", statement);
          throw err; // Re-throw the error to stop the migration
        }
      }

      console.log("\n✅ Migrations applied successfully.");
    } catch (error) {
      console.error("\n❌ Migration process failed. Halting.");
      // The detailed error is already logged, so we can exit.
    } finally {
      client.release();
    }
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
