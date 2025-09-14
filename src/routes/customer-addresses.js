const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const { auth: authenticateUser } = require("../middleware/auth");
const { generateCustomerMapsLink } = require("../utils/maps");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /api/customer-addresses - Get user's addresses
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        ca.id,
        ca.region_id,
        ca.city_id,
        ca.area_name,
        ca.landmark,
        ca.additional_instructions,
        ca.contact_phone,
        ca.is_default,
        ca.google_maps_link,
        ca.created_at,
        ca.updated_at,
        gr.name as region_name,
        gc.name as city_name
      FROM customer_addresses ca
      JOIN ghana_regions gr ON ca.region_id = gr.id
      JOIN ghana_cities gc ON ca.city_id = gc.id
      WHERE ca.customer_id = $1
      ORDER BY ca.is_default DESC, ca.created_at DESC
    `,
      [userId]
    );

    const addresses = result.rows.map((row) => ({
      id: row.id.toString(),
      regionId: row.region_id.toString(),
      regionName: row.region_name,
      cityId: row.city_id.toString(),
      cityName: row.city_name,
      areaName: row.area_name,
      landmark: row.landmark,
      additionalInstructions: row.additional_instructions,
      contactPhone: row.contact_phone,
      isDefault: row.is_default,
      googleMapsLink: row.google_maps_link,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    }));

    res.json({
      success: true,
      message: "Addresses retrieved successfully",
      count: addresses.length,
      addresses: addresses,
    });
  } catch (error) {
    console.error("Error fetching customer addresses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
      error: error.message,
    });
  }
});

// GET /api/customer-addresses/:id - Get single address
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        ca.id,
        ca.region_id,
        ca.city_id,
        ca.area_name,
        ca.landmark,
        ca.additional_instructions,
        ca.contact_phone,
        ca.is_default,
        ca.google_maps_link,
        ca.created_at,
        ca.updated_at,
        gr.name as region_name,
        gc.name as city_name
      FROM customer_addresses ca
      JOIN ghana_regions gr ON ca.region_id = gr.id
      JOIN ghana_cities gc ON ca.city_id = gc.id
      WHERE ca.id = $1 AND ca.customer_id = $2
    `,
      [addressId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const address = result.rows[0];
    const addressData = {
      id: address.id.toString(),
      regionId: address.region_id.toString(),
      regionName: address.region_name,
      cityId: address.city_id.toString(),
      cityName: address.city_name,
      areaName: address.area_name,
      landmark: address.landmark,
      additionalInstructions: address.additional_instructions,
      contactPhone: address.contact_phone,
      isDefault: address.is_default,
      googleMapsLink: address.google_maps_link,
      createdAt: address.created_at.toISOString(),
      updatedAt: address.updated_at ? address.updated_at.toISOString() : null,
    };

    res.json({
      success: true,
      message: "Address retrieved successfully",
      address: addressData,
    });
  } catch (error) {
    console.error("Error fetching customer address:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch address",
      error: error.message,
    });
  }
});

