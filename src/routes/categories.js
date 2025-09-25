const express = require("express");
const { Pool } = require("pg");
const { adminAuth } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper function to build category tree
function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter((cat) => cat.parent_id === parentId)
    .map((cat) => ({
      id: cat.id.toString(),
      name: cat.name,
      description: cat.description,
      parentId: cat.parent_id ? cat.parent_id.toString() : null,
      imageUrl: cat.image_url,
      isActive: cat.is_active,
      sortOrder: cat.sort_order,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
      children: buildCategoryTree(categories, cat.id),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// GET all categories (public route) - returns hierarchical tree
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, parent_id, image_url, is_active, sort_order, created_at, updated_at 
       FROM categories 
       WHERE is_active = true 
       ORDER BY sort_order ASC, name ASC`
    );

    const categories = result.rows;
    const categoryTree = buildCategoryTree(categories);

    res.json({
      success: true,
      message: "Categories retrieved successfully",
      count: categories.length,
      categories: categoryTree,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching categories",
      error: error.message,
    });
  }
});

// GET categories as flat list (public route) - for dropdowns/filters
router.get("/flat", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, parent_id, image_url, is_active, sort_order, created_at, updated_at 
       FROM categories 
       WHERE is_active = true 
       ORDER BY sort_order ASC, name ASC`
    );

    const categories = result.rows.map((cat) => ({
      id: cat.id.toString(),
      name: cat.name,
      description: cat.description,
      parentId: cat.parent_id ? cat.parent_id.toString() : null,
      imageUrl: cat.image_url,
      isActive: cat.is_active,
      sortOrder: cat.sort_order,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
    }));

    res.json({
      success: true,
      message: "Categories retrieved successfully",
      count: categories.length,
      categories: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching categories",
      error: error.message,
    });
  }
});

// GET single category by ID (public route)
router.get("/:id", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `SELECT id, name, description, parent_id, image_url, is_active, sort_order, created_at, updated_at 
       FROM categories 
       WHERE id = $1 AND is_active = true`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const category = result.rows[0];
    res.json({
      success: true,
      message: "Category retrieved successfully",
      category: {
        id: category.id.toString(),
        name: category.name,
        description: category.description,
        parentId: category.parent_id ? category.parent_id.toString() : null,
        imageUrl: category.image_url,
        isActive: category.is_active,
        sortOrder: category.sort_order,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching category",
      error: error.message,
    });
  }
});

// GET subcategories of a specific category (public route)
router.get("/:id/children", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `SELECT id, name, description, parent_id, image_url, is_active, sort_order, created_at, updated_at 
       FROM categories 
       WHERE parent_id = $1 AND is_active = true 
       ORDER BY sort_order ASC, name ASC`,
      [categoryId]
    );

    const subcategories = result.rows.map((cat) => ({
      id: cat.id.toString(),
      name: cat.name,
      description: cat.description,
      parentId: cat.parent_id.toString(),
      imageUrl: cat.image_url,
      isActive: cat.is_active,
      sortOrder: cat.sort_order,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
    }));

    res.json({
      success: true,
      message: "Subcategories retrieved successfully",
      count: subcategories.length,
      subcategories: subcategories,
    });
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching subcategories",
      error: error.message,
    });
  }
});

// POST create new category (admin only)
router.post(
  "/",
  adminAuth,
  [
    body("name")
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Category name is required and must be 1-100 characters"),
    body("description").optional().trim(),
    body("parent_id")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Parent ID must be a positive integer"),
    body("image_url")
      .optional()
      .isURL()
      .withMessage("Image URL must be a valid URL"),
    body("sort_order")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Sort order must be a non-negative integer"),
  ],
  async (req, res) => {
    try {
      // Check validation errors
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
        parent_id,
        image_url,
        sort_order = 0,
      } = req.body;

      // Check if parent category exists (if parent_id is provided)
      if (parent_id) {
        const parentResult = await pool.query(
          "SELECT id FROM categories WHERE id = $1 AND is_active = true",
          [parent_id]
        );

        if (parentResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }
      }

      // Check if category name already exists at the same level
      const existingCategory = await pool.query(
        "SELECT id FROM categories WHERE name = $1 AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL))",
        [name, parent_id || null]
      );

      if (existingCategory.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Category with this name already exists at this level",
        });
      }

      // Create new category
      const newCategory = await pool.query(
        "INSERT INTO categories (name, description, parent_id, image_url, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, parent_id, image_url, is_active, sort_order, created_at",
        [name, description, parent_id || null, image_url, sort_order]
      );

      const category = newCategory.rows[0];
      res.status(201).json({
        success: true,
        message: "Category created successfully",
        category: {
          id: category.id.toString(),
          name: category.name,
          description: category.description,
          parentId: category.parent_id ? category.parent_id.toString() : null,
          imageUrl: category.image_url,
          isActive: category.is_active,
          sortOrder: category.sort_order,
          createdAt: category.created_at,
        },
      });
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating category",
        error: error.message,
      });
    }
  }
);

