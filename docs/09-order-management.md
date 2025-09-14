# Order & Delivery System

This section covers endpoints related to order processing and delivery management.

## Order Management System

The order management system supports 4 payment/delivery combinations with comprehensive order tracking and management.

### Order Creation

#### Create Order from Cart

- **URL:** `POST /api/orders`
- **Description:** Create a new order from the user's cart with support for 4 payment/delivery combinations. Validates that all cart items support the selected delivery method.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "paymentMethod": "online", // "online", "on_delivery", "on_pickup"
    "deliveryMethod": "delivery", // "delivery", "pickup"
    "deliveryAddressId": 1, // Required for delivery
    "pickupLocationId": 1, // Required for pickup
    "customerNotes": "Please call before delivery"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Order created successfully",
    "order": {
      "id": "1",
      "orderNumber": "ORD-123456-001",
      "status": "pending",
      "paymentMethod": "online",
      "paymentStatus": "pending",
      "deliveryMethod": "delivery",
      "deliveryAddress": {
        "regionId": "1",
        "regionName": "Greater Accra",
        "cityId": "1",
        "cityName": "Tema",
        "areaName": "Kpone",
        "landmark": "Near Top Oil Kpone",
        "additionalInstructions": "Call when you arrive",
        "contactPhone": "+233123456789",
        "googleMapsLink": "https://www.google.com/maps/search/?api=1&query=..."
      },
      "pickupLocation": null,
      "totals": {
        "subtotal": 100.0,
        "taxAmount": 10.0,
        "shippingFee": 20.0,
        "largeOrderFee": 0.0,
        "specialDeliveryFee": 0.0,
        "totalAmount": 130.0
      },
      "customerNotes": "Please call before delivery",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

**Error Response (400) - Delivery Eligibility Issues:**

```json
{
  "success": false,
  "message": "Delivery method not compatible with cart items",
  "deliveryEligibilityIssues": [
    {
      "type": "not_delivery_eligible",
      "message": "Some items in your cart are not available for delivery",
      "items": [
        {
          "productId": 2,
          "productName": "Fragile Glass Vase",
          "message": "This item is not available for delivery"
        }
      ]
    }
  ]
}
```

### Order Retrieval

#### Get User's Orders

- **URL:** `GET /api/orders`
- **Description:** Retrieve user's order history with optional filtering
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `status` (optional): Filter by order status
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Orders retrieved successfully",
    "count": 2,
    "orders": [
      {
        "id": "1",
        "orderNumber": "ORD-123456-001",
        "status": "pending",
        "paymentMethod": "online",
        "paymentStatus": "pending",
        "deliveryMethod": "delivery",
        "deliveryAddress": {
          /* address object */
        },
        "pickupLocationName": null,
        "deliveryZoneName": "Accra North",
        "totals": {
          /* totals object */
        },
        "customerNotes": "Please call before delivery",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": null,
        "confirmedAt": null,
        "shippedAt": null,
        "deliveredAt": null
      }
    ]
  }
  ```

#### Get Single Order

- **URL:** `GET /api/orders/:id`
- **Description:** Get detailed information for a single order including all items
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Order retrieved successfully",
    "order": {
      "id": "1",
      "orderNumber": "ORD-123456-001",
      "status": "pending",
      "paymentMethod": "online",
      "paymentStatus": "pending",
      "deliveryMethod": "delivery",
      "deliveryAddress": {
        /* full address object */
      },
      "pickupLocation": null,
      "deliveryZone": {
        "id": "1",
        "name": "Accra North",
        "deliveryFee": 20.0
      },
      "totals": {
        /* complete totals breakdown */
      },
      "customerNotes": "Please call before delivery",
      "notes": null,
      "estimatedDeliveryDate": null,
      "actualDeliveryDate": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": null,
      "confirmedAt": null,
      "shippedAt": null,
      "deliveredAt": null,
      "items": [
        {
          "id": "1",
          "productId": "1",
          "productName": "Classic White T-Shirt",
          "productDescription": "Premium cotton classic fit t-shirt",
          "productImageUrl": "https://example.com/image.jpg",
          "size": "M",
          "color": "White",
          "quantity": 2,
          "unitPrice": 29.99,
          "subtotal": 59.98,
          "requiresSpecialDelivery": false,
          "currentProductName": "Classic White T-Shirt",
          "currentImageUrl": "https://example.com/image.jpg"
        }
      ]
    }
  }
  ```

### Order Status Flow

The system supports the following order statuses:

1. **pending** - Order created, awaiting confirmation
2. **confirmed** - Order confirmed by admin
3. **processing** - Order being prepared
4. **ready_for_pickup** - Order ready for customer pickup
5. **shipped** - Order shipped for delivery
6. **out_for_delivery** - Order out for delivery
7. **delivered** - Order successfully delivered
8. **cancelled** - Order cancelled
9. **refunded** - Order refunded

### Payment & Delivery Combinations

The system supports 4 combinations:

1. **Pay Online + Delivery** - Customer pays instantly, gets delivery
2. **Pay Online + Pickup** - Customer pays instantly, picks up from store
3. **Pay on Delivery + Delivery** - Customer pays when item arrives
4. **Pay on Delivery + Pickup** - Customer pays when picking up

### Order Features

- **Dynamic Calculations:** Uses admin-defined settings for tax, shipping, and free shipping
- **Stock Management:** Automatically reduces product stock on order creation
- **Product Snapshots:** Preserves product details at time of order
- **Transaction Safety:** Database transactions ensure data consistency
- **Address Integration:** Works with customer addresses and pickup locations
- **Google Maps Links:** Automatic generation for delivery addresses

