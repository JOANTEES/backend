const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const { adminAuth } = require("../middleware/auth");
const emailService = require("../utils/emailService");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Note: Payment creation is now automatic when bookings/orders are created
// Use PATCH /api/payments/:id/add-payment to add partial payments

// POST /api/payments/paystack/initialize - create Paystack transaction (client or server initiated)
router.post(
  "/paystack/initialize",
  adminAuth,
  [
    body("email").isEmail(),
    body("amount").isFloat({ min: 0.01 }), // in major units; we'll convert to kobo/pesewas as needed
    body("metadata").optional(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });

      const { email, amount, metadata } = req.body;
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret)
        return res
          .status(500)
          .json({ message: "PAYSTACK_SECRET_KEY not configured" });

      const initRes = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({
            email,
            amount: Math.round(amount * 100),
            metadata,
          }),
        }
      );
      const initJson = await initRes.json();
      if (!initRes.ok || !initJson.status) {
        return res
          .status(502)
          .json({ message: "Paystack init failed", error: initJson });
      }

      return res.json(initJson.data); // contains authorization_url, reference, access_code
    } catch (error) {
      console.error("Error initializing Paystack:", error);
      return res.status(500).json({
        message: "Server error initializing Paystack",
        error: error.message,
      });
    }
  }
);

