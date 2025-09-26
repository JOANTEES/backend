# Database Schema

This section provides an overview of the main tables in the PostgreSQL database. For the complete and most up-to-date schema, refer to the `database/schema.sql` file.

### `users`

Stores information for all users, including customers and admins.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(255)
- `email`: VARCHAR(255) UNIQUE
- `password`: VARCHAR(255) (Hashed)
- `role`: VARCHAR(50) ('customer' or 'admin')
- `created_at`: TIMESTAMP

### `brands`

Stores product brand information.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(100) UNIQUE
- `description`: TEXT
- `logo_url`: VARCHAR(500)
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `categories`

Stores product categories with hierarchical support (subcategories).

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(100)
- `description`: TEXT
- `parent_id`: INTEGER REFERENCES categories(id)
- `image_url`: VARCHAR(500)
- `is_active`: BOOLEAN
- `sort_order`: INTEGER
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `products`

Contains all product information for the catalog (Enhanced with pricing, variants, and relationships).

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(255)
- `description`: TEXT
- `sku`: VARCHAR(100) UNIQUE
- `cost_price`: DECIMAL(10, 2)
- `price`: DECIMAL(10, 2)
- `discount_price`: DECIMAL(10, 2)
- `discount_percent`: DECIMAL(5, 2)
- `brand_id`: INTEGER REFERENCES brands(id)
- `category_id`: INTEGER REFERENCES categories(id)
- `category`: VARCHAR(100) (Legacy field)
- `image_url`: VARCHAR(500)
- `stock_quantity`: INTEGER
- `requires_special_delivery`: BOOLEAN
- `delivery_eligible`: BOOLEAN
- `pickup_eligible`: BOOLEAN
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `product_variants`

Stores product variants for size/color combinations with individual stock tracking.

- `id`: SERIAL PRIMARY KEY
- `product_id`: INTEGER REFERENCES products(id)
- `sku`: VARCHAR(100) UNIQUE
- `size`: VARCHAR(20)
- `color`: VARCHAR(50)
- `stock_quantity`: INTEGER
- `image_url`: VARCHAR(500)
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `carts`

Stores user shopping carts with delivery method selection.

- `id`: SERIAL PRIMARY KEY
- `user_id`: INTEGER REFERENCES users(id)
- `delivery_method`: VARCHAR(20) ('delivery' or 'pickup')
- `delivery_zone_id`: INTEGER REFERENCES delivery_zones(id)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `cart_items`

Stores individual items in shopping carts with variant support.

- `id`: SERIAL PRIMARY KEY
- `cart_id`: INTEGER REFERENCES carts(id)
- `product_id`: INTEGER REFERENCES products(id)
- `variant_id`: INTEGER REFERENCES product_variants(id)
- `quantity`: INTEGER
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `orders`

Stores order information with comprehensive tracking.

- `id`: SERIAL PRIMARY KEY
- `user_id`: INTEGER REFERENCES users(id)
- `order_number`: VARCHAR(50) UNIQUE
- `payment_method`: VARCHAR(20)
- `delivery_method`: VARCHAR(20)
- `delivery_zone_id`: INTEGER REFERENCES delivery_zones(id)
- `pickup_location_id`: INTEGER REFERENCES pickup_locations(id)
- `delivery_address_id`: INTEGER REFERENCES customer_addresses(id)
- `delivery_address`: JSONB
- `subtotal`: DECIMAL(10, 2)
- `tax_amount`: DECIMAL(10, 2)
- `shipping_fee`: DECIMAL(10, 2)
- `large_order_fee`: DECIMAL(10, 2)
- `special_delivery_fee`: DECIMAL(10, 2)
- `total_amount`: DECIMAL(10, 2)
- `customer_notes`: TEXT
- `status`: VARCHAR(20)
- `payment_status`: VARCHAR(20)
- `amount_paid`: DECIMAL(10, 2)
- `payment_reference`: VARCHAR(100)
- `notes`: TEXT
- `estimated_delivery_date`: DATE
- `actual_delivery_date`: DATE
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP
- `confirmed_at`: TIMESTAMP
- `shipped_at`: TIMESTAMP
- `delivered_at`: TIMESTAMP

### `order_items`

Stores individual items in orders with variant snapshots.

- `id`: SERIAL PRIMARY KEY
- `order_id`: INTEGER REFERENCES orders(id)
- `product_id`: INTEGER REFERENCES products(id)
- `variant_id`: INTEGER REFERENCES product_variants(id)
- `product_name`: VARCHAR(255)
- `product_description`: TEXT
- `product_image_url`: VARCHAR(500)
- `variant_sku`: VARCHAR(100)
- `size`: VARCHAR(20)
- `color`: VARCHAR(50)
- `quantity`: INTEGER
- `unit_price`: DECIMAL(10, 2)
- `subtotal`: DECIMAL(10, 2)
- `requires_special_delivery`: BOOLEAN
- `created_at`: TIMESTAMP

### `delivery_zones`

Stores delivery zones with associated fees and coverage areas.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(100)
- `delivery_fee`: DECIMAL(10, 2)
- `estimated_days`: INTEGER
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `pickup_locations`

Stores admin-managed pickup locations with Ghana address structure.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(100)
- `region_id`: INTEGER REFERENCES ghana_regions(id)
- `city_id`: INTEGER REFERENCES ghana_cities(id)
- `area_name`: VARCHAR(100)
- `landmark`: VARCHAR(200)
- `contact_phone`: VARCHAR(20)
- `google_maps_link`: VARCHAR(500)
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `customer_addresses`

Stores customer delivery addresses with Ghana address structure.

- `id`: SERIAL PRIMARY KEY
- `customer_id`: INTEGER REFERENCES users(id)
- `region_id`: INTEGER REFERENCES ghana_regions(id)
- `city_id`: INTEGER REFERENCES ghana_cities(id)
- `area_name`: VARCHAR(100)
- `landmark`: VARCHAR(200)
- `additional_instructions`: TEXT
- `contact_phone`: VARCHAR(20)
- `google_maps_link`: VARCHAR(500)
- `is_default`: BOOLEAN
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `ghana_regions`

Pre-populated table with Ghana's 16 regions.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(100)
- `code`: VARCHAR(10)
- `is_active`: BOOLEAN

### `ghana_cities`

Pre-populated table with major cities in each region.

- `id`: SERIAL PRIMARY KEY
- `region_id`: INTEGER REFERENCES ghana_regions(id)
- `name`: VARCHAR(100)
- `is_active`: BOOLEAN

### `app_settings`

Singleton table for application-wide configuration.

- `id`: INTEGER PRIMARY KEY (always 1)
- `tax_rate`: DECIMAL(5, 2)
- `free_shipping_threshold`: DECIMAL(10, 2)
- `large_order_quantity_threshold`: INTEGER
- `large_order_delivery_fee`: DECIMAL(10, 2)
- `currency_symbol`: VARCHAR(10)
- `currency_code`: VARCHAR(3)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## Additional Tables

The system also includes several other tables for comprehensive e-commerce functionality:

### Customer Management

- `customer_segments` - Customer segmentation for marketing
- `loyalty_programs` - Loyalty program definitions
- `customer_preferences` - Customer preference settings
- `customer_activity` - Customer activity tracking
- `purchase_history` - Historical purchase data

### Payment & Checkout

- `payments` - Payment transaction records
- `checkout_sessions` - Online payment sessions

### Address & Location

- `delivery_zone_areas` - Structured area coverage for delivery zones

For complete table definitions and relationships, refer to the `database/schema.sql` file.
