const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const { adminAuth } = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// GET /api/admin/settings - Get current app settings
router.get("/", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM app_settings WHERE id = 1"
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    const settings = result.rows[0];
    const settingsData = {
      id: settings.id,
      taxRate: parseFloat(settings.tax_rate),
      freeShippingThreshold: parseFloat(settings.free_shipping_threshold),
      largeOrderQuantityThreshold: settings.large_order_quantity_threshold,
      largeOrderDeliveryFee: parseFloat(settings.large_order_delivery_fee),
      pickupAddress: settings.pickup_address,
      currencySymbol: settings.currency_symbol,
      currencyCode: settings.currency_code,
      updatedAt: settings.updated_at.toISOString(),
    };

    res.json({
      success: true,
      message: "Settings retrieved successfully",
      settings: settingsData,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching settings",
      error: error.message,
    });
  }
});

// PUT /api/admin/settings - Update app settings
router.put(
  "/",
  adminAuth,
  body("taxRate").optional().isFloat({ min: 0, max: 100 }),
  body("freeShippingThreshold").optional().isFloat({ min: 0 }),
  body("largeOrderQuantityThreshold").optional().isInt({ min: 1 }),
  body("largeOrderDeliveryFee").optional().isFloat({ min: 0 }),
  body("pickupAddress").optional().trim(),
  body("currencySymbol").optional().trim().isLength({ min: 1, max: 5 }),
  body("currencyCode").optional().trim().isLength({ min: 3, max: 3 }),
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

      const {
        taxRate,
        freeShippingThreshold,
        largeOrderQuantityThreshold,
        largeOrderDeliveryFee,
        pickupAddress,
        currencySymbol,
        currencyCode,
      } = req.body;

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (taxRate !== undefined) {
        updateFields.push(`tax_rate = $${paramCount++}`);
        updateValues.push(taxRate);
      }
      if (freeShippingThreshold !== undefined) {
        updateFields.push(`free_shipping_threshold = $${paramCount++}`);
        updateValues.push(freeShippingThreshold);
      }
      if (largeOrderQuantityThreshold !== undefined) {
        updateFields.push(`large_order_quantity_threshold = $${paramCount++}`);
        updateValues.push(largeOrderQuantityThreshold);
      }
      if (largeOrderDeliveryFee !== undefined) {
        updateFields.push(`large_order_delivery_fee = $${paramCount++}`);
        updateValues.push(largeOrderDeliveryFee);
      }
      if (pickupAddress !== undefined) {
        updateFields.push(`pickup_address = $${paramCount++}`);
        updateValues.push(pickupAddress);
      }
      if (currencySymbol !== undefined) {
        updateFields.push(`currency_symbol = $${paramCount++}`);
        updateValues.push(currencySymbol);
      }
      if (currencyCode !== undefined) {
        updateFields.push(`currency_code = $${paramCount++}`);
        updateValues.push(currencyCode);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields provided for update",
        });
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(1); // Always update the single row with id = 1

      const updateQuery = `
        UPDATE app_settings
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);
      const settings = result.rows[0];

      const settingsData = {
        id: settings.id,
        taxRate: parseFloat(settings.tax_rate),
        freeShippingThreshold: parseFloat(settings.free_shipping_threshold),
        largeOrderQuantityThreshold: settings.large_order_quantity_threshold,
        largeOrderDeliveryFee: parseFloat(settings.large_order_delivery_fee),
        pickupAddress: settings.pickup_address,
        currencySymbol: settings.currency_symbol,
        currencyCode: settings.currency_code,
        updatedAt: settings.updated_at.toISOString(),
      };

      res.json({
        success: true,
        message: "Settings updated successfully",
        settings: settingsData,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating settings",
        error: error.message,
      });
    }
  }
);

module.exports = router;
