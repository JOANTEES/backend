# Product Variants Management Endpoints

These endpoints handle the management of product variants (size/color combinations) with individual stock levels. Product variants allow products to have multiple options like different sizes and colors, each with their own SKU and stock quantity.

## Product Variants Features

- **Size & Color Combinations:** Products can have multiple variants with different sizes and colors
- **Individual Stock Management:** Each variant has its own stock quantity
- **Unique SKUs:** Each variant can have its own unique SKU
- **Variant Images:** Each variant can have its own image
- **Stock Tracking:** Real-time stock level monitoring and updates
- **Conflict Prevention:** Prevents duplicate size/color combinations for the same product
- **Cart Integration:** Variants are used in shopping carts and orders
- **Admin Management:** Full CRUD operations for administrators

## Product Variant Object Structure

```json
{
  "id": "1",
  "productId": "16",
  "productName": "Nike Air Max",
  "sku": "NIKE-AM-001-RED-M",
  "size": "M",
  "color": "Red",
  "stockQuantity": 25,
  "imageUrl": "https://example.com/nike-airmax-red-m.jpg",
  "isActive": true,
  "createdAt": "2025-09-25T21:35:00.000Z",
  "updatedAt": "2025-09-25T21:35:00.000Z"
}
```

### Field Descriptions

| Field           | Type    | Description                                 |
| --------------- | ------- | ------------------------------------------- |
| `id`            | string  | Unique variant identifier                   |
| `productId`     | string  | Parent product ID                           |
| `productName`   | string  | Name of the parent product                  |
| `sku`           | string  | Stock Keeping Unit (unique, optional)       |
| `size`          | string  | Size of the variant (max 20 characters)     |
| `color`         | string  | Color of the variant (max 50 characters)    |
| `stockQuantity` | number  | Available stock quantity (non-negative)     |
| `imageUrl`      | string  | Variant-specific image URL (optional)       |
| `isActive`      | boolean | Whether the variant is active/visible       |
| `createdAt`     | string  | ISO timestamp when variant was created      |
| `updatedAt`     | string  | ISO timestamp when variant was last updated |

## API Endpoints

### 1. Get Variants for Product

- **URL:** `GET /api/product-variants/product/:productId`
- **Description:** Retrieves all active variants for a specific product
- **Headers:** None required
- **Parameters:** `:productId` - Product ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product variants retrieved successfully",
    "product": {
      "id": "16",
      "name": "Nike Air Max"
    },
    "count": 3,
    "variants": [
      {
        "id": "1",
        "productId": "16",
        "productName": "Nike Air Max",
        "sku": "NIKE-AM-001-RED-M",
        "size": "M",
        "color": "Red",
        "stockQuantity": 25,
        "imageUrl": "https://example.com/nike-airmax-red-m.jpg",
        "isActive": true,
        "createdAt": "2025-09-25T21:35:00.000Z",
        "updatedAt": "2025-09-25T21:35:00.000Z"
      },
      {
        "id": "2",
        "productId": "16",
        "productName": "Nike Air Max",
        "sku": "NIKE-AM-001-RED-L",
        "size": "L",
        "color": "Red",
        "stockQuantity": 15,
        "imageUrl": "https://example.com/nike-airmax-red-l.jpg",
        "isActive": true,
        "createdAt": "2025-09-25T21:36:00.000Z",
        "updatedAt": "2025-09-25T21:36:00.000Z"
      }
    ]
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Product not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Invalid product ID. Must be a number."
}
```

### 2. Get Single Variant

- **URL:** `GET /api/product-variants/:id`
- **Description:** Retrieves a single variant by ID
- **Headers:** None required
- **Parameters:** `:id` - Variant ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product variant retrieved successfully",
    "variant": {
      "id": "1",
      "productId": "16",
      "productName": "Nike Air Max",
      "sku": "NIKE-AM-001-RED-M",
      "size": "M",
      "color": "Red",
      "stockQuantity": 25,
      "imageUrl": "https://example.com/nike-airmax-red-m.jpg",
      "isActive": true,
      "createdAt": "2025-09-25T21:35:00.000Z",
      "updatedAt": "2025-09-25T21:35:00.000Z"
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Product variant not found"
}
```

### 3. Create Variant (Admin Only)

