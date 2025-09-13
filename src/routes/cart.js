const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Middleware to authenticate user
const authenticateUser = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

// Helper function to get user's cart with product details
async function getUserCart(userId) {
  const result = await pool.query(
    `SELECT 
      ci.id,
      ci.quantity,
      ci.size,
      ci.color,
      ci.created_at,
      p.id as product_id,
      p.name as product_name,
      p.description,
      p.price,
      p.category,
      p.image_url,
      p.stock_quantity,
      p.requires_special_delivery
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = $1 AND p.is_active = true
    ORDER BY ci.created_at DESC`,
    [userId]
  );

  return result.rows.map((item) => ({
    id: item.id.toString(),
    productId: item.product_id.toString(),
    productName: item.product_name,
    description: item.description,
    price: parseFloat(item.price),
    category: item.category,
    imageUrl: item.image_url,
    stockQuantity: item.stock_quantity,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
    subtotal: parseFloat(item.price) * item.quantity,
    createdAt: item.created_at.toISOString(),
  }));
}

// Helper function to get app settings
async function getAppSettings() {
  const result = await pool.query("SELECT * FROM app_settings WHERE id = 1");
  if (result.rows.length === 0) {
    // Return default settings if none found
    return {
      tax_rate: 10.0,
      free_shipping_threshold: 100.0,
      large_order_quantity_threshold: 10,
      large_order_delivery_fee: 50.0,
    };
  }
  return result.rows[0];
}

// Helper function to calculate cart totals with dynamic settings
async function calculateCartTotals(cartItems, deliveryZoneId = null) {
  const settings = await getAppSettings();
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate tax
  const tax = subtotal * (settings.tax_rate / 100);
  
  // Calculate shipping
  let shipping = 0;
  
  // Check if this is a large order (by quantity)
  if (totalQuantity >= settings.large_order_quantity_threshold) {
    shipping = settings.large_order_delivery_fee;
  } else if (deliveryZoneId) {
    // Get delivery zone fee
    const zoneResult = await pool.query(
      "SELECT delivery_fee FROM delivery_zones WHERE id = $1 AND is_active = true",
      [deliveryZoneId]
    );
    if (zoneResult.rows.length > 0) {
      shipping = parseFloat(zoneResult.rows[0].delivery_fee);
    }
  }
  
  // Check if any product requires special delivery
  const specialDeliveryProducts = cartItems.filter(item => item.requires_special_delivery);
  if (specialDeliveryProducts.length > 0) {
    shipping = settings.large_order_delivery_fee;
  }
  
  // Apply free shipping threshold
  if (subtotal >= settings.free_shipping_threshold) {
    shipping = 0;
  }
  
  const total = subtotal + tax + shipping;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

// GET /api/cart - Get user's cart
router.get("/", authenticateUser, async (req, res) => {
  try {
    const cartItems = await getUserCart(req.user.id);
    const totals = calculateCartTotals(cartItems);

    res.json({
      success: true,
      message: "Cart retrieved successfully",
      data: {
        items: cartItems,
        totals,
        itemCount: cartItems.length,
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching cart",
      error: error.message,
    });
  }
});

// POST /api/cart/add - Add item to cart
router.post(
  "/add",
  authenticateUser,
  [
    body("productId")
      .isInt({ min: 1 })
      .withMessage("Valid product ID is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("size").optional().isString().trim(),
    body("color").optional().isString().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { productId, quantity, size, color } = req.body;
      const userId = req.user.id;

      // Start transaction
      await pool.query("BEGIN");

      try {
        // Check if product exists and is active
        const productResult = await pool.query(
          "SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = $1",
          [productId]
        );

        if (productResult.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        const product = productResult.rows[0];

        if (!product.is_active) {
          await pool.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: "Product is not available",
          });
        }

        // Check stock availability
        if (product.stock_quantity < quantity) {
          await pool.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `Only ${product.stock_quantity} items available in stock`,
          });
        }

        // Check if item already exists in cart
        const existingItem = await pool.query(
          "SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2 AND (size = $3 OR (size IS NULL AND $3 IS NULL)) AND (color = $4 OR (color IS NULL AND $4 IS NULL))",
          [userId, productId, size, color]
        );

        if (existingItem.rows.length > 0) {
          // Update existing item
          const newQuantity = existingItem.rows[0].quantity + quantity;

          if (product.stock_quantity < newQuantity) {
            await pool.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              message: `Only ${product.stock_quantity} items available in stock`,
            });
          }

          await pool.query(
            "UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [newQuantity, existingItem.rows[0].id]
          );
        } else {
          // Add new item to cart
          await pool.query(
            "INSERT INTO cart_items (user_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)",
            [userId, productId, quantity, size, color]
          );
        }

        // Reduce stock quantity
        await pool.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [quantity, productId]
        );

        // Log activity
        await pool.query(
          "INSERT INTO customer_activity (customer_id, type, description, metadata) VALUES ($1, $2, $3, $4)",
          [
            userId,
            "purchase",
            `Added ${quantity} x ${product.name} to cart`,
            {
              productId: productId,
              quantity: quantity,
              size: size,
              color: color,
            },
          ]
        );

        await pool.query("COMMIT");

        // Get updated cart
        const cartItems = await getUserCart(userId);
        const totals = calculateCartTotals(cartItems);

        res.status(201).json({
          success: true,
          message: "Item added to cart successfully",
          data: {
            items: cartItems,
            totals,
            itemCount: cartItems.length,
          },
        });
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adding item to cart",
        error: error.message,
      });
    }
  }
);

