# Order & Delivery System

This section covers endpoints related to order processing and delivery management.

## Order Management (Coming Soon)

The order management system is currently under development.

#### Planned Order Endpoints:

- `POST /api/orders` - Create order from cart
- `GET /api/orders` - Get a user's order history
- `GET /api/orders/:id` - Get details for a single order
- `GET /api/orders/admin` - Get all orders (admin)
- `PUT /api/orders/:id/status` - Update order status (admin)

#### Planned Features:

- **Dynamic Calculations:** Use admin-defined settings for tax, shipping, and free shipping.
- **Payment Options:** Support for online payments and Cash on Delivery.
- **Pickup Option:** Allow users to select free pickup from a store location.
- **Address Collection:** A landmark-based address system tailored for Ghana.
- **Google Maps Integration:** Automatic generation of map links for delivery.
- **Order Tracking:** Real-time status updates from `pending` to `delivered`.

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
