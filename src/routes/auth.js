const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { Pool } = require("pg");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Register user
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("first_name").notEmpty().trim(),
    body("last_name").notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password, first_name, last_name } = req.body;

      // Check if user already exists
      const userExists = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (userExists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email",
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await pool.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role",
        [email, passwordHash, first_name, last_name, "customer"]
      );

      // Generate JWT token
      const token = jwt.sign(
        {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          role: newUser.rows[0].role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          first_name: newUser.rows[0].first_name,
          last_name: newUser.rows[0].last_name,
          role: newUser.rows[0].role,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  }
);

// Login user
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
        [email]
      );

      if (user.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(
        password,
        user.rows[0].password_hash
      );

      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.rows[0].id,
          email: user.rows[0].email,
          role: user.rows[0].role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Update last_login timestamp
      await pool.query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [user.rows[0].id]
      );

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.rows[0].id,
          email: user.rows[0].email,
          first_name: user.rows[0].first_name,
          last_name: user.rows[0].last_name,
          role: user.rows[0].role,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  }
);

// Get current user profile
router.get("/profile", async (req, res) => {
  try {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user data
    const user = await pool.query(
      "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1",
      [decoded.id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      user: user.rows[0],
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting profile",
    });
  }
});

module.exports = router;
