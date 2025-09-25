# Product Management Endpoints

These endpoints handle the management of products in the e-commerce system with advanced pricing, profit tracking, and brand/category relationships. Products can be created, updated, and retrieved by both customers and administrators.

## Product Features

- **Public Access:** Customers can view all active products
- **Admin Management:** Full CRUD operations for administrators
- **Advanced Pricing:** Cost price, selling price, discount price, and percentage discounts
- **Profit Tracking:** Automatic calculation of profit margins and effective pricing
- **Brand Management:** Products can be linked to brands
- **Category Management:** Products can be linked to hierarchical categories
- **SKU Management:** Unique product identifiers for inventory tracking
- **Image Support:** Products can have associated images
- **Stock Management:** Track inventory quantities
- **Special Delivery:** Products can be marked for special delivery requirements
- **Delivery Options:** Products can be marked as delivery-eligible or pickup-only

## Product Object Structure

```json
{
  "id": "16",
  "name": "Nike Air Max",
  "description": "Comfortable running shoes",
  "sku": "NIKE-AM-001",
  "costPrice": 80,
  "price": 120,
  "discountPrice": 100,
  "discountPercent": 15,
  "effectivePrice": 100,
  "profitMargin": {
    "costPrice": 80,
    "sellingPrice": 100,
    "profit": 20,
    "margin": 20
  },
  "brand": {
    "id": "2",
    "name": "Nike"
  },
  "category": {
    "id": "2",
    "name": "T-Shirts"
  },
  "legacyCategory": "Shoes",
  "imageUrl": "https://example.com/nike-airmax.jpg",
  "requiresSpecialDelivery": false,
  "deliveryEligible": true,
  "pickupEligible": true,
  "createdAt": "2025-09-25T21:30:06.557Z",
  "updatedAt": "2025-09-25T21:30:17.797Z"
}
```

### Field Descriptions

| Field                     | Type    | Description                                      |
| ------------------------- | ------- | ------------------------------------------------ |
| `id`                      | string  | Unique product identifier                        |
| `name`                    | string  | Product name (1-255 characters)                  |
| `description`             | string  | Product description (optional)                   |
| `sku`                     | string  | Stock Keeping Unit (unique, optional)            |
| `costPrice`               | number  | Cost price for profit calculation (optional)     |
| `price`                   | number  | Regular selling price (required)                 |
| `discountPrice`           | number  | Discounted price (optional)                      |
| `discountPercent`         | number  | Percentage discount (0-100, optional)            |
| `effectivePrice`          | number  | Final price after discounts (calculated)         |
| `profitMargin`            | object  | Profit calculation details (if costPrice set)    |
| `brand`                   | object  | Brand information (if linked)                    |
| `category`                | object  | Category information (if linked)                 |
| `legacyCategory`          | string  | Legacy category field for backward compatibility |
| `imageUrl`                | string  | Product image URL (optional)                     |
| `requiresSpecialDelivery` | boolean | Whether product requires special delivery        |
| `deliveryEligible`        | boolean | Whether product can be delivered                 |
| `pickupEligible`          | boolean | Whether product can be picked up                 |
| `createdAt`               | string  | ISO timestamp when product was created           |
| `updatedAt`               | string  | ISO timestamp when product was last updated      |

### Profit Margin Object

When `costPrice` is provided, the system automatically calculates profit margins:

```json
{
  "costPrice": 80,
  "sellingPrice": 100,
  "profit": 20,
  "margin": 20
}
```

- `costPrice`: The cost price of the product
- `sellingPrice`: The effective selling price (after discounts)
- `profit`: Absolute profit amount (sellingPrice - costPrice)
- `margin`: Profit margin percentage ((profit / sellingPrice) \* 100)

### Effective Price Calculation

The system automatically calculates the effective price based on available discounts:

1. **Discount Price Priority:** If `discountPrice` is set and less than `price`, use `discountPrice`
2. **Percentage Discount:** If `discountPercent` is set, calculate: `price - (price * discountPercent / 100)`
3. **Regular Price:** If no discounts, use the regular `price`

## API Endpoints

### 1. Get All Products

