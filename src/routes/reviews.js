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

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get public reviews
 *     description: Retrieve all approved and non-flagged reviews with pagination
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reviews per page
 *     responses:
 *       200:
 *         description: List of approved reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalReviews:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 */
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

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     description: Submit a new review. Auto-approves clean reviews, flags inappropriate content.
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - review_text
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Star rating (1-5)
 *               review_text:
 *                 type: string
 *                 description: Review content
 *               guest_name:
 *                 type: string
 *                 description: Required when user is not signed in
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/reviews/{id}/flag:
 *   post:
 *     summary: Flag a review
 *     description: Manually flag a review for inappropriate content
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for flagging
 *                 example: "Inappropriate content"
 *     responses:
 *       200:
 *         description: Review flagged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
/**
 * @swagger
 * /api/reviews/admin:
 *   get:
 *     summary: Get all reviews for admin management
 *     description: Retrieve all reviews with filtering options for admin moderation
 *     tags: [Reviews - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of reviews per page
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, flagged, pending, approved]
 *           default: all
 *         description: Filter reviews by status
 *     responses:
 *       200:
 *         description: List of reviews with admin details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reviews:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Review'
 *                       - type: object
 *                         properties:
 *                           email:
 *                             type: string
 *                             nullable: true
 *                 pagination:
 *                   type: object
 *                 filters:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: string
 *                     available:
 *                       type: array
 *                       items:
 *                         type: string
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/reviews/admin/{id}/approve:
 *   put:
 *     summary: Approve a flagged review
 *     description: Approve a review that was flagged for moderation
 *     tags: [Reviews - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/reviews/admin/{id}:
 *   delete:
 *     summary: Remove a review
 *     description: Permanently delete a review
 *     tags: [Reviews - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
