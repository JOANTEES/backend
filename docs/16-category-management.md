# Category Management Endpoints

These endpoints handle the management of product categories with hierarchical support (subcategories). Categories help organize products and provide filtering options for customers.

## Category Features

- **Hierarchical Structure:** Support for parent-child relationships (subcategories)
- **Tree View:** Get categories as a nested tree structure
- **Flat List:** Get categories as a flat list for dropdowns/filters
- **Sort Order:** Customizable ordering within each level
- **Active Status:** Soft delete functionality (deactivate instead of hard delete)
- **Product Association:** Categories can be linked to products
- **Public Access:** Customers can view active categories
- **Admin Management:** Full CRUD operations for administrators

## Category Object Structure

```json
{
  "id": "1",
  "name": "Men's Clothing",
  "description": "All men's clothing items",
  "parentId": null,
  "imageUrl": "https://example.com/mens-category.jpg",
  "isActive": true,
  "sortOrder": 1,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "children": [
    {
      "id": "2",
      "name": "T-Shirts",
      "description": "Men's t-shirts",
      "parentId": "1",
      "imageUrl": "https://example.com/tshirts.jpg",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2024-01-15T10:35:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z",
      "children": []
    }
  ]
}
```

### Field Descriptions

| Field         | Type    | Description                                   |
| ------------- | ------- | --------------------------------------------- |
| `id`          | string  | Unique category identifier                    |
| `name`        | string  | Category name (1-100 characters)              |
| `description` | string  | Category description (optional)               |
| `parentId`    | string  | Parent category ID (null for root categories) |
| `imageUrl`    | string  | URL to category image (optional)              |
| `isActive`    | boolean | Whether the category is active/visible        |
| `sortOrder`   | number  | Sort order within the same level (0-based)    |
| `createdAt`   | string  | ISO timestamp when category was created       |
| `updatedAt`   | string  | ISO timestamp when category was last updated  |
| `children`    | array   | Array of subcategories (only in tree view)    |

## API Endpoints

### 1. Get Category Tree

- **URL:** `GET /api/categories`
- **Description:** Retrieves all active categories as a hierarchical tree structure
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Categories retrieved successfully",
    "count": 3,
    "categories": [
      {
        "id": "1",
        "name": "Men's Clothing",
        "description": "All men's clothing items",
        "parentId": null,
        "imageUrl": "https://example.com/mens-category.jpg",
        "isActive": true,
        "sortOrder": 1,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "children": [
          {
            "id": "2",
            "name": "T-Shirts",
            "description": "Men's t-shirts",
            "parentId": "1",
            "imageUrl": "https://example.com/tshirts.jpg",
            "isActive": true,
            "sortOrder": 1,
            "createdAt": "2024-01-15T10:35:00.000Z",
            "updatedAt": "2024-01-15T10:35:00.000Z",
            "children": []
          }
        ]
      }
    ]
  }
  ```

### 2. Get Flat Category List

- **URL:** `GET /api/categories/flat`
- **Description:** Retrieves all active categories as a flat list (useful for dropdowns and filters)
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Categories retrieved successfully",
    "count": 3,
    "categories": [
      {
        "id": "1",
        "name": "Men's Clothing",
        "description": "All men's clothing items",
        "parentId": null,
        "imageUrl": "https://example.com/mens-category.jpg",
        "isActive": true,
        "sortOrder": 1,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "2",
        "name": "T-Shirts",
        "description": "Men's t-shirts",
        "parentId": "1",
        "imageUrl": "https://example.com/tshirts.jpg",
        "isActive": true,
        "sortOrder": 1,
        "createdAt": "2024-01-15T10:35:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      }
    ]
  }
  ```

### 3. Get Single Category

- **URL:** `GET /api/categories/:id`
- **Description:** Retrieves a single category by ID
- **Headers:** None required
- **Parameters:** `:id` - Category ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Category retrieved successfully",
    "category": {
      "id": "1",
      "name": "Men's Clothing",
      "description": "All men's clothing items",
      "parentId": null,
      "imageUrl": "https://example.com/mens-category.jpg",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Category not found"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Invalid category ID. Must be a number."
}
```

### 4. Get Subcategories

- **URL:** `GET /api/categories/:id/children`
- **Description:** Retrieves all subcategories of a specific category
- **Headers:** None required
- **Parameters:** `:id` - Parent category ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Subcategories retrieved successfully",
    "count": 2,
    "subcategories": [
      {
        "id": "2",
        "name": "T-Shirts",
        "description": "Men's t-shirts",
        "parentId": "1",
        "imageUrl": "https://example.com/tshirts.jpg",
        "isActive": true,
        "sortOrder": 1,
        "createdAt": "2024-01-15T10:35:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      },
      {
        "id": "3",
        "name": "Jeans",
        "description": "Men's jeans",
        "parentId": "1",
        "imageUrl": "https://example.com/jeans.jpg",
        "isActive": true,
        "sortOrder": 2,
        "createdAt": "2024-01-15T10:40:00.000Z",
        "updatedAt": "2024-01-15T10:40:00.000Z"
      }
    ]
  }
  ```

