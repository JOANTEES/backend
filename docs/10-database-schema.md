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

### `products`

Contains all product information for the catalog.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(255)
- `description`: TEXT
- `price`: DECIMAL(10, 2)
- `category`: VARCHAR(100)
- `size`: VARCHAR(50)
- `color`: VARCHAR(50)
- `stock_quantity`: INTEGER
- `image_url`: VARCHAR(500)
- `is_active`: BOOLEAN
- `requires_special_delivery`: BOOLEAN
- `created_at`: TIMESTAMP

### `carts`

Stores user cart information with order-level delivery method.

- `id`: SERIAL PRIMARY KEY
- `user_id`: INTEGER (Foreign Key to `users.id`)
- `delivery_method`: VARCHAR(20) ('pickup' or 'delivery')
- `delivery_zone_id`: INTEGER (Foreign Key to `delivery_zones.id`)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### `cart_items`

Stores items currently in a user's shopping cart.

- `id`: SERIAL PRIMARY KEY
- `cart_id`: INTEGER (Foreign Key to `carts.id`)
- `product_id`: INTEGER (Foreign Key to `products.id`)
- `quantity`: INTEGER
- `size`: VARCHAR(20)
- `color`: VARCHAR(50)
- `created_at`: TIMESTAMP

### `ghana_regions`

Stores all 16 regions of Ghana for structured address selection.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(100) UNIQUE
- `code`: VARCHAR(10) UNIQUE
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP

### `ghana_cities`

Stores major cities for each region.

- `id`: SERIAL PRIMARY KEY
- `region_id`: INTEGER (Foreign Key to `ghana_regions.id`)
- `name`: VARCHAR(100)
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP

### `delivery_zones`

Stores delivery zone information and fees.

- `id`: SERIAL PRIMARY KEY
- `name`: VARCHAR(255)
- `description`: TEXT
- `delivery_fee`: DECIMAL(10, 2)
- `estimated_days`: VARCHAR(50)
- `coverage_areas`: TEXT[] (Array of strings)
- `is_active`: BOOLEAN
- `created_at`: TIMESTAMP

### `delivery_zone_areas`

Stores structured area coverage for each delivery zone.

- `id`: SERIAL PRIMARY KEY
- `delivery_zone_id`: INTEGER (Foreign Key to `delivery_zones.id`)
- `region_id`: INTEGER (Foreign Key to `ghana_regions.id`)
- `city_id`: INTEGER (Foreign Key to `ghana_cities.id`)
- `area_name`: VARCHAR(100)
- `created_at`: TIMESTAMP

### `app_settings`

Stores application-wide business settings (singleton table).

- `id`: INTEGER PRIMARY KEY (always 1)
- `tax_rate`: DECIMAL(5, 2) (percentage)
- `free_shipping_threshold`: DECIMAL(10, 2)
- `large_order_quantity_threshold`: INTEGER
- `large_order_delivery_fee`: DECIMAL(10, 2)
- `pickup_address`: TEXT
- `currency_symbol`: VARCHAR(5)
- `currency_code`: VARCHAR(3)
- `updated_at`: TIMESTAMP

### Customer Management Tables

The CRM system uses a set of related tables to store customer data, including:

- `customer_segments`
- `loyalty_programs`
- `customer_preferences`
- `customer_addresses`
- `purchase_history`
- `customer_activity`

Refer to `database/schema.sql` for detailed column definitions of these tables.