// PUT update existing category (admin only)
router.put(
  "/:id",
  adminAuth,
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Category name must be 1-100 characters"),
    body("description").optional().trim(),
    body("parent_id")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Parent ID must be a positive integer"),
    body("image_url")
      .optional()
      .isURL()
      .withMessage("Image URL must be a valid URL"),
    body("sort_order")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Sort order must be a non-negative integer"),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("is_active must be a boolean"),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID. Must be a number.",
        });
      }

      const { name, description, parent_id, image_url, sort_order, is_active } =
        req.body;

      // Check if category exists
      const existingCategory = await pool.query(
        "SELECT id FROM categories WHERE id = $1",
        [categoryId]
      );

      if (existingCategory.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Check if parent category exists (if parent_id is provided)
      if (parent_id !== undefined && parent_id !== null) {
        const parentResult = await pool.query(
          "SELECT id FROM categories WHERE id = $1 AND is_active = true",
          [parent_id]
        );

        if (parentResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }

        // Prevent setting parent to self or creating circular references
        if (parent_id === categoryId) {
          return res.status(400).json({
            success: false,
            message: "Category cannot be its own parent",
          });
        }
      }

      // Check if new name conflicts with existing category at the same level
      if (name) {
        const nameConflict = await pool.query(
          "SELECT id FROM categories WHERE name = $1 AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL)) AND id != $3",
          [name, parent_id || null, categoryId]
        );

        if (nameConflict.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: "Category with this name already exists at this level",
          });
        }
      }

      // Build dynamic update query
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
      if (parent_id !== undefined) {
        updateFields.push(`parent_id = $${paramCount++}`);
        updateValues.push(parent_id);
      }
      if (image_url !== undefined) {
        updateFields.push(`image_url = $${paramCount++}`);
        updateValues.push(image_url);
      }
      if (sort_order !== undefined) {
        updateFields.push(`sort_order = $${paramCount++}`);
        updateValues.push(sort_order);
      }
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(is_active);
      }

      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (updateFields.length === 1) {
        // Only updated_at was added, no actual fields to update
        return res.status(400).json({
          success: false,
          message: "No fields provided for update",
        });
      }

      // Execute update
      const updatedCategory = await pool.query(
        `UPDATE categories SET ${updateFields.join(
          ", "
        )} WHERE id = $${paramCount} RETURNING id, name, description, parent_id, image_url, is_active, sort_order, created_at, updated_at`,
        [...updateValues, categoryId]
      );

      const category = updatedCategory.rows[0];
      res.json({
        success: true,
        message: "Category updated successfully",
        category: {
          id: category.id.toString(),
          name: category.name,
          description: category.description,
          parentId: category.parent_id ? category.parent_id.toString() : null,
          imageUrl: category.image_url,
          isActive: category.is_active,
          sortOrder: category.sort_order,
          createdAt: category.created_at,
          updatedAt: category.updated_at,
        },
      });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating category",
        error: error.message,
      });
    }
  }
);

// DELETE category (admin only) - Soft delete
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID. Must be a number.",
      });
    }

    // Check if category exists
    const existingCategory = await pool.query(
      "SELECT id, name FROM categories WHERE id = $1",
      [categoryId]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has subcategories
    const subcategoriesResult = await pool.query(
      "SELECT COUNT(*) as count FROM categories WHERE parent_id = $1 AND is_active = true",
      [categoryId]
    );

    if (parseInt(subcategoriesResult.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete category. It has active subcategories. Deactivate them first or move them to another parent.",
      });
    }

    // Check if category is used by any products
    const productsUsingCategory = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE category_id = $1",
      [categoryId]
    );

    if (parseInt(productsUsingCategory.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete category. It is being used by products. Deactivate it instead.",
      });
    }

    // Soft delete - set is_active to false
    const deletedCategory = await pool.query(
      "UPDATE categories SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
      [categoryId]
    );

    res.json({
      success: true,
      message: "Category deleted successfully",
      category: {
        id: deletedCategory.rows[0].id.toString(),
        name: deletedCategory.rows[0].name,
        isActive: deletedCategory.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting category",
      error: error.message,
    });
  }
});

module.exports = router;