// POST /api/customer-addresses - Create new address
router.post(
  "/",
  authenticateUser,
  [
    body("regionId").isInt({ min: 1 }),
    body("cityId").isInt({ min: 1 }),
    body("areaName").notEmpty().trim().isLength({ min: 1, max: 100 }),
    body("landmark").optional().trim().isLength({ max: 255 }),
    body("additionalInstructions").optional().trim(),
    body("contactPhone").optional().trim().isLength({ max: 30 }),
    body("isDefault").optional().isBoolean(),
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
        regionId,
        cityId,
        areaName,
        landmark,
        additionalInstructions,
        contactPhone,
        isDefault = false,
      } = req.body;

      // Get region and city names for Google Maps link generation
      const regionResult = await pool.query(
        "SELECT name FROM ghana_regions WHERE id = $1",
        [regionId]
      );
      const cityResult = await pool.query(
        "SELECT name FROM ghana_cities WHERE id = $1",
        [cityId]
      );

      if (regionResult.rows.length === 0 || cityResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid region or city ID",
        });
      }

      // If this is being set as default, unset other defaults
      if (isDefault) {
        await pool.query(
          "UPDATE customer_addresses SET is_default = false WHERE customer_id = $1",
          [userId]
        );
      }

      // Generate Google Maps link
      const mapsLink = generateCustomerMapsLink({
        regionName: regionResult.rows[0].name,
        cityName: cityResult.rows[0].name,
        areaName,
        landmark,
        additionalInstructions,
      });

      // Create address
      const result = await pool.query(
        `INSERT INTO customer_addresses (
          customer_id, region_id, city_id, area_name, landmark,
          additional_instructions, contact_phone, is_default, google_maps_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, area_name, landmark, additional_instructions, contact_phone,
                  is_default, google_maps_link, created_at`,
        [
          userId,
          regionId,
          cityId,
          areaName,
          landmark,
          additionalInstructions,
          contactPhone,
          isDefault,
          mapsLink,
        ]
      );

      const address = result.rows[0];
      const addressData = {
        id: address.id.toString(),
        regionId: regionId.toString(),
        regionName: regionResult.rows[0].name,
        cityId: cityId.toString(),
        cityName: cityResult.rows[0].name,
        areaName: address.area_name,
        landmark: address.landmark,
        additionalInstructions: address.additional_instructions,
        contactPhone: address.contact_phone,
        isDefault: address.is_default,
        googleMapsLink: address.google_maps_link,
        createdAt: address.created_at.toISOString(),
      };

      res.status(201).json({
        success: true,
        message: "Address created successfully",
        address: addressData,
      });
    } catch (error) {
      console.error("Error creating customer address:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create address",
        error: error.message,
      });
    }
  }
);

// PUT /api/customer-addresses/:id - Update address
router.put(
  "/:id",
  authenticateUser,
  [
    body("regionId").optional().isInt({ min: 1 }),
    body("cityId").optional().isInt({ min: 1 }),
    body("areaName").optional().trim().isLength({ min: 1, max: 100 }),
    body("landmark").optional().trim().isLength({ max: 255 }),
    body("additionalInstructions").optional().trim(),
    body("contactPhone").optional().trim().isLength({ max: 30 }),
    body("isDefault").optional().isBoolean(),
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

      const addressId = parseInt(req.params.id);
      const userId = req.user.id;

      if (isNaN(addressId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid address ID. Must be a number.",
        });
      }

      // Check if address exists and belongs to user
      const existingAddress = await pool.query(
        "SELECT * FROM customer_addresses WHERE id = $1 AND customer_id = $2",
        [addressId, userId]
      );

      if (existingAddress.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }

      const {
        regionId,
        cityId,
        areaName,
        landmark,
        additionalInstructions,
        contactPhone,
        isDefault,
      } = req.body;

      // If this is being set as default, unset other defaults
      if (isDefault) {
        await pool.query(
          "UPDATE customer_addresses SET is_default = false WHERE customer_id = $1 AND id != $2",
          [userId, addressId]
        );
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (regionId !== undefined) {
        updateFields.push(`region_id = $${paramCount++}`);
        updateValues.push(regionId);
      }
      if (cityId !== undefined) {
        updateFields.push(`city_id = $${paramCount++}`);
        updateValues.push(cityId);
      }
      if (areaName !== undefined) {
        updateFields.push(`area_name = $${paramCount++}`);
        updateValues.push(areaName);
      }
      if (landmark !== undefined) {
        updateFields.push(`landmark = $${paramCount++}`);
        updateValues.push(landmark);
      }
      if (additionalInstructions !== undefined) {
        updateFields.push(`additional_instructions = $${paramCount++}`);
        updateValues.push(additionalInstructions);
      }
      if (contactPhone !== undefined) {
        updateFields.push(`contact_phone = $${paramCount++}`);
        updateValues.push(contactPhone);
      }
      if (isDefault !== undefined) {
        updateFields.push(`is_default = $${paramCount++}`);
        updateValues.push(isDefault);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields provided for update",
        });
      }

      // If location details changed, regenerate Google Maps link
      if (
        regionId !== undefined ||
        cityId !== undefined ||
        areaName !== undefined ||
        landmark !== undefined ||
        additionalInstructions !== undefined
      ) {
        const finalRegionId = regionId || existingAddress.rows[0].region_id;
        const finalCityId = cityId || existingAddress.rows[0].city_id;
        const finalAreaName = areaName || existingAddress.rows[0].area_name;
        const finalLandmark =
          landmark !== undefined ? landmark : existingAddress.rows[0].landmark;
        const finalAdditionalInstructions =
          additionalInstructions !== undefined
            ? additionalInstructions
            : existingAddress.rows[0].additional_instructions;

        // Get region and city names
        const regionResult = await pool.query(
          "SELECT name FROM ghana_regions WHERE id = $1",
          [finalRegionId]
        );
        const cityResult = await pool.query(
          "SELECT name FROM ghana_cities WHERE id = $1",
          [finalCityId]
        );

        if (regionResult.rows.length === 0 || cityResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid region or city ID",
          });
        }

        // Generate new Google Maps link
        const mapsLink = generateCustomerMapsLink({
          regionName: regionResult.rows[0].name,
          cityName: cityResult.rows[0].name,
          areaName: finalAreaName,
          landmark: finalLandmark,
          additionalInstructions: finalAdditionalInstructions,
        });

        updateFields.push(`google_maps_link = $${paramCount++}`);
        updateValues.push(mapsLink);
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(addressId);

      const updateQuery = `
        UPDATE customer_addresses
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING id, region_id, city_id, area_name, landmark, additional_instructions,
                  contact_phone, is_default, google_maps_link, created_at, updated_at
      `;

      const result = await pool.query(updateQuery, updateValues);
      const address = result.rows[0];

      // Get region and city names for response
      const regionResult = await pool.query(
        "SELECT name FROM ghana_regions WHERE id = $1",
        [address.region_id]
      );
      const cityResult = await pool.query(
        "SELECT name FROM ghana_cities WHERE id = $1",
        [address.city_id]
      );

      const addressData = {
        id: address.id.toString(),
        regionId: address.region_id.toString(),
        regionName: regionResult.rows[0].name,
        cityId: address.city_id.toString(),
        cityName: cityResult.rows[0].name,
        areaName: address.area_name,
        landmark: address.landmark,
        additionalInstructions: address.additional_instructions,
        contactPhone: address.contact_phone,
        isDefault: address.is_default,
        googleMapsLink: address.google_maps_link,
        createdAt: address.created_at.toISOString(),
        updatedAt: address.updated_at.toISOString(),
      };

      res.json({
        success: true,
        message: "Address updated successfully",
        address: addressData,
      });
    } catch (error) {
      console.error("Error updating customer address:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update address",
        error: error.message,
      });
    }
  }
);