---

## Delivery Zones System (Available Now)

These endpoints allow admins to manage delivery zones and customers to view them.

### 1. Get Available Delivery Zones

- **URL:** `GET /api/delivery-zones`
- **Description:** Retrieve all active delivery zones for customer selection with structured area coverage.
- **Headers:** None required.
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Delivery zones retrieved successfully",
    "count": 1,
    "zones": [
      {
        "id": "1",
        "name": "Accra North",
        "description": "Accra North and surrounding areas",
        "deliveryFee": 20.0,
        "estimatedDays": "1-2 days",
        "coverageAreas": ["East Legon", "Labone"],
        "structuredAreas": [
          {
            "id": 1,
            "regionId": 1,
            "regionName": "Greater Accra",
            "cityId": 1,
            "cityName": "Accra",
            "areaName": "East Legon"
          },
          {
            "id": 2,
            "regionId": 1,
            "regionName": "Greater Accra",
            "cityId": 1,
            "cityName": "Accra",
            "areaName": "Labone"
          }
        ],
        "isActive": true,
        "createdAt": "2024-01-16T14:00:00.000Z"
      }
    ]
  }
  ```

### 2. Get Single Delivery Zone

- **URL:** `GET /api/delivery-zones/:id`
- **Description:** Retrieve details of a specific delivery zone by its ID.
- **Headers:** None required.
- **Response (200):** A single delivery zone object.

### 3. Create Delivery Zone (Admin Only)

- **URL:** `POST /api/delivery-zones`
- **Description:** Create a new delivery zone.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "Tema",
    "description": "Tema and surrounding areas",
    "deliveryFee": 25.0,
    "estimatedDays": "2-3 days",
    "coverageAreas": ["Tema", "Kpone", "Ashaiman"]
  }
  ```
- **Response (201):** The newly created delivery zone object.

### 4. Update Delivery Zone (Admin Only)

- **URL:** `PUT /api/delivery-zones/:id`
- **Description:** Update an existing delivery zone.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:** (Include only the fields to be updated)
  ```json
  {
    "deliveryFee": 20.0,
    "isActive": false
  }
  ```
- **Response (200):** The updated delivery zone object.

### 5. Delete Delivery Zone (Admin Only)

- **URL:** `DELETE /api/delivery-zones/:id`
- **Description:** Deactivates a delivery zone (soft delete). It is not permanently removed from the database.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Delivery zone deactivated successfully",
    "zone": {
      "id": "2",
      "name": "Tema",
      "isActive": false
    }
  }
  ```

### 6. Get All Delivery Zones (Admin Only)

- **URL:** `GET /api/delivery-zones/admin`
- **Description:** Retrieve all delivery zones, including inactive ones.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):** A list of all delivery zone objects.

### 7. Add Area to Delivery Zone (Admin Only)

- **URL:** `POST /api/delivery-zones/:id/areas`
- **Description:** Add a specific area to a delivery zone's coverage.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "regionId": 1,
    "cityId": 1,
    "areaName": "East Legon"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Area added to delivery zone successfully",
    "area": {
      "id": "1",
      "deliveryZoneId": "1",
      "regionId": "1",
      "cityId": "1",
      "areaName": "East Legon",
      "createdAt": "2024-01-16T15:00:00.000Z"
    }
  }
  ```

### 8. Remove Area from Delivery Zone (Admin Only)

- **URL:** `DELETE /api/delivery-zones/:id/areas/:areaId`
- **Description:** Remove a specific area from a delivery zone's coverage.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Area removed from delivery zone successfully",
    "area": {
      "id": "1",
      "areaName": "East Legon"
    }
  }
  ```

### 9. Get Areas for Delivery Zone (Admin Only)

- **URL:** `GET /api/delivery-zones/:id/areas`
- **Description:** Get all areas covered by a specific delivery zone.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Delivery zone areas retrieved successfully",
    "count": 2,
    "areas": [
      {
        "id": "1",
        "deliveryZoneId": "1",
        "regionId": "1",
        "regionName": "Greater Accra",
        "cityId": "1",
        "cityName": "Accra",
        "areaName": "East Legon",
        "createdAt": "2024-01-16T15:00:00.000Z"
      }
    ]
  }
  ```

---

## Admin Settings System (Available Now)

These endpoints allow admins to manage application-wide business settings.

### 1. Get App Settings

- **URL:** `GET /api/admin/settings`
- **Description:** Retrieve current application settings.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Settings retrieved successfully",
    "settings": {
      "id": 1,
      "taxRate": 10.0,
      "freeShippingThreshold": 100.0,
      "largeOrderQuantityThreshold": 10,
      "largeOrderDeliveryFee": 50.0,
      "pickupAddress": "123 Main St, Accra",
      "currencySymbol": "$",
      "currencyCode": "USD",
      "updatedAt": "2024-01-16T15:00:00.000Z"
    }
  }
  ```

### 2. Update App Settings

- **URL:** `PUT /api/admin/settings`
- **Description:** Update application settings.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "taxRate": 12.5,
    "freeShippingThreshold": 150.0,
    "largeOrderQuantityThreshold": 15,
    "largeOrderDeliveryFee": 75.0,
    "pickupAddress": "456 New St, Accra",
    "currencySymbol": "₵",
    "currencyCode": "GHS"
  }
  ```
- **Response (200):** The updated settings object.