// POST /api/payments/paystack/initialize-session - prepare inline-only session (no server init)
router.post("/paystack/initialize-session", async (req, res) => {
  try {
    // Require auth via header token if middleware not applied globally
    const authHeader =
      req.header("authorization") || req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { sessionId } = req.body || {};
    if (!sessionId || isNaN(parseInt(sessionId))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid sessionId is required" });
    }

    // Fetch session and user
    const sessionRes = await pool.query(
      `SELECT cs.*, u.email as customer_email
         FROM checkout_sessions cs
         JOIN users u ON u.id = cs.user_id
         WHERE cs.id = $1 AND cs.status = 'pending'`,
      [parseInt(sessionId)]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Checkout session not found or not pending",
      });
    }
    const s = sessionRes.rows[0];

    // Generate and persist a fresh unique reference for this attempt
    const uniqueRef = `JTN-${s.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    await pool.query(
      `UPDATE checkout_sessions SET payment_reference = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [uniqueRef, s.id]
    );

    // Return inline parameters only (no authorization_url)
    return res.json({
      success: true,
      message: "Session payment prepared",
      data: {
        reference: uniqueRef,
        amount: Math.round(Number(s.total_amount) * 100),
        currency: "GHS",
        email: s.customer_email,
      },
    });
  } catch (error) {
    console.error("Error initializing session payment:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/payments/paystack/webhook - Paystack webhook handler
router.post(
  "/paystack/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.header("x-paystack-signature");
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) return res.status(500).end();

      // Verify signature
      const crypto = require("crypto");
      const hash = crypto
        .createHmac("sha512", secret)
        .update(req.body)
        .digest("hex");
      if (hash !== signature) return res.status(401).end();

      const event = JSON.parse(req.body.toString());
      if (event?.event === "charge.success") {
        const data = event.data;
        const reference = data.reference;
        const customerEmail = data.customer?.email;
        const amount = Number(data.amount) / 100;

        // Optionally, link to a booking via metadata.booking_id
        const bookingId = data.metadata?.booking_id
          ? parseInt(data.metadata.booking_id)
          : null;

        // Try to resolve order by reference saved on orders.payment_reference
        let orderId = null;
        let customerName = null;
        const orderRes = await pool.query(
          `SELECT id FROM orders WHERE payment_reference = $1`,
          [reference]
        );
        if (orderRes.rows.length > 0) {
          orderId = orderRes.rows[0].id;

          // Get customer info from order
          const customerRes = await pool.query(
            "SELECT u.first_name, u.last_name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1",
            [orderId]
          );
          const customer = customerRes.rows[0];
          if (customer) {
            customerName = `${customer.first_name} ${customer.last_name}`;
            // Use order customer email if available, otherwise use Paystack email
            if (customer.email) {
              customerEmail = customer.email;
            }
          }
        }

        await pool.query(
          `INSERT INTO payments (booking_id, order_id, amount, currency, method, status, provider, provider_reference, paystack_reference, transaction_id, authorization_code, customer_email, notes, metadata, payment_history)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT DO NOTHING`,
          [
            bookingId,
            orderId,
            amount,
            data.currency || "GHS",
            "paystack",
            "completed",
            "paystack",
            reference,
            reference,
            data.id?.toString() || null,
            data.authorization?.authorization_code || null,
            customerEmail || null,
            customerName || null,
            data.metadata || null,
            JSON.stringify({
              transactions: [
                {
                  amount: amount,
                  method: "paystack",
                  timestamp: new Date().toISOString(),
                  notes: "Online payment",
                },
              ],
            }),
          ]
        );

        if (bookingId) {
          await recalcBookingPaymentStatus(bookingId);
        }
        if (orderId) {
          await pool.query(
            `UPDATE orders SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [orderId]
          );
        } else {
          // No order yet: try creating order from a checkout session
          let sessionRes = await pool.query(
            `SELECT * FROM checkout_sessions WHERE payment_reference = $1 ORDER BY created_at DESC LIMIT 1`,
            [reference]
          );
          // Fallback: match by metadata.session_id when reference isn't stored
          if (sessionRes.rows.length === 0 && data.metadata?.session_id) {
            sessionRes = await pool.query(
              `SELECT * FROM checkout_sessions WHERE id = $1 AND status = 'pending'`,
              [parseInt(data.metadata.session_id)]
            );
          }
          if (sessionRes.rows.length > 0) {
            const s = sessionRes.rows[0];

            const client = await pool.connect();
            try {
              await client.query("BEGIN");

              // Build delivery_address JSON if delivery
              let deliveryAddressJson = null;
              if (s.delivery_method === "delivery" && s.delivery_address_id) {
                const addrRes = await client.query(
                  `SELECT ca.*, gr.name as region_name, gc.name as city_name
                   FROM customer_addresses ca
                   JOIN ghana_regions gr ON ca.region_id = gr.id
                   JOIN ghana_cities gc ON ca.city_id = gc.id
                   WHERE ca.id = $1`,
                  [s.delivery_address_id]
                );
                if (addrRes.rows.length > 0) {
                  const addr = addrRes.rows[0];
                  deliveryAddressJson = {
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

              // Create order from session data
              const orderNum = `ORD-${Date.now()
                .toString()
                .slice(-6)}-${Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0")}`;
              const orderInsert = await client.query(
                `INSERT INTO orders (
                  user_id, order_number, payment_method, delivery_method,
                  delivery_zone_id, pickup_location_id, delivery_address_id,
                  delivery_address, subtotal, tax_amount, shipping_fee,
                  large_order_fee, special_delivery_fee, total_amount,
                  customer_notes, payment_status, payment_reference, amount_paid
                ) VALUES ($1,$2,'online',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NULL,'paid',$14,$15)
                RETURNING id`,
                [
                  s.user_id,
                  orderNum,
                  s.delivery_method,
                  s.delivery_zone_id,
                  s.pickup_location_id,
                  s.delivery_address_id,
                  deliveryAddressJson
                    ? JSON.stringify(deliveryAddressJson)
                    : null,
                  s.subtotal,
                  s.tax_amount,
                  s.shipping_fee,
                  s.large_order_fee,
                  s.special_delivery_fee,
                  s.total_amount,
                  reference,
                  s.total_amount, // amount_paid = total_amount for paid orders
                ]
              );
              const newOrderId = orderInsert.rows[0].id;

              // Create order items from user's cart with variant support
              const cartItemsRes = await client.query(
                `SELECT 
                  ci.*, 
                  p.name as product_name, p.description as product_description,
                  p.image_url as product_image_url, p.price as unit_price,
                  p.discount_price, p.discount_percent, p.cost_price,
                  p.requires_special_delivery,
                  pv.id as variant_id, pv.sku as variant_sku,
                  pv.size as variant_size, pv.color as variant_color,
                  pv.image_url as variant_image_url, pv.stock_quantity as variant_stock
                 FROM cart_items ci
                 JOIN carts c ON ci.cart_id = c.id
                 JOIN products p ON ci.product_id = p.id
                 JOIN product_variants pv ON ci.variant_id = pv.id
                 WHERE c.user_id = $1`,
                [s.user_id]
              );

              // Calculate effective pricing for cart items
              const cartItems = cartItemsRes.rows.map((item) => {
                const originalPrice = parseFloat(item.unit_price);
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
                  ...item,
                  effectivePrice: parseFloat(effectivePrice.toFixed(2)),
                  discountAmount: parseFloat(discountAmount.toFixed(2)),
                  hasDiscount: hasDiscount,
                };
              });

              for (const item of cartItems) {
                // Use effective price if available, otherwise fall back to unit_price
                const itemPrice = item.effectivePrice || item.unit_price;

                await client.query(
                  `INSERT INTO order_items (
                     order_id, product_id, variant_id, product_name, product_description,
                     product_image_url, variant_sku, size, color, quantity, unit_price,
                     subtotal, requires_special_delivery
                   ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                  [
                    newOrderId,
                    item.product_id,
                    item.variant_id,
                    item.product_name,
                    item.product_description,
                    item.variant_image_url || item.product_image_url,
                    item.variant_sku,
                    item.variant_size,
                    item.variant_color,
                    item.quantity,
                    itemPrice,
                    itemPrice * item.quantity,
                    item.requires_special_delivery,
                  ]
                );

                // Update variant stock
                await client.query(
                  `UPDATE product_variants 
                   SET stock_quantity = stock_quantity - $1 
                   WHERE id = $2`,
                  [item.quantity, item.variant_id]
                );

                // Note: Product stock is now managed through variants only
                // No need to update products.stock_quantity as it doesn't exist
              }

              // Attach payments to new order
              await client.query(
                `UPDATE payments SET order_id = $1 WHERE provider_reference = $2 AND order_id IS NULL`,
                [newOrderId, reference]
              );

              // Clear cart
              await client.query(
                `DELETE FROM cart_items USING carts WHERE cart_items.cart_id = carts.id AND carts.user_id = $1`,
                [s.user_id]
              );
              await client.query(`DELETE FROM carts WHERE user_id = $1`, [
                s.user_id,
              ]);

              // Mark session as paid
              await client.query(
                `UPDATE checkout_sessions SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [s.id]
              );

              await client.query("COMMIT");

              // Send admin notification email (don't wait for it to complete)
              console.log(
                `📧 [EMAIL-TRIGGER] Payment verified, order created: ${newOrderId}, triggering admin notification...`
              );
              emailService
                .sendNewOrderNotification(newOrderId)
                .catch((error) => {
                  console.error(
                    "❌ [EMAIL] Admin notification failed for order:",
                    newOrderId,
                    error
                  );
                });

              // Send customer order confirmation email (don't wait for it to complete)
              console.log(
                `📧 [EMAIL-TRIGGER] Payment verified, order created: ${newOrderId}, sending customer confirmation...`
              );
              emailService
                .sendOrderStatusEmail(newOrderId, "pending")
                .catch((error) => {
                  console.error(
                    "❌ [EMAIL] Customer confirmation failed for order:",
                    newOrderId,
                    error
                  );
                });
            } catch (e) {
              await pool.query("ROLLBACK");
              throw e;
            } finally {
              client.release();
            }
          }
        }
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error("Error handling Paystack webhook:", error);
      return res.sendStatus(500);
    }
  }
);

