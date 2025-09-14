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

// GET /api/delivery-zones - Get all delivery zones (public)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        dz.id, 
        dz.name, 
        dz.description, 
        dz.delivery_fee, 
        dz.estimated_days, 
        dz.coverage_areas, 
        dz.is_active, 
        dz.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', dza.id,
              'regionId', dza.region_id,
              'regionName', gr.name,
              'cityId', dza.city_id,
              'cityName', gc.name,
              'areaName', dza.area_name
            )
          ) FILTER (WHERE dza.id IS NOT NULL), 
          '[]'::json
        ) as structured_areas
      FROM delivery_zones dz
      LEFT JOIN delivery_zone_areas dza ON dz.id = dza.delivery_zone_id
      LEFT JOIN ghana_regions gr ON dza.region_id = gr.id
      LEFT JOIN ghana_cities gc ON dza.city_id = gc.id
      WHERE dz.is_active = true
      GROUP BY dz.id, dz.name, dz.description, dz.delivery_fee, dz.estimated_days, dz.coverage_areas, dz.is_active, dz.created_at
      ORDER BY dz.name ASC
    `);

    const zones = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      deliveryFee: parseFloat(row.delivery_fee),
      estimatedDays: row.estimated_days,
      coverageAreas: row.coverage_areas || [],
      structuredAreas: row.structured_areas,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
    }));

    res.json({
      success: true,
      message: "Delivery zones retrieved successfully",
      count: zones.length,
      zones: zones,
    });
  } catch (error) {
    console.error("Error fetching delivery zones:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching delivery zones",
      error: error.message,
    });
  }
});

// GET /api/delivery-zones/:id - Get single delivery zone (public)
router.get("/:id", async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);

    if (isNaN(zoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery zone ID. Must be a number.",
      });
    }

    const result = await pool.query(
      "SELECT id, name, description, delivery_fee, estimated_days, coverage_areas, is_active, created_at FROM delivery_zones WHERE id = $1",
      [zoneId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery zone not found",
      });
    }

    const zone = result.rows[0];
    const zoneData = {
      id: zone.id.toString(),
      name: zone.name,
      description: zone.description,
      deliveryFee: parseFloat(zone.delivery_fee),
      estimatedDays: zone.estimated_days,
      coverageAreas: zone.coverage_areas || [],
      isActive: zone.is_active,
      createdAt: zone.created_at.toISOString(),
    };

    res.json({
      success: true,
      message: "Delivery zone retrieved successfully",
      zone: zoneData,
    });
  } catch (error) {
    console.error("Error fetching delivery zone:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching delivery zone",
      error: error.message,
    });
  }
});

// POST /api/delivery-zones - Create delivery zone (admin only)
router.post(
  "/",
  adminAuth,
  body("name").notEmpty().trim().isLength({ min: 1, max: 255 }),
  body("description").optional().trim(),
  body("deliveryFee").isFloat({ min: 0 }),
  body("estimatedDays").notEmpty().trim().isLength({ min: 1, max: 50 }),
  body("coverageAreas").optional().isArray(),
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

      const { name, description, deliveryFee, estimatedDays, coverageAreas } =
        req.body;

      // Check if zone with same name already exists
      const existingZone = await pool.query(
        "SELECT id FROM delivery_zones WHERE name = $1",
        [name]
      );

      if (existingZone.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Delivery zone with this name already exists",
        });
      }

      // Create new delivery zone
      const newZone = await pool.query(
        "INSERT INTO delivery_zones (name, description, delivery_fee, estimated_days, coverage_areas) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, delivery_fee, estimated_days, coverage_areas, is_active, created_at",
        [name, description, deliveryFee, estimatedDays, coverageAreas || []]
      );

      const zone = newZone.rows[0];
      const zoneData = {
        id: zone.id.toString(),
        name: zone.name,
        description: zone.description,
        deliveryFee: parseFloat(zone.delivery_fee),
        estimatedDays: zone.estimated_days,
        coverageAreas: zone.coverage_areas || [],
        isActive: zone.is_active,
        createdAt: zone.created_at.toISOString(),
      };

      res.status(201).json({
        success: true,
        message: "Delivery zone created successfully",
        zone: zoneData,
      });
    } catch (error) {
      console.error("Error creating delivery zone:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating delivery zone",
        error: error.message,
      });
    }
  }
);

// PUT /api/delivery-zones/:id - Update delivery zone (admin only)
router.put(
  "/:id",
  adminAuth,
  body("name").optional().trim().isLength({ min: 1, max: 255 }),
  body("description").optional().trim(),
  body("deliveryFee").optional().isFloat({ min: 0 }),
  body("estimatedDays").optional().trim().isLength({ min: 1, max: 50 }),
  body("coverageAreas").optional().isArray(),
  body("isActive").optional().isBoolean(),
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

      const zoneId = parseInt(req.params.id);

      if (isNaN(zoneId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery zone ID. Must be a number.",
        });
      }

      // Check if zone exists
      const existingZone = await pool.query(
        "SELECT id FROM delivery_zones WHERE id = $1",
        [zoneId]
      );

      if (existingZone.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Delivery zone not found",
        });
      }

      const {
        name,
        description,
        deliveryFee,
        estimatedDays,
        coverageAreas,
        isActive,
      } = req.body;

      // Check if name is being changed and if new name already exists
      if (name) {
        const nameCheck = await pool.query(
          "SELECT id FROM delivery_zones WHERE name = $1 AND id != $2",
          [name, zoneId]
        );

        if (nameCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Delivery zone with this name already exists",
          });
        }
      }

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
      if (deliveryFee !== undefined) {
        updateFields.push(`delivery_fee = $${paramCount++}`);
        updateValues.push(deliveryFee);
      }
      if (estimatedDays !== undefined) {
        updateFields.push(`estimated_days = $${paramCount++}`);
        updateValues.push(estimatedDays);
      }
      if (coverageAreas !== undefined) {
        updateFields.push(`coverage_areas = $${paramCount++}`);
        updateValues.push(coverageAreas);
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

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(zoneId);

      const updateQuery = `
        UPDATE delivery_zones
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING id, name, description, delivery_fee, estimated_days, coverage_areas, is_active, created_at, updated_at
      `;

      const result = await pool.query(updateQuery, updateValues);
      const zone = result.rows[0];

      const zoneData = {
        id: zone.id.toString(),
        name: zone.name,
        description: zone.description,
        deliveryFee: parseFloat(zone.delivery_fee),
        estimatedDays: zone.estimated_days,
        coverageAreas: zone.coverage_areas || [],
        isActive: zone.is_active,
        createdAt: zone.created_at.toISOString(),
        updatedAt: zone.updated_at.toISOString(),
      };

      res.json({
        success: true,
        message: "Delivery zone updated successfully",
        zone: zoneData,
      });
    } catch (error) {
      console.error("Error updating delivery zone:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating delivery zone",
        error: error.message,
      });
    }
  }
);

// DELETE /api/delivery-zones/:id - Delete delivery zone (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);

    if (isNaN(zoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery zone ID. Must be a number.",
      });
    }

    // Check if zone exists
    const existingZone = await pool.query(
      "SELECT id, name FROM delivery_zones WHERE id = $1",
      [zoneId]
    );

    if (existingZone.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Delivery zone not found",
      });
    }

    // Soft delete by marking inactive
    const result = await pool.query(
      "UPDATE delivery_zones SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [zoneId]
    );

    res.json({
      success: true,
      message: "Delivery zone deactivated successfully",
      zone: {
        id: result.rows[0].id.toString(),
        name: result.rows[0].name,
        isActive: result.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error("Error deleting delivery zone:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting delivery zone",
      error: error.message,
    });
  }
});

// GET /api/delivery-zones/admin - Get all delivery zones including inactive (admin only)
router.get("/admin", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, delivery_fee, estimated_days, coverage_areas, is_active, created_at, updated_at FROM delivery_zones ORDER BY created_at DESC"
    );

    const zones = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      deliveryFee: parseFloat(row.delivery_fee),
      estimatedDays: row.estimated_days,
      coverageAreas: row.coverage_areas || [],
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    }));

    res.json({
      success: true,
      message: "All delivery zones retrieved successfully",
      count: zones.length,
      zones: zones,
    });
  } catch (error) {
    console.error("Error fetching all delivery zones:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching delivery zones",
      error: error.message,
    });
  }
});

// POST /api/delivery-zones/:id/areas - Add area to delivery zone (admin only)
router.post(
  "/:id/areas",
  adminAuth,
  [
    body("regionId").isInt({ min: 1 }),
    body("cityId").isInt({ min: 1 }),
    body("areaName").notEmpty().trim().isLength({ min: 1, max: 100 }),
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

      const zoneId = parseInt(req.params.id);
      const { regionId, cityId, areaName } = req.body;

      if (isNaN(zoneId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid delivery zone ID. Must be a number.",
        });
      }

      // Check if zone exists
      const zoneExists = await pool.query(
        "SELECT id FROM delivery_zones WHERE id = $1",
        [zoneId]
      );

      if (zoneExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Delivery zone not found",
        });
      }

      // Check if area already exists for this zone
      const existingArea = await pool.query(
        "SELECT id FROM delivery_zone_areas WHERE delivery_zone_id = $1 AND region_id = $2 AND city_id = $3 AND area_name = $4",
        [zoneId, regionId, cityId, areaName]
      );

      if (existingArea.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "This area already exists for this delivery zone",
        });
      }

      // Add area to delivery zone
      const result = await pool.query(
        `INSERT INTO delivery_zone_areas (delivery_zone_id, region_id, city_id, area_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, delivery_zone_id, region_id, city_id, area_name, created_at`,
        [zoneId, regionId, cityId, areaName]
      );

      const area = result.rows[0];

      res.status(201).json({
        success: true,
        message: "Area added to delivery zone successfully",
        area: {
          id: area.id.toString(),
          deliveryZoneId: area.delivery_zone_id.toString(),
          regionId: area.region_id.toString(),
          cityId: area.city_id.toString(),
          areaName: area.area_name,
          createdAt: area.created_at.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error adding area to delivery zone:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adding area to delivery zone",
        error: error.message,
      });
    }
  }
);

// DELETE /api/delivery-zones/:id/areas/:areaId - Remove area from delivery zone (admin only)
router.delete("/:id/areas/:areaId", adminAuth, async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);
    const areaId = parseInt(req.params.areaId);

    if (isNaN(zoneId) || isNaN(areaId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid zone ID or area ID. Must be numbers.",
      });
    }

    // Check if area exists and belongs to the zone
    const areaExists = await pool.query(
      "SELECT id, area_name FROM delivery_zone_areas WHERE id = $1 AND delivery_zone_id = $2",
      [areaId, zoneId]
    );

    if (areaExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Area not found in this delivery zone",
      });
    }

    // Remove area from delivery zone
    await pool.query("DELETE FROM delivery_zone_areas WHERE id = $1", [areaId]);

    res.json({
      success: true,
      message: "Area removed from delivery zone successfully",
      area: {
        id: areaId.toString(),
        areaName: areaExists.rows[0].area_name,
      },
    });
  } catch (error) {
    console.error("Error removing area from delivery zone:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing area from delivery zone",
      error: error.message,
    });
  }
});

// GET /api/delivery-zones/:id/areas - Get areas for a delivery zone (admin only)
router.get("/:id/areas", adminAuth, async (req, res) => {
  try {
    const zoneId = parseInt(req.params.id);

    if (isNaN(zoneId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery zone ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        dza.id,
        dza.delivery_zone_id,
        dza.region_id,
        gr.name as region_name,
        dza.city_id,
        gc.name as city_name,
        dza.area_name,
        dza.created_at
      FROM delivery_zone_areas dza
      JOIN ghana_regions gr ON dza.region_id = gr.id
      JOIN ghana_cities gc ON dza.city_id = gc.id
      WHERE dza.delivery_zone_id = $1
      ORDER BY gr.name, gc.name, dza.area_name
    `,
      [zoneId]
    );

    const areas = result.rows.map((row) => ({
      id: row.id.toString(),
      deliveryZoneId: row.delivery_zone_id.toString(),
      regionId: row.region_id.toString(),
      regionName: row.region_name,
      cityId: row.city_id.toString(),
      cityName: row.city_name,
      areaName: row.area_name,
      createdAt: row.created_at.toISOString(),
    }));

    res.json({
      success: true,
      message: "Delivery zone areas retrieved successfully",
      count: areas.length,
      areas: areas,
    });
  } catch (error) {
    console.error("Error fetching delivery zone areas:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching delivery zone areas",
      error: error.message,
    });
  }
});

module.exports = router;