// PUT /api/cart/:itemId - Update cart item quantity
router.put(
  "/:itemId",
  authenticateUser,
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { itemId } = req.params;
      const { quantity } = req.body;
      const userId = req.user.id;

      // Start transaction
      await pool.query("BEGIN");

      try {
        // Get current cart item
        const cartItemResult = await pool.query(
          `SELECT ci.id, ci.quantity, ci.product_id, p.stock_quantity, p.name
           FROM cart_items ci
           JOIN products p ON ci.product_id = p.id
           WHERE ci.id = $1 AND ci.user_id = $2`,
          [itemId, userId]
        );

        if (cartItemResult.rows.length === 0) {
          await pool.query("ROLLBACK");
          return res.status(404).json({
            success: false,
            message: "Cart item not found",
          });
        }

        const cartItem = cartItemResult.rows[0];
        const quantityDifference = quantity - cartItem.quantity;

        // Check stock availability
        if (cartItem.stock_quantity < quantity) {
          await pool.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `Only ${cartItem.stock_quantity} items available in stock`,
          });
        }

        // Update cart item
        await pool.query(
          "UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [quantity, itemId]
        );

        // Update stock quantity
        await pool.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [quantityDifference, cartItem.product_id]
        );

        // Log activity
        await pool.query(
          "INSERT INTO customer_activity (customer_id, type, description, metadata) VALUES ($1, $2, $3, $4)",
          [
            userId,
            "purchase",
            `Updated ${cartItem.name} quantity to ${quantity} in cart`,
            {
              productId: cartItem.product_id,
              quantity: quantity,
              quantityDifference: quantityDifference,
            },
          ]
        );

        await pool.query("COMMIT");

        // Get updated cart
        const cartItems = await getUserCart(userId);
        const totals = calculateCartTotals(cartItems);

        res.json({
          success: true,
          message: "Cart item updated successfully",
          data: {
            items: cartItems,
            totals,
            itemCount: cartItems.length,
          },
        });
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating cart item",
        error: error.message,
      });
    }
  }
);

// DELETE /api/cart/:itemId - Remove item from cart
router.delete("/:itemId", authenticateUser, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    // Start transaction
    await pool.query("BEGIN");

    try {
      // Get cart item details
      const cartItemResult = await pool.query(
        `SELECT ci.id, ci.quantity, ci.product_id, p.name
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.id = $1 AND ci.user_id = $2`,
        [itemId, userId]
      );

      if (cartItemResult.rows.length === 0) {
        await pool.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Cart item not found",
        });
      }

      const cartItem = cartItemResult.rows[0];

      // Remove from cart
      await pool.query("DELETE FROM cart_items WHERE id = $1", [itemId]);

      // Restore stock quantity
      await pool.query(
        "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [cartItem.quantity, cartItem.product_id]
      );

      // Log activity
      await pool.query(
        "INSERT INTO customer_activity (customer_id, type, description, metadata) VALUES ($1, $2, $3, $4)",
        [
          userId,
          "purchase",
          `Removed ${cartItem.name} from cart`,
          {
            productId: cartItem.product_id,
            quantity: cartItem.quantity,
          },
        ]
      );

      await pool.query("COMMIT");

      // Get updated cart
      const cartItems = await getUserCart(userId);
      const totals = calculateCartTotals(cartItems);

      res.json({
        success: true,
        message: "Item removed from cart successfully",
        data: {
          items: cartItems,
          totals,
          itemCount: cartItems.length,
        },
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing cart item",
      error: error.message,
    });
  }
});

// DELETE /api/cart/clear - Clear entire cart
router.delete("/clear", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Start transaction
    await pool.query("BEGIN");

    try {
      // Get all cart items for this user
      const cartItemsResult = await pool.query(
        `SELECT ci.quantity, ci.product_id, p.name
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.user_id = $1`,
        [userId]
      );

      // Restore stock for all items
      for (const item of cartItemsResult.rows) {
        await pool.query(
          "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [item.quantity, item.product_id]
        );
      }

      // Clear cart
      await pool.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);

      // Log activity
      await pool.query(
        "INSERT INTO customer_activity (customer_id, type, description, metadata) VALUES ($1, $2, $3, $4)",
        [
          userId,
          "purchase",
          "Cleared entire cart",
          {
            itemsCleared: cartItemsResult.rows.length,
          },
        ]
      );

      await pool.query("COMMIT");

      res.json({
        success: true,
        message: "Cart cleared successfully",
        data: {
          items: [],
          totals: {
            subtotal: 0,
            tax: 0,
            shipping: 0,
            total: 0,
          },
          itemCount: 0,
        },
      });
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Server error while clearing cart",
      error: error.message,
    });
  }
});

module.exports = router;
