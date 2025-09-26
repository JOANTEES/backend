# Shopping Cart Endpoints

These endpoints manage the shopping cart for an authenticated user. All routes are protected and require a customer JWT token. The cart system now works with product variants for size/color combinations.

### Cart Features

- **Product Variants:** Add items by variant ID (size/color combinations) instead of individual product attributes
- **Variant Stock Management:** Real-time stock validation per variant with individual stock quantities
- **Transaction Safety:** All operations use database transactions to ensure data consistency
- **Activity Logging:** All cart actions are logged in the customer's activity feed
- **Smart Totals:** The `GET /api/cart` endpoint automatically calculates subtotal, tax, and shipping using dynamic admin settings
- **Order-Level Delivery Method:** Users choose delivery method (pickup or delivery) for the entire cart, not per item
- **Delivery Eligibility Validation:** Cart validates that all items support the selected delivery method
- **Duplicate Prevention:** Adding the same variant updates the quantity instead of creating a new entry
- **No Stock Reduction:** Stock is not reduced when adding to cart - only during order creation

### 1. Get User's Cart

- **URL:** `GET /api/cart`
- **Description:** Retrieves the contents of the user's cart, including calculated totals and variant information.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart retrieved successfully",
    "data": {
      "cart": {
        "id": "39",
        "deliveryMethod": "delivery",
        "deliveryZoneId": null,
        "deliveryZoneName": null,
        "deliveryZoneFee": null
      },
      "items": [
        {
          "id": "82",
          "productId": "16",
          "productName": "Nike Air Max",
          "description": "Comfortable running shoes",
          "price": 120,
          "discountPrice": 100,
          "discountPercent": 15,
          "effectivePrice": 100,
          "discountAmount": 20,
          "hasDiscount": true,
          "quantity": 3,
          "variantId": "1",
          "sku": "NIKE-AM-001-RED-M",
          "size": "M",
          "color": "Red",
          "imageUrl": "https://example.com/nike-airmax-red-m.jpg",
          "stockQuantity": 40,
          "requiresSpecialDelivery": false,
          "deliveryEligible": true,
          "pickupEligible": true,
          "subtotal": 300,
          "createdAt": "2025-09-25T21:45:19.850Z"
        },
        {
          "id": "83",
          "productId": "16",
          "productName": "Nike Air Max",
          "description": "Comfortable running shoes",
          "price": 120,
          "quantity": 1,
          "variantId": "2",
          "sku": "NIKE-AM-001-RED-L",
          "size": "L",
          "color": "Red",
          "imageUrl": "https://example.com/nike-airmax-red-l.jpg",
          "stockQuantity": 15,
          "requiresSpecialDelivery": false,
          "deliveryEligible": true,
          "pickupEligible": true,
          "subtotal": 120,
          "createdAt": "2025-09-25T21:45:27.634Z"
        }
      ],
      "totals": {
        "subtotal": 400,
        "tax": 20,
        "shipping": 0,
        "total": 420,
        "deliveryEligibilityIssues": null
      },
      "itemCount": 2
    }
  }
  ```

### 2. Add Item to Cart

- **URL:** `POST /api/cart/add`
- **Description:** Adds an item to the cart by variant ID. If the variant already exists, it updates the quantity.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "variantId": 1,
    "quantity": 2
  }
  ```

**Validation Rules:**

- `variantId`: Required, must be a valid variant ID
- `quantity`: Required, must be at least 1

**Response (200):**