// GET /api/payments/paystack/callback - Paystack redirect handler (verifies and redirects)
router.get("/paystack/callback", async (req, res) => {
  try {
    const reference = req.query.reference;
    if (!reference) return res.status(400).send("Missing reference");

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return res.status(500).send("Paystack key not configured");

    // Verify transaction
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      }
    );
    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok || !verifyJson.status) {
      return res.status(502).send("Verification failed");
    }

    // Find order by reference
    const orderRes = await pool.query(
      `SELECT id FROM orders WHERE payment_reference = $1`,
      [reference]
    );
    if (orderRes.rows.length > 0 && verifyJson.data.status === "success") {
      const orderId = orderRes.rows[0].id;

      // 1) Update order payment status
      await pool.query(
        `UPDATE orders SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );

      // 2) Ensure there is a completed payment record for this order/reference
      const amount = Number(verifyJson.data.amount || 0) / 100;
      const currency = verifyJson.data.currency || "GHS";
      const transactionId = verifyJson.data.id?.toString() || null;
      const authorizationCode =
        verifyJson.data.authorization?.authorization_code || null;

      // Get customer info from order
      const customerRes = await pool.query(
        "SELECT u.first_name, u.last_name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = $1",
        [orderId]
      );
      const customer = customerRes.rows[0];
      const customerEmail =
        customer?.email || verifyJson.data.customer?.email || null;
      const customerName = customer
        ? `${customer.first_name} ${customer.last_name}`
        : null;

      // Try update existing payment by order_id + provider_reference
      const updated = await pool.query(
        `UPDATE payments
         SET status = 'completed', amount = COALESCE($1, amount), currency = $2, method = 'paystack', provider = 'paystack',
             paystack_reference = $3, transaction_id = $4, authorization_code = $5, customer_email = COALESCE($6, customer_email), 
             notes = COALESCE($7, notes), updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $8 AND provider_reference = $9
         RETURNING id`,
        [
          amount || null,
          currency,
          reference,
          transactionId,
          authorizationCode,
          customerEmail,
          customerName,
          orderId,
          reference,
        ]
      );

      if (updated.rows.length === 0) {
        // No existing row — insert one
        await pool.query(
          `INSERT INTO payments (order_id, amount, currency, method, status, provider, provider_reference, paystack_reference, transaction_id, authorization_code, customer_email, notes, payment_history)
           VALUES ($1,$2,$3,'paystack','completed','paystack',$4,$5,$6,$7,$8,$9,$10)`,
          [
            orderId,
            amount,
            currency,
            reference,
            reference,
            transactionId,
            authorizationCode,
            customerEmail,
            customerName,
            JSON.stringify({
              transactions: [
                {
                  amount: amount,
                  method: "paystack",
                  timestamp: new Date().toISOString(),
                  notes: "Online payment",
                },
              ],
            }),
          ]
        );
      }
    }
    // If no order yet, try creating it from session as well (mirror webhook path)
    else {
      const sessionRes = await pool.query(
        `SELECT * FROM checkout_sessions WHERE payment_reference = $1 ORDER BY created_at DESC LIMIT 1`,
        [reference]
      );
      if (sessionRes.rows.length > 0 && verifyJson.data.status === "success") {
        const s = sessionRes.rows[0];
        const orderNum = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
          Math.random() * 1000
        )
          .toString()
          .padStart(3, "0")}`;
        const orderInsert = await pool.query(
          `INSERT INTO orders (
            user_id, order_number, payment_method, delivery_method,
            delivery_zone_id, pickup_location_id, delivery_address_id,
            delivery_address, subtotal, tax_amount, shipping_fee,
            large_order_fee, special_delivery_fee, total_amount,
            customer_notes, payment_status, payment_reference, amount_paid
          ) VALUES ($1,$2,'online',$3,$4,$5,$6,NULL,$7,$8,$9,$10,$11,$12,NULL,'paid',$13,$14)
          RETURNING id`,
          [
            s.user_id,
            orderNum,
            s.delivery_method,
            s.delivery_zone_id,
            s.pickup_location_id,
            s.delivery_address_id,
            s.subtotal,
            s.tax_amount,
            s.shipping_fee,
            s.large_order_fee,
            s.special_delivery_fee,
            s.total_amount,
            reference,
            s.total_amount, // amount_paid = total_amount for paid orders
          ]
        );
        const newOrderId = orderInsert.rows[0].id;

        // Create order items from user's cart with variant support
        const cartItemsRes = await pool.query(
          `SELECT 
            ci.*, 
            p.name as product_name, p.description as product_description,
            p.image_url as product_image_url, p.price as unit_price,
            p.discount_price, p.discount_percent, p.cost_price,
            p.requires_special_delivery,
            pv.id as variant_id, pv.sku as variant_sku,
            pv.size as variant_size, pv.color as variant_color,
            pv.image_url as variant_image_url, pv.stock_quantity as variant_stock
           FROM cart_items ci
           JOIN carts c ON ci.cart_id = c.id
           JOIN products p ON ci.product_id = p.id
           JOIN product_variants pv ON ci.variant_id = pv.id
           WHERE c.user_id = $1`,
          [s.user_id]
        );

        // Calculate effective pricing for cart items
        const cartItems = cartItemsRes.rows.map((item) => {
          const originalPrice = parseFloat(item.unit_price);
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
            ...item,
            effectivePrice: parseFloat(effectivePrice.toFixed(2)),
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            hasDiscount: hasDiscount,
          };
        });

        for (const item of cartItems) {
          // Use effective price if available, otherwise fall back to unit_price
          const itemPrice = item.effectivePrice || item.unit_price;

          await pool.query(
            `INSERT INTO order_items (
               order_id, product_id, variant_id, product_name, product_description,
               product_image_url, variant_sku, size, color, quantity, unit_price,
               subtotal, requires_special_delivery
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              newOrderId,
              item.product_id,
              item.variant_id,
              item.product_name,
              item.product_description,
              item.variant_image_url || item.product_image_url,
              item.variant_sku,
              item.variant_size,
              item.variant_color,
              item.quantity,
              itemPrice,
              itemPrice * item.quantity,
              item.requires_special_delivery,
            ]
          );

          // Update variant stock
          await pool.query(
            `UPDATE product_variants 
             SET stock_quantity = stock_quantity - $1 
             WHERE id = $2`,
            [item.quantity, item.variant_id]
          );

          // Note: Product stock is now managed through variants only
          // No need to update products.stock_quantity as it doesn't exist
        }

        // Clear cart
        await pool.query(
          `DELETE FROM cart_items USING carts WHERE cart_items.cart_id = carts.id AND carts.user_id = $1`,
          [s.user_id]
        );
        await pool.query(`DELETE FROM carts WHERE user_id = $1`, [s.user_id]);

        await pool.query(
          `UPDATE payments SET order_id = $1 WHERE provider_reference = $2 AND order_id IS NULL`,
          [newOrderId, reference]
        );
        await pool.query(
          `UPDATE checkout_sessions SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [s.id]
        );
      }
    }

    // Redirect back to frontend success/failure page
    const successUrl = process.env.PAYSTACK_SUCCESS_URL || "/";
    const failureUrl = process.env.PAYSTACK_FAILURE_URL || "/";
    const redirectTo =
      verifyJson.data.status === "success" ? successUrl : failureUrl;
    return res.redirect(302, redirectTo);
  } catch (e) {
    console.error("Error in Paystack callback:", e);
    return res.status(500).send("Server error");
  }
});

