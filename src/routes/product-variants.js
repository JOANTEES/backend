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

// GET all variants for a specific product (public route)
router.get("/product/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID. Must be a number.",
      });
    }

    // Check if product exists
    const productResult = await pool.query(
      "SELECT id, name FROM products WHERE id = $1 AND is_active = true",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const result = await pool.query(
      `SELECT 
        pv.id, pv.product_id, pv.sku, pv.size, pv.color, pv.stock_quantity, 
        pv.image_url, pv.is_active, pv.created_at, pv.updated_at,
        p.name as product_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.product_id = $1 AND pv.is_active = true
      ORDER BY pv.size ASC, pv.color ASC`,
      [productId]
    );

    const variants = result.rows.map((variant) => ({
      id: variant.id.toString(),
      productId: variant.product_id.toString(),
      productName: variant.product_name,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      stockQuantity: variant.stock_quantity,
      imageUrl: variant.image_url,
      isActive: variant.is_active,
      createdAt: variant.created_at,
      updatedAt: variant.updated_at,
    }));

    res.json({
      success: true,
      message: "Product variants retrieved successfully",
      product: {
        id: productResult.rows[0].id.toString(),
        name: productResult.rows[0].name,
      },
      count: variants.length,
      variants: variants,
    });
  } catch (error) {
    console.error("Error fetching product variants:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product variants",
      error: error.message,
    });
  }
});

// GET single variant by ID (public route)
router.get("/:id", async (req, res) => {
  try {
    const variantId = parseInt(req.params.id);

    if (isNaN(variantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `SELECT 
        pv.id, pv.product_id, pv.sku, pv.size, pv.color, pv.stock_quantity, 
        pv.image_url, pv.is_active, pv.created_at, pv.updated_at,
        p.name as product_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.id = $1 AND pv.is_active = true`,
      [variantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    const variant = result.rows[0];
    res.json({
      success: true,
      message: "Product variant retrieved successfully",
      variant: {
        id: variant.id.toString(),
        productId: variant.product_id.toString(),
        productName: variant.product_name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stockQuantity: variant.stock_quantity,
        imageUrl: variant.image_url,
        isActive: variant.is_active,
        createdAt: variant.created_at,
        updatedAt: variant.updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching product variant:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product variant",
      error: error.message,
    });
  }
});

// POST create new variant (admin only)
router.post(
  "/",
  adminAuth,
  [
    body("product_id")
      .notEmpty()
      .isInt({ min: 1 })
      .withMessage("Product ID is required and must be a positive integer"),
    body("sku")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("SKU must be 100 characters or less"),
    body("size")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Size must be 20 characters or less"),
    body("color")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Color must be 50 characters or less"),
    body("stock_quantity")
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
    body("image_url")
      .optional()
      .isURL()
      .withMessage("Image URL must be a valid URL"),
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

      const { product_id, sku, size, color, stock_quantity, image_url } =
        req.body;

      // Check if product exists
      const productResult = await pool.query(
        "SELECT id, name FROM products WHERE id = $1 AND is_active = true",
        [product_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if SKU is unique (if provided)
      if (sku) {
        const skuResult = await pool.query(
          "SELECT id FROM product_variants WHERE sku = $1",
          [sku]
        );
        if (skuResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "SKU already exists",
          });
        }
      }

      // Check if variant with same size/color combination already exists for this product
      const existingVariant = await pool.query(
        "SELECT id FROM product_variants WHERE product_id = $1 AND size = $2 AND color = $3",
        [product_id, size || null, color || null]
      );

      if (existingVariant.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "Variant with this size and color combination already exists for this product",
        });
      }

      // Create new variant
      const newVariant = await pool.query(
        `INSERT INTO product_variants (product_id, sku, size, color, stock_quantity, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, product_id, sku, size, color, stock_quantity, image_url, is_active, created_at`,
        [product_id, sku, size, color, stock_quantity, image_url]
      );

      const variant = newVariant.rows[0];
      res.status(201).json({
        success: true,
        message: "Product variant created successfully",
        variant: {
          id: variant.id.toString(),
          productId: variant.product_id.toString(),
          productName: productResult.rows[0].name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          stockQuantity: variant.stock_quantity,
          imageUrl: variant.image_url,
          isActive: variant.is_active,
          createdAt: variant.created_at,
        },
      });
    } catch (error) {
      console.error("Error creating product variant:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating product variant",
        error: error.message,
      });
    }
  }
);

