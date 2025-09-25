# Brand Management Endpoints

These endpoints handle the management of product brands. Brands help organize products and provide filtering options for customers.

## Brand Features

- **Brand Information:** Name, description, and logo
- **Active Status:** Soft delete functionality (deactivate instead of hard delete)
- **Product Association:** Brands can be linked to products
- **Public Access:** Customers can view active brands
- **Admin Management:** Full CRUD operations for administrators

## Brand Object Structure

```json
{
  "id": "1",
  "name": "Nike",
  "description": "Just Do It - Athletic wear and footwear",
  "logoUrl": "https://example.com/nike-logo.png",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Field Descriptions

| Field         | Type    | Description                               |
| ------------- | ------- | ----------------------------------------- |
| `id`          | string  | Unique brand identifier                   |
| `name`        | string  | Brand name (unique, 1-100 characters)     |
| `description` | string  | Brand description (optional)              |
| `logoUrl`     | string  | URL to brand logo image (optional)        |
| `isActive`    | boolean | Whether the brand is active/visible       |
| `createdAt`   | string  | ISO timestamp when brand was created      |
| `updatedAt`   | string  | ISO timestamp when brand was last updated |

## API Endpoints

### 1. Get All Brands

- **URL:** `GET /api/brands`
- **Description:** Retrieves all active brands
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Brands retrieved successfully",
    "count": 2,
    "brands": [
      {
        "id": "1",
        "name": "Nike",
        "description": "Just Do It - Athletic wear and footwear",
        "logoUrl": "https://example.com/nike-logo.png",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "2",
        "name": "Adidas",
        "description": "Impossible is Nothing - Sports apparel",
        "logoUrl": "https://example.com/adidas-logo.png",
        "isActive": true,
        "createdAt": "2024-01-15T11:00:00.000Z"
      }
    ]
  }
  ```

### 2. Get Single Brand

- **URL:** `GET /api/brands/:id`
- **Description:** Retrieves a single brand by ID
- **Headers:** None required
- **Parameters:** `:id` - Brand ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Brand retrieved successfully",
    "brand": {
      "id": "1",
      "name": "Nike",
      "description": "Just Do It - Athletic wear and footwear",
      "logoUrl": "https://example.com/nike-logo.png",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Brand not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Invalid brand ID. Must be a number."
}
```

### 3. Create Brand (Admin Only)

- **URL:** `POST /api/brands`
- **Description:** Creates a new brand
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "Puma",
    "description": "Forever Faster - Sports and lifestyle brand",
    "logo_url": "https://example.com/puma-logo.png"
  }
  ```

**Validation Rules:**

- `name`: Required, 1-100 characters, must be unique
- `description`: Optional, any length
- `logo_url`: Optional, must be valid URL

**Response (201):**

```json
{
  "success": true,
  "message": "Brand created successfully",
  "brand": {
    "id": "3",
    "name": "Puma",
    "description": "Forever Faster - Sports and lifestyle brand",
    "logoUrl": "https://example.com/puma-logo.png",
    "isActive": true,
    "createdAt": "2024-01-15T12:00:00.000Z"
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
      "message": "Brand name is required and must be 1-100 characters"
    }
  ]
}
```

**Error Response (409) - Duplicate Name:**

```json
{
  "success": false,
  "message": "Brand with this name already exists"
}
```

### 4. Update Brand (Admin Only)

- **URL:** `PUT /api/brands/:id`
- **Description:** Updates an existing brand
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Brand ID (number)
- **Request Body:** (Include only fields to be updated)
  ```json
  {
    "name": "Nike Inc.",
    "description": "Updated description",
    "logo_url": "https://example.com/new-nike-logo.png",
    "is_active": true
  }
  ```

**Validation Rules:**

- `name`: Optional, 1-100 characters, must be unique if provided
- `description`: Optional, any length
- `logo_url`: Optional, must be valid URL
- `is_active`: Optional, boolean

**Response (200):**

```json
{
  "success": true,
  "message": "Brand updated successfully",
  "brand": {
    "id": "1",
    "name": "Nike Inc.",
    "description": "Updated description",
    "logoUrl": "https://example.com/new-nike-logo.png",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:30:00.000Z"
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Brand not found"
}
```

**Error Response (409) - Name Conflict:**

```json
{
  "success": false,
  "message": "Brand with this name already exists"
}
```

### 5. Delete Brand (Admin Only)

- **URL:** `DELETE /api/brands/:id`
- **Description:** Soft deletes a brand (sets is_active to false)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Brand ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Brand deleted successfully",
    "brand": {
      "id": "1",
      "name": "Nike",
      "isActive": false
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Brand not found"
}
```

**Error Response (409) - Brand in Use:**

```json
{
  "success": false,
  "message": "Cannot delete brand. It is being used by products. Deactivate it instead."
}
```

## Frontend Integration Notes

### Brand Selection for Products

When creating or editing products, the frontend should:

1. Fetch all active brands using `GET /api/brands`
2. Display brands in a dropdown/select component
3. Store the selected `brand_id` when creating/updating products

### Brand Filtering

For product filtering, the frontend can:

1. Use brand names for filter options
2. Filter products by `brand_id` when making product API calls
3. Display brand logos in product listings

### Admin Brand Management

For admin interfaces:

1. Display brands in a table with edit/delete actions
2. Show brand usage count (how many products use this brand)
3. Prevent deletion of brands that are in use by products
4. Use soft delete (deactivate) instead of hard delete

## Error Handling

All endpoints return consistent error responses with:

- `success`: boolean indicating if the request was successful
- `message`: Human-readable error description
- `errors`: Array of validation errors (for 400 responses)
- `error`: Technical error details (for 500 responses)

## Rate Limiting

- Public endpoints (GET): No rate limiting
- Admin endpoints (POST, PUT, DELETE): Subject to authentication and admin role verification