// POST /api/payments/paystack/verify - client-triggered verification fallback (use after inline success)
router.post("/paystack/verify", async (req, res) => {
  try {
    const { reference } = req.body || {};
    if (!reference || typeof reference !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "reference is required" });
    }
    console.log("[VERIFY] Start", { reference });

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return res
        .status(500)
        .json({ success: false, message: "Paystack key not configured" });
    }

    // Verify transaction
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      }
    );
    const verifyJson = await verifyRes.json();
    console.log("[VERIFY] Paystack response", {
      httpOk: verifyRes.ok,
      paystackStatus: verifyJson?.status,
      dataStatus: verifyJson?.data?.status,
      amount: verifyJson?.data?.amount,
      currency: verifyJson?.data?.currency,
      customer: verifyJson?.data?.customer?.email,
    });
    if (!verifyRes.ok || !verifyJson.status) {
      return res.status(502).json({
        success: false,
        message: "Verification failed",
        error: verifyJson,
      });
    }

    // Mirror callback logic to create/link order from session if needed
    const data = verifyJson.data;
    // Extract paid details for payment upsert in dev verify flow
    const paidAmount = Number(verifyJson.data.amount || 0) / 100;
    const paidCurrency = verifyJson.data.currency || "GHS";
    const paidTransactionId = verifyJson.data.id?.toString() || null;
    const paidAuthorizationCode =
      verifyJson.data.authorization?.authorization_code || null;
    let paidCustomerEmail = verifyJson.data.customer?.email || null;

    // Try resolve order by reference
    let orderId = null;
    const orderRes = await pool.query(
      `SELECT id FROM orders WHERE payment_reference = $1`,
      [reference]
    );
    if (orderRes.rows.length > 0) {
      orderId = orderRes.rows[0].id;
      console.log("[VERIFY] Found existing order", { orderId, reference });
    }

    if (orderId) {
      await pool.query(
        `UPDATE orders SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );
      // Ensure a completed payment row exists (dev verify path)
      await pool.query(
        `INSERT INTO payments (order_id, amount, currency, method, status, provider, provider_reference, paystack_reference, transaction_id, authorization_code, customer_email, payment_history)
         VALUES ($1,$2,$3,'paystack','completed','paystack',$4,$5,$6,$7,$8,$9)
         ON CONFLICT DO NOTHING`,
        [
          orderId,
          paidAmount,
          paidCurrency,
          reference,
          reference,
          paidTransactionId,
          paidAuthorizationCode,
          paidCustomerEmail,
          JSON.stringify({
            transactions: [
              {
                amount: paidAmount,
                method: "paystack",
                timestamp: new Date().toISOString(),
                notes: "Online payment",
              },
            ],
          }),
        ]
      );
      console.log("[VERIFY] Marked order paid", { orderId });
    } else {
      // No order yet: try session by reference
      let sessionRes = await pool.query(
        `SELECT * FROM checkout_sessions WHERE payment_reference = $1 ORDER BY created_at DESC LIMIT 1`,
        [reference]
      );
      if (sessionRes.rows.length === 0 && data?.metadata?.session_id) {
        sessionRes = await pool.query(
          `SELECT * FROM checkout_sessions WHERE id = $1 AND status = 'pending'`,
          [parseInt(data.metadata.session_id)]
        );
      }
      if (sessionRes.rows.length > 0 && data.status === "success") {
        const s = sessionRes.rows[0];
        // Build delivery_address JSON if delivery
        let deliveryAddressJson = null;
        if (s.delivery_method === "delivery" && s.delivery_address_id) {
          const addrRes = await pool.query(
            `SELECT ca.*, gr.name as region_name, gc.name as city_name
             FROM customer_addresses ca
             JOIN ghana_regions gr ON ca.region_id = gr.id
             JOIN ghana_cities gc ON ca.city_id = gc.id
             WHERE ca.id = $1`,
            [s.delivery_address_id]
          );
          if (addrRes.rows.length > 0) {
            const addr = addrRes.rows[0];
            deliveryAddressJson = {
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
        console.log("[VERIFY] Found session", {
          sessionId: s.id,
          userId: s.user_id,
        });
        const orderNum = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
          Math.random() * 1000
        )
          .toString()
          .padStart(3, "0")}`;
        const orderInsert = await pool.query(
          `INSERT INTO orders (
            user_id, order_number, payment_method, delivery_method,
            delivery_zone_id, pickup_location_id, delivery_address_id,
            delivery_address, subtotal, tax_amount, shipping_fee,
            large_order_fee, special_delivery_fee, total_amount,
            customer_notes, payment_status, payment_reference, amount_paid
          ) VALUES ($1,$2,'online',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NULL,'paid',$14,$15)
          RETURNING id`,
          [
            s.user_id,
            orderNum,
            s.delivery_method,
            s.delivery_zone_id,
            s.pickup_location_id,
            s.delivery_address_id,
            deliveryAddressJson ? JSON.stringify(deliveryAddressJson) : null,
            s.subtotal,
            s.tax_amount,
            s.shipping_fee,
            s.large_order_fee,
            s.special_delivery_fee,
            s.total_amount,
            reference,
            s.total_amount, // amount_paid = total_amount for paid orders
          ]
        );
        orderId = orderInsert.rows[0].id;
        console.log("[VERIFY] Created order", { orderId, userId: s.user_id });
        // Insert order items from user's cart with variant support
        const cartItemsRes = await pool.query(
          `SELECT 
            ci.*, 
            p.name as product_name, p.description as product_description,
            p.image_url as product_image_url, p.price as unit_price,
            p.discount_price, p.discount_percent, p.cost_price,
            p.requires_special_delivery,
            pv.id as variant_id, pv.sku as variant_sku,
            pv.size as variant_size, pv.color as variant_color,
            pv.image_url as variant_image_url, pv.stock_quantity as variant_stock
           FROM cart_items ci
           JOIN carts c ON ci.cart_id = c.id
           JOIN products p ON ci.product_id = p.id
           JOIN product_variants pv ON ci.variant_id = pv.id
           WHERE c.user_id = $1`,
          [s.user_id]
        );

        // Calculate effective pricing for cart items
        const cartItems = cartItemsRes.rows.map((item) => {
          const originalPrice = parseFloat(item.unit_price);
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
            ...item,
            effectivePrice: parseFloat(effectivePrice.toFixed(2)),
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            hasDiscount: hasDiscount,
          };
        });

        for (const item of cartItems) {
          // Use effective price if available, otherwise fall back to unit_price
          const itemPrice = item.effectivePrice || item.unit_price;

          await pool.query(
            `INSERT INTO order_items (
               order_id, product_id, variant_id, product_name, product_description,
               product_image_url, variant_sku, size, color, quantity, unit_price,
               subtotal, requires_special_delivery
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              orderId,
              item.product_id,
              item.variant_id,
              item.product_name,
              item.product_description,
              item.variant_image_url || item.product_image_url,
              item.variant_sku,
              item.variant_size,
              item.variant_color,
              item.quantity,
              itemPrice,
              itemPrice * item.quantity,
              item.requires_special_delivery,
            ]
          );

          // Update variant stock
          await pool.query(
            `UPDATE product_variants 
             SET stock_quantity = stock_quantity - $1 
             WHERE id = $2`,
            [item.quantity, item.variant_id]
          );

          // Note: Product stock is now managed through variants only
          // No need to update products.stock_quantity as it doesn't exist
        }
        // Upsert completed payment row for the order
        if (!paidCustomerEmail) {
          const u = await pool.query(`SELECT email FROM users WHERE id = $1`, [
            s.user_id,
          ]);
          if (u.rows.length > 0) paidCustomerEmail = u.rows[0].email;
        }
        await pool.query(
          `INSERT INTO payments (order_id, amount, currency, method, status, provider, provider_reference, paystack_reference, transaction_id, authorization_code, customer_email, payment_history)
           VALUES ($1,$2,$3,'paystack','completed','paystack',$4,$5,$6,$7,$8,$9)
           ON CONFLICT DO NOTHING`,
          [
            orderId,
            paidAmount,
            paidCurrency,
            reference,
            reference,
            paidTransactionId,
            paidAuthorizationCode,
            paidCustomerEmail,
            JSON.stringify({
              transactions: [
                {
                  amount: paidAmount,
                  method: "paystack",
                  timestamp: new Date().toISOString(),
                  notes: "Online payment",
                },
              ],
            }),
          ]
        );
        // Clear cart
        await pool.query(
          `DELETE FROM cart_items USING carts WHERE cart_items.cart_id = carts.id AND carts.user_id = $1`,
          [s.user_id]
        );
        await pool.query(`DELETE FROM carts WHERE user_id = $1`, [s.user_id]);
        await pool.query(
          `UPDATE payments SET order_id = $1 WHERE provider_reference = $2 AND order_id IS NULL`,
          [orderId, reference]
        );
        console.log("[VERIFY] Linked any existing payment to order", {
          orderId,
          reference,
        });
        await pool.query(
          `UPDATE checkout_sessions SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [s.id]
        );
        console.log("[VERIFY] Marked session paid", { sessionId: s.id });

        // Send admin notification email (don't wait for it to complete)
        console.log(
          `📧 [EMAIL-TRIGGER] Payment verified (cart flow), order created: ${orderId}, triggering admin notification...`
        );
        emailService.sendNewOrderNotification(orderId).catch((error) => {
          console.error(
            "❌ [EMAIL] Admin notification failed for order:",
            orderId,
            error
          );
        });

        // Send customer order confirmation email (don't wait for it to complete)
        console.log(
          `📧 [EMAIL-TRIGGER] Payment verified (cart flow), order created: ${orderId}, sending customer confirmation...`
        );
        emailService.sendOrderStatusEmail(orderId, "pending").catch((error) => {
          console.error(
            "❌ [EMAIL] Customer confirmation failed for order:",
            orderId,
            error
          );
        });
      }
    }

    console.log("[VERIFY] Done", { reference, orderId });
    return res.json({
      success: true,
      message: "Verification processed",
      orderId: orderId ? orderId.toString() : null,
    });
  } catch (e) {
    console.error("[VERIFY] Error", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// PATCH /api/payments/:id/add-payment - Add partial payment amount (admin only)
router.patch(
  "/:id/add-payment",
  adminAuth,
  [
    body("amount").isFloat({ min: 0.01 }),
    body("method").isIn(["cash", "bank_transfer", "check", "paystack"]),
    body("notes").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });
      }

      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: "Invalid payment ID" });
      }

      const { amount, method, notes } = req.body;

      // Get current payment record
      const paymentRes = await pool.query(
        `SELECT * FROM payments WHERE id = $1`,
        [paymentId]
      );
      if (paymentRes.rows.length === 0) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const payment = paymentRes.rows[0];

      // Get current payment history to calculate total paid
      const currentHistory = payment.payment_history?.transactions || [];
      const totalPaid = currentHistory.reduce(
        (sum, txn) => sum + Number(txn.amount || 0),
        0
      );
      const newTotalPaid = totalPaid + Number(amount);

      // Create new transaction record
      const newTransaction = {
        amount: Number(amount),
        method: method,
        timestamp: new Date().toISOString(),
        notes: notes || null,
      };

      // Update payment record with new transaction history (amount stays the same - total due)
      const updatedHistory = {
        transactions: [...currentHistory, newTransaction],
      };

      const updatedPayment = await pool.query(
        `UPDATE payments 
         SET payment_history = $1::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(updatedHistory), paymentId]
      );

      // Recalculate payment status for linked booking or order
      if (payment.booking_id) {
        await recalcBookingPaymentStatus(payment.booking_id);
      }
      if (payment.order_id) {
        await recalcOrderPaymentStatus(payment.order_id);
      }

      return res.json({
        success: true,
        message: "Payment added successfully",
        payment: updatedPayment.rows[0],
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      return res.status(500).json({
        message: "Server error while adding payment",
        error: error.message,
      });
    }
  }
);

// GET /api/payments - List all payments with history (admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         p.id, p.booking_id, p.order_id, p.amount, p.currency, p.status, p.method, p.provider, 
         p.payment_history, p.created_at, p.updated_at,
         b.event_title as booking_title, b.name as booking_customer,
         o.order_number, u.email as order_customer
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN orders o ON p.order_id = o.id
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY p.created_at DESC`
    );
    return res.json({ payments: result.rows });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({
      message: "Server error while fetching payments",
      error: error.message,
    });
  }
});

