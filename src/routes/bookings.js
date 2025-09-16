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

// GET all bookings (admin only)
router.get("/", adminAuth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         b.id, b.name, b.email, b.phone, b.event_title, b.event_type, b.date, b.time, b.duration, b.location, b.price, b.status, b.payment_status, b.notes, b.created_at,
         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id AND p.status = 'completed'), 0)::decimal AS paid_total
       FROM bookings b
       ORDER BY b.created_at DESC`
    );
    return res.json({ bookings: result.rows });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({
      message: "Server error while fetching bookings",
      error: error.message,
    });
  }
});

// POST create booking (admin only)
router.post(
  "/",
  adminAuth,
  [
    body("name").notEmpty().trim(),
    body("email").isEmail().normalizeEmail(),
    body("eventTitle").notEmpty().trim(),
    body("date").notEmpty().isISO8601(),
    body("price").isFloat({ min: 0 }),
    body("eventType").optional().isString(),
    body("time").optional().isString(),
    body("duration").optional().isInt({ min: 0 }),
    body("location").optional().isString(),
    body("phone").optional().isString(),
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

      const {
        name,
        email,
        phone,
        eventTitle,
        eventType,
        date,
        time,
        duration,
        location,
        price,
        notes,
      } = req.body;

      const insert = await pool.query(
        `INSERT INTO bookings (name, email, phone, event_title, event_type, date, time, duration, location, price, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id, name, email, phone, event_title, event_type, date, time, duration, location, price, status, payment_status, notes, created_at`,
        [
          name,
          email,
          phone,
          eventTitle,
          eventType,
          date,
          time,
          duration,
          location,
          price,
          notes,
        ]
      );

      const booking = insert.rows[0];

      // Create a pending payment record for the booking
      await pool.query(
        `INSERT INTO payments (
          booking_id, order_id, amount, currency, status, method, provider, customer_email, notes, payment_history
        ) VALUES ($1, NULL, $2, 'GHS', 'pending', 'cash', 'manual', $3, $4, '{"transactions": []}'::jsonb)`,
        [booking.id, price, email, name]
      );

      return res.status(201).json({ booking });
    } catch (error) {
      console.error("Error creating booking:", error);
      return res.status(500).json({
        message: "Server error while creating booking",
        error: error.message,
      });
    }
  }
);

// PATCH status (admin only)
router.patch(
  "/:id/status",
  adminAuth,
  [body("status").isIn(["pending", "confirmed", "cancelled", "completed"])],
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ message: "Invalid booking ID" });

      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res
          .status(400)
          .json({ message: "Validation failed", errors: errors.array() });

      const { status } = req.body;
      const updated = await pool.query(
        `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status`,
        [status, id]
      );
      if (updated.rows.length === 0)
        return res.status(404).json({ message: "Booking not found" });
      return res.json({ booking: updated.rows[0] });
    } catch (error) {
      console.error("Error updating booking status:", error);
      return res.status(500).json({
        message: "Server error while updating booking status",
        error: error.message,
      });
    }
  }
);

// DELETE booking (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ message: "Invalid booking ID" });
    const deleted = await pool.query(
      `DELETE FROM bookings WHERE id = $1 RETURNING id`,
      [id]
    );
    if (deleted.rows.length === 0)
      return res.status(404).json({ message: "Booking not found" });
    return res.json({ message: "Booking deleted", booking: deleted.rows[0] });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res.status(500).json({
      message: "Server error while deleting booking",
      error: error.message,
    });
  }
});

module.exports = router;
