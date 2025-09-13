# Shopping Cart Endpoints

These endpoints manage the shopping cart for an authenticated user. All routes are protected and require a customer JWT token.

### Cart Features

- **Stock Management:** Stock quantity automatically reduces when adding to cart and restores when removing.
- **Transaction Safety:** All operations use database transactions to ensure data consistency.
- **Activity Logging:** All cart actions are logged in the customer's activity feed.
- **Smart Totals:** The `GET /api/cart` endpoint automatically calculates subtotal, tax, and shipping using dynamic admin settings. Tax rate, free shipping threshold, and large order handling are all configurable by admins.
- **Order-Level Delivery Method:** Users choose delivery method (pickup or delivery) for the entire cart, not per item.
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
          "subtotal": 59.98
        }
      ],
      "totals": {
        "subtotal": 59.98,
        "tax": 6.0,
        "shipping": 15.0,
        "total": 80.98
      },
      "itemCount": 1
    }
  }
  ```

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

### 4. Update Cart Item Quantity

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

### 4. Remove Item from Cart

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

### 5. Clear Entire Cart

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
