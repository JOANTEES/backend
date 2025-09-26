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
  // Parse numeric values from string to float to prevent type errors
  const settings = result.rows[0];
  return {
    ...settings,
    tax_rate: parseFloat(settings.tax_rate),
    free_shipping_threshold: parseFloat(settings.free_shipping_threshold),
    large_order_delivery_fee: parseFloat(settings.large_order_delivery_fee),
  };
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
      ci.id, ci.quantity, ci.created_at,
      p.id AS product_id, p.name AS product_name, p.description, p.price,
      p.discount_price, p.discount_percent, p.cost_price,
      p.category, p.requires_special_delivery, p.delivery_eligible, p.pickup_eligible,
      pv.id AS variant_id, pv.sku, pv.size, pv.color, pv.stock_quantity, pv.image_url
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
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
    items: itemsResult.rows.map((item) => {
      // Calculate effective pricing
      const originalPrice = parseFloat(item.price);
      const discountPrice = item.discount_price
        ? parseFloat(item.discount_price)
        : null;
      const discountPercent = item.discount_percent
        ? parseFloat(item.discount_percent)
        : null;

      let effectivePrice = originalPrice;
      let discountAmount = 0;
      let hasDiscount = false;

      if (discountPrice && discountPrice < originalPrice) {
        effectivePrice = discountPrice;
        discountAmount = originalPrice - discountPrice;
        hasDiscount = true;
      } else if (discountPercent && discountPercent > 0) {
        discountAmount = originalPrice * (discountPercent / 100);
        effectivePrice = originalPrice - discountAmount;
        hasDiscount = true;
      }

      return {
        id: item.id.toString(),
        productId: item.product_id.toString(),
        productName: item.product_name,
        description: item.description,
        price: originalPrice,
        discountPrice: discountPrice,
        discountPercent: discountPercent,
        effectivePrice: parseFloat(effectivePrice.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        hasDiscount: hasDiscount,
        quantity: item.quantity,
        variantId: item.variant_id ? item.variant_id.toString() : null,
        sku: item.sku,
        size: item.size,
        color: item.color,
        imageUrl: item.image_url || item.product_image_url,
        stockQuantity: item.stock_quantity,
        requiresSpecialDelivery: item.requires_special_delivery,
        deliveryEligible: item.delivery_eligible,
        pickupEligible: item.pickup_eligible,
        subtotal: parseFloat((effectivePrice * item.quantity).toFixed(2)),
        createdAt: item.created_at,
      };
    }),
  };
}

// Helper function to automatically determine delivery zone based on address
async function determineDeliveryZone(regionId, cityId, areaName) {
  try {
    // 1) Try exact area match (case-insensitive)
    const exact = await pool.query(
      `
      SELECT 
        dz.id, dz.name, dz.delivery_fee, dz.estimated_days
      FROM delivery_zones dz
      JOIN delivery_zone_areas dza ON dz.id = dza.delivery_zone_id
      WHERE dz.is_active = true 
        AND dza.region_id = $1 
        AND dza.city_id = $2 
        AND LOWER(dza.area_name) = LOWER($3)
      LIMIT 1
    `,
      [regionId, cityId, areaName]
    );

    const row = exact.rows[0];
    if (row) {
      return {
        id: row.id.toString(),
        name: row.name,
        deliveryFee: parseFloat(row.delivery_fee),
        estimatedDays: row.estimated_days,
      };
    }

    // 2) Fallback: any zone covering the city (ignore area), pick the lowest delivery fee
    const cityWide = await pool.query(
      `
      SELECT dz.id, dz.name, dz.delivery_fee, dz.estimated_days
      FROM delivery_zones dz
      WHERE dz.is_active = true AND EXISTS (
        SELECT 1 FROM delivery_zone_areas dza
        WHERE dza.delivery_zone_id = dz.id
          AND dza.region_id = $1
          AND dza.city_id = $2
      )
      ORDER BY dz.delivery_fee ASC
      LIMIT 1
    `,
      [regionId, cityId]
    );

    const anyRow = cityWide.rows[0];
    if (anyRow) {
      return {
        id: anyRow.id.toString(),
        name: anyRow.name,
        deliveryFee: parseFloat(anyRow.delivery_fee),
        estimatedDays: anyRow.estimated_days,
      };
    }

    return null;
  } catch (error) {
    console.error("Error determining delivery zone:", error);
    return null;
  }
}

