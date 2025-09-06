const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const dashboardRoutes = require("./routes/dashboard");
const bookingsRoutes = require("./routes/bookings");
const paymentsRoutes = require("./routes/payments");

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully!");
    console.log("🕐 Database time:", res.rows[0].now);
  }
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Joantee Backend API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Database test route
app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() as current_time, version() as db_version"
    );
    res.json({
      message: "Database connection successful!",
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 Home: http://localhost:${PORT}/`);
  console.log(`🗄️  Database test: http://localhost:${PORT}/db-test`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST /api/auth/register - User registration`);
  console.log(`   POST /api/auth/login - User login`);
  console.log(`   GET /api/auth/profile - Get user profile`);
  console.log(`🛍️  Product endpoints:`);
  console.log(`   GET /api/products - List all products`);
  console.log(`   GET /api/products/:id - Get single product by ID`);
  console.log(`   POST /api/products - Create new product (admin only)`);
  console.log(`   PUT /api/products/:id - Update product (admin only)`);
  console.log(`   DELETE /api/products/:id - Delete product (admin only)`);
  console.log(`👥 User endpoints:`);
  console.log(`   GET /api/users - Get all users (admin only)`);
  console.log(`   GET /api/users/:id - Get user by ID (admin only)`);
});

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`🔐 Auth endpoints:`);
    console.log(`   POST /api/auth/register - Register new user`);
    console.log(`   POST /api/auth/login - User login`);
    console.log(`   GET /api/auth/profile - Get user profile`);
    console.log(`🛍️ Product endpoints:`);
    console.log(`   GET /api/products - Get all products`);
    console.log(`   GET /api/products/:id - Get product by ID`);
    console.log(`   POST /api/products - Create new product (admin only)`);
    console.log(`   PUT /api/products/:id - Update product (admin only)`);
    console.log(`   DELETE /api/products/:id - Delete product (admin only)`);
    console.log(`👥 User endpoints:`);
    console.log(`   GET /api/users - Get all users (admin only)`);
    console.log(`   GET /api/users/:id - Get user by ID (admin only)`);
  });
}

module.exports = app;
