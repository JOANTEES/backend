## Payments (Paystack)

Environment:

- `PAYSTACK_SECRET_KEY` (server)
- Optionally `PAYSTACK_PUBLIC_KEY` (client)

Endpoints:

- `GET /api/payments` (admin) — list payments
- `POST /api/payments` (admin) — record a manual/offline payment
- `POST /api/payments/paystack/initialize` (admin) — server-side initialize Paystack transaction. Returns `{ authorization_url, reference, access_code }`
- `POST /api/payments/paystack/webhook` — Paystack webhook

Webhook setup:

- Configure URL: `<your-server>/api/payments/paystack/webhook`
- Method: POST
- Content type: `application/json` (we use `express.raw` here due to signature verification)

Notes:

- Amounts sent to Paystack must be in kobo/pesewas (amount \* 100)
- Store `reference` and map to a `booking_id` via `metadata.booking_id`
- On `charge.success`, we insert a payment row and, if a booking is linked, mark `bookings.payment_status = 'paid'`

# Joantee Backend API

This is the backend API server for the Joantee admin dashboard and user web application.

## 🚀 Quick Start

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Navigate to the server directory:**

   ```bash
   cd server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create environment file:**

   ```bash
   # Create .env file manually with your Neon database connection
   # DATABASE_URL=postgresql://username:password@hostname.neon.tech/database_name?sslmode=require&channel_binding=require
   # JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   ```