- **URL:** `POST /api/product-variants`
- **Description:** Creates a new product variant
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "product_id": 16,
    "sku": "NIKE-AM-001-BLUE-M",
    "size": "M",
    "color": "Blue",
    "stock_quantity": 30,
    "image_url": "https://example.com/nike-airmax-blue-m.jpg"
  }
  ```

**Validation Rules:**

- `product_id`: Required, must be valid product ID
- `sku`: Optional, max 100 characters, must be unique
- `size`: Optional, max 20 characters
- `color`: Optional, max 50 characters
- `stock_quantity`: Required, non-negative integer
- `image_url`: Optional, must be valid URL

**Response (201):**

```json
{
  "success": true,
  "message": "Product variant created successfully",
  "variant": {
    "id": "3",
    "productId": "16",
    "productName": "Nike Air Max",
    "sku": "NIKE-AM-001-BLUE-M",
    "size": "M",
    "color": "Blue",
    "stockQuantity": 30,
    "imageUrl": "https://example.com/nike-airmax-blue-m.jpg",
    "isActive": true,
    "createdAt": "2025-09-25T21:37:00.000Z"
  }
}
```

**Error Response (400) - Product Not Found:**

```json
{
  "success": false,
  "message": "Product not found"
}
```

**Error Response (409) - Duplicate SKU:**

```json
{
  "success": false,
  "message": "SKU already exists"
}
```

**Error Response (409) - Duplicate Size/Color:**

```json
{
  "success": false,
  "message": "Variant with this size and color combination already exists for this product"
}
```

### 4. Update Variant (Admin Only)

- **URL:** `PUT /api/product-variants/:id`
- **Description:** Updates an existing variant
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Variant ID (number)
- **Request Body:** (Include only fields to be updated)
  ```json
  {
    "stock_quantity": 35,
    "image_url": "https://example.com/new-nike-airmax-blue-m.jpg",
    "is_active": true
  }
  ```

**Validation Rules:** Same as create, but all fields are optional

**Response (200):**

```json
{
  "success": true,
  "message": "Product variant updated successfully",
  "variant": {
    "id": "3",
    "productId": "16",
    "productName": "Nike Air Max",
    "sku": "NIKE-AM-001-BLUE-M",
    "size": "M",
    "color": "Blue",
    "stockQuantity": 35,
    "imageUrl": "https://example.com/new-nike-airmax-blue-m.jpg",
    "isActive": true,
    "createdAt": "2025-09-25T21:37:00.000Z",
    "updatedAt": "2025-09-25T21:38:00.000Z"
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Product variant not found"
}
```

**Error Response (409) - Size/Color Conflict:**

```json
{
  "success": false,
  "message": "Variant with this size and color combination already exists for this product"
}
```

### 5. Delete Variant (Admin Only)

- **URL:** `DELETE /api/product-variants/:id`
- **Description:** Soft deletes a variant (sets is_active to false)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Variant ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product variant deleted successfully",
    "variant": {
      "id": "3",
      "sku": "NIKE-AM-001-BLUE-M",
      "isActive": false
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Product variant not found"
}
```

**Error Response (409) - Variant in Use:**

```json
{
  "success": false,
  "message": "Cannot delete variant. It is currently in shopping carts. Deactivate it instead."
}
```

**Error Response (409) - Variant in Orders:**

```json
{
  "success": false,
  "message": "Cannot delete variant. It has been used in orders. Deactivate it instead."
}
```

### 6. Get Stock Levels (Admin Only)

- **URL:** `GET /api/product-variants/product/:productId/stock`
- **Description:** Retrieves stock levels for all variants of a product
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:productId` - Product ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product stock levels retrieved successfully",
    "product": {
      "id": "16",
      "name": "Nike Air Max"
    },
    "totalStock": 70,
    "variantCount": 3,
    "variants": [
      {
        "id": "1",
        "sku": "NIKE-AM-001-RED-M",
        "size": "M",
        "color": "Red",
        "stockQuantity": 25,
        "isActive": true
      },
      {
        "id": "2",
        "sku": "NIKE-AM-001-RED-L",
        "size": "L",
        "color": "Red",
        "stockQuantity": 15,
        "isActive": true
      },
      {
        "id": "3",
        "sku": "NIKE-AM-001-BLUE-M",
        "size": "M",
        "color": "Blue",
        "stockQuantity": 30,
        "isActive": true
      }
    ]
  }
  ```

### 7. Update Stock Quantity (Admin Only)

- **URL:** `PUT /api/product-variants/:id/stock`
- **Description:** Updates stock quantity for a specific variant
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Variant ID (number)
- **Request Body:**
  ```json
  {
    "stock_quantity": 40
  }
  ```

**Validation Rules:**

- `stock_quantity`: Required, non-negative integer

**Response (200):**

```json
{
  "success": true,
  "message": "Stock quantity updated successfully",
  "variant": {
    "id": "1",
    "productId": "16",
    "sku": "NIKE-AM-001-RED-M",
    "size": "M",
    "color": "Red",
    "stockQuantity": 40,
    "updatedAt": "2025-09-25T21:40:00.000Z"
  }
}
```

## Frontend Integration Notes

### Product Display with Variants

For product detail pages:

1. Display all available variants with size/color options
2. Show stock availability for each variant
3. Use variant images when available
4. Handle out-of-stock variants appropriately
5. Update product total stock based on variant stock levels

### Variant Selection

For product selection interfaces:

1. Use radio buttons or dropdowns for size/color selection
2. Disable out-of-stock options
3. Show stock quantity for each variant
4. Update pricing if variants have different prices (future enhancement)

### Admin Variant Management

For admin interfaces:

1. Display variants in a table with edit/delete actions
2. Show stock levels with low-stock warnings
3. Allow bulk stock updates
4. Prevent deletion of variants in use
5. Use soft delete (deactivate) instead of hard delete

### Cart Integration

For shopping cart functionality:

1. Store `variant_id` instead of just `product_id` in cart items
2. Validate stock availability when adding to cart
3. Update stock quantities when orders are placed
4. Handle variant-specific pricing (future enhancement)

### Stock Management

For inventory management:

1. Use stock level endpoints for monitoring
2. Set up low-stock alerts
3. Track stock movements
4. Generate stock reports

## Error Handling

All endpoints return consistent error responses with:

- `success`: boolean indicating if the request was successful
- `message`: Human-readable error description
- `errors`: Array of validation errors (for 400 responses)
- `error`: Technical error details (for 500 responses)

## Rate Limiting

- Public endpoints (GET): No rate limiting
- Admin endpoints (POST, PUT, DELETE): Subject to authentication and admin role verification
