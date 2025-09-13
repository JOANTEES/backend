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
- `created_at`: TIMESTAMP

### `cart_items`

Stores items currently in a user's shopping cart.

- `id`: SERIAL PRIMARY KEY
- `user_id`: INTEGER (Foreign Key to `users.id`)
- `product_id`: INTEGER (Foreign Key to `products.id`)
- `quantity`: INTEGER
- `size`: VARCHAR(20)
- `color`: VARCHAR(50)
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

### Customer Management Tables

The CRM system uses a set of related tables to store customer data, including:

- `customer_segments`
- `loyalty_programs`
- `customer_preferences`
- `customer_addresses`
- `purchase_history`
- `customer_activity`

Refer to `database/schema.sql` for detailed column definitions of these tables.
