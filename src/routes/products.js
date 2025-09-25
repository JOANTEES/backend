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

// Helper function to calculate effective price
function calculateEffectivePrice(product) {
  let effectivePrice = parseFloat(product.price);

  if (
    product.discount_price &&
    parseFloat(product.discount_price) < effectivePrice
  ) {
    effectivePrice = parseFloat(product.discount_price);
  } else if (
    product.discount_percent &&
    parseFloat(product.discount_percent) > 0
  ) {
    const discountAmount =
      effectivePrice * (parseFloat(product.discount_percent) / 100);
    effectivePrice = effectivePrice - discountAmount;
  }

  return parseFloat(effectivePrice.toFixed(2));
}

// Helper function to calculate profit margin
function calculateProfitMargin(product) {
  if (!product.cost_price) return null;

  const costPrice = parseFloat(product.cost_price);
  const sellingPrice = calculateEffectivePrice(product);
  const profit = sellingPrice - costPrice;
  const margin = (profit / sellingPrice) * 100;

  return {
    costPrice: costPrice,
    sellingPrice: sellingPrice,
    profit: parseFloat(profit.toFixed(2)),
    margin: parseFloat(margin.toFixed(2)),
  };
}

// GET all products (public route - no authentication required)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.description, p.sku, p.cost_price, p.price, p.discount_price, p.discount_percent,
        p.brand_id, p.category_id, p.category, p.image_url, p.requires_special_delivery, 
        p.delivery_eligible, p.pickup_eligible, p.created_at,
        b.name as brand_name,
        c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true 
      ORDER BY p.created_at DESC
    `);

    const products = result.rows.map((product) => {
      const effectivePrice = calculateEffectivePrice(product);
      const profitMargin = calculateProfitMargin(product);

      return {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        sku: product.sku,
        costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
        price: parseFloat(product.price),
        discountPrice: product.discount_price
          ? parseFloat(product.discount_price)
          : null,
        discountPercent: product.discount_percent
          ? parseFloat(product.discount_percent)
          : null,
        effectivePrice: effectivePrice,
        profitMargin: profitMargin,
        brand: product.brand_id
          ? {
              id: product.brand_id.toString(),
              name: product.brand_name,
            }
          : null,
        category: product.category_id
          ? {
              id: product.category_id.toString(),
              name: product.category_name,
            }
          : null,
        legacyCategory: product.category,
        imageUrl: product.image_url,
        requiresSpecialDelivery: product.requires_special_delivery,
        deliveryEligible: product.delivery_eligible,
        pickupEligible: product.pickup_eligible,
        createdAt: product.created_at,
      };
    });

    res.json({
      success: true,
      message: "Products retrieved successfully",
      count: products.length,
      products: products,
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
      `
      SELECT 
        p.id, p.name, p.description, p.sku, p.cost_price, p.price, p.discount_price, p.discount_percent,
        p.brand_id, p.category_id, p.category, p.image_url, p.requires_special_delivery, 
        p.delivery_eligible, p.pickup_eligible, p.created_at,
        b.name as brand_name,
        c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.is_active = true
    `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = result.rows[0];
    const effectivePrice = calculateEffectivePrice(product);
    const profitMargin = calculateProfitMargin(product);

    res.json({
      success: true,
      message: "Product retrieved successfully",
      product: {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        sku: product.sku,
        costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
        price: parseFloat(product.price),
        discountPrice: product.discount_price
          ? parseFloat(product.discount_price)
          : null,
        discountPercent: product.discount_percent
          ? parseFloat(product.discount_percent)
          : null,
        effectivePrice: effectivePrice,
        profitMargin: profitMargin,
        brand: product.brand_id
          ? {
              id: product.brand_id.toString(),
              name: product.brand_name,
            }
          : null,
        category: product.category_id
          ? {
              id: product.category_id.toString(),
              name: product.category_name,
            }
          : null,
        legacyCategory: product.category,
        imageUrl: product.image_url,
        requiresSpecialDelivery: product.requires_special_delivery,
        deliveryEligible: product.delivery_eligible,
        pickupEligible: product.pickup_eligible,
        createdAt: product.created_at,
      },
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
    body("sku").optional().trim().isLength({ max: 100 }),
    body("cost_price").optional().isFloat({ min: 0 }),
    body("price").isFloat({ min: 0.01 }),
    body("discount_price").optional().isFloat({ min: 0.01 }),
    body("discount_percent").optional().isFloat({ min: 0, max: 100 }),
    body("brand_id").optional().isInt({ min: 1 }),
    body("category_id").optional().isInt({ min: 1 }),
    body("category").optional().trim(), // Legacy field for backward compatibility
    body("image_url").optional().isURL(),
    body("requires_special_delivery").optional().isBoolean(),
    body("delivery_eligible").optional().isBoolean(),
    body("pickup_eligible").optional().isBoolean(),
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
        sku,
        cost_price,
        price,
        discount_price,
        discount_percent,
        brand_id,
        category_id,
        category, // Legacy field
        image_url,
        requires_special_delivery = false,
        delivery_eligible = true,
        pickup_eligible = true,
      } = req.body;

      // Validate that either category_id or category is provided
      if (!category_id && !category) {
        return res.status(400).json({
          success: false,
          message: "Either category_id or category must be provided",
        });
      }

      // Validate that discount_price is less than price if provided
      if (discount_price && parseFloat(discount_price) >= parseFloat(price)) {
        return res.status(400).json({
          success: false,
          message: "Discount price must be less than regular price",
        });
      }

      // Check if brand exists (if brand_id is provided)
      if (brand_id) {
        const brandResult = await pool.query(
          "SELECT id FROM brands WHERE id = $1 AND is_active = true",
          [brand_id]
        );
        if (brandResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Brand not found",
          });
        }
      }

      // Check if category exists (if category_id is provided)
      if (category_id) {
        const categoryResult = await pool.query(
          "SELECT id FROM categories WHERE id = $1 AND is_active = true",
          [category_id]
        );
        if (categoryResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Category not found",
          });
        }
      }

      // Check if SKU is unique (if provided)
      if (sku) {
        const skuResult = await pool.query(
          "SELECT id FROM products WHERE sku = $1",
          [sku]
        );
        if (skuResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "SKU already exists",
          });
        }
      }

      // Create new product
      const newProduct = await pool.query(
        `INSERT INTO products (
          name, description, sku, cost_price, price, discount_price, discount_percent,
          brand_id, category_id, category, image_url, requires_special_delivery, 
          delivery_eligible, pickup_eligible
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING id, name, description, sku, cost_price, price, discount_price, discount_percent,
                  brand_id, category_id, category, image_url, requires_special_delivery, 
                  delivery_eligible, pickup_eligible, created_at`,
        [
          name,
          description,
          sku,
          cost_price,
          price,
          discount_price,
          discount_percent,
          brand_id,
          category_id,
          category,
          image_url,
          requires_special_delivery,
          delivery_eligible,
          pickup_eligible,
        ]
      );

      const product = newProduct.rows[0];
      const effectivePrice = calculateEffectivePrice(product);
      const profitMargin = calculateProfitMargin(product);

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        product: {
          id: product.id.toString(),
          name: product.name,
          description: product.description,
          sku: product.sku,
          costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
          price: parseFloat(product.price),
          discountPrice: product.discount_price
            ? parseFloat(product.discount_price)
            : null,
          discountPercent: product.discount_percent
            ? parseFloat(product.discount_percent)
            : null,
          effectivePrice: effectivePrice,
          profitMargin: profitMargin,
          brandId: product.brand_id ? product.brand_id.toString() : null,
          categoryId: product.category_id
            ? product.category_id.toString()
            : null,
          legacyCategory: product.category,
          imageUrl: product.image_url,
          requiresSpecialDelivery: product.requires_special_delivery,
          deliveryEligible: product.delivery_eligible,
          pickupEligible: product.pickup_eligible,
          createdAt: product.created_at,
        },
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
    body("sku").optional().trim().isLength({ max: 100 }),
    body("cost_price").optional().isFloat({ min: 0 }),
    body("price").optional().isFloat({ min: 0.01 }),
    body("discount_price").optional().isFloat({ min: 0.01 }),
    body("discount_percent").optional().isFloat({ min: 0, max: 100 }),
    body("brand_id").optional().isInt({ min: 1 }),
    body("category_id").optional().isInt({ min: 1 }),
    body("category").optional().trim(), // Legacy field
    body("image_url").optional().isURL(),
    body("requires_special_delivery").optional().isBoolean(),
    body("delivery_eligible").optional().isBoolean(),
    body("pickup_eligible").optional().isBoolean(),
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
        sku,
        cost_price,
        price,
        discount_price,
        discount_percent,
        brand_id,
        category_id,
        category, // Legacy field
        image_url,
        requires_special_delivery,
        delivery_eligible,
        pickup_eligible,
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

      // Validate that discount_price is less than price if both are provided
      if (
        discount_price !== undefined &&
        price !== undefined &&
        parseFloat(discount_price) >= parseFloat(price)
      ) {
        return res.status(400).json({
          success: false,
          message: "Discount price must be less than regular price",
        });
      }

      // Check if brand exists (if brand_id is provided)
      if (brand_id !== undefined) {
        const brandResult = await pool.query(
          "SELECT id FROM brands WHERE id = $1 AND is_active = true",
          [brand_id]
        );
        if (brandResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Brand not found",
          });
        }
      }

      // Check if category exists (if category_id is provided)
      if (category_id !== undefined) {
        const categoryResult = await pool.query(
          "SELECT id FROM categories WHERE id = $1 AND is_active = true",
          [category_id]
        );
        if (categoryResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Category not found",
          });
        }
      }

      // Check if SKU is unique (if provided)
      if (sku !== undefined) {
        const skuResult = await pool.query(
          "SELECT id FROM products WHERE sku = $1 AND id != $2",
          [sku, productId]
        );
        if (skuResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "SKU already exists",
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
      if (sku !== undefined) {
        updateFields.push(`sku = $${paramCount++}`);
        updateValues.push(sku);
      }
      if (cost_price !== undefined) {
        updateFields.push(`cost_price = $${paramCount++}`);
        updateValues.push(cost_price);
      }
      if (price !== undefined) {
        updateFields.push(`price = $${paramCount++}`);
        updateValues.push(price);
      }
      if (discount_price !== undefined) {
        updateFields.push(`discount_price = $${paramCount++}`);
        updateValues.push(discount_price);
      }
      if (discount_percent !== undefined) {
        updateFields.push(`discount_percent = $${paramCount++}`);
        updateValues.push(discount_percent);
      }
      if (brand_id !== undefined) {
        updateFields.push(`brand_id = $${paramCount++}`);
        updateValues.push(brand_id);
      }
      if (category_id !== undefined) {
        updateFields.push(`category_id = $${paramCount++}`);
        updateValues.push(category_id);
      }
      if (category !== undefined) {
        updateFields.push(`category = $${paramCount++}`);
        updateValues.push(category);
      }
      if (image_url !== undefined) {
        updateFields.push(`image_url = $${paramCount++}`);
        updateValues.push(image_url);
      }
      if (requires_special_delivery !== undefined) {
        updateFields.push(`requires_special_delivery = $${paramCount++}`);
        updateValues.push(requires_special_delivery);
      }
      if (delivery_eligible !== undefined) {
        updateFields.push(`delivery_eligible = $${paramCount++}`);
        updateValues.push(delivery_eligible);
      }
      if (pickup_eligible !== undefined) {
        updateFields.push(`pickup_eligible = $${paramCount++}`);
        updateValues.push(pickup_eligible);
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
        RETURNING id, name, description, sku, cost_price, price, discount_price, discount_percent,
                  brand_id, category_id, category, image_url, requires_special_delivery, 
                  delivery_eligible, pickup_eligible, created_at, updated_at
      `;

      const updatedProduct = await pool.query(updateQuery, updateValues);
      const product = updatedProduct.rows[0];
      const effectivePrice = calculateEffectivePrice(product);
      const profitMargin = calculateProfitMargin(product);

      res.json({
        success: true,
        message: "Product updated successfully",
        product: {
          id: product.id.toString(),
          name: product.name,
          description: product.description,
          sku: product.sku,
          costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
          price: parseFloat(product.price),
          discountPrice: product.discount_price
            ? parseFloat(product.discount_price)
            : null,
          discountPercent: product.discount_percent
            ? parseFloat(product.discount_percent)
            : null,
          effectivePrice: effectivePrice,
          profitMargin: profitMargin,
          brandId: product.brand_id ? product.brand_id.toString() : null,
          categoryId: product.category_id
            ? product.category_id.toString()
            : null,
          legacyCategory: product.category,
          imageUrl: product.image_url,
          requiresSpecialDelivery: product.requires_special_delivery,
          deliveryEligible: product.delivery_eligible,
          pickupEligible: product.pickup_eligible,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
        },
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
