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
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_eligible BOOLEAN DEFAULT true;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_eligible BOOLEAN DEFAULT true;",

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

    // Enhanced Orders Table (4 payment/delivery combinations)
    "DROP TABLE IF EXISTS orders CASCADE;",
    `CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      
      -- Order Status
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'processing', 'ready_for_pickup', 
        'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'
      )),
      
      -- Payment Information
      payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('online', 'on_delivery', 'on_pickup')),
      payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
      payment_reference VARCHAR(255),
      
      -- Delivery Information
      delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('delivery', 'pickup')),
      delivery_zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL,
      pickup_location_id INTEGER REFERENCES pickup_locations(id) ON DELETE SET NULL,
      
      -- Address Information
      delivery_address_id INTEGER REFERENCES customer_addresses(id) ON DELETE SET NULL,
      delivery_address JSONB,
      
      -- Pricing Breakdown
      subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal > 0),
      tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      large_order_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      special_delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
      
      -- Order Tracking
      notes TEXT,
      customer_notes TEXT,
      estimated_delivery_date DATE,
      actual_delivery_date TIMESTAMP,
      
      -- Timestamps
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TIMESTAMP,
      shipped_at TIMESTAMP,
      delivered_at TIMESTAMP
    );`,

    // Enhanced Order Items Table
    "DROP TABLE IF EXISTS order_items CASCADE;",
    `CREATE TABLE order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      
      -- Product Details (snapshot at time of order)
      product_name VARCHAR(255) NOT NULL,
      product_description TEXT,
      product_image_url VARCHAR(500),
      size VARCHAR(20),
      color VARCHAR(50),
      
      -- Pricing
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
      subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal > 0),
      
      -- Special flags
      requires_special_delivery BOOLEAN DEFAULT false,
      
      -- Timestamps
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

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

    `CREATE TABLE IF NOT EXISTS pickup_locations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      region_id INTEGER REFERENCES ghana_regions(id) ON DELETE CASCADE,
      city_id INTEGER REFERENCES ghana_cities(id) ON DELETE CASCADE,
      area_name VARCHAR(100) NOT NULL,
      landmark VARCHAR(255),
      additional_instructions TEXT,
      contact_phone VARCHAR(30),
      contact_email VARCHAR(255),
      operating_hours JSONB,
      is_active BOOLEAN DEFAULT true,
      google_maps_link TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // Drop and recreate customer_addresses table with new structure
    "DROP TABLE IF EXISTS customer_addresses CASCADE;",
    `CREATE TABLE customer_addresses (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      region_id INTEGER REFERENCES ghana_regions(id) ON DELETE CASCADE,
      city_id INTEGER REFERENCES ghana_cities(id) ON DELETE CASCADE,
      area_name VARCHAR(100) NOT NULL,
      landmark VARCHAR(255),
      additional_instructions TEXT,
      contact_phone VARCHAR(30),
      is_default BOOLEAN DEFAULT false,
      google_maps_link TEXT,
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
    "CREATE INDEX IF NOT EXISTS idx_pickup_locations_active ON pickup_locations(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_pickup_locations_region_city ON pickup_locations(region_id, city_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_customer_addresses_region_city ON customer_addresses(region_id, city_id);",

    // Enhanced indexes for orders
    "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);",
    "CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);",
    "CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);",
    "CREATE INDEX IF NOT EXISTS idx_orders_delivery_method ON orders(delivery_method);",
    "CREATE INDEX IF NOT EXISTS idx_orders_delivery_zone ON orders(delivery_zone_id);",
    "CREATE INDEX IF NOT EXISTS idx_orders_pickup_location ON orders(pickup_location_id);",
    "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);",
    "CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);",

    // Enhanced indexes for order_items
    "CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);",
    "CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);",
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

    // Ghana Regions Table
    `CREATE TABLE IF NOT EXISTS ghana_regions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      code VARCHAR(10) NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // Ghana Cities Table
    `CREATE TABLE IF NOT EXISTS ghana_cities (
      id SERIAL PRIMARY KEY,
      region_id INTEGER REFERENCES ghana_regions(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(region_id, name)
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

    // Delivery Zone Areas Table
    `CREATE TABLE IF NOT EXISTS delivery_zone_areas (
      id SERIAL PRIMARY KEY,
      delivery_zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE CASCADE,
      region_id INTEGER REFERENCES ghana_regions(id) ON DELETE CASCADE,
      city_id INTEGER REFERENCES ghana_cities(id) ON DELETE CASCADE,
      area_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(delivery_zone_id, region_id, city_id, area_name)
    );`,

    // --- Indexes for Cart and Delivery ---
    "CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);",
    "CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);",
    "CREATE INDEX IF NOT EXISTS idx_delivery_zones_name ON delivery_zones(name);",
    "CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_ghana_regions_active ON ghana_regions(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_ghana_cities_region_id ON ghana_cities(region_id);",
    "CREATE INDEX IF NOT EXISTS idx_ghana_cities_active ON ghana_cities(is_active);",
    "CREATE INDEX IF NOT EXISTS idx_delivery_zone_areas_zone_id ON delivery_zone_areas(delivery_zone_id);",
    "CREATE INDEX IF NOT EXISTS idx_delivery_zone_areas_region_city ON delivery_zone_areas(region_id, city_id);",

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

    // Insert Ghana Regions (16 regions)
    `INSERT INTO ghana_regions (name, code) VALUES
    ('Greater Accra', 'GA'),
    ('Ashanti', 'AS'),
    ('Western', 'WE'),
    ('Eastern', 'EA'),
    ('Volta', 'VO'),
    ('Central', 'CE'),
    ('Northern', 'NO'),
    ('Upper East', 'UE'),
    ('Upper West', 'UW'),
    ('Brong-Ahafo', 'BA'),
    ('Western North', 'WN'),
    ('Ahafo', 'AH'),
    ('Bono', 'BO'),
    ('Bono East', 'BE'),
    ('Oti', 'OT'),
    ('Savannah', 'SA')
    ON CONFLICT (code) DO NOTHING;`,

    // Insert major cities for each region
    `INSERT INTO ghana_cities (region_id, name) VALUES
    -- Greater Accra
    (1, 'Accra'),
    (1, 'Tema'),
    (1, 'Madina'),
    (1, 'Adenta'),
    -- Ashanti
    (2, 'Kumasi'),
    (2, 'Obuasi'),
    (2, 'Ejisu'),
    (2, 'Konongo'),
    -- Western
    (3, 'Takoradi'),
    (3, 'Sekondi'),
    (3, 'Tarkwa'),
    (3, 'Prestea'),
    -- Eastern
    (4, 'Koforidua'),
    (4, 'Nkawkaw'),
    (4, 'Mpraeso'),
    (4, 'Begoro'),
    -- Volta
    (5, 'Ho'),
    (5, 'Keta'),
    (5, 'Hohoe'),
    (5, 'Kpando'),
    -- Central
    (6, 'Cape Coast'),
    (6, 'Kasoa'),
    (6, 'Winneba'),
    (6, 'Swedru'),
    -- Northern
    (7, 'Tamale'),
    (7, 'Yendi'),
    (7, 'Savelugu'),
    (7, 'Tolon'),
    -- Upper East
    (8, 'Bolgatanga'),
    (8, 'Navrongo'),
    (8, 'Bawku'),
    (8, 'Paga'),
    -- Upper West
    (9, 'Wa'),
    (9, 'Lawra'),
    (9, 'Jirapa'),
    (9, 'Nandom'),
    -- Brong-Ahafo
    (10, 'Sunyani'),
    (10, 'Techiman'),
    (10, 'Berekum'),
    (10, 'Bechem'),
    -- Western North
    (11, 'Sefwi Wiawso'),
    (11, 'Bibiani'),
    (11, 'Juaboso'),
    (11, 'Aowin'),
    -- Ahafo
    (12, 'Goaso'),
    (12, 'Bechem'),
    (12, 'Hwidiem'),
    (12, 'Kenyasi'),
    -- Bono
    (13, 'Sunyani'),
    (13, 'Berekum'),
    (13, 'Dormaa Ahenkro'),
    (13, 'Wenchi'),
    -- Bono East
    (14, 'Techiman'),
    (14, 'Atebubu'),
    (14, 'Nkoranza'),
    (14, 'Kintampo'),
    -- Oti
    (15, 'Dambai'),
    (15, 'Kete Krachi'),
    (15, 'Nkwanta'),
    (15, 'Kadjebi'),
    -- Savannah
    (16, 'Damongo'),
    (16, 'Bole'),
    (16, 'Salaga'),
    (16, 'Sawla')
    ON CONFLICT (region_id, name) DO NOTHING;`,
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
