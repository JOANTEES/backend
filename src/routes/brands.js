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

// GET all brands (public route)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, logo_url, is_active, created_at FROM brands WHERE is_active = true ORDER BY name ASC"
    );

    res.json({
      success: true,
      message: "Brands retrieved successfully",
      count: result.rows.length,
      brands: result.rows.map((brand) => ({
        id: brand.id.toString(),
        name: brand.name,
        description: brand.description,
        logoUrl: brand.logo_url,
        isActive: brand.is_active,
        createdAt: brand.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching brands",
      error: error.message,
    });
  }
});

// GET single brand by ID (public route)
router.get("/:id", async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);

    if (isNaN(brandId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID. Must be a number.",
      });
    }

    const result = await pool.query(
      "SELECT id, name, description, logo_url, is_active, created_at, updated_at FROM brands WHERE id = $1 AND is_active = true",
      [brandId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const brand = result.rows[0];
    res.json({
      success: true,
      message: "Brand retrieved successfully",
      brand: {
        id: brand.id.toString(),
        name: brand.name,
        description: brand.description,
        logoUrl: brand.logo_url,
        isActive: brand.is_active,
        createdAt: brand.created_at,
        updatedAt: brand.updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching brand:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching brand",
      error: error.message,
    });
  }
});

// POST create new brand (admin only)
router.post(
  "/",
  adminAuth,
  [
    body("name")
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Brand name is required and must be 1-100 characters"),
    body("description").optional().trim(),
    body("logo_url")
      .optional()
      .isURL()
      .withMessage("Logo URL must be a valid URL"),
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

      const { name, description, logo_url } = req.body;

      // Check if brand name already exists
      const existingBrand = await pool.query(
        "SELECT id FROM brands WHERE name = $1",
        [name]
      );

      if (existingBrand.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Brand with this name already exists",
        });
      }

      // Create new brand
      const newBrand = await pool.query(
        "INSERT INTO brands (name, description, logo_url) VALUES ($1, $2, $3) RETURNING id, name, description, logo_url, is_active, created_at",
        [name, description, logo_url]
      );

      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        brand: {
          id: newBrand.rows[0].id.toString(),
          name: newBrand.rows[0].name,
          description: newBrand.rows[0].description,
          logoUrl: newBrand.rows[0].logo_url,
          isActive: newBrand.rows[0].is_active,
          createdAt: newBrand.rows[0].created_at,
        },
      });
    } catch (error) {
      console.error("Error creating brand:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating brand",
        error: error.message,
      });
    }
  }
);

// PUT update existing brand (admin only)
router.put(
  "/:id",
  adminAuth,
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Brand name must be 1-100 characters"),
    body("description").optional().trim(),
    body("logo_url")
      .optional()
      .isURL()
      .withMessage("Logo URL must be a valid URL"),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean"),
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

      const brandId = parseInt(req.params.id);
      if (isNaN(brandId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid brand ID. Must be a number.",
        });
      }

      const { name, description, logo_url, is_active } = req.body;

      // Check if brand exists
      const existingBrand = await pool.query(
        "SELECT id FROM brands WHERE id = $1",
        [brandId]
      );

      if (existingBrand.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
        });
      }

      // Check if new name conflicts with existing brand
      if (name) {
        const nameConflict = await pool.query(
          "SELECT id FROM brands WHERE name = $1 AND id != $2",
          [name, brandId]
        );

        if (nameConflict.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Brand with this name already exists",
          });
        }
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
      if (logo_url !== undefined) {
        updateFields.push(`logo_url = $${paramCount++}`);
        updateValues.push(logo_url);
      }
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(is_active);
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) {
        // Only updated_at was added, no actual fields to update
        return res.status(400).json({
          success: false,
          message: "No fields provided for update",
        });
      }

      // Execute update
      const updatedBrand = await pool.query(
        `UPDATE brands SET ${updateFields.join(
          ", "
        )} WHERE id = $${paramCount} RETURNING id, name, description, logo_url, is_active, created_at, updated_at`,
        [...updateValues, brandId]
      );

      res.json({
        success: true,
        message: "Brand updated successfully",
        brand: {
          id: updatedBrand.rows[0].id.toString(),
          name: updatedBrand.rows[0].name,
          description: updatedBrand.rows[0].description,
          logoUrl: updatedBrand.rows[0].logo_url,
          isActive: updatedBrand.rows[0].is_active,
          createdAt: updatedBrand.rows[0].created_at,
          updatedAt: updatedBrand.rows[0].updated_at,
        },
      });
    } catch (error) {
      console.error("Error updating brand:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating brand",
        error: error.message,
      });
    }
  }
);

// DELETE brand (admin only) - Soft delete
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const brandId = parseInt(req.params.id);

    if (isNaN(brandId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand ID. Must be a number.",
      });
    }

    // Check if brand exists
    const existingBrand = await pool.query(
      "SELECT id, name FROM brands WHERE id = $1",
      [brandId]
    );

    if (existingBrand.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    // Check if brand is used by any products
    const productsUsingBrand = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE brand_id = $1",
      [brandId]
    );

    if (parseInt(productsUsingBrand.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete brand. It is being used by products. Deactivate it instead.",
      });
    }

    // Soft delete - set is_active to false
    const deletedBrand = await pool.query(
      "UPDATE brands SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [brandId]
    );

    res.json({
      success: true,
      message: "Brand deleted successfully",
      brand: {
        id: deletedBrand.rows[0].id.toString(),
        name: deletedBrand.rows[0].name,
        isActive: deletedBrand.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting brand",
      error: error.message,
    });
  }
});

module.exports = router;
