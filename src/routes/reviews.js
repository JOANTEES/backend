const express = require("express");
const { Pool } = require("pg");
const { auth } = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper function to check for inappropriate keywords
async function checkForInappropriateContent(text) {
  try {
    const result = await pool.query(
      "SELECT keyword FROM inappropriate_keywords WHERE LOWER($1) LIKE '%' || LOWER(keyword) || '%'",
      [text]
    );

    if (result.rows.length > 0) {
      return {
        isInappropriate: true,
        flaggedKeywords: result.rows.map((row) => row.keyword),
        reason: `Flagged for containing: ${result.rows
          .map((row) => row.keyword)
          .join(", ")}`,
      };
    }

    return { isInappropriate: false };
  } catch (error) {
    console.error("Error checking inappropriate content:", error);
    return { isInappropriate: false };
  }
}

// GET /api/reviews - Get public reviews (approved and not flagged)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT r.*, 
              COALESCE(u.first_name || ' ' || u.last_name, r.guest_name) as display_name,
              CASE WHEN u.id IS NOT NULL THEN true ELSE false END as is_authenticated_user
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.is_approved = true AND r.is_flagged = false
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM reviews WHERE is_approved = true AND is_flagged = false"
    );

    res.json({
      success: true,
      reviews: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalReviews: parseInt(countResult.rows[0].count),
        hasNextPage: offset + result.rows.length < countResult.rows[0].count,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching reviews",
    });
  }
});

// POST /api/reviews - Create a new review
router.post("/", async (req, res) => {
  try {
    const { rating, review_text, guest_name } = req.body;
    const user_id = req.user ? req.user.id : null;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (!review_text || review_text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Review text is required",
      });
    }

    // If no user_id, guest_name is required
    if (!user_id && (!guest_name || guest_name.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Guest name is required when not signed in",
      });
    }

    // Check for inappropriate content
    const contentCheck = await checkForInappropriateContent(review_text);

    const reviewData = {
      user_id,
      guest_name: guest_name ? guest_name.trim() : null,
      rating,
      review_text: review_text.trim(),
      is_approved: !contentCheck.isInappropriate,
      is_flagged: contentCheck.isInappropriate,
      flag_reason: contentCheck.isInappropriate ? contentCheck.reason : null,
    };

    const result = await pool.query(
      `INSERT INTO reviews (user_id, guest_name, rating, review_text, is_approved, is_flagged, flag_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        reviewData.user_id,
        reviewData.guest_name,
        reviewData.rating,
        reviewData.review_text,
        reviewData.is_approved,
        reviewData.is_flagged,
        reviewData.flag_reason,
      ]
    );

    const review = result.rows[0];

    res.status(201).json({
      success: true,
      message: review.is_flagged
        ? "Review submitted and flagged for moderation"
        : "Review submitted successfully",
      review: {
        id: review.id,
        rating: review.rating,
        review_text: review.review_text,
        display_name: user_id
          ? `${req.user.first_name} ${req.user.last_name}`
          : guest_name,
        is_authenticated_user: !!user_id,
        created_at: review.created_at,
        is_approved: review.is_approved,
        is_flagged: review.is_flagged,
      },
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({
      success: false,
      message: "Error creating review",
    });
  }
});

// POST /api/reviews/:id/flag - Flag a review (manual flagging by users)
router.post("/:id/flag", async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { reason } = req.body;

    // Check if review exists
    const reviewResult = await pool.query(
      "SELECT id, is_flagged FROM reviews WHERE id = $1",
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Update review to be flagged
    await pool.query(
      "UPDATE reviews SET is_flagged = true, flag_reason = COALESCE(flag_reason || '; ', '') || $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [`Manual flag: ${reason || "No reason provided"}`, reviewId]
    );

    res.json({
      success: true,
      message: "Review flagged successfully",
    });
  } catch (error) {
    console.error("Error flagging review:", error);
    res.status(500).json({
      success: false,
      message: "Error flagging review",
    });
  }
});

// Admin routes - require authentication
// GET /api/reviews/admin - Get all reviews for admin management
router.get("/admin", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { page = 1, limit = 20, filter = "all" } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "";
    let queryParams = [limit, offset];

    switch (filter) {
      case "flagged":
        whereClause = "WHERE r.is_flagged = true";
        break;
      case "pending":
        whereClause = "WHERE r.is_approved = false";
        break;
      case "approved":
        whereClause = "WHERE r.is_approved = true AND r.is_flagged = false";
        break;
      default:
        whereClause = "";
    }

    const result = await pool.query(
      `SELECT r.*, 
              COALESCE(u.first_name || ' ' || u.last_name, r.guest_name) as display_name,
              u.email,
              CASE WHEN u.id IS NOT NULL THEN true ELSE false END as is_authenticated_user
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    // Get total count
    const countQuery =
      filter === "all"
        ? "SELECT COUNT(*) FROM reviews"
        : `SELECT COUNT(*) FROM reviews r ${whereClause}`;

    const countResult = await pool.query(
      countQuery,
      filter === "all" ? [] : queryParams.slice(2)
    );

    res.json({
      success: true,
      reviews: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
        totalReviews: parseInt(countResult.rows[0].count),
        hasNextPage: offset + result.rows.length < countResult.rows[0].count,
        hasPrevPage: page > 1,
      },
      filters: {
        current: filter,
        available: ["all", "flagged", "pending", "approved"],
      },
    });
  } catch (error) {
    console.error("Error fetching admin reviews:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin reviews",
    });
  }
});

// PUT /api/reviews/admin/:id/approve - Approve a flagged review
router.put("/admin/:id/approve", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const reviewId = req.params.id;

    const result = await pool.query(
      "UPDATE reviews SET is_approved = true, is_flagged = false, flag_reason = null, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [reviewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      message: "Review approved successfully",
      review: result.rows[0],
    });
  } catch (error) {
    console.error("Error approving review:", error);
    res.status(500).json({
      success: false,
      message: "Error approving review",
    });
  }
});

// DELETE /api/reviews/admin/:id - Remove a review
router.delete("/admin/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const reviewId = req.params.id;

    const result = await pool.query(
      "DELETE FROM reviews WHERE id = $1 RETURNING *",
      [reviewId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    res.json({
      success: true,
      message: "Review removed successfully",
    });
  } catch (error) {
    console.error("Error removing review:", error);
    res.status(500).json({
      success: false,
      message: "Error removing review",
    });
  }
});

module.exports = router;
