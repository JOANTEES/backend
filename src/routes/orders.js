const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const { auth: authenticateUser, adminAuth } = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper function to generate order number
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp.slice(-6)}-${random}`;
}

// Helper function to get app settings
async function getAppSettings() {
  const result = await pool.query("SELECT * FROM app_settings WHERE id = 1");
  return result.rows[0];
}

// Helper function to calculate order totals
async function calculateOrderTotals(
  cartItems,
  deliveryMethod,
  deliveryZoneId,
  pickupLocationId
) {
  const settings = await getAppSettings();

  let subtotal = 0;
  let specialDeliveryFee = 0;
  let totalQuantity = 0;

  // Calculate subtotal and check for special delivery
  for (const item of cartItems) {
    subtotal += item.unit_price * item.quantity;
    totalQuantity += item.quantity;

    if (item.requires_special_delivery) {
      specialDeliveryFee = parseFloat(settings.large_order_delivery_fee);
    }
  }

  // Calculate tax
  const taxAmount = subtotal * (parseFloat(settings.tax_rate) / 100);

  // Calculate shipping fee
  let shippingFee = 0;
  if (deliveryMethod === "delivery") {
    if (deliveryZoneId) {
      const zoneResult = await pool.query(
        "SELECT delivery_fee FROM delivery_zones WHERE id = $1",
        [deliveryZoneId]
      );
      if (zoneResult.rows.length > 0) {
        shippingFee = parseFloat(zoneResult.rows[0].delivery_fee);
      }
    }

    // Check for large order fee
    if (totalQuantity >= settings.large_order_quantity_threshold) {
      shippingFee += parseFloat(settings.large_order_delivery_fee);
    }
  }

  // Check for free shipping
  if (subtotal >= parseFloat(settings.free_shipping_threshold)) {
    shippingFee = 0;
  }

  const totalAmount = subtotal + taxAmount + shippingFee + specialDeliveryFee;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    shippingFee: parseFloat(shippingFee.toFixed(2)),
    largeOrderFee:
      totalQuantity >= settings.large_order_quantity_threshold
        ? parseFloat(settings.large_order_delivery_fee)
        : 0,
    specialDeliveryFee: parseFloat(specialDeliveryFee.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

// POST /api/orders - Create order from cart
// NOTE: For online payments, order creation now happens after Paystack success via webhook/callback
router.post(
  "/",
  authenticateUser,
  [
    body("paymentMethod").isIn(["online", "on_delivery", "on_pickup"]),
    body("deliveryMethod").isIn(["delivery", "pickup"]),
    body("deliveryAddressId").optional().isInt({ min: 1 }),
    body("pickupLocationId").optional().isInt({ min: 1 }),
    body("customerNotes").optional().trim().isLength({ max: 500 }),
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

      const userId = req.user.id;
      const {
        paymentMethod,
        deliveryMethod,
        deliveryAddressId,
        pickupLocationId,
        customerNotes,
      } = req.body;

      // Validate delivery method requirements
      if (deliveryMethod === "delivery" && !deliveryAddressId) {
        return res.status(400).json({
          success: false,
          message: "Delivery address is required for delivery orders",
        });
      }

      if (deliveryMethod === "pickup" && !pickupLocationId) {
        return res.status(400).json({
          success: false,
          message: "Pickup location is required for pickup orders",
        });
      }

      // Get user's cart
      const cartResult = await pool.query(
        `
        SELECT c.*, dz.name as delivery_zone_name, dz.delivery_fee as zone_delivery_fee
        FROM carts c
        LEFT JOIN delivery_zones dz ON c.delivery_zone_id = dz.id
        WHERE c.user_id = $1
      `,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      const cart = cartResult.rows[0];

      // Get cart items with product details
      const cartItemsResult = await pool.query(
        `
        SELECT 
          ci.*,
          p.name as product_name,
          p.description as product_description,
          p.image_url as product_image_url,
          p.price as unit_price,
          p.requires_special_delivery,
          p.delivery_eligible,
          p.pickup_eligible
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = $1
      `,
        [cart.id]
      );

      if (cartItemsResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      const cartItems = cartItemsResult.rows;

      // Validate delivery eligibility
      const deliveryEligibilityIssues = [];
      if (deliveryMethod === "delivery") {
        const notDeliveryEligible = cartItems.filter(
          (item) => !item.delivery_eligible
        );
        if (notDeliveryEligible.length > 0) {
          deliveryEligibilityIssues.push({
            type: "not_delivery_eligible",
            message: "Some items in your cart are not available for delivery",
            items: notDeliveryEligible.map((item) => ({
              productId: item.product_id,
              productName: item.product_name,
              message: "This item is not available for delivery",
            })),
          });
        }
      } else if (deliveryMethod === "pickup") {
        const notPickupEligible = cartItems.filter(
          (item) => !item.pickup_eligible
        );
        if (notPickupEligible.length > 0) {
          deliveryEligibilityIssues.push({
            type: "not_pickup_eligible",
            message: "Some items in your cart are not available for pickup",
            items: notPickupEligible.map((item) => ({
              productId: item.product_id,
              productName: item.product_name,
              message: "This item is not available for pickup",
            })),
          });
        }
      }

      if (deliveryEligibilityIssues.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Delivery method not compatible with cart items",
          deliveryEligibilityIssues: deliveryEligibilityIssues,
        });
      }

      // Calculate totals
      const totals = await calculateOrderTotals(
        cartItems,
        deliveryMethod,
        deliveryMethod === "delivery" ? cart.delivery_zone_id : null,
        pickupLocationId
      );

      // Get delivery address if needed
      let deliveryAddress = null;
      if (deliveryMethod === "delivery" && deliveryAddressId) {
        const addressResult = await pool.query(
          `
          SELECT ca.*, gr.name as region_name, gc.name as city_name
          FROM customer_addresses ca
          JOIN ghana_regions gr ON ca.region_id = gr.id
          JOIN ghana_cities gc ON ca.city_id = gc.id
          WHERE ca.id = $1 AND ca.customer_id = $2
        `,
          [deliveryAddressId, userId]
        );

        if (addressResult.rows.length > 0) {
          const addr = addressResult.rows[0];
          deliveryAddress = {
            regionId: addr.region_id,
            regionName: addr.region_name,
            cityId: addr.city_id,
            cityName: addr.city_name,
            areaName: addr.area_name,
            landmark: addr.landmark,
            additionalInstructions: addr.additional_instructions,
            contactPhone: addr.contact_phone,
            googleMapsLink: addr.google_maps_link,
          };
        }
      }

      // Get pickup location if needed
      let pickupLocation = null;
      if (deliveryMethod === "pickup" && pickupLocationId) {
        const pickupResult = await pool.query(
          `
          SELECT pl.*, gr.name as region_name, gc.name as city_name
          FROM pickup_locations pl
          JOIN ghana_regions gr ON pl.region_id = gr.id
          JOIN ghana_cities gc ON pl.city_id = gc.id
          WHERE pl.id = $1 AND pl.is_active = true
        `,
          [pickupLocationId]
        );

        if (pickupResult.rows.length > 0) {
          const loc = pickupResult.rows[0];
          pickupLocation = {
            id: loc.id,
            name: loc.name,
            regionName: loc.region_name,
            cityName: loc.city_name,
            areaName: loc.area_name,
            landmark: loc.landmark,
            contactPhone: loc.contact_phone,
            googleMapsLink: loc.google_maps_link,
          };
        }
      }

      // For online payments: create a checkout session instead of an order
      if (paymentMethod === "online") {
        // Calculate totals for the session (reuse the earlier totals)
        const sessionRes = await pool.query(
          `INSERT INTO checkout_sessions (
            user_id, delivery_method, delivery_zone_id, delivery_address_id, pickup_location_id,
            subtotal, tax_amount, shipping_fee, large_order_fee, special_delivery_fee, total_amount, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
          RETURNING id, created_at`,
          [
            userId,
            deliveryMethod,
            deliveryMethod === "delivery" ? cart.delivery_zone_id : null,
            deliveryAddressId || null,
            deliveryMethod === "pickup" ? pickupLocationId : null,
            totals.subtotal,
            totals.taxAmount,
            totals.shippingFee,
            totals.largeOrderFee,
            totals.specialDeliveryFee,
            totals.totalAmount,
          ]
        );

        return res.status(201).json({
          success: true,
          message:
            "Checkout session created. Initialize Paystack to proceed with payment.",
          session: {
            id: sessionRes.rows[0].id.toString(),
            amount: totals.totalAmount,
            createdAt: sessionRes.rows[0].created_at.toISOString(),
          },
        });
      }

      // Start transaction for offline payments (on_delivery/on_pickup)
      await pool.query("BEGIN");

      try {
        // Generate order number
        const orderNumber = generateOrderNumber();

        // Create order
        const orderResult = await pool.query(
          `
          INSERT INTO orders (
            user_id, order_number, payment_method, delivery_method,
            delivery_zone_id, pickup_location_id, delivery_address_id,
            delivery_address, subtotal, tax_amount, shipping_fee,
            large_order_fee, special_delivery_fee, total_amount,
            customer_notes, payment_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id, order_number, status, payment_status, created_at
        `,
          [
            userId,
            orderNumber,
            paymentMethod,
            deliveryMethod,
            deliveryMethod === "delivery" ? cart.delivery_zone_id : null,
            pickupLocationId,
            deliveryAddressId,
            deliveryAddress ? JSON.stringify(deliveryAddress) : null,
            totals.subtotal,
            totals.taxAmount,
            totals.shippingFee,
            totals.largeOrderFee,
            totals.specialDeliveryFee,
            totals.totalAmount,
            customerNotes,
            paymentMethod === "online" ? "pending" : "pending",
          ]
        );

        const order = orderResult.rows[0];

        // Create order items
        for (const item of cartItems) {
          await pool.query(
            `
            INSERT INTO order_items (
              order_id, product_id, product_name, product_description,
              product_image_url, size, color, quantity, unit_price,
              subtotal, requires_special_delivery
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
            [
              order.id,
              item.product_id,
              item.product_name,
              item.product_description,
              item.product_image_url,
              item.size,
              item.color,
              item.quantity,
              item.unit_price,
              item.unit_price * item.quantity,
              item.requires_special_delivery,
            ]
          );

          // Update product stock
          await pool.query(
            `
            UPDATE products 
            SET stock_quantity = stock_quantity - $1 
            WHERE id = $2
          `,
            [item.quantity, item.product_id]
          );
        }

        // Clear cart
        await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [
          cart.id,
        ]);
        await pool.query("DELETE FROM carts WHERE id = $1", [cart.id]);

        // Commit transaction
        await pool.query("COMMIT");

        // Prepare response
        const orderData = {
          id: order.id.toString(),
          orderNumber: order.order_number,
          status: order.status,
          paymentMethod: paymentMethod,
          paymentStatus: order.payment_status,
          deliveryMethod: deliveryMethod,
          deliveryAddress: deliveryAddress,
          pickupLocation: pickupLocation,
          totals: totals,
          customerNotes: customerNotes,
          createdAt: order.created_at.toISOString(),
        };

        res.status(201).json({
          success: true,
          message: "Order created successfully",
          order: orderData,
        });
      } catch (error) {
        // Rollback transaction
        await pool.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message,
      });
    }
  }
);

