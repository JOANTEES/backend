const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const { adminAuth } = require("../middleware/auth");
const { generatePickupMapsLink } = require("../utils/maps");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /api/pickup-locations - Get all active pickup locations (public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pl.id,
        pl.name,
        pl.description,
        pl.area_name,
        pl.landmark,
        pl.additional_instructions,
        pl.contact_phone,
        pl.contact_email,
        pl.operating_hours,
        pl.google_maps_link,
        pl.created_at,
        gr.name as region_name,
        gc.name as city_name
      FROM pickup_locations pl
      JOIN ghana_regions gr ON pl.region_id = gr.id
      JOIN ghana_cities gc ON pl.city_id = gc.id
      WHERE pl.is_active = true
      ORDER BY gr.name, gc.name, pl.name
    `);

    const locations = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      regionName: row.region_name,
      cityName: row.city_name,
      areaName: row.area_name,
      landmark: row.landmark,
      additionalInstructions: row.additional_instructions,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      operatingHours: row.operating_hours,
      googleMapsLink: row.google_maps_link,
      createdAt: row.created_at.toISOString(),
    }));

    res.json({
      success: true,
      message: "Pickup locations retrieved successfully",
      count: locations.length,
      locations: locations,
    });
  } catch (error) {
    console.error("Error fetching pickup locations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pickup locations",
      error: error.message,
    });
  }
});

// GET /api/pickup-locations/:id - Get single pickup location (public)
router.get("/:id", async (req, res) => {
  try {
    const locationId = parseInt(req.params.id);

    if (isNaN(locationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup location ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        pl.id,
        pl.name,
        pl.description,
        pl.area_name,
        pl.landmark,
        pl.additional_instructions,
        pl.contact_phone,
        pl.contact_email,
        pl.operating_hours,
        pl.google_maps_link,
        pl.created_at,
        gr.name as region_name,
        gc.name as city_name
      FROM pickup_locations pl
      JOIN ghana_regions gr ON pl.region_id = gr.id
      JOIN ghana_cities gc ON pl.city_id = gc.id
      WHERE pl.id = $1 AND pl.is_active = true
    `,
      [locationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pickup location not found",
      });
    }

    const location = result.rows[0];
    const locationData = {
      id: location.id.toString(),
      name: location.name,
      description: location.description,
      regionName: location.region_name,
      cityName: location.city_name,
      areaName: location.area_name,
      landmark: location.landmark,
      additionalInstructions: location.additional_instructions,
      contactPhone: location.contact_phone,
      contactEmail: location.contact_email,
      operatingHours: location.operating_hours,
      googleMapsLink: location.google_maps_link,
      createdAt: location.created_at.toISOString(),
    };

    res.json({
      success: true,
      message: "Pickup location retrieved successfully",
      location: locationData,
    });
  } catch (error) {
    console.error("Error fetching pickup location:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pickup location",
      error: error.message,
    });
  }
});

// POST /api/pickup-locations - Create pickup location (admin only)
router.post(
  "/",
  adminAuth,
  [
    body("name").notEmpty().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("regionId").isInt({ min: 1 }),
    body("cityId").isInt({ min: 1 }),
    body("areaName").notEmpty().trim().isLength({ min: 1, max: 100 }),
    body("landmark").optional().trim().isLength({ max: 255 }),
    body("additionalInstructions").optional().trim(),
    body("contactPhone").optional().trim().isLength({ max: 30 }),
    body("contactEmail").optional().isEmail(),
    body("operatingHours").optional().isObject(),
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

      const {
        name,
        description,
        regionId,
        cityId,
        areaName,
        landmark,
        additionalInstructions,
        contactPhone,
        contactEmail,
        operatingHours,
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

      // Generate Google Maps link
      const mapsLink = generatePickupMapsLink({
        regionName: regionResult.rows[0].name,
        cityName: cityResult.rows[0].name,
        areaName,
        landmark,
        additionalInstructions,
      });

      // Create pickup location
      const result = await pool.query(
        `INSERT INTO pickup_locations (
          name, description, region_id, city_id, area_name, landmark,
          additional_instructions, contact_phone, contact_email, operating_hours, google_maps_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, description, area_name, landmark, additional_instructions,
                  contact_phone, contact_email, operating_hours, google_maps_link, is_active, created_at`,
        [
          name,
          description,
          regionId,
          cityId,
          areaName,
          landmark,
          additionalInstructions,
          contactPhone,
          contactEmail,
          operatingHours ? JSON.stringify(operatingHours) : null,
          mapsLink,
        ]
      );

      const location = result.rows[0];
      const locationData = {
        id: location.id.toString(),
        name: location.name,
        description: location.description,
        regionId: regionId.toString(),
        regionName: regionResult.rows[0].name,
        cityId: cityId.toString(),
        cityName: cityResult.rows[0].name,
        areaName: location.area_name,
        landmark: location.landmark,
        additionalInstructions: location.additional_instructions,
        contactPhone: location.contact_phone,
        contactEmail: location.contact_email,
        operatingHours: location.operating_hours,
        googleMapsLink: location.google_maps_link,
        isActive: location.is_active,
        createdAt: location.created_at.toISOString(),
      };

      res.status(201).json({
        success: true,
        message: "Pickup location created successfully",
        location: locationData,
      });
    } catch (error) {
      console.error("Error creating pickup location:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create pickup location",
        error: error.message,
      });
    }
  }
);