// DELETE /api/customer-addresses/:id - Delete address
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID. Must be a number.",
      });
    }

    // Check if address exists and belongs to user
    const existingAddress = await pool.query(
      "SELECT id, area_name FROM customer_addresses WHERE id = $1 AND customer_id = $2",
      [addressId, userId]
    );

    if (existingAddress.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Delete address
    await pool.query("DELETE FROM customer_addresses WHERE id = $1", [
      addressId,
    ]);

    res.json({
      success: true,
      message: "Address deleted successfully",
      address: {
        id: addressId.toString(),
        areaName: existingAddress.rows[0].area_name,
      },
    });
  } catch (error) {
    console.error("Error deleting customer address:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
      error: error.message,
    });
  }
});

// PUT /api/customer-addresses/:id/set-default - Set address as default
router.put("/:id/set-default", authenticateUser, async (req, res) => {
  try {
    const addressId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID. Must be a number.",
      });
    }

    // Check if address exists and belongs to user
    const existingAddress = await pool.query(
      "SELECT id FROM customer_addresses WHERE id = $1 AND customer_id = $2",
      [addressId, userId]
    );

    if (existingAddress.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Unset all other defaults
    await pool.query(
      "UPDATE customer_addresses SET is_default = false WHERE customer_id = $1",
      [userId]
    );

    // Set this address as default
    await pool.query(
      "UPDATE customer_addresses SET is_default = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [addressId]
    );

    res.json({
      success: true,
      message: "Address set as default successfully",
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set default address",
      error: error.message,
    });
  }
});

module.exports = router;
