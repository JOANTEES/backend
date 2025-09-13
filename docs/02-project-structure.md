# Project Structure

The project follows a standard Node.js application structure, separating concerns into distinct directories.

```
/
├── database/
│   └── schema.sql        # Main database schema file
├── docs/                 # All API documentation files
├── node_modules/         # Project dependencies
├── src/                  # Main source code directory
│   ├── database/
│   │   ├── init.js       # (If exists) For initial data seeding
│   │   └── migrate.js    # Script to run database migrations
│   ├── middleware/
│   │   └── auth.js       # Authentication middleware (JWT verification, admin checks)
│   ├── routes/
│   │   ├── auth.js       # Authentication routes (register, login)
│   │   ├── bookings.js   # Routes for handling bookings
│   │   ├── cart.js       # Shopping cart routes
│   │   ├── customers.js  # Customer management routes
│   │   ├── dashboard.js  # Routes for admin dashboard data
│   │   ├── delivery-zones.js # Delivery zone management routes
│   │   ├── payments.js   # Payment processing routes
│   │   ├── products.js   # Product and category routes
│   │   └── users.js      # Admin routes for user management
│   └── index.js          # Main application entry point
├── .env                  # Environment variables (DATABASE_URL, JWT_SECRET)
├── .gitignore            # Files to ignore in git
├── package.json          # Project metadata and dependencies
└── vercel.json           # Vercel deployment configuration
```