// PUT /api/pickup-locations/:id - Update pickup location (admin only)
router.put(
  "/:id",
  adminAuth,
  [
    body("name").optional().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("regionId").optional().isInt({ min: 1 }),
    body("cityId").optional().isInt({ min: 1 }),
    body("areaName").optional().trim().isLength({ min: 1, max: 100 }),
    body("landmark").optional().trim().isLength({ max: 255 }),
    body("additionalInstructions").optional().trim(),
    body("contactPhone").optional().trim().isLength({ max: 30 }),
    body("contactEmail").optional().isEmail(),
    body("operatingHours").optional().isObject(),
    body("isActive").optional().isBoolean(),
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

      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid pickup location ID. Must be a number.",
        });
      }

      // Check if location exists
      const existingLocation = await pool.query(
        "SELECT * FROM pickup_locations WHERE id = $1",
        [locationId]
      );

      if (existingLocation.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Pickup location not found",
        });
      }

      const {
        name,
        description,
        regionId,
        cityId,
        areaName,
        landmark,
        additionalInstructions,
        contactPhone,
        contactEmail,
        operatingHours,
        isActive,
      } = req.body;

      // Build update query dynamically
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
      if (contactEmail !== undefined) {
        updateFields.push(`contact_email = $${paramCount++}`);
        updateValues.push(contactEmail);
      }
      if (operatingHours !== undefined) {
        updateFields.push(`operating_hours = $${paramCount++}`);
        updateValues.push(
          operatingHours ? JSON.stringify(operatingHours) : null
        );
      }
      if (isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(isActive);
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
        const finalRegionId = regionId || existingLocation.rows[0].region_id;
        const finalCityId = cityId || existingLocation.rows[0].city_id;
        const finalAreaName = areaName || existingLocation.rows[0].area_name;
        const finalLandmark =
          landmark !== undefined ? landmark : existingLocation.rows[0].landmark;
        const finalAdditionalInstructions =
          additionalInstructions !== undefined
            ? additionalInstructions
            : existingLocation.rows[0].additional_instructions;

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
        const mapsLink = generatePickupMapsLink({
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
      updateValues.push(locationId);

      const updateQuery = `
        UPDATE pickup_locations
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING id, name, description, region_id, city_id, area_name, landmark,
                  additional_instructions, contact_phone, contact_email, operating_hours,
                  google_maps_link, is_active, created_at, updated_at
      `;

      const result = await pool.query(updateQuery, updateValues);
      const location = result.rows[0];

      // Get region and city names for response
      const regionResult = await pool.query(
        "SELECT name FROM ghana_regions WHERE id = $1",
        [location.region_id]
      );
      const cityResult = await pool.query(
        "SELECT name FROM ghana_cities WHERE id = $1",
        [location.city_id]
      );

      const locationData = {
        id: location.id.toString(),
        name: location.name,
        description: location.description,
        regionId: location.region_id.toString(),
        regionName: regionResult.rows[0].name,
        cityId: location.city_id.toString(),
        cityName: cityResult.rows[0].name,
        areaName: location.area_name,
        landmark: location.landmark,
        additionalInstructions: location.additional_instructions,
        contactPhone: location.contact_phone,
        contactEmail: location.contact_email,
        operatingHours: location.operating_hours,
        googleMapsLink: location.google_maps_link,
        isActive: location.is_active,
        createdAt: location.created_at.toISOString(),
        updatedAt: location.updated_at.toISOString(),
      };

      res.json({
        success: true,
        message: "Pickup location updated successfully",
        location: locationData,
      });
    } catch (error) {
      console.error("Error updating pickup location:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update pickup location",
        error: error.message,
      });
    }
  }
);

// DELETE /api/pickup-locations/:id - Delete pickup location (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const locationId = parseInt(req.params.id);

    if (isNaN(locationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pickup location ID. Must be a number.",
      });
    }

    // Check if location exists
    const existingLocation = await pool.query(
      "SELECT id, name FROM pickup_locations WHERE id = $1",
      [locationId]
    );

    if (existingLocation.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pickup location not found",
      });
    }

    // Soft delete by marking inactive
    const result = await pool.query(
      "UPDATE pickup_locations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [locationId]
    );

    res.json({
      success: true,
      message: "Pickup location deactivated successfully",
      location: {
        id: result.rows[0].id.toString(),
        name: result.rows[0].name,
        isActive: result.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error("Error deleting pickup location:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete pickup location",
      error: error.message,
    });
  }
});

// GET /api/pickup-locations/admin - Get all pickup locations including inactive (admin only)
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pl.id,
        pl.name,
        pl.description,
        pl.area_name,
        pl.landmark,
        pl.additional_instructions,
        pl.contact_phone,
        pl.contact_email,
        pl.operating_hours,
        pl.google_maps_link,
        pl.is_active,
        pl.created_at,
        pl.updated_at,
        gr.name as region_name,
        gc.name as city_name
      FROM pickup_locations pl
      JOIN ghana_regions gr ON pl.region_id = gr.id
      JOIN ghana_cities gc ON pl.city_id = gc.id
      ORDER BY pl.created_at DESC
    `);

    const locations = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      regionName: row.region_name,
      cityName: row.city_name,
      areaName: row.area_name,
      landmark: row.landmark,
      additionalInstructions: row.additional_instructions,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      operatingHours: row.operating_hours,
      googleMapsLink: row.google_maps_link,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    }));

    res.json({
      success: true,
      message: "All pickup locations retrieved successfully",
      count: locations.length,
      locations: locations,
    });
  } catch (error) {
    console.error("Error fetching all pickup locations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pickup locations",
      error: error.message,
    });
  }
});

module.exports = router;
