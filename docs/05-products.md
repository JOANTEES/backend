# Products & Categories Endpoints

These endpoints handle the management of products and product categories.

### Product Delivery Options

Products can be configured with specific delivery eligibility:

- **`delivery_eligible`** (boolean, default: true): Whether the product can be delivered to customers
- **`pickup_eligible`** (boolean, default: true): Whether the product can be picked up by customers
- **`requires_special_delivery`** (boolean, default: false): Whether the product requires special delivery handling (affects shipping costs)

**Common configurations:**

- **Both delivery and pickup:** `delivery_eligible: true, pickup_eligible: true` (default)
- **Pickup only:** `delivery_eligible: false, pickup_eligible: true` (fragile items, large items)
- **Delivery only:** `delivery_eligible: true, pickup_eligible: false` (digital products, services)
- **Special delivery:** `requires_special_delivery: true` (large items, fragile items)

### 1. Get All Products

- **URL:** `GET /api/products`
- **Description:** Retrieves a list of all products.
- **Headers:** None required.
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Products retrieved successfully",
    "count": 1,
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
        "requires_special_delivery": false,
        "delivery_eligible": true,
        "pickup_eligible": true,
        "created_at": "2024-01-16T10:00:00.000Z"
      }
    ]
  }
  ```

### 2. Get Single Product

- **URL:** `GET /api/products/:id`
- **Description:** Retrieves a single product by its ID.
- **Headers:** None required.
- **Parameters:** `:id` - Product ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product retrieved successfully",
    "product": {
      "id": 1,
      "name": "Classic White T-Shirt"
      // ... other fields
    }
  }
  ```

### 3. Create Product (Admin Only)

- **URL:** `POST /api/products`
- **Description:** Adds a new product to the catalog.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "New Product",
    "description": "A great new product",
    "price": 49.99,
    "category": "New Category",
    "size": "L",
    "color": "Black",
    "stock_quantity": 100,
    "image_url": "https://example.com/image.jpg",
    "requires_special_delivery": false,
    "delivery_eligible": true,
    "pickup_eligible": true
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "product": {
      "id": 2
      // ... new product fields
    }
  }
  ```

### 4. Update Product (Admin Only)

- **URL:** `PUT /api/products/:id`
- **Description:** Updates an existing product.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Product ID (number)
- **Request Body:** (Include only the fields to be updated)
  ```json
  {
    "price": 45.99,
    "stock_quantity": 95
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product updated successfully",
    "product": {
      "id": 1,
      "price": "45.99",
      "stock_quantity": 95
      // ... other fields
    }
  }
  ```

### 5. Delete Product (Admin Only)

- **URL:** `DELETE /api/products/:id`
- **Description:** Deletes a product from the catalog.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Product ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product deleted successfully",
    "product": {
      "id": 1
    }
  }
  ```
