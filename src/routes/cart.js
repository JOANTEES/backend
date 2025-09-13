const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const { auth: authenticateUser } = require("../middleware/auth");

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper function to get app settings from the database
async function getAppSettings() {
  const result = await pool.query("SELECT * FROM app_settings WHERE id = 1");
  if (result.rows.length === 0) {
    // Provide sensible defaults if the settings table is empty
    return {
      tax_rate: 10.0,
      free_shipping_threshold: 100.0,
      large_order_quantity_threshold: 10,
      large_order_delivery_fee: 50.0,
    };
  }
  return result.rows[0];
}

// Helper function to get a user's cart, creating one if it doesn't exist
async function getOrCreateCart(userId) {
  let cartResult = await pool.query("SELECT * FROM carts WHERE user_id = $1", [
    userId,
  ]);

  if (cartResult.rows.length > 0) {
    return cartResult.rows[0];
  }

  const newCartResult = await pool.query(
    "INSERT INTO carts (user_id) VALUES ($1) RETURNING *",
    [userId]
  );
  return newCartResult.rows[0];
}

// Helper function to get all data related to a user's cart (cart settings, items, delivery info)
async function getCartData(userId) {
  const cart = await getOrCreateCart(userId);

  const itemsResult = await pool.query(
    `SELECT
      ci.id, ci.quantity, ci.size, ci.color, ci.created_at,
      p.id AS product_id, p.name AS product_name, p.description, p.price,
      p.category, p.image_url, p.stock_quantity, p.requires_special_delivery
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.cart_id = $1 AND p.is_active = true
    ORDER BY ci.created_at DESC`,
    [cart.id]
  );

  let deliveryZone = null;
  if (cart.delivery_method === "delivery" && cart.delivery_zone_id) {
    const zoneResult = await pool.query(
      "SELECT name, delivery_fee FROM delivery_zones WHERE id = $1 AND is_active = true",
      [cart.delivery_zone_id]
    );
    if (zoneResult.rows.length > 0) {
      deliveryZone = zoneResult.rows[0];
    }
  }

  return {
    cart: {
      id: cart.id.toString(),
      deliveryMethod: cart.delivery_method,
      deliveryZoneId: cart.delivery_zone_id
        ? cart.delivery_zone_id.toString()
        : null,
      deliveryZoneName: deliveryZone ? deliveryZone.name : null,
      deliveryZoneFee: deliveryZone
        ? parseFloat(deliveryZone.delivery_fee)
        : null,
    },
    items: itemsResult.rows.map((item) => ({
      id: item.id.toString(),
      productId: item.product_id.toString(),
      productName: item.product_name,
      description: item.description,
      price: parseFloat(item.price),
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      imageUrl: item.image_url,
      stockQuantity: item.stock_quantity,
      requiresSpecialDelivery: item.requires_special_delivery,
      subtotal: parseFloat(item.price) * item.quantity,
      createdAt: item.created_at,
    })),
  };
}

