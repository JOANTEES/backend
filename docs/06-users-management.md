# Admin User Management Endpoints

These endpoints are for admins to manage all user accounts in the system. All routes here are protected and require an admin role.

### 1. Get All Users

- **URL:** `GET /api/users`
- **Description:** Retrieves a list of all users (both customers and admins).
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Users retrieved successfully",
    "count": 2,
    "users": [
      {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin"
      },
      {
        "id": 2,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "customer"
      }
    ]
  }
  ```

### 2. Get Single User

- **URL:** `GET /api/users/:id`
- **Description:** Retrieves a single user by their ID.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - User ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "User retrieved successfully",
    "user": {
      "id": 2,
      "name": "John Doe"
      // ... other fields
    }
  }
  ```

### 3. Update User Role or Details

- **URL:** `PUT /api/users/:id`
- **Description:** Updates a user's details, including their role. This is how a user can be promoted to an admin.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - User ID (number)
- **Request Body:**
  ```json
  {
    "name": "John Admin",
    "role": "admin"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "User updated successfully",
    "user": {
      "id": 2,
      "name": "John Admin",
      "role": "admin"
    }
  }
  ```

### 4. Delete User

- **URL:** `DELETE /api/users/:id`
- **Description:** Deletes a user from the system.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Parameters:** `:id` - User ID (number)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```