```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "cart": {
      "id": "39",
      "deliveryMethod": "delivery",
      "deliveryZoneId": null,
      "deliveryZoneName": null,
      "deliveryZoneFee": null
    },
    "items": [
      {
        "id": "82",
        "productId": "16",
        "productName": "Nike Air Max",
        "description": "Comfortable running shoes",
        "price": 120,
        "quantity": 2,
        "variantId": "1",
        "sku": "NIKE-AM-001-RED-M",
        "size": "M",
        "color": "Red",
        "imageUrl": "https://example.com/nike-airmax-red-m.jpg",
        "stockQuantity": 40,
        "requiresSpecialDelivery": false,
        "deliveryEligible": true,
        "pickupEligible": true,
        "subtotal": 240,
        "createdAt": "2025-09-25T21:45:19.850Z"
      }
    ],
    "totals": {
      "subtotal": 240,
      "tax": 12,
      "shipping": 0,
      "total": 252,
      "deliveryEligibilityIssues": null
    },
    "itemCount": 1
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

**Error Response (400) - Insufficient Stock:**

```json
{
  "success": false,
  "message": "Not enough stock. Only 5 available for this variant."
}
```

**Error Response (400) - Product Not Available:**

```json
{
  "success": false,
  "message": "Product is not available"
}
```

### 3. Update Cart Item Quantity

- **URL:** `PUT /api/cart/items/:itemId`
- **Description:** Updates the quantity of a specific cart item.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Parameters:** `:itemId` - Cart item ID
- **Request Body:**
  ```json
  {
    "quantity": 3
  }
  ```

**Validation Rules:**

- `quantity`: Required, must be at least 1

**Response (200):**

```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": {
    "cart": {
      "id": "39",
      "deliveryMethod": "delivery",
      "deliveryZoneId": null,
      "deliveryZoneName": null,
      "deliveryZoneFee": null
    },
    "items": [
      {
        "id": "82",
        "productId": "16",
        "productName": "Nike Air Max",
        "description": "Comfortable running shoes",
        "price": 120,
        "quantity": 3,
        "variantId": "1",
        "sku": "NIKE-AM-001-RED-M",
        "size": "M",
        "color": "Red",
        "imageUrl": "https://example.com/nike-airmax-red-m.jpg",
        "stockQuantity": 40,
        "requiresSpecialDelivery": false,
        "deliveryEligible": true,
        "pickupEligible": true,
        "subtotal": 360,
        "createdAt": "2025-09-25T21:45:19.850Z"
      }
    ],
    "totals": {
      "subtotal": 360,
      "tax": 18,
      "shipping": 0,
      "total": 378,
      "deliveryEligibilityIssues": null
    },
    "itemCount": 1
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Cart item not found"
}
```

**Error Response (400) - Insufficient Stock:**

```json
{
  "success": false,
  "message": "Not enough stock. Only 5 available for this variant."
}
```

### 4. Remove Item from Cart

- **URL:** `DELETE /api/cart/items/:itemId`
- **Description:** Removes a specific item from the cart.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Parameters:** `:itemId` - Cart item ID
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Item removed from cart successfully",
    "data": {
      "cart": {
        "id": "39",
        "deliveryMethod": "delivery",
        "deliveryZoneId": null,
        "deliveryZoneName": null,
        "deliveryZoneFee": null
      },
      "items": [],
      "totals": {
        "subtotal": 0,
        "tax": 0,
        "shipping": 0,
        "total": 0,
        "deliveryEligibilityIssues": null
      },
      "itemCount": 0
    }
  }
  ```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Cart item not found"
}
```

### 5. Clear Cart

- **URL:** `DELETE /api/cart/clear`
- **Description:** Removes all items from the cart.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart cleared successfully",
    "data": {
      "cart": {
        "id": "39",
        "deliveryMethod": "delivery",
        "deliveryZoneId": null,
        "deliveryZoneName": null,
        "deliveryZoneFee": null
      },
      "items": [],
      "totals": {
        "subtotal": 0,
        "tax": 0,
        "shipping": 0,
        "total": 0,
        "deliveryEligibilityIssues": null
      },
      "itemCount": 0
    }
  }
  ```

### 6. Update Delivery Method

