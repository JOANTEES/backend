const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const { adminAuth } = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /api/payments (admin only)
router.get("/", adminAuth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.booking_id, p.amount, p.currency, p.method, p.status, p.provider, p.provider_reference, p.paystack_reference, p.transaction_id, p.authorization_code, p.customer_email, p.metadata, p.notes, p.created_at,
              b.event_title, b.email AS booking_email
       FROM payments p
       LEFT JOIN bookings b ON b.id = p.booking_id
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

// POST /api/payments (admin only) - record a payment (for offline or after webhook)
router.post(
  "/",
  adminAuth,
  [
    body("booking_id").isInt({ min: 1 }),
    body("amount").isFloat({ min: 0.01 }),
    body("currency").optional().isString(),
    body("status")
      .optional()
      .isIn(["pending", "completed", "failed", "refunded"]),
    body("method").optional().isIn(["cash", "bank_transfer", "check"]),
    body("notes").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });

      const {
        booking_id,
        amount,
        currency = "GHS",
        status = "pending",
        method = "cash",
        notes,
      } = req.body;
      const insert = await pool.query(
        `INSERT INTO payments (booking_id, amount, currency, status, method, provider, created_at)
         VALUES ($1,$2,$3,$4,$5,'paystack', CURRENT_TIMESTAMP)
         RETURNING id, booking_id, amount, currency, method, status, provider, created_at`,
        [booking_id, amount, currency, status, method]
      );
      const payment = insert.rows[0];

      // Recalculate linked booking payment status, if any
      if (payment.booking_id) {
        await recalcBookingPaymentStatus(payment.booking_id);
      }

      return res.status(201).json({ payment });
    } catch (error) {
      console.error("Error creating payment:", error);
      return res.status(500).json({
        message: "Server error while creating payment",
        error: error.message,
      });
    }
  }
);

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

        await pool.query(
          `INSERT INTO payments (booking_id, amount, currency, method, status, provider, provider_reference, paystack_reference, transaction_id, authorization_code, customer_email, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT DO NOTHING`,
          [
            bookingId,
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
            data.metadata || null,
          ]
        );

        if (bookingId) {
          await recalcBookingPaymentStatus(bookingId);
        }
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error("Error handling Paystack webhook:", error);
      return res.sendStatus(500);
    }
  }
);

module.exports = router;

// PATCH /api/payments/:id/status (admin) — persist status changes and update booking
router.patch(
  "/:id/status",
  adminAuth,
  [
    body("status").isIn([
      "pending",
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
        `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, booking_id, status`,
        [status, id]
      );
      if (updated.rows.length === 0)
        return res.status(404).json({ message: "Payment not found" });

      const payment = updated.rows[0];
      if (payment.booking_id) {
        await recalcBookingPaymentStatus(payment.booking_id);
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

// Helper: recalc a booking's payment_status based on sum of completed payments vs booking price
async function recalcBookingPaymentStatus(bookingId) {
  try {
    const bookingRes = await pool.query(
      `SELECT price FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (bookingRes.rows.length === 0) return;
    const price = Number(bookingRes.rows[0].price || 0);

    const sumRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::decimal AS paid FROM payments WHERE booking_id = $1 AND status = 'completed'`,
      [bookingId]
    );
    const paid = Number(sumRes.rows[0].paid || 0);

    let newStatus = "pending";
    if (paid <= 0) newStatus = "pending";
    else if (paid > 0 && paid < price) newStatus = "partial";
    else if (paid >= price) newStatus = "paid";

    await pool.query(
      `UPDATE bookings SET payment_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, bookingId]
    );
  } catch (e) {
    console.error("Error recalculating booking payment status:", e);
  }
}