// Helper function to calculate all cart totals based on items, settings, and delivery choices
async function calculateCartTotals(cartData) {
  const settings = await getAppSettings();
  const { cart, items } = cartData;

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const tax = subtotal * (settings.tax_rate / 100);

  // Check delivery eligibility
  const deliveryEligibilityIssues = [];
  if (cart.deliveryMethod === "delivery") {
    const notDeliveryEligible = items.filter((item) => !item.deliveryEligible);
    if (notDeliveryEligible.length > 0) {
      deliveryEligibilityIssues.push({
        type: "not_delivery_eligible",
        message: "Some items are not available for delivery",
        items: notDeliveryEligible.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          message: "This item is not available for delivery",
        })),
      });
    }
  } else if (cart.deliveryMethod === "pickup") {
    const notPickupEligible = items.filter((item) => !item.pickupEligible);
    if (notPickupEligible.length > 0) {
      deliveryEligibilityIssues.push({
        type: "not_pickup_eligible",
        message: "Some items are not available for pickup",
        items: notPickupEligible.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          message: "This item is not available for pickup",
        })),
      });
    }
  }

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
    deliveryEligibilityIssues:
      deliveryEligibilityIssues.length > 0 ? deliveryEligibilityIssues : null,
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

// POST /api/cart/add - Add an item to the cart (by variant)
router.post(
  "/add",
  authenticateUser,
  [
    body("variantId")
      .isInt({ min: 1 })
      .withMessage("Valid Variant ID is required."),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { variantId, quantity } = req.body;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get variant and product info
      const variantResult = await client.query(
        `SELECT 
          pv.id, pv.product_id, pv.sku, pv.size, pv.color, pv.stock_quantity, pv.image_url,
          p.name as product_name, p.price, p.discount_price, p.discount_percent, p.cost_price,
          p.requires_special_delivery, p.delivery_eligible, p.pickup_eligible, p.is_active as product_active
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.id = $1 FOR UPDATE`,
        [variantId]
      );

      if (variantResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, message: "Product variant not found" });
      }

      const variant = variantResult.rows[0];
      if (!variant.product_active) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ success: false, message: "Product is not available" });
      }

      const cart = await getOrCreateCart(userId);

      // Check if variant already exists in cart
      const existingItem = await client.query(
        "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
        [cart.id, variantId]
      );

      if (existingItem.rows.length > 0) {
        const newQuantity = existingItem.rows[0].quantity + quantity;
        if (variant.stock_quantity < newQuantity) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `Not enough stock. Only ${variant.stock_quantity} available for this variant.`,
          });
        }
        await client.query(
          "UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [newQuantity, existingItem.rows[0].id]
        );
      } else {
        if (variant.stock_quantity < quantity) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `Not enough stock. Only ${variant.stock_quantity} available for this variant.`,
          });
        }
        await client.query(
          "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4)",
          [cart.id, variant.product_id, variantId, quantity]
        );
      }

      // Note: We don't reduce stock here - that happens during order creation
      // This allows for cart abandonment without affecting inventory

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
      return res.status(400).json({
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

// PUT /api/cart/delivery-address - Set delivery address and automatically determine zone
router.put(
  "/delivery-address",
  authenticateUser,
  [
    body("regionId")
      .isInt({ min: 1 })
      .withMessage("Valid region ID is required."),
    body("cityId").isInt({ min: 1 }).withMessage("Valid city ID is required."),
    body("areaName")
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Area name is required."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { regionId, cityId, areaName } = req.body;
    const userId = req.user.id;

    try {
      // Determine the delivery zone automatically
      const deliveryZone = await determineDeliveryZone(
        regionId,
        cityId,
        areaName
      );

      if (!deliveryZone) {
        return res.status(400).json({
          success: false,
          message:
            "No delivery zone found for the specified address. Please contact support.",
        });
      }

      // Update the cart with delivery method and zone
      const cart = await getOrCreateCart(userId);
      await pool.query(
        "UPDATE carts SET delivery_method = 'delivery', delivery_zone_id = $1 WHERE id = $2",
        [deliveryZone.id, cart.id]
      );

      const cartData = await getCartData(userId);
      const totals = await calculateCartTotals(cartData);

      res.json({
        success: true,
        message: "Delivery address set and zone determined automatically.",
        data: {
          ...cartData,
          totals,
          itemCount: cartData.items.length,
          determinedZone: deliveryZone,
        },
      });
    } catch (error) {
      console.error("Error setting delivery address:", error);
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
router.delete("/:itemId", authenticateUser, async (req, res, next) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  // If the path was actually '/clear', let the dedicated route handle it
  if (itemId === "clear") {
    return next();
  }

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
