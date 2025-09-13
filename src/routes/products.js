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

// GET all products (public route - no authentication required)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, price, category, size, color, stock_quantity, image_url, created_at FROM products WHERE is_active = true ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      message: "Products retrieved successfully",
      count: result.rows.length,
      products: result.rows,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching products",
      error: error.message,
    });
  }
});

// GET single product by ID (public route - no authentication required)
router.get("/:id", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID. Must be a number.",
      });
    }

    const result = await pool.query(
      "SELECT id, name, description, price, category, size, color, stock_quantity, image_url, created_at FROM products WHERE id = $1 AND is_active = true",
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product retrieved successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product",
      error: error.message,
    });
  }
});

// POST create new product (admin only)
router.post(
  "/",
  adminAuth,
  [
    body("name").notEmpty().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("price").isFloat({ min: 0.01 }),
    body("category").notEmpty().trim(),
    body("size").optional().trim(),
    body("color").optional().trim(),
    body("stock_quantity").isInt({ min: 0 }),
    body("image_url").optional().isURL(),
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

      const {
        name,
        description,
        price,
        category,
        size,
        color,
        stock_quantity,
        image_url,
      } = req.body;

      // Create new product
      const newProduct = await pool.query(
        "INSERT INTO products (name, description, price, category, size, color, stock_quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, description, price, category, size, color, stock_quantity, image_url, created_at",
        [
          name,
          description,
          price,
          category,
          size,
          color,
          stock_quantity,
          image_url,
        ]
      );

      res.status(201).json({
        message: "Product created successfully",
        product: newProduct.rows[0],
      });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({
        message: "Server error while creating product",
        error: error.message,
      });
    }
  }
);

// PUT update existing product (admin only)
router.put(
  "/:id",
  adminAuth,
  [
    body("name").optional().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("price").optional().isFloat({ min: 0.01 }),
    body("category").optional().trim(),
    body("size").optional().trim(),
    body("color").optional().trim(),
    body("stock_quantity").optional().isInt({ min: 0 }),
    body("image_url").optional().isURL(),
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

      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID. Must be a number.",
        });
      }

      const {
        name,
        description,
        price,
        category,
        size,
        color,
        stock_quantity,
        image_url,
      } = req.body;

      // Check if product exists
      const existingProduct = await pool.query(
        "SELECT id FROM products WHERE id = $1",
        [productId]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(description);
      }
      if (price !== undefined) {
        updateFields.push(`price = $${paramCount++}`);
        updateValues.push(price);
      }
      if (category !== undefined) {
        updateFields.push(`category = $${paramCount++}`);
        updateValues.push(category);
      }
      if (size !== undefined) {
        updateFields.push(`size = $${paramCount++}`);
        updateValues.push(size);
      }
      if (color !== undefined) {
        updateFields.push(`color = $${paramCount++}`);
        updateValues.push(color);
      }
      if (stock_quantity !== undefined) {
        updateFields.push(`stock_quantity = $${paramCount++}`);
        updateValues.push(stock_quantity);
      }
      if (image_url !== undefined) {
        updateFields.push(`image_url = $${paramCount++}`);
        updateValues.push(image_url);
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) {
        // Only updated_at was added, no actual fields to update
        return res.status(400).json({
          message: "No fields provided for update",
        });
      }

      // Add product ID to values array
      updateValues.push(productId);

      const updateQuery = `
        UPDATE products 
        SET ${updateFields.join(", ")} 
        WHERE id = $${paramCount} 
        RETURNING id, name, description, price, category, size, color, stock_quantity, image_url, created_at, updated_at
      `;

      const updatedProduct = await pool.query(updateQuery, updateValues);

      res.json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct.rows[0],
      });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating product",
        error: error.message,
      });
    }
  }
);

// DELETE product (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID. Must be a number.",
      });
    }

    // Check if product exists
    const existingProduct = await pool.query(
      "SELECT id, name FROM products WHERE id = $1",
      [productId]
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Soft delete - set is_active to false instead of hard delete
    const deletedProduct = await pool.query(
      "UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [productId]
    );

    res.json({
      success: true,
      message: "Product deleted successfully",
      product: {
        id: deletedProduct.rows[0].id,
        name: deletedProduct.rows[0].name,
        is_active: deletedProduct.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting product",
      error: error.message,
    });
  }
});

module.exports = router;
