const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const passport = require("./config/passport");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1); // Trust the first proxy (e.g., Vercel)
const PORT = process.env.PORT || 5000;

// Import routes
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");
const dashboardRoutes = require("./routes/dashboard");
const bookingsRoutes = require("./routes/bookings");
const paymentsRoutes = require("./routes/payments");
const customersRoutes = require("./routes/customers");
const cartRoutes = require("./routes/cart");
const deliveryZonesRoutes = require("./routes/delivery-zones");
const adminSettingsRoutes = require("./routes/admin-settings");
const ghanaLocationsRoutes = require("./routes/ghana-locations");
const pickupLocationsRoutes = require("./routes/pickup-locations");
const customerAddressesRoutes = require("./routes/customer-addresses");
const ordersRoutes = require("./routes/orders");
const brandsRoutes = require("./routes/brands");
const categoriesRoutes = require("./routes/categories");
const productVariantsRoutes = require("./routes/product-variants");
const reportsRoutes = require("./routes/reports");
const reviewsRoutes = require("./routes/reviews");

// Swagger documentation
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./config/swagger");

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
// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Session middleware for OAuth (short-lived sessions, MemoryStore is acceptable)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret-key",
    resave: false,
    saveUninitialized: true, // Force session creation for new users
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/delivery-zones", deliveryZonesRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/ghana", ghanaLocationsRoutes);
app.use("/api/pickup-locations", pickupLocationsRoutes);
app.use("/api/customer-addresses", customerAddressesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/product-variants", productVariantsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/reviews", reviewsRoutes);

// Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "JoanTee API Documentation",
  })
);

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

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`🔐 Auth endpoints:`);
    console.log(`   POST /api/auth/register - Register new user`);
    console.log(`   POST /api/auth/login - User login`);
    console.log(`   GET /api/auth/profile - Get user profile`);
    console.log(`   POST /api/auth/refresh - Refresh access token`);
    console.log(`   POST /api/auth/logout - User logout`);
    console.log(`   GET /api/auth/google - Initiate Google OAuth`);
    console.log(`   GET /api/auth/google/callback - Google OAuth callback`);
    console.log(`   GET /api/auth/oauth/user - Get OAuth user info`);
    console.log(`🛍️ Product endpoints:`);
    console.log(`   GET /api/products - Get all products`);
    console.log(`   GET /api/products/:id - Get product by ID`);
    console.log(`   POST /api/products - Create new product (admin only)`);
    console.log(`   PUT /api/products/:id - Update product (admin only)`);
    console.log(`   DELETE /api/products/:id - Delete product (admin only)`);
    console.log(`👥 User endpoints:`);
    console.log(`   GET /api/users - Get all users (admin only)`);
    console.log(`   GET /api/users/:id - Get user by ID (admin only)`);
    console.log(`👤 Customer endpoints:`);
    console.log(`   GET /api/customers - Get all customers`);
    console.log(`   GET /api/customers/:id - Get single customer`);
    console.log(`   GET /api/customers/segments - Get customer segments`);
    console.log(`   GET /api/customers/loyalty - Get loyalty programs`);
    console.log(
      `   GET /api/customers/communications - Get communication campaigns`
    );
    console.log(
      `   GET /api/customers/:id/purchases - Get customer purchase history`
    );
    console.log(`   GET /api/customers/:id/activity - Get customer activity`);
    console.log(`🛒 Cart endpoints:`);
    console.log(`   GET /api/cart - Get user's cart`);
    console.log(`   POST /api/cart/add - Add item to cart`);
    console.log(`   PUT /api/cart/:itemId - Update cart item quantity`);
    console.log(`   DELETE /api/cart/:itemId - Remove item from cart`);
    console.log(`   DELETE /api/cart/clear - Clear entire cart`);
    console.log(`🚚 Delivery zones endpoints:`);
    console.log(`   GET /api/delivery-zones - Get available delivery zones`);
    console.log(`   GET /api/delivery-zones/:id - Get single delivery zone`);
    console.log(
      `   POST /api/delivery-zones - Create delivery zone (admin only)`
    );
    console.log(
      `   PUT /api/delivery-zones/:id - Update delivery zone (admin only)`
    );
    console.log(
      `   DELETE /api/delivery-zones/:id - Delete delivery zone (admin only)`
    );
    console.log(
      `   GET /api/delivery-zones/admin - Get all zones including inactive (admin only)`
    );
    console.log(`⚙️  Admin settings endpoints:`);
    console.log(`   GET /api/admin/settings - Get app settings`);
    console.log(`   PUT /api/admin/settings - Update app settings`);
    console.log(`🇬🇭 Ghana locations endpoints:`);
    console.log(`   GET /api/ghana/regions - Get all Ghana regions`);
    console.log(
      `   GET /api/ghana/cities - Get all cities or cities by region`
    );
    console.log(
      `   GET /api/ghana/cities/:regionId - Get cities by specific region`
    );
    console.log(`📍 Pickup locations endpoints:`);
    console.log(
      `   GET /api/pickup-locations - Get all active pickup locations`
    );
    console.log(
      `   GET /api/pickup-locations/:id - Get single pickup location`
    );
    console.log(
      `   POST /api/pickup-locations - Create pickup location (admin only)`
    );
    console.log(
      `   PUT /api/pickup-locations/:id - Update pickup location (admin only)`
    );
    console.log(
      `   DELETE /api/pickup-locations/:id - Delete pickup location (admin only)`
    );
    console.log(
      `   GET /api/pickup-locations/admin - Get all locations including inactive (admin only)`
    );
    console.log(`🏠 Customer addresses endpoints:`);
    console.log(`   GET /api/customer-addresses - Get user's addresses`);
    console.log(`   GET /api/customer-addresses/:id - Get single address`);
    console.log(`   POST /api/customer-addresses - Create new address`);
    console.log(`   PUT /api/customer-addresses/:id - Update address`);
    console.log(`   DELETE /api/customer-addresses/:id - Delete address`);
    console.log(
      `   PUT /api/customer-addresses/:id/set-default - Set address as default`
    );
    console.log(`📦 Order management endpoints:`);
    console.log(`   POST /api/orders - Create order from cart`);
    console.log(`   GET /api/orders - Get user's orders`);
    console.log(`   GET /api/orders/:id - Get single order with items`);
    console.log(`🏷️  Brand management endpoints:`);
    console.log(`   GET /api/brands - Get all active brands`);
    console.log(`   GET /api/brands/:id - Get single brand`);
    console.log(`   POST /api/brands - Create new brand (admin only)`);
    console.log(`   PUT /api/brands/:id - Update brand (admin only)`);
    console.log(`   DELETE /api/brands/:id - Delete brand (admin only)`);
    console.log(`📂 Category management endpoints:`);
    console.log(`   GET /api/categories - Get hierarchical category tree`);
    console.log(`   GET /api/categories/flat - Get flat category list`);
    console.log(`   GET /api/categories/:id - Get single category`);
    console.log(`   GET /api/categories/:id/children - Get subcategories`);
    console.log(`   POST /api/categories - Create new category (admin only)`);
    console.log(`   PUT /api/categories/:id - Update category (admin only)`);
    console.log(`   DELETE /api/categories/:id - Delete category (admin only)`);
    console.log(`🔧 Product variants endpoints:`);
    console.log(
      `   GET /api/product-variants/product/:productId - Get variants for product`
    );
    console.log(`   GET /api/product-variants/:id - Get single variant`);
    console.log(
      `   POST /api/product-variants - Create new variant (admin only)`
    );
    console.log(
      `   PUT /api/product-variants/:id - Update variant (admin only)`
    );
    console.log(
      `   DELETE /api/product-variants/:id - Delete variant (admin only)`
    );
    console.log(
      `   GET /api/product-variants/product/:productId/stock - Get stock levels (admin only)`
    );
    console.log(
      `   PUT /api/product-variants/:id/stock - Update stock quantity (admin only)`
    );
    console.log(`📊 Reports & Analytics endpoints:`);
    console.log(
      `   GET /api/reports/profit-margins - Get profit margins for all products (admin only)`
    );
    console.log(
      `   GET /api/reports/overall-metrics - Get overall business metrics (admin only)`
    );
    console.log(
      `   GET /api/reports/sales-trends - Get sales trends over time (admin only)`
    );
    console.log(
      `   GET /api/reports/inventory-status - Get inventory status and alerts (admin only)`
    );
    console.log(
      `   GET /api/reports/customer-insights - Get customer insights and analytics (admin only)`
    );
    console.log(`⭐ Review system endpoints:`);
    console.log(`   GET /api/reviews - Get public reviews`);
    console.log(`   POST /api/reviews - Create new review`);
    console.log(`   POST /api/reviews/:id/flag - Flag a review`);
    console.log(
      `   GET /api/reviews/admin - Get all reviews for admin (admin only)`
    );
    console.log(
      `   PUT /api/reviews/admin/:id/approve - Approve flagged review (admin only)`
    );
    console.log(
      `   DELETE /api/reviews/admin/:id - Remove review (admin only)`
    );
    console.log(`📚 API Documentation:`);
    console.log(
      `   GET /api-docs - Interactive API documentation (Swagger UI)`
    );
  });
}

module.exports = app;