### 5. Create Category (Admin Only)

- **URL:** `POST /api/categories`
- **Description:** Creates a new category
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "Women's Clothing",
    "description": "All women's clothing items",
    "parent_id": null,
    "image_url": "https://example.com/womens-category.jpg",
    "sort_order": 2
  }
  ```

**Validation Rules:**

- `name`: Required, 1-100 characters
- `description`: Optional, any length
- `parent_id`: Optional, must be valid category ID if provided
- `image_url`: Optional, must be valid URL
- `sort_order`: Optional, non-negative integer (default: 0)

**Response (201):**

```json
{
  "success": true,
  "message": "Category created successfully",
  "category": {
    "id": "4",
    "name": "Women's Clothing",
    "description": "All women's clothing items",
    "parentId": null,
    "imageUrl": "https://example.com/womens-category.jpg",
    "isActive": true,
    "sortOrder": 2,
    "createdAt": "2024-01-15T11:00:00.000Z"
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
      "message": "Category name is required and must be 1-100 characters"
    }
  ]
}
```

**Error Response (400) - Invalid Parent:**

```json
{
  "success": false,
  "message": "Parent category not found"
}
```

**Error Response (409) - Duplicate Name:**

```json
{
  "success": false,
  "message": "Category with this name already exists at this level"
}
```

### 6. Update Category (Admin Only)

- **URL:** `PUT /api/categories/:id`
- **Description:** Updates an existing category
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Category ID (number)
- **Request Body:** (Include only fields to be updated)
  ```json
  {
    "name": "Men's Apparel",
    "description": "Updated description",
    "parent_id": null,
    "image_url": "https://example.com/new-mens-category.jpg",
    "sort_order": 1,
    "is_active": true
  }
  ```

**Validation Rules:**

- `name`: Optional, 1-100 characters
- `description`: Optional, any length
- `parent_id`: Optional, must be valid category ID if provided
- `image_url`: Optional, must be valid URL
- `sort_order`: Optional, non-negative integer
- `is_active`: Optional, boolean

**Response (200):**

```json
{
  "success": true,
  "message": "Category updated successfully",
  "category": {
    "id": "1",
    "name": "Men's Apparel",
    "description": "Updated description",
    "parentId": null,
    "imageUrl": "https://example.com/new-mens-category.jpg",
    "isActive": true,
    "sortOrder": 1,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Category not found"
}
```

**Error Response (400) - Circular Reference:**

```json
{
  "success": false,
  "message": "Category cannot be its own parent"
}
```

**Error Response (409) - Name Conflict:**

```json
{
  "success": false,
  "message": "Category with this name already exists at this level"
}
```

### 7. Delete Category (Admin Only)

- **URL:** `DELETE /api/categories/:id`
- **Description:** Soft deletes a category (sets is_active to false)
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Category ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Category deleted successfully",
    "category": {
      "id": "1",
      "name": "Men's Apparel",
      "isActive": false
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Category not found"
}
```

**Error Response (409) - Has Subcategories:**

```json
{
  "success": false,
  "message": "Cannot delete category. It has active subcategories. Deactivate them first or move them to another parent."
}
```

**Error Response (409) - Category in Use:**

```json
{
  "success": false,
  "message": "Cannot delete category. It is being used by products. Deactivate it instead."
}
```

## Frontend Integration Notes

### Category Tree Display

For hierarchical category navigation:

1. Use `GET /api/categories` to get the full tree structure
2. Display categories with nested subcategories
3. Handle expand/collapse functionality for subcategories

### Category Selection for Products

When creating or editing products:

1. Use `GET /api/categories/flat` for dropdown/select components
2. Display parent categories with indentation or grouping
3. Store the selected `category_id` when creating/updating products

### Category Filtering

For product filtering:

1. Use category names for filter options
2. Filter products by `category_id` when making product API calls
3. Show category hierarchy in filter UI

### Admin Category Management

For admin interfaces:

1. Display categories in a tree table with edit/delete actions
2. Show category usage count (how many products use this category)
3. Prevent deletion of categories that have subcategories or are in use
4. Use soft delete (deactivate) instead of hard delete
5. Allow drag-and-drop reordering using `sort_order`

### Breadcrumb Navigation

For product pages and category pages:

1. Build breadcrumbs by traversing the parent hierarchy
2. Use `parentId` to build the full path from root to current category

## Error Handling

All endpoints return consistent error responses with:

- `success`: boolean indicating if the request was successful
- `message`: Human-readable error description
- `errors`: Array of validation errors (for 400 responses)
- `error`: Technical error details (for 500 responses)

## Rate Limiting

- Public endpoints (GET): No rate limiting
- Admin endpoints (POST, PUT, DELETE): Subject to authentication and admin role verification
