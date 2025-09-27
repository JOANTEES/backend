# Authentication System

> **⚠️ IMPORTANT:** This documentation has been updated with significant enhancements. For the complete, detailed documentation including token refresh, logout, and frontend integration guide, see **[04-authentication-updated.md](./04-authentication-updated.md)**

## Overview

Authentication is handled via JSON Web Tokens (JWT) with refresh token support. All protected routes require a `Bearer` token in the `Authorization` header.

The authentication system now includes:

- ✅ Automatic token refresh
- ✅ Proper logout functionality
- ✅ Enhanced error handling
- ✅ Seamless user experience
- ✅ Google OAuth integration
- ✅ Support for OAuth-only accounts
- ✅ Password reset functionality
- ✅ Email service integration (Resend)

## Quick Reference

| Endpoint                       | Method | Description            |
| ------------------------------ | ------ | ---------------------- |
| `/api/auth/register`           | POST   | Register new user      |
| `/api/auth/login`              | POST   | User login             |
| `/api/auth/profile`            | GET    | Get user profile       |
| `/api/auth/refresh`            | POST   | Refresh access token   |
| `/api/auth/logout`             | POST   | User logout            |
| `/api/auth/google`             | GET    | Initiate Google OAuth  |
| `/api/auth/google/callback`    | GET    | Google OAuth callback  |
| `/api/auth/oauth/user`         | GET    | Get OAuth user info    |
| `/api/auth/forgot-password`    | POST   | Request password reset |
| `/api/auth/verify-reset-token` | POST   | Verify reset token     |
| `/api/auth/reset-password`     | POST   | Reset password         |

**For complete documentation, examples, and frontend integration guide, see [04-authentication-updated.md](./04-authentication-updated.md)**

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