// Helper function to calculate all cart totals based on items, settings, and delivery choices
async function calculateCartTotals(cartData) {
  const settings = await getAppSettings();
  const { cart, items } = cartData;

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const tax = subtotal * (settings.tax_rate / 100);

  let shipping = 0;
  if (cart.deliveryMethod === "delivery") {
    const hasSpecialDelivery = items.some(
      (item) => item.requiresSpecialDelivery
    );
    if (
      totalQuantity >= settings.large_order_quantity_threshold ||
      hasSpecialDelivery
    ) {
      shipping = settings.large_order_delivery_fee;
    } else if (cart.deliveryZoneFee) {
      shipping = cart.deliveryZoneFee;
    }
    // Apply free shipping threshold
    if (subtotal >= settings.free_shipping_threshold) {
      shipping = 0;
    }
  }

  const total = subtotal + tax + shipping;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

// --- API Endpoints ---

// GET /api/cart - Get user's full cart details and totals
router.get("/", authenticateUser, async (req, res) => {
  try {
    const cartData = await getCartData(req.user.id);
    const totals = await calculateCartTotals(cartData);
    res.json({
      success: true,
      message: "Cart retrieved successfully",
      data: { ...cartData, totals, itemCount: cartData.items.length },
    });
  } catch (error) {
    console.error("Error getting cart:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/cart/add - Add an item to the cart
router.post(
  "/add",
  authenticateUser,
  [
    body("productId")
      .isInt({ min: 1 })
      .withMessage("Valid Product ID is required."),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1."),
    body("size").optional().isString().trim(),
    body("color").optional().isString().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { productId, quantity, size, color } = req.body;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const productResult = await client.query(
        "SELECT name, stock_quantity, is_active FROM products WHERE id = $1 FOR UPDATE",
        [productId]
      );

      if (productResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      const product = productResult.rows[0];
      if (!product.is_active) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ success: false, message: "Product is not available" });
      }

      const cart = await getOrCreateCart(userId);

      const existingItem = await client.query(
        "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND (size = $3 OR (size IS NULL AND $3 IS NULL)) AND (color = $4 OR (color IS NULL AND $4 IS NULL))",
        [cart.id, productId, size, color]
      );

      if (existingItem.rows.length > 0) {
        const newQuantity = existingItem.rows[0].quantity + quantity;
        if (product.stock_quantity < newQuantity) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({
              success: false,
              message: `Not enough stock. Only ${product.stock_quantity} available.`,
            });
        }
        await client.query(
          "UPDATE cart_items SET quantity = $1 WHERE id = $2",
          [newQuantity, existingItem.rows[0].id]
        );
      } else {
        if (product.stock_quantity < quantity) {
          await client.query("ROLLBACK");
          return res
            .status(400)
            .json({
              success: false,
              message: `Not enough stock. Only ${product.stock_quantity} available.`,
            });
        }
        await client.query(
          "INSERT INTO cart_items (cart_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)",
          [cart.id, productId, quantity, size, color]
        );
      }

      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2",
        [quantity, productId]
      );

      await client.query("COMMIT");

      const cartData = await getCartData(userId);
      const totals = await calculateCartTotals(cartData);

      res.status(200).json({
        success: true,
        message: "Item added to cart",
        data: { ...cartData, totals, itemCount: cartData.items.length },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error adding item to cart:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

// PUT /api/cart/delivery - Update the delivery method for the entire cart
router.put(
  "/delivery",
  authenticateUser,
  [
    body("deliveryMethod")
      .isIn(["pickup", "delivery"])
      .withMessage("Invalid delivery method."),
    body("deliveryZoneId")
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage("Invalid Delivery Zone ID."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryMethod, deliveryZoneId } = req.body;
    const userId = req.user.id;

    if (deliveryMethod === "delivery" && !deliveryZoneId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Delivery Zone ID is required for delivery.",
        });
    }

    try {
      const cart = await getOrCreateCart(userId);

      await pool.query(
        "UPDATE carts SET delivery_method = $1, delivery_zone_id = $2 WHERE id = $3",
        [
          deliveryMethod,
          deliveryMethod === "pickup" ? null : deliveryZoneId,
          cart.id,
        ]
      );

      const cartData = await getCartData(userId);
      const totals = await calculateCartTotals(cartData);

      res.json({
        success: true,
        message: "Delivery method updated.",
        data: { ...cartData, totals, itemCount: cartData.items.length },
      });
    } catch (error) {
      console.error("Error updating delivery method:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

// PUT /api/cart/:itemId - Update the quantity of a single cart item
router.put(
  "/:itemId",
  authenticateUser,
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const itemResult = await client.query(
        `SELECT ci.id, ci.quantity, ci.product_id, p.stock_quantity 
             FROM cart_items ci 
             JOIN carts c ON ci.cart_id = c.id
             JOIN products p ON ci.product_id = p.id
             WHERE ci.id = $1 AND c.user_id = $2 FOR UPDATE`,
        [itemId, userId]
      );

      if (itemResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, message: "Item not found in cart." });
      }

      const item = itemResult.rows[0];
      const stockRequired = quantity - item.quantity;

      if (item.stock_quantity < stockRequired) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ success: false, message: "Not enough stock." });
      }

      await client.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [
        quantity,
        itemId,
      ]);
      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2",
        [stockRequired, item.product_id]
      );

      await client.query("COMMIT");

      const cartData = await getCartData(userId);
      const totals = await calculateCartTotals(cartData);

      res.json({
        success: true,
        message: "Item quantity updated.",
        data: { ...cartData, totals, itemCount: cartData.items.length },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating item quantity:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

// DELETE /api/cart/:itemId - Remove a single item from the cart
router.delete("/:itemId", authenticateUser, async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const itemResult = await client.query(
      `SELECT ci.id, ci.quantity, ci.product_id 
             FROM cart_items ci
             JOIN carts c ON ci.cart_id = c.id
             WHERE ci.id = $1 AND c.user_id = $2`,
      [itemId, userId]
    );

    if (itemResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart." });
    }

    const item = itemResult.rows[0];

    await client.query("DELETE FROM cart_items WHERE id = $1", [itemId]);
    await client.query(
      "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2",
      [item.quantity, item.product_id]
    );

    await client.query("COMMIT");

    const cartData = await getCartData(userId);
    const totals = await calculateCartTotals(cartData);

    res.json({
      success: true,
      message: "Item removed from cart.",
      data: { ...cartData, totals, itemCount: cartData.items.length },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error removing item from cart:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/cart/clear - Remove all items from the cart
router.delete("/clear", authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cart = await getOrCreateCart(userId);
    const itemsResult = await client.query(
      "SELECT quantity, product_id FROM cart_items WHERE cart_id = $1",
      [cart.id]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
    }

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);

    await client.query("COMMIT");

    const cartData = await getCartData(userId);
    const totals = await calculateCartTotals(cartData);

    res.json({
      success: true,
      message: "Cart cleared.",
      data: { ...cartData, totals, itemCount: cartData.items.length },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error clearing cart:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  } finally {
    client.release();
  }
});

module.exports = router;