// GET /api/orders - Get user's orders
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let whereClause = "WHERE o.user_id = $1";
    let queryParams = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereClause += ` AND o.status = $${paramCount}`;
      queryParams.push(status);
    }

    const offset = (page - 1) * limit;
    paramCount++;
    const limitClause = `LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    const offsetClause = `OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(
      `
      SELECT 
        o.id, o.order_number, o.status, o.payment_method, o.payment_status,
        o.delivery_method, o.delivery_address, o.subtotal, o.tax_amount,
        o.shipping_fee, o.large_order_fee, o.special_delivery_fee,
        o.total_amount, o.customer_notes, o.created_at, o.updated_at,
        o.confirmed_at, o.shipped_at, o.delivered_at,
        pl.name as pickup_location_name,
        dz.name as delivery_zone_name
      FROM orders o
      LEFT JOIN pickup_locations pl ON o.pickup_location_id = pl.id
      LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
      ${whereClause}
      ORDER BY o.created_at DESC
      ${limitClause} ${offsetClause}
    `,
      queryParams
    );

    const orders = result.rows.map((row) => ({
      id: row.id.toString(),
      orderNumber: row.order_number,
      status: row.status,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      deliveryMethod: row.delivery_method,
      deliveryAddress: row.delivery_address,
      pickupLocationName: row.pickup_location_name,
      deliveryZoneName: row.delivery_zone_name,
      totals: {
        subtotal: parseFloat(row.subtotal),
        taxAmount: parseFloat(row.tax_amount),
        shippingFee: parseFloat(row.shipping_fee),
        largeOrderFee: parseFloat(row.large_order_fee),
        specialDeliveryFee: parseFloat(row.special_delivery_fee),
        totalAmount: parseFloat(row.total_amount),
      },
      customerNotes: row.customer_notes,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
      confirmedAt: row.confirmed_at ? row.confirmed_at.toISOString() : null,
      shippedAt: row.shipped_at ? row.shipped_at.toISOString() : null,
      deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
    }));

    res.json({
      success: true,
      message: "Orders retrieved successfully",
      count: orders.length,
      orders: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// GET /api/orders/:id - Get single order
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID. Must be a number.",
      });
    }

    // Get order details
    const orderResult = await pool.query(
      `
      SELECT 
        o.*, pl.name as pickup_location_name, pl.contact_phone as pickup_phone,
        pl.google_maps_link as pickup_maps_link,
        dz.name as delivery_zone_name, dz.delivery_fee as zone_delivery_fee
      FROM orders o
      LEFT JOIN pickup_locations pl ON o.pickup_location_id = pl.id
      LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
      WHERE o.id = $1 AND o.user_id = $2
    `,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await pool.query(
      `
      SELECT 
        oi.*, p.name as current_product_name, p.image_url as current_image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at
    `,
      [orderId]
    );

    const orderItems = itemsResult.rows.map((item) => ({
      id: item.id.toString(),
      productId: item.product_id ? item.product_id.toString() : null,
      productName: item.product_name,
      productDescription: item.product_description,
      productImageUrl: item.product_image_url,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal),
      requiresSpecialDelivery: item.requires_special_delivery,
      currentProductName: item.current_product_name,
      currentImageUrl: item.current_image_url,
    }));

    const orderData = {
      id: order.id.toString(),
      orderNumber: order.order_number,
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      deliveryMethod: order.delivery_method,
      deliveryAddress: order.delivery_address,
      pickupLocation: order.pickup_location_id
        ? {
            id: order.pickup_location_id.toString(),
            name: order.pickup_location_name,
            contactPhone: order.pickup_phone,
            googleMapsLink: order.pickup_maps_link,
          }
        : null,
      deliveryZone: order.delivery_zone_id
        ? {
            id: order.delivery_zone_id.toString(),
            name: order.delivery_zone_name,
            deliveryFee: parseFloat(order.zone_delivery_fee),
          }
        : null,
      totals: {
        subtotal: parseFloat(order.subtotal),
        taxAmount: parseFloat(order.tax_amount),
        shippingFee: parseFloat(order.shipping_fee),
        largeOrderFee: parseFloat(order.large_order_fee),
        specialDeliveryFee: parseFloat(order.special_delivery_fee),
        totalAmount: parseFloat(order.total_amount),
      },
      customerNotes: order.customer_notes,
      notes: order.notes,
      estimatedDeliveryDate: order.estimated_delivery_date,
      actualDeliveryDate: order.actual_delivery_date
        ? order.actual_delivery_date.toISOString()
        : null,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at ? order.updated_at.toISOString() : null,
      confirmedAt: order.confirmed_at ? order.confirmed_at.toISOString() : null,
      shippedAt: order.shipped_at ? order.shipped_at.toISOString() : null,
      deliveredAt: order.delivered_at ? order.delivered_at.toISOString() : null,
      items: orderItems,
    };

    res.json({
      success: true,
      message: "Order retrieved successfully",
      order: orderData,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
});