- **URL:** `PUT /api/cart/delivery`
- **Description:** Updates the delivery method for the entire cart.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "deliveryMethod": "delivery",
    "deliveryZoneId": 1
  }
  ```

**Validation Rules:**

- `deliveryMethod`: Required, must be "pickup" or "delivery"
- `deliveryZoneId`: Required when deliveryMethod is "delivery", must be valid delivery zone ID

**Response (200):**

```json
{
  "success": true,
  "message": "Delivery method updated successfully",
  "data": {
    "cart": {
      "id": "39",
      "deliveryMethod": "delivery",
      "deliveryZoneId": "1",
      "deliveryZoneName": "East Legon",
      "deliveryZoneFee": 15.0
    },
    "items": [
      {
        "id": "82",
        "productId": "16",
        "productName": "Nike Air Max",
        "description": "Comfortable running shoes",
        "price": 120,
        "quantity": 3,
        "variantId": "1",
        "sku": "NIKE-AM-001-RED-M",
        "size": "M",
        "color": "Red",
        "imageUrl": "https://example.com/nike-airmax-red-m.jpg",
        "stockQuantity": 40,
        "requiresSpecialDelivery": false,
        "deliveryEligible": true,
        "pickupEligible": true,
        "subtotal": 360,
        "createdAt": "2025-09-25T21:45:19.850Z"
      }
    ],
    "totals": {
      "subtotal": 360,
      "tax": 18,
      "shipping": 15,
      "total": 393,
      "deliveryEligibilityIssues": null
    },
    "itemCount": 1
  }
}
```

**Error Response (400) - Invalid Delivery Method:**

```json
{
  "success": false,
  "message": "Invalid delivery method."
}
```

**Error Response (400) - Missing Delivery Zone:**

```json
{
  "success": false,
  "message": "Delivery Zone ID is required for delivery."
}
```

## Cart Item Object Structure

### Cart Item Fields

| Field                     | Type    | Description                                 |
| ------------------------- | ------- | ------------------------------------------- |
| `id`                      | string  | Unique cart item identifier                 |
| `productId`               | string  | Parent product ID                           |
| `productName`             | string  | Name of the parent product                  |
| `description`             | string  | Product description                         |
| `price`                   | number  | Original product price                      |
| `discountPrice`           | number  | Discount price (if set)                     |
| `discountPercent`         | number  | Discount percentage (if set)                |
| `effectivePrice`          | number  | Final price after discount applied          |
| `discountAmount`          | number  | Amount saved from discount                  |
| `hasDiscount`             | boolean | Whether product has an active discount      |
| `quantity`                | number  | Quantity in cart                            |
| `variantId`               | string  | Product variant ID (size/color combination) |
| `sku`                     | string  | Variant SKU                                 |
| `size`                    | string  | Variant size                                |
| `color`                   | string  | Variant color                               |
| `imageUrl`                | string  | Variant-specific image URL                  |
| `stockQuantity`           | number  | Available stock for this variant            |
| `requiresSpecialDelivery` | boolean | Whether product requires special delivery   |
| `deliveryEligible`        | boolean | Whether product can be delivered            |
| `pickupEligible`          | boolean | Whether product can be picked up            |
| `subtotal`                | number  | Price × quantity                            |
| `createdAt`               | string  | ISO timestamp when item was added to cart   |

## Cart Totals Object Structure

### Totals Fields

| Field                       | Type   | Description                               |
| --------------------------- | ------ | ----------------------------------------- |
| `subtotal`                  | number | Sum of all item subtotals                 |
| `tax`                       | number | Calculated tax amount                     |
| `shipping`                  | number | Delivery/shipping cost                    |
| `total`                     | number | Final total (subtotal + tax + shipping)   |
| `deliveryEligibilityIssues` | array  | Issues with delivery method compatibility |

### Delivery Eligibility Issues

When items in the cart are not compatible with the selected delivery method, the `deliveryEligibilityIssues` array will contain objects describing the issues:

```json
{
  "type": "not_delivery_eligible",
  "message": "Some items are not available for delivery",
  "items": [
    {
      "productId": "16",
      "productName": "Nike Air Max",
      "message": "This item is not available for delivery"
    }
  ]
}
```

## Frontend Integration Notes

### Adding Items to Cart

For product detail pages with variants:

1. Display available variants with size/color options
2. Show stock availability for each variant
3. Use `variantId` when adding to cart instead of `productId`
4. Handle out-of-stock variants appropriately

### Cart Display

For cart pages:

1. Display variant information (size, color, SKU)
2. Show variant-specific images when available
3. Display stock quantities for each variant
4. Handle delivery eligibility issues

### Stock Management

For inventory management:

1. Stock is not reduced when adding to cart
2. Stock is only reduced during order creation
3. This allows for cart abandonment without affecting inventory
4. Real-time stock validation prevents overselling

### Effective Pricing

For discount management:

1. **Original Price**: The base product price
2. **Discount Price**: Fixed discount price (takes precedence over percentage)
3. **Discount Percent**: Percentage discount (used if no discount price)
4. **Effective Price**: Final price after discount applied
5. **Discount Amount**: Amount saved from the discount
6. **Has Discount**: Boolean flag indicating if discount is active
7. **Subtotal Calculation**: Uses effective price × quantity
8. **Order Creation**: Orders use effective pricing for accurate totals

### Error Handling

For user experience:

1. Show clear error messages for stock issues
2. Handle variant not found errors
3. Display delivery eligibility issues
4. Provide fallback options for out-of-stock items

## Error Handling

All endpoints return consistent error responses with:

- `success`: boolean indicating if the request was successful
- `message`: Human-readable error description
- `errors`: Array of validation errors (for 400 responses)
- `error`: Technical error details (for 500 responses)

## Rate Limiting

All cart endpoints require authentication and are subject to rate limiting based on user activity.
