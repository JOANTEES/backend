const express = require("express");
const { Pool } = require("pg");
const { adminAuth } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// GET all users (admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, first_name, last_name, role, is_active, phone, department, last_login, created_at, updated_at FROM users ORDER BY created_at DESC"
    );

    res.json({
      message: "Users retrieved successfully",
      count: result.rows.length,
      users: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Server error while fetching users",
      error: error.message,
    });
  }
});

// GET single user by ID (admin only)
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        message: "Invalid user ID. Must be a number.",
      });
    }

    const result = await pool.query(
      "SELECT id, email, first_name, last_name, role, is_active, phone, department, last_login, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "User retrieved successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Server error while fetching user",
      error: error.message,
    });
  }
});

module.exports = router;

// Update user (admin only)
router.put(
  "/:id",
  adminAuth,
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("first_name").optional().isString().trim().isLength({ min: 1 }),
    body("last_name").optional().isString().trim().isLength({ min: 1 }),
    body("role").optional().isIn(["admin", "customer"]),
    body("phone").optional().isString().trim().isLength({ min: 3, max: 30 }),
    body("department")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 }),
    body("is_active").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res
          .status(400)
          .json({ message: "Invalid user ID. Must be a number." });
      }

      const existing = await pool.query("SELECT id FROM users WHERE id = $1", [
        userId,
      ]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const {
        email,
        first_name,
        last_name,
        role,
        phone,
        department,
        is_active,
      } = req.body;

      const updateFields = [];
      const updateValues = [];
      let param = 1;

      if (email !== undefined) {
        updateFields.push(`email = $${param++}`);
        updateValues.push(email);
      }
      if (first_name !== undefined) {
        updateFields.push(`first_name = $${param++}`);
        updateValues.push(first_name);
      }
      if (last_name !== undefined) {
        updateFields.push(`last_name = $${param++}`);
        updateValues.push(last_name);
      }
      if (role !== undefined) {
        updateFields.push(`role = $${param++}`);
        updateValues.push(role);
      }
      if (phone !== undefined) {
        updateFields.push(`phone = $${param++}`);
        updateValues.push(phone);
      }
      if (department !== undefined) {
        updateFields.push(`department = $${param++}`);
        updateValues.push(department);
      }
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${param++}`);
        updateValues.push(is_active);
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");

      if (updateFields.length === 1) {
        return res
          .status(400)
          .json({ message: "No fields provided for update" });
      }

      updateValues.push(userId);

      const updateQuery = `
        UPDATE users
        SET ${updateFields.join(", ")}
        WHERE id = $${param}
        RETURNING id, email, first_name, last_name, role, is_active, phone, department, last_login, created_at, updated_at
      `;

      const result = await pool.query(updateQuery, updateValues);

      return res.json({
        message: "User updated successfully",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({
        message: "Server error while updating user",
        error: error.message,
      });
    }
  }
);

// Delete user (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid user ID. Must be a number." });
    }

    const existing = await pool.query("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Soft delete by marking inactive
    const result = await pool.query(
      "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, is_active",
      [userId]
    );

    return res.json({
      message: "User deactivated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res
      .status(500)
      .json({
        message: "Server error while deleting user",
        error: error.message,
      });
  }
});

// Update user status (admin only)
router.patch("/:id/status", adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "Invalid user ID. Must be a number." });
    }

    const { status } = req.body; // expected 'active' | 'inactive' | 'suspended'
    if (!status || !["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Map status to is_active flag; keep status string in future if needed
    const isActive = status === "active";

    const existing = await pool.query("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await pool.query(
      "UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, is_active",
      [isActive, userId]
    );

    return res.json({
      message: "User status updated successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res
      .status(500)
      .json({
        message: "Server error while updating user status",
        error: error.message,
      });
  }
});