// PATCH /api/payments/:id/status (admin) — persist status changes and update booking
router.patch(
  "/:id/status",
  adminAuth,
  [
    body("status").isIn([
      "pending",
      "partial",
      "completed",
      "failed",
      "refunded",
      "cancelled",
    ]),
  ],
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ message: "Invalid payment ID" });
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });

      const { status } = req.body;

      // Update payment
      const updated = await pool.query(
        `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, booking_id, order_id, status`,
        [status, id]
      );
      if (updated.rows.length === 0)
        return res.status(404).json({ message: "Payment not found" });

      const payment = updated.rows[0];
      if (payment.booking_id) {
        await recalcBookingPaymentStatus(payment.booking_id);
      }
      if (payment.order_id) {
        await recalcOrderPaymentStatus(payment.order_id);
        // If payment is completed, optionally advance order status to 'completed'
        if (status === "completed") {
          await pool.query(
            `UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status NOT IN ('completed','cancelled','refunded')`,
            [payment.order_id]
          );
        }
      }

      return res.json({ payment });
    } catch (error) {
      console.error("Error updating payment status:", error);
      return res.status(500).json({
        message: "Server error while updating payment status",
        error: error.message,
      });
    }
  }
);

// Helper: recalc a booking's payment_status based on payment history transactions vs booking price
async function recalcBookingPaymentStatus(bookingId) {
  try {
    const bookingRes = await pool.query(
      `SELECT price FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (bookingRes.rows.length === 0) return;
    const total = Number(bookingRes.rows[0].price || 0);

    // Get all payments for this booking and calculate total paid from payment_history
    const paymentsRes = await pool.query(
      `SELECT payment_history FROM payments WHERE booking_id = $1`,
      [bookingId]
    );

    let totalPaid = 0;
    for (const payment of paymentsRes.rows) {
      if (payment.payment_history?.transactions) {
        const paymentTotal = payment.payment_history.transactions.reduce(
          (sum, txn) => {
            return sum + Number(txn.amount || 0);
          },
          0
        );
        totalPaid += paymentTotal;
      }
    }

    let newStatus = "pending";
    if (totalPaid > 0 && totalPaid < total && total > 0) {
      newStatus = "partial";
    } else if (totalPaid >= total && total > 0) {
      newStatus = "paid";
    }

    await pool.query(
      `UPDATE bookings SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, bookingId]
    );
  } catch (e) {
    console.error("Error recalculating booking payment status:", e);
  }
}