// PUT update existing variant (admin only)
router.put(
  "/:id",
  adminAuth,
  [
    body("sku")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("SKU must be 100 characters or less"),
    body("size")
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage("Size must be 20 characters or less"),
    body("color")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Color must be 50 characters or less"),
    body("stock_quantity")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
    body("image_url")
      .optional()
      .isURL()
      .withMessage("Image URL must be a valid URL"),
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

      const variantId = parseInt(req.params.id);
      if (isNaN(variantId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant ID. Must be a number.",
        });
      }

      const { sku, size, color, stock_quantity, image_url, is_active } =
        req.body;

      // Check if variant exists
      const existingVariant = await pool.query(
        "SELECT id, product_id FROM product_variants WHERE id = $1",
        [variantId]
      );

      if (existingVariant.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product variant not found",
        });
      }

      const productId = existingVariant.rows[0].product_id;

      // Check if SKU is unique (if provided and different from current)
      if (sku !== undefined) {
        const skuResult = await pool.query(
          "SELECT id FROM product_variants WHERE sku = $1 AND id != $2",
          [sku, variantId]
        );
        if (skuResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "SKU already exists",
          });
        }
      }

      // Check if size/color combination conflicts with other variants of the same product
      if (size !== undefined || color !== undefined) {
        const conflictResult = await pool.query(
          "SELECT id FROM product_variants WHERE product_id = $1 AND size = $2 AND color = $3 AND id != $4",
          [
            productId,
            size !== undefined ? size : null,
            color !== undefined ? color : null,
            variantId,
          ]
        );
        if (conflictResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message:
              "Variant with this size and color combination already exists for this product",
          });
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (sku !== undefined) {
        updateFields.push(`sku = $${paramCount++}`);
        updateValues.push(sku);
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
      const updatedVariant = await pool.query(
        `UPDATE product_variants SET ${updateFields.join(
          ", "
        )} WHERE id = $${paramCount} 
         RETURNING id, product_id, sku, size, color, stock_quantity, image_url, is_active, created_at, updated_at`,
        [...updateValues, variantId]
      );

      const variant = updatedVariant.rows[0];

      // Get product name for response
      const productResult = await pool.query(
        "SELECT name FROM products WHERE id = $1",
        [variant.product_id]
      );

      res.json({
        success: true,
        message: "Product variant updated successfully",
        variant: {
          id: variant.id.toString(),
          productId: variant.product_id.toString(),
          productName: productResult.rows[0].name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          stockQuantity: variant.stock_quantity,
          imageUrl: variant.image_url,
          isActive: variant.is_active,
          createdAt: variant.created_at,
          updatedAt: variant.updated_at,
        },
      });
    } catch (error) {
      console.error("Error updating product variant:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating product variant",
        error: error.message,
      });
    }
  }
);

// DELETE variant (admin only) - Soft delete
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const variantId = parseInt(req.params.id);

    if (isNaN(variantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid variant ID. Must be a number.",
      });
    }

    // Check if variant exists
    const existingVariant = await pool.query(
      "SELECT id, product_id, sku FROM product_variants WHERE id = $1",
      [variantId]
    );

    if (existingVariant.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    // Check if variant is used in any active cart items
    const cartItemsResult = await pool.query(
      "SELECT COUNT(*) as count FROM cart_items WHERE variant_id = $1",
      [variantId]
    );

    if (parseInt(cartItemsResult.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete variant. It is currently in shopping carts. Deactivate it instead.",
      });
    }

    // Check if variant is used in any orders
    const orderItemsResult = await pool.query(
      "SELECT COUNT(*) as count FROM order_items WHERE variant_id = $1",
      [variantId]
    );

    if (parseInt(orderItemsResult.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete variant. It has been used in orders. Deactivate it instead.",
      });
    }

    // Soft delete - set is_active to false
    const deletedVariant = await pool.query(
      "UPDATE product_variants SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, sku, is_active",
      [variantId]
    );

    res.json({
      success: true,
      message: "Product variant deleted successfully",
      variant: {
        id: deletedVariant.rows[0].id.toString(),
        sku: deletedVariant.rows[0].sku,
        isActive: deletedVariant.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error("Error deleting product variant:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting product variant",
      error: error.message,
    });
  }
});

// GET stock levels for a product (admin only)
router.get("/product/:productId/stock", adminAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID. Must be a number.",
      });
    }

    // Check if product exists
    const productResult = await pool.query(
      "SELECT id, name FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const result = await pool.query(
      `SELECT 
        pv.id, pv.sku, pv.size, pv.color, pv.stock_quantity, pv.is_active
      FROM product_variants pv
      WHERE pv.product_id = $1
      ORDER BY pv.size ASC, pv.color ASC`,
      [productId]
    );

    const variants = result.rows.map((variant) => ({
      id: variant.id.toString(),
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      stockQuantity: variant.stock_quantity,
      isActive: variant.is_active,
    }));

    // Calculate total stock
    const totalStock = variants.reduce(
      (sum, variant) => sum + variant.stockQuantity,
      0
    );

    res.json({
      success: true,
      message: "Product stock levels retrieved successfully",
      product: {
        id: productResult.rows[0].id.toString(),
        name: productResult.rows[0].name,
      },
      totalStock: totalStock,
      variantCount: variants.length,
      variants: variants,
    });
  } catch (error) {
    console.error("Error fetching product stock levels:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product stock levels",
      error: error.message,
    });
  }
});

// PUT update stock quantity for a variant (admin only)
router.put(
  "/:id/stock",
  adminAuth,
  [
    body("stock_quantity")
      .isInt({ min: 0 })
      .withMessage("Stock quantity must be a non-negative integer"),
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

      const variantId = parseInt(req.params.id);
      const { stock_quantity } = req.body;

      if (isNaN(variantId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant ID. Must be a number.",
        });
      }

      // Check if variant exists
      const existingVariant = await pool.query(
        "SELECT id, product_id, sku, size, color FROM product_variants WHERE id = $1",
        [variantId]
      );

      if (existingVariant.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product variant not found",
        });
      }

      // Update stock quantity
      const updatedVariant = await pool.query(
        `UPDATE product_variants 
         SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, product_id, sku, size, color, stock_quantity, updated_at`,
        [stock_quantity, variantId]
      );

      const variant = updatedVariant.rows[0];

      res.json({
        success: true,
        message: "Stock quantity updated successfully",
        variant: {
          id: variant.id.toString(),
          productId: variant.product_id.toString(),
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          stockQuantity: variant.stock_quantity,
          updatedAt: variant.updated_at,
        },
      });
    } catch (error) {
      console.error("Error updating stock quantity:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating stock quantity",
        error: error.message,
      });
    }
  }
);

module.exports = router;