// GET /api/admin/orders - Admin list of all orders with filters
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      deliveryMethod,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      q,
    } = req.query;

    let where = "WHERE 1=1";
    const params = [];
    let idx = 0;

    if (status) {
      params.push(status);
      where += ` AND o.status = $${++idx}`;
    }
    if (paymentStatus) {
      params.push(paymentStatus);
      where += ` AND o.payment_status = $${++idx}`;
    }
    if (deliveryMethod) {
      params.push(deliveryMethod);
      where += ` AND o.delivery_method = $${++idx}`;
    }
    if (paymentMethod) {
      params.push(paymentMethod);
      where += ` AND o.payment_method = $${++idx}`;
    }
    if (startDate) {
      params.push(startDate);
      where += ` AND o.created_at >= $${++idx}`;
    }
    if (endDate) {
      params.push(endDate);
      where += ` AND o.created_at <= $${++idx}`;
    }
    if (q) {
      // search by order_number or user email
      params.push(`%${q}%`);
      where += ` AND (o.order_number ILIKE $${++idx} OR u.email ILIKE $${idx})`;
    }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(limit);
    const limitIdx = ++idx;
    params.push(offset);
    const offsetIdx = ++idx;

    const result = await pool.query(
      `SELECT 
         o.id, o.order_number, o.status, o.payment_method, o.payment_status,
         o.delivery_method, o.subtotal, o.tax_amount, o.shipping_fee, o.total_amount,
         o.created_at, o.updated_at,
         u.email as customer_email,
         pl.name as pickup_location_name,
         dz.name as delivery_zone_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN pickup_locations pl ON o.pickup_location_id = pl.id
       LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    return res.json({
      success: true,
      message: "Admin orders retrieved successfully",
      count: result.rows.length,
      orders: result.rows.map((row) => ({
        id: row.id.toString(),
        orderNumber: row.order_number,
        status: row.status,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        deliveryMethod: row.delivery_method,
        totals: {
          subtotal: parseFloat(row.subtotal),
          taxAmount: parseFloat(row.tax_amount),
          shippingFee: parseFloat(row.shipping_fee),
          totalAmount: parseFloat(row.total_amount),
        },
        customerEmail: row.customer_email,
        pickupLocationName: row.pickup_location_name,
        deliveryZoneName: row.delivery_zone_name,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
      })),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin orders",
      error: error.message,
    });
  }
});
module.exports = router;

// POST /api/orders/:id/pay/initialize - Initialize Paystack payment for an order (customer)
router.post("/:id/pay/initialize", authenticateUser, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID. Must be a number.",
      });
    }

    const userId = req.user.id;

    // Fetch order and ensure it belongs to user
    const orderRes = await pool.query(
      `SELECT id, user_id, order_number, total_amount, payment_status, payment_method
         FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );
    if (orderRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    const order = orderRes.rows[0];

    if (order.payment_status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }

    // Get user's email
    const userRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [
      userId,
    ]);
    const customerEmail = userRes.rows[0]?.email;
    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: "User email not found",
      });
    }

    // Use single env for both dev and prod
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "Paystack secret key not configured",
      });
    }

    // Initialize Paystack transaction
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || null;
    const initRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: Math.round(Number(order.total_amount) * 100),
          currency: "GHS",
          metadata: {
            order_id: order.id,
            user_id: userId,
            order_number: order.order_number,
          },
          ...(callbackUrl ? { callback_url: callbackUrl } : {}),
        }),
      }
    );
    const initJson = await initRes.json();
    if (!initRes.ok || !initJson.status) {
      return res.status(502).json({
        success: false,
        message: "Paystack initialization failed",
        error: initJson,
      });
    }

    const { reference, authorization_url, access_code } = initJson.data;

    // Save payment reference on order
    await pool.query(
      `UPDATE orders SET payment_reference = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [reference, order.id]
    );

    return res.json({
      success: true,
      message: "Payment initialized",
      data: { reference, authorization_url, access_code },
    });
  } catch (error) {
    console.error("Error initializing order payment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize payment",
      error: error.message,
    });
  }
});
