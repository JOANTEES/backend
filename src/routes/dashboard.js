const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /api/dashboard/stats
router.get("/stats", async (_req, res) => {
  try {
    const [
      usersCount,
      activeAdminsCount,
      productsCount,
      ordersCount,
      bookingsCount,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM users"),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND is_active = true"
      ),
      pool.query(
        "SELECT COUNT(*)::int AS count FROM products WHERE is_active = true"
      ),
      pool.query("SELECT COUNT(*)::int AS count FROM orders"),
      pool.query("SELECT COUNT(*)::int AS count FROM bookings"),
    ]);

    const stats = {
      totalVisitors: 0, // No tracking table yet
      totalPurchases: ordersCount.rows[0].count,
      totalUsers: usersCount.rows[0].count,
      totalBookings: bookingsCount.rows[0].count,
      totalClothes: productsCount.rows[0].count,
      activeAdmins: activeAdminsCount.rows[0].count,
    };

    return res.json({ stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching stats", error: error.message });
  }
});

module.exports = router;
