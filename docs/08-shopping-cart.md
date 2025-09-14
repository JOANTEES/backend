# Shopping Cart Endpoints

These endpoints manage the shopping cart for an authenticated user. All routes are protected and require a customer JWT token.

### Cart Features

- **Stock Management:** Stock quantity automatically reduces when adding to cart and restores when removing.
- **Transaction Safety:** All operations use database transactions to ensure data consistency.
- **Activity Logging:** All cart actions are logged in the customer's activity feed.
- **Smart Totals:** The `GET /api/cart` endpoint automatically calculates subtotal, tax, and shipping using dynamic admin settings. Tax rate, free shipping threshold, and large order handling are all configurable by admins.
- **Order-Level Delivery Method:** Users choose delivery method (pickup or delivery) for the entire cart, not per item.
- **Delivery Eligibility Validation:** Cart validates that all items support the selected delivery method. Items can be marked as delivery-only, pickup-only, or both.
- **Duplicate Prevention:** Adding the same product with the same size/color updates the quantity instead of creating a new entry.

### 1. Get User's Cart

- **URL:** `GET /api/cart`
- **Description:** Retrieves the contents of the user's cart, including calculated totals.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart retrieved successfully",
    "data": {
      "cart": {
        "id": "1",
        "deliveryMethod": "delivery",
        "deliveryZoneId": "1",
        "deliveryZoneName": "East Legon",
        "deliveryZoneFee": 15.0,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      "items": [
        {
          "id": "1",
          "productId": "1",
          "productName": "Classic White T-Shirt",
          "quantity": 2,
          "price": 29.99,
          "size": "M",
          "color": "White",
          "deliveryEligible": true,
          "pickupEligible": true,
          "requiresSpecialDelivery": false,
          "subtotal": 59.98
        }
      ],
      "totals": {
        "subtotal": 59.98,
        "tax": 6.0,
        "shipping": 15.0,
        "total": 80.98,
        "deliveryEligibilityIssues": null
      },
      "itemCount": 1
    }
  }
  ```

#### Delivery Eligibility Validation

The cart system automatically validates that all items support the selected delivery method:

- **When `deliveryEligibilityIssues` is `null`:** All items in the cart are compatible with the selected delivery method.
- **When `deliveryEligibilityIssues` contains issues:** Some items are not compatible with the selected delivery method.

**Example of delivery eligibility issues:**

```json
{
  "totals": {
    "subtotal": 59.98,
    "tax": 6.0,
    "shipping": 15.0,
    "total": 80.98,
    "deliveryEligibilityIssues": [
      {
        "type": "not_delivery_eligible",
        "message": "Some items are not available for delivery",
        "items": [
          {
            "productId": "2",
            "productName": "Fragile Glass Vase",
            "message": "This item is not available for delivery"
          }
        ]
      }
    ]
  }
}
```

**Frontend should:**

1. Check for `deliveryEligibilityIssues` in the cart response
2. Display warnings to users about incompatible items
3. Suggest switching delivery method or removing incompatible items
4. Prevent order creation when there are eligibility issues

### 2. Add Item to Cart

- **URL:** `POST /api/cart/add`
- **Description:** Adds a product to the user's cart or updates its quantity.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "productId": 1,
    "quantity": 1,
    "size": "M",
    "color": "White"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Item added to cart successfully",
    "item": {
      // ... details of the added/updated item
    }
  }
  ```

### 3. Update Cart Delivery Method

- **URL:** `PUT /api/cart/delivery`
- **Description:** Updates the delivery method and zone for the entire cart.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "deliveryMethod": "delivery",
    "deliveryZoneId": 1
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart delivery method updated successfully",
    "data": {
      "deliveryMethod": "delivery",
      "deliveryZoneId": 1
    }
  }
  ```

### 4. Set Delivery Address (Auto-Determine Zone)

- **URL:** `PUT /api/cart/delivery-address`
- **Description:** Sets the delivery address and automatically determines the correct delivery zone based on the address.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "regionId": 1,
    "cityId": 1,
    "areaName": "East Legon"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Delivery address set and zone determined automatically.",
    "data": {
      "cart": {
        "id": "1",
        "deliveryMethod": "delivery",
        "deliveryZoneId": "1",
        "deliveryZoneName": "Accra North",
        "deliveryZoneFee": 20.0
      },
      "items": [...],
      "totals": {...},
      "itemCount": 2,
      "determinedZone": {
        "id": "1",
        "name": "Accra North",
        "deliveryFee": 20.0,
        "estimatedDays": "1-2 days"
      }
    }
  }
  ```
- **Response (400):**
  ```json
  {
    "success": false,
    "message": "No delivery zone found for the specified address. Please contact support."
  }
  ```

### 5. Update Cart Item Quantity

- **URL:** `PUT /api/cart/:itemId`
- **Description:** Updates the quantity of a specific item in the cart.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Parameters:** `:itemId` - The ID of the cart item (not the product ID).
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
    "item": {
      // ... details of the updated item
    }
  }
  ```

### 6. Remove Item from Cart

- **URL:** `DELETE /api/cart/:itemId`
- **Description:** Removes a single item from the cart.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Parameters:** `:itemId` - The ID of the cart item.
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Item removed from cart successfully"
  }
  ```

### 7. Clear Entire Cart

- **URL:** `DELETE /api/cart/clear`
- **Description:** Removes all items from the user's cart.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cart cleared successfully"
  }
  ```