4. **Initialize the database:**

   ```bash
   npm run db:init
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

## 📁 Project Structure

```
server/
├── src/
│   ├── index.js              # Main server file
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── products.js       # Product management routes
│   │   ├── users.js          # User management routes
│   │   ├── customers.js      # Customer management routes
│   │   ├── dashboard.js      # Dashboard analytics routes
│   │   ├── bookings.js       # Booking management routes
│   │   └── payments.js       # Payment processing routes
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   └── database/
│       ├── init.js           # Database initialization script
│       └── migrate.js        # Database migration script
├── database/
│   └── schema.sql            # Database table definitions
├── package.json              # Dependencies and scripts
├── .gitignore               # Git ignore rules
├── .eslintrc.js             # ESLint configuration
└── README.md                # This file
```

## 🔧 Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload
- `npm run db:init` - Initialize database tables and sample data
- `npm run lint` - Check for linting issues
- `npm run lint:fix` - Fix linting issues automatically

## 🌐 API Endpoints

### Base URL

```
http://localhost:5000
```

### Authentication Endpoints

#### 1. User Registration

- **URL:** `POST /api/auth/register`
- **Description:** Register a new user account
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### 2. User Login

- **URL:** `POST /api/auth/login`
- **Description:** Authenticate user and get JWT token
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### 3. Get User Profile

- **URL:** `GET /api/auth/profile`
- **Description:** Get current user's profile information
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "customer",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### User Management Endpoints

#### 4. Get All Users (Admin Only)

- **URL:** `GET /api/users`
- **Description:** Retrieve all users (admin access required)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "message": "Users retrieved successfully",
    "count": 2,
    "users": [
      {
        "id": 1,
        "email": "admin@joantee.com",
        "first_name": "Admin",
        "last_name": "User",
        "role": "admin",
        "is_active": true,
        "created_at": "2025-08-16T13:47:04.079Z",
        "updated_at": "2025-08-16T13:47:04.079Z"
      },
      {
        "id": 2,
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "role": "customer",
        "is_active": true,
        "created_at": "2025-08-16T13:55:00.000Z",
        "updated_at": "2025-08-16T13:55:00.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - **401 Unauthorized:** No or invalid JWT token
  - **403 Forbidden:** User is not an admin

#### 5. Get User by ID (Admin Only)

- **URL:** `GET /api/users/:id`
- **Description:** Retrieve a specific user by ID (admin access required)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - User ID (number)
- **Response (200):**
  ```json
  {
    "message": "User retrieved successfully",
    "user": {
      "id": 1,
      "email": "admin@joantee.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Invalid user ID format
  - **401 Unauthorized:** No or invalid JWT token
  - **403 Forbidden:** User is not an admin
  - **404 Not Found:** User with specified ID doesn't exist

### Product Endpoints

#### 6. Get All Products

- **URL:** `GET /api/products`
- **Description:** Retrieve all active products (public route - no authentication required)
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "message": "Products retrieved successfully",
    "count": 3,
    "products": [
      {
        "id": 1,
        "name": "Classic White T-Shirt",
        "description": "Premium cotton classic fit t-shirt",
        "price": "29.99",
        "category": "T-Shirts",
        "size": "M",
        "color": "White",
        "stock_quantity": 50,
        "image_url": null,
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": 2,
        "name": "Denim Jeans",
        "description": "Comfortable straight-leg denim jeans",
        "price": "79.99",
        "category": "Jeans",
        "size": "32",
        "color": "Blue",
        "stock_quantity": 30,
        "image_url": null,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 7. Get Single Product by ID

- **URL:** `GET /api/products/:id`
- **Description:** Retrieve a specific product by ID (public route - no authentication required)
- **Headers:** None required
- **Parameters:** `:id` - Product ID (number)
- **Response (200):**
  ```json
  {
    "message": "Product retrieved successfully",
    "product": {
      "id": 1,
      "name": "Classic White T-Shirt",
      "description": "Premium cotton classic fit t-shirt",
      "price": "29.99",
      "category": "T-Shirts",
      "size": "M",
      "color": "White",
      "stock_quantity": 50,
      "image_url": null,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Invalid product ID format (not a number)
  - **404 Not Found:** Product with specified ID doesn't exist or is inactive

#### 8. Create New Product (Admin Only)

- **URL:** `POST /api/products`
- **Description:** Create a new product (admin access required)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "New Product",
    "description": "Product description",
    "price": 49.99,
    "category": "Category Name",
    "size": "M",
    "color": "Blue",
    "stock_quantity": 25,
    "image_url": "https://example.com/image.jpg"
  }
  ```
- **Required Fields:** `name`, `price`, `category`, `stock_quantity`
- **Optional Fields:** `description`, `size`, `color`, `image_url`
- **Response (201):**
  ```json
  {
    "message": "Product created successfully",
    "product": {
      "id": 4,
      "name": "New Product",
      "description": "Product description",
      "price": "49.99",
      "category": "Category Name",
      "size": "M",
      "color": "Blue",
      "stock_quantity": 25,
      "image_url": "https://example.com/image.jpg",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Validation failed (missing required fields, invalid price, etc.)
  - **401 Unauthorized:** No or invalid JWT token
  - **403 Forbidden:** User is not an admin

#### 9. Update Product (Admin Only)

- **URL:** `PUT /api/products/:id`
- **Description:** Update an existing product (admin access required)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Product ID (number)
- **Request Body:** Any combination of fields to update
  ```json
  {
    "price": 39.99,
    "stock_quantity": 40
  }
  ```
- **All Fields Optional:** `name`, `description`, `price`, `category`, `size`, `color`, `stock_quantity`, `image_url`
- **Response (200):**
  ```json
  {
    "message": "Product updated successfully",
    "product": {
      "id": 1,
      "name": "Classic White T-Shirt",
      "description": "Premium cotton classic fit t-shirt",
      "price": "39.99",
      "category": "T-Shirts",
      "size": "M",
      "color": "White",
      "stock_quantity": 40,
      "image_url": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Validation failed or no fields provided for update
  - **401 Unauthorized:** No or invalid JWT token
  - **403 Forbidden:** User is not an admin
  - **404 Not Found:** Product with specified ID doesn't exist

#### 10. Delete Product (Admin Only)

- **URL:** `DELETE /api/products/:id`
- **Description:** Delete a product (admin access required) - Soft delete (sets is_active = false)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Product ID (number)
- **Response (200):**
  ```json
  {
    "message": "Product deleted successfully",
    "product": {
      "id": 1,
      "name": "Classic White T-Shirt",
      "is_active": false
    }
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Invalid product ID format
  - **401 Unauthorized:** No or invalid JWT token
  - **403 Forbidden:** User is not an admin
  - **404 Not Found:** Product with specified ID doesn't exist

**Note:** Delete is a soft delete - products are marked as inactive but remain in the database. They won't appear in the "Get All Products" endpoint which filters by `is_active = true`.

### Utility Endpoints

#### 11. API Status

- **URL:** `GET /`
- **Description:** Check if API is running
- **Response (200):**
  ```json
  {
    "message": "Joantee Backend API is running!",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

#### 12. Health Check

- **URL:** `GET /health`
- **Description:** Check API health status
- **Response (200):**
  ```json
  {
    "status": "OK",
    "uptime": 123.456,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

#### 13. Database Test

- **URL:** `GET /db-test`
- **Description:** Test database connection
- **Response (200):**
  ```json
  {
    "message": "Database connection successful!",
    "data": {
      "current_time": "2024-01-01T00:00:00.000Z",
      "db_version": "PostgreSQL 15.0..."
    },
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

## 🔒 Authentication

### JWT Token Usage

- **Token Format:** `Bearer <JWT_TOKEN>`
- **Header:** `Authorization: Bearer <JWT_TOKEN>`
- **Expiration:** 24 hours
- **Token Payload:**
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "role": "customer"
  }
  ```

### Protected Routes

Routes that require authentication will return:

- **401 Unauthorized** if no token is provided
- **401 Unauthorized** if token is invalid
- **403 Forbidden** if user doesn't have required role (for admin routes)

### Admin Access

Some endpoints require admin role (`role: "admin"`):

- `GET /api/users/:id` - Get user details

**Sample Admin User:**

- Email: `admin@joantee.com`
- Password: `admin123`

### Customer Management Endpoints

#### 1. Get All Customers

- **URL:** `GET /api/customers`
- **Description:** Retrieve all customers with complete profile data
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "message": "Customers retrieved successfully",
    "count": 1,
    "customers": [
      {
        "id": "2",
        "firstName": "Test",
        "lastName": "User",
        "email": "test@example.com",
        "phone": "+1234567890",
        "dateOfBirth": null,
        "gender": null,
        "address": {
          "street": "123 Main St",
          "city": "New York",
          "state": "NY",
          "zipCode": "10001",
          "country": "USA"
        },
        "preferences": {
          "size": ["M", "L"],
          "colors": ["Blue", "Black"],
          "brands": ["Nike", "Adidas"],
          "categories": ["T-Shirts", "Jeans"],
          "priceRange": {
            "min": 20,
            "max": 100
          },
          "communication": {
            "email": true,
            "sms": false,
            "push": true
          }
        },
        "loyaltyPoints": 150,
        "loyaltyTier": "silver",
        "totalSpent": 299.97,
        "totalOrders": 3,
        "averageOrderValue": 99.99,
        "lastPurchaseDate": "2024-01-15T10:30:00.000Z",
        "registrationDate": "2024-01-01T00:00:00.000Z",
        "status": "active",
        "tags": ["VIP", "High Value"],
        "notes": "Prefers express shipping",
        "avatar": null
      }
    ]
  }
  ```

#### 2. Get Single Customer

- **URL:** `GET /api/customers/:id`
- **Description:** Retrieve a specific customer by ID
- **Headers:** None required
- **Parameters:** `:id` - Customer ID (number)
- **Response (200):**
  ```json
  {
    "message": "Customer retrieved successfully",
    "customer": {
      "id": "2",
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com"
      // ... complete customer object
    }
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Invalid customer ID format
  - **404 Not Found:** Customer not found

#### 3. Get Customer Segments

- **URL:** `GET /api/customers/segments`
- **Description:** Retrieve all customer segments for targeting
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "message": "Customer segments retrieved successfully",
    "count": 2,
    "segments": [
      {
        "id": "1",
        "name": "High Value Customers",
        "description": "Customers who have spent over $500",
        "criteria": {
          "totalSpent": {
            "min": 500
          }
        },
        "customerCount": 25,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 4. Get Loyalty Programs

- **URL:** `GET /api/customers/loyalty`
- **Description:** Retrieve all loyalty programs
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "message": "Loyalty programs retrieved successfully",
    "count": 1,
    "programs": [
      {
        "id": "1",
        "name": "VIP Rewards Program",
        "description": "Exclusive rewards for loyal customers",
        "type": "annual",
        "startDate": "2024-01-01",
        "endDate": "2024-12-31",
        "tiers": [
          {
            "name": "Bronze",
            "minPoints": 0,
            "benefits": ["5% discount"],
            "discountPercentage": 5
          },
          {
            "name": "Silver",
            "minPoints": 1000,
            "benefits": ["10% discount", "Free shipping"],
            "discountPercentage": 10
          }
        ],
        "rewards": [
          {
            "id": "1",
            "name": "Free Shipping",
            "description": "Complimentary shipping on all orders",
            "pointsRequired": 500,
            "type": "free_shipping",
            "value": 0,
            "isActive": true
          }
        ],
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 5. Get Communication Campaigns

- **URL:** `GET /api/customers/communications`
- **Description:** Retrieve all communication campaigns
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "message": "Communication campaigns retrieved successfully",
    "count": 1,
    "campaigns": [
      {
        "id": "1",
        "name": "Welcome Email Series",
        "type": "email",
        "subject": "Welcome to Joantee!",
        "content": "Thank you for joining us...",
        "targetSegment": "New Customers",
        "targetCustomers": ["2", "3", "4"],
        "scheduledDate": "2024-01-15T09:00:00.000Z",
        "sentDate": "2024-01-15T09:05:00.000Z",
        "status": "sent",
        "openRate": 75.5,
        "clickRate": 12.3,
        "deliveryRate": 98.7,
        "createdAt": "2024-01-10T00:00:00.000Z"
      }
    ]
  }
  ```

#### 6. Get Customer Purchase History

- **URL:** `GET /api/customers/:id/purchases`
- **Description:** Retrieve purchase history for a specific customer
- **Headers:** None required
- **Parameters:** `:id` - Customer ID (number)
- **Response (200):**
  ```json
  {
    "message": "Customer purchase history retrieved successfully",
    "count": 2,
    "purchases": [
      {
        "id": "1",
        "customerId": "2",
        "orderDate": "2024-01-15T10:30:00.000Z",
        "items": [
          {
            "id": "1",
            "name": "Classic White T-Shirt",
            "size": "M",
            "color": "White",
            "price": 29.99,
            "quantity": 2,
            "image": "https://example.com/tshirt.jpg"
          }
        ],
        "totalAmount": 59.98,
        "status": "completed",
        "paymentMethod": "credit_card",
        "shippingAddress": {
          "street": "123 Main St",
          "city": "New York",
          "state": "NY",
          "zipCode": "10001",
          "country": "USA"
        }
      }
    ]
  }
  ```

#### 7. Get Customer Activity

- **URL:** `GET /api/customers/:id/activity`
- **Description:** Retrieve activity log for a specific customer
- **Headers:** None required
- **Parameters:** `:id` - Customer ID (number)
- **Response (200):**
  ```json
  {
    "message": "Customer activity retrieved successfully",
    "count": 5,
    "activities": [
      {
        "id": "1",
        "customerId": "2",
        "type": "purchase",
        "description": "Completed order #12345",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "metadata": {
          "orderId": "12345",
          "amount": 59.98
        }
      },
      {
        "id": "2",
        "customerId": "2",
        "type": "login",
        "description": "Logged into account",
        "timestamp": "2024-01-15T09:15:00.000Z",
        "metadata": {
          "ipAddress": "192.168.1.1"
        }
      }
    ]
  }
  ```

### Shopping Cart Endpoints

#### 1. Get User's Cart

- **URL:** `GET /api/cart`
- **Description:** Retrieve user's shopping cart with product details and totals
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart retrieved successfully",
    "data": {
      "items": [
        {
          "id": "1",
          "productId": "2",
          "productName": "Classic White T-Shirt",
          "description": "Premium cotton classic fit t-shirt",
          "price": 29.99,
          "category": "T-Shirts",
          "imageUrl": "https://example.com/tshirt.jpg",
          "stockQuantity": 45,
          "quantity": 2,
          "size": "M",
          "color": "White",
          "subtotal": 59.98,
          "createdAt": "2024-01-15T10:30:00.000Z"
        }
      ],
      "totals": {
        "subtotal": 59.98,
        "tax": 5.99,
        "shipping": 10.0,
        "total": 75.97
      },
      "itemCount": 1
    }
  }
  ```

#### 2. Add Item to Cart

- **URL:** `POST /api/cart/add`
- **Description:** Add a product to the user's cart (reduces stock quantity)
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "productId": 2,
    "quantity": 2,
    "size": "M",
    "color": "White"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Item added to cart successfully",
    "data": {
      "items": [...],
      "totals": {
        "subtotal": 59.98,
        "tax": 5.99,
        "shipping": 10.00,
        "total": 75.97
      },
      "itemCount": 1
    }
  }
  ```
- **Error Responses:**
  - **400 Bad Request:** Validation failed, insufficient stock, or product not available
  - **404 Not Found:** Product not found

#### 3. Update Cart Item Quantity

- **URL:** `PUT /api/cart/:itemId`
- **Description:** Update the quantity of an item in the cart (adjusts stock)
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Parameters:** `:itemId` - Cart item ID
- **Request Body:**
  ```json
  {
    "quantity": 3
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart item updated successfully",
    "data": {
      "items": [...],
      "totals": {
        "subtotal": 89.97,
        "tax": 8.99,
        "shipping": 10.00,
        "total": 108.96
      },
      "itemCount": 1
    }
  }
  ```

#### 4. Remove Item from Cart

- **URL:** `DELETE /api/cart/:itemId`
- **Description:** Remove an item from the cart (restores stock quantity)
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Parameters:** `:itemId` - Cart item ID
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Item removed from cart successfully",
    "data": {
      "items": [],
      "totals": {
        "subtotal": 0,
        "tax": 0,
        "shipping": 0,
        "total": 0
      },
      "itemCount": 0
    }
  }
  ```

#### 5. Clear Entire Cart

- **URL:** `DELETE /api/cart/clear`
- **Description:** Remove all items from the cart (restores all stock)
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart cleared successfully",
    "data": {
      "items": [],
      "totals": {
        "subtotal": 0,
        "tax": 0,
        "shipping": 0,
        "total": 0
      },
      "itemCount": 0
    }
  }
  ```

### Cart Features

- **Stock Management:** Stock quantity automatically reduces when adding to cart and restores when removing
- **Transaction Safety:** All operations use database transactions to ensure data consistency
- **Activity Logging:** All cart actions are logged in customer activity
- **Smart Totals:** Automatically calculates subtotal, tax (10%), and shipping (free over $100)
- **Duplicate Prevention:** Same product with same size/color updates quantity instead of creating duplicate entries
- **Validation:** Comprehensive input validation and error handling

## 📊 Database Schema

### Users Table Structure

The users table contains the following fields:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table Structure

The products table contains the following fields:

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    category VARCHAR(100) NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sample Data

The database comes pre-loaded with:

**Sample Users:**

- **Admin User:** admin@joantee.com (role: admin)

**Sample Products:**

- **Classic White T-Shirt** - $29.99 (T-Shirts category)
- **Denim Jeans** - $79.99 (Jeans category)
- **Hooded Sweatshirt** - $59.99 (Hoodies category)

### Data Types for Frontend

**User Fields:**

- **id**: Integer (unique identifier)
- **email**: String (user email)
- **first_name**: String (user's first name)
- **last_name**: String (user's last name)
- **role**: String ("admin" or "customer")
- **is_active**: Boolean (account status)
- **created_at**: ISO Date String (when account was created)
- **updated_at**: ISO Date String (when account was last updated)

**Product Fields:**

- **id**: Integer (unique identifier)
- **name**: String (product name)
- **description**: String (product description)
- **price**: Decimal (price in dollars, e.g., "29.99")
- **category**: String (product category)
- **size**: String (product size, can be null)
- **color**: String (product color, can be null)
- **stock_quantity**: Integer (available stock)
- **image_url**: String (product image URL, can be null)
- **created_at**: ISO Date String (when product was created)

## 🚧 Next Steps

1. ✅ Set up PostgreSQL database (Neon)
2. ✅ Create database connection and models
3. ✅ Implement user authentication
4. ✅ Create basic product listing API
5. ✅ Create basic user management API
6. ✅ Add product management (Create, Update, Delete)
7. ✅ Add user listing and management
8. ✅ Add customer management system
9. ✅ Add customer segments and loyalty programs
10. ✅ Add communication campaigns
11. ✅ Add purchase history tracking
12. ✅ Add customer activity logging
13. 🔄 Implement shopping cart system
14. 🔄 Implement order creation from cart
15. 🔄 Add payment processing integration
16. 🔄 Add customer-facing profile management

## 🆘 Troubleshooting

- **Port already in use**: Change the PORT in your `.env` file
- **Module not found**: Run `npm install` to install dependencies
- **Environment variables not loading**: Make sure your `.env` file is in the server directory
- **Database connection failed**: Check your DATABASE_URL in the `.env` file
- **JWT errors**: Make sure JWT_SECRET is set in your `.env` file
- **Admin access denied**: Make sure you're using an admin user's JWT token

## 📚 Dependencies

- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware
- **dotenv** - Environment variable loader
- **pg** - PostgreSQL driver
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT token handling
- **express-validator** - Input validation
- **Nodemon** - Development auto-reload (dev dependency)
- **ESLint** - Code linting (dev dependency)