- **URL:** `GET /api/products`
- **Description:** Retrieves all active products with brand and category information
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Products retrieved successfully",
    "count": 2,
    "products": [
      {
        "id": "16",
        "name": "Nike Air Max",
        "description": "Comfortable running shoes",
        "sku": "NIKE-AM-001",
        "costPrice": 80,
        "price": 120,
        "discountPrice": 100,
        "discountPercent": 15,
        "effectivePrice": 100,
        "profitMargin": {
          "costPrice": 80,
          "sellingPrice": 100,
          "profit": 20,
          "margin": 20
        },
        "brand": {
          "id": "2",
          "name": "Nike"
        },
        "category": {
          "id": "2",
          "name": "T-Shirts"
        },
        "legacyCategory": "Shoes",
        "imageUrl": "https://example.com/nike-airmax.jpg",
        "requiresSpecialDelivery": false,
        "deliveryEligible": true,
        "pickupEligible": true,
        "createdAt": "2025-09-25T21:30:06.557Z"
      }
    ]
  }
  ```

### 2. Get Single Product

- **URL:** `GET /api/products/:id`
- **Description:** Retrieves a single product by ID with full details
- **Headers:** None required
- **Parameters:** `:id` - Product ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product retrieved successfully",
    "product": {
      "id": "16",
      "name": "Nike Air Max",
      "description": "Comfortable running shoes",
      "sku": "NIKE-AM-001",
      "costPrice": 80,
      "price": 120,
      "discountPrice": 100,
      "discountPercent": 15,
      "effectivePrice": 100,
      "profitMargin": {
        "costPrice": 80,
        "sellingPrice": 100,
        "profit": 20,
        "margin": 20
      },
      "brand": {
        "id": "2",
        "name": "Nike"
      },
      "category": {
        "id": "2",
        "name": "T-Shirts"
      },
      "legacyCategory": "Shoes",
      "imageUrl": "https://example.com/nike-airmax.jpg",
      "requiresSpecialDelivery": false,
      "deliveryEligible": true,
      "pickupEligible": true,
      "createdAt": "2025-09-25T21:30:06.557Z"
    }
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

### 3. Create Product (Admin Only)

- **URL:** `POST /api/products`
- **Description:** Creates a new product
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "Nike Air Max",
    "description": "Comfortable running shoes",
    "sku": "NIKE-AM-001",
    "cost_price": 80,
    "price": 120,
    "discount_price": 100,
    "discount_percent": 15,
    "brand_id": 2,
    "category_id": 2,
    "category": "Shoes",
    "image_url": "https://example.com/nike-airmax.jpg",
    "requires_special_delivery": false,
    "delivery_eligible": true,
    "pickup_eligible": true
  }
  ```

**Validation Rules:**

- `name`: Required, 1-255 characters
- `description`: Optional, any length
- `sku`: Optional, max 100 characters, must be unique
- `cost_price`: Optional, non-negative number
- `price`: Required, positive number
- `discount_price`: Optional, positive number, must be less than price
- `discount_percent`: Optional, 0-100
- `brand_id`: Optional, must be valid brand ID
- `category_id`: Optional, must be valid category ID
- `category`: Optional, legacy field for backward compatibility
- `image_url`: Optional, must be valid URL
- `requires_special_delivery`: Optional, boolean
- `delivery_eligible`: Optional, boolean
- `pickup_eligible`: Optional, boolean

**Response (201):**

```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "id": "16",
    "name": "Nike Air Max",
    "description": "Comfortable running shoes",
    "sku": "NIKE-AM-001",
    "costPrice": 80,
    "price": 120,
    "discountPrice": 100,
    "discountPercent": 15,
    "effectivePrice": 100,
    "profitMargin": {
      "costPrice": 80,
      "sellingPrice": 100,
      "profit": 20,
      "margin": 20
    },
    "brandId": "2",
    "categoryId": "2",
    "legacyCategory": "Shoes",
    "imageUrl": "https://example.com/nike-airmax.jpg",
    "requiresSpecialDelivery": false,
    "deliveryEligible": true,
    "pickupEligible": true,
    "createdAt": "2025-09-25T21:30:06.557Z"
  }
}
```

