# Customer Management Endpoints

These endpoints provide advanced CRM-like features for managing and understanding customer data. They are intended for use in the admin dashboard. All routes are protected and require an admin role.

### 1. Get All Customers

- **URL:** `GET /api/customers`
- **Description:** Retrieves a list of all users with the 'customer' role.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Customers retrieved successfully",
    "count": 1,
    "customers": [
      {
        "id": "2",
        "firstName": "Test",
        "lastName": "User",
        "email": "test@example.com",
        "loyaltyPoints": 0,
        "totalSpent": 0,
        "status": "inactive"
        // ... and many other fields
      }
    ]
  }
  ```

### 2. Get Single Customer

- **URL:** `GET /api/customers/:id`
- **Description:** Retrieves detailed information for a single customer.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Customer's User ID (number)
- **Response (200):** A comprehensive customer object.

### 3. Get Customer Segments

- **URL:** `GET /api/customers/segments`
- **Description:** Retrieves defined customer segments.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Customer segments retrieved successfully",
    "count": 0,
    "segments": []
  }
  ```

### 4. Get Loyalty Programs

- **URL:** `GET /api/customers/loyalty`
- **Description:** Retrieves loyalty program details.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Loyalty programs retrieved successfully",
    "count": 0,
    "programs": []
  }
  ```

### 5. Get Communication Campaigns

- **URL:** `GET /api/customers/communications`
- **Description:** Retrieves marketing and communication campaigns.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Communication campaigns retrieved successfully",
    "count": 0,
    "campaigns": []
  }
  ```

### 6. Get Customer Purchase History

- **URL:** `GET /api/customers/:id/purchases`
- **Description:** Retrieves the purchase history for a specific customer.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Customer's User ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Purchase history retrieved successfully",
    "count": 0,
    "purchases": []
  }
  ```

### 7. Get Customer Activity

- **URL:** `GET /api/customers/:id/activity`
- **Description:** Retrieves a log of a customer's activities (logins, purchases, etc.).
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - Customer's User ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Customer activity retrieved successfully",
    "count": 1,
    "activity": [
      {
        "type": "account_created",
        "description": "User registered an account",
        "timestamp": "2024-01-16T12:00:00.000Z"
      }
    ]
  }
  ```
