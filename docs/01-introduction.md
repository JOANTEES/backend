# Introduction

Welcome to the JoanTee Backend API. This document provides a high-level overview of the system's architecture, features, and technology stack.

## Core Features

- **User Authentication:** Secure user registration and login for both customers and admins using JWT.
- **Product Management:** Full CRUD operations for products, categories, and inventory.
- **Customer Management:** Advanced tracking of customer data, segments, loyalty, and purchase history.
- **Shopping Cart:** Robust cart functionality with stock management and persistent storage.
- **Order System:** Comprehensive order processing, including a dynamic delivery zone system.
- **Admin Dashboard:** Endpoints to support a full-featured admin panel for managing the entire platform.

## Technology Stack

- **Backend Framework:** Node.js with Express.js
- **Database:** PostgreSQL (hosted on Neon.tech)
- **Authentication:** JSON Web Tokens (JWT)
- **Validation:** `express-validator`
- **Deployment:** Vercel