**Error Response (400) - Validation Error:**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Product name is required and must be 1-255 characters"
    }
  ]
}
```

**Error Response (400) - Invalid Brand:**

```json
{
  "success": false,
  "message": "Brand not found"
}
```

**Error Response (400) - Invalid Category:**

```json
{
  "success": false,
  "message": "Category not found"
}
```

**Error Response (400) - Invalid Discount:**

```json
{
  "success": false,
  "message": "Discount price must be less than regular price"
}
```

**Error Response (409) - Duplicate SKU:**

```json
{
  "success": false,
  "message": "SKU already exists"
}
```

### 4. Update Product (Admin Only)

- **URL:** `PUT /api/products/:id`
- **Description:** Updates an existing product
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Product ID (number)
- **Request Body:** (Include only fields to be updated)
  ```json
  {
    "discount_percent": 20,
    "cost_price": 75,
    "delivery_eligible": false
  }
  ```

**Validation Rules:** Same as create, but all fields are optional

**Response (200):**

```json
{
  "success": true,
  "message": "Product updated successfully",
  "product": {
    "id": "16",
    "name": "Nike Air Max",
    "description": "Comfortable running shoes",
    "sku": "NIKE-AM-001",
    "costPrice": 75,
    "price": 120,
    "discountPrice": 100,
    "discountPercent": 20,
    "effectivePrice": 96,
    "profitMargin": {
      "costPrice": 75,
      "sellingPrice": 96,
      "profit": 21,
      "margin": 21.88
    },
    "brandId": "2",
    "categoryId": "2",
    "legacyCategory": "Shoes",
    "imageUrl": "https://example.com/nike-airmax.jpg",
    "requiresSpecialDelivery": false,
    "deliveryEligible": false,
    "pickupEligible": true,
    "createdAt": "2025-09-25T21:30:06.557Z",
    "updatedAt": "2025-09-25T21:30:17.797Z"
  }
}
```

**Error Response (404):**

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

### 5. Delete Product (Admin Only)

- **URL:** `DELETE /api/products/:id`
- **Description:** Soft deletes a product (sets is_active to false)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Product ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Product deleted successfully",
    "product": {
      "id": "16",
      "name": "Nike Air Max",
      "isActive": false
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Product not found"
}
```

## Product Delivery Options

Products can be configured with specific delivery eligibility:

- **`delivery_eligible`** (boolean, default: true): Whether the product can be delivered to customers
- **`pickup_eligible`** (boolean, default: true): Whether the product can be picked up by customers
- **`requires_special_delivery`** (boolean, default: false): Whether the product requires special delivery handling (affects shipping costs)

**Common configurations:**

- **Both delivery and pickup:** `delivery_eligible: true, pickup_eligible: true` (default)
- **Pickup only:** `delivery_eligible: false, pickup_eligible: true` (fragile items, large items)
- **Delivery only:** `delivery_eligible: true, pickup_eligible: false` (digital products, services)
- **Special delivery:** `requires_special_delivery: true` (large items, fragile items)

## Frontend Integration Notes

### Product Display

For product listings and detail pages:

1. Use `effectivePrice` for displaying the final price to customers
2. Show `discountPrice` or `discountPercent` for discount indicators
3. Display `profitMargin` information in admin interfaces
4. Use `brand` and `category` objects for filtering and navigation

### Product Creation/Editing

For admin product management:

1. Validate that `discount_price < price` before submission
2. Show profit margin calculations in real-time
3. Use brand and category dropdowns with proper validation
4. Handle SKU uniqueness validation

### Pricing Logic

The frontend should:

1. Always use `effectivePrice` for cart calculations
2. Display original price with strikethrough when discounted
3. Show discount percentage or amount clearly
4. Calculate totals using effective prices

### Filtering and Search

For product filtering:

1. Filter by `brand.id` and `category.id` for precise matching
2. Use `legacyCategory` for backward compatibility
3. Filter by `deliveryEligible` and `pickupEligible` based on delivery method
4. Search by `sku` for inventory management

## Error Handling

All endpoints return consistent error responses with:

- `success`: boolean indicating if the request was successful
- `message`: Human-readable error description
- `errors`: Array of validation errors (for 400 responses)
- `error`: Technical error details (for 500 responses)

## Rate Limiting

- Public endpoints (GET): No rate limiting
- Admin endpoints (POST, PUT, DELETE): Subject to authentication and admin role verification
