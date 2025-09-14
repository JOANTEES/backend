const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /api/ghana/regions - Get all Ghana regions
router.get("/regions", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, code FROM ghana_regions WHERE is_active = true ORDER BY name"
    );

    res.json({
      success: true,
      message: "Regions retrieved successfully",
      count: result.rows.length,
      regions: result.rows,
    });
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch regions",
      error: error.message,
    });
  }
});

// GET /api/ghana/cities - Get all cities or cities by region
router.get("/cities", async (req, res) => {
  try {
    const { region_id } = req.query;
    let query = `
      SELECT c.id, c.name, c.region_id, r.name as region_name, r.code as region_code
      FROM ghana_cities c
      JOIN ghana_regions r ON c.region_id = r.id
      WHERE c.is_active = true
    `;
    const params = [];

    if (region_id) {
      query += " AND c.region_id = $1";
      params.push(region_id);
    }

    query += " ORDER BY r.name, c.name";

    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: "Cities retrieved successfully",
      count: result.rows.length,
      cities: result.rows,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
});

// GET /api/ghana/cities/:regionId - Get cities by specific region
router.get("/cities/:regionId", async (req, res) => {
  try {
    const { regionId } = req.params;

    if (!regionId || isNaN(regionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid region ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `SELECT c.id, c.name, c.region_id, r.name as region_name, r.code as region_code
       FROM ghana_cities c
       JOIN ghana_regions r ON c.region_id = r.id
       WHERE c.region_id = $1 AND c.is_active = true
       ORDER BY c.name`,
      [regionId]
    );

    res.json({
      success: true,
      message: "Cities retrieved successfully",
      count: result.rows.length,
      cities: result.rows,
    });
  } catch (error) {
    console.error("Error fetching cities by region:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
});

module.exports = router;
