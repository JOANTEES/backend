# Authentication Endpoints

Authentication is handled via JSON Web Tokens (JWT). All protected routes require a `Bearer` token in the `Authorization` header.

The `auth.js` file handles registration and login for all users (both admins and customers). The user's `role` is set to `'customer'` by default upon registration.

### 1. Register a New User

- **URL:** `POST /api/auth/register`
- **Description:** Creates a new user account.
- **Headers:** None required.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "a_strong_password"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "customer"
    },
    "token": "your_jwt_token"
  }
  ```

### 2. Login a User

- **URL:** `POST /api/auth/login`
- **Description:** Authenticates a user and returns a JWT.
- **Headers:** None required.
- **Request Body:**
  ```json
  {
    "email": "john.doe@example.com",
    "password": "a_strong_password"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "customer"
    },
    "token": "your_jwt_token"
  }
  ```

### 3. Get User Profile

- **URL:** `GET /api/auth/profile`
- **Description:** Retrieves the profile of the currently authenticated user.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "customer"
    }
  }
  ```