// Helper: recalc an order's payment_status based on payment history transactions vs order total_amount
async function recalcOrderPaymentStatus(orderId) {
  try {
    const orderRes = await pool.query(
      `SELECT total_amount FROM orders WHERE id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0) return;
    const total = Number(orderRes.rows[0].total_amount || 0);

    // Get all payments for this order and calculate total paid from payment_history
    const paymentsRes = await pool.query(
      `SELECT payment_history FROM payments WHERE order_id = $1`,
      [orderId]
    );

    let totalPaid = 0;
    for (const payment of paymentsRes.rows) {
      if (payment.payment_history?.transactions) {
        const paymentTotal = payment.payment_history.transactions.reduce(
          (sum, txn) => {
            return sum + Number(txn.amount || 0);
          },
          0
        );
        totalPaid += paymentTotal;
      }
    }

    let newStatus = "pending";
    if (totalPaid > 0 && totalPaid < total && total > 0) {
      newStatus = "partial";
    } else if (totalPaid >= total && total > 0) {
      newStatus = "paid";
    }

    await pool.query(
      `UPDATE orders SET payment_status = $1, amount_paid = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [newStatus, totalPaid, orderId]
    );
  } catch (e) {
    console.error("Error recalculating order payment status:", e);
  }
}

module.exports = router;
