const express = require("express");
const { Pool } = require("pg");
const { body, validationResult } = require("express-validator");
const adminAuth = require("../middleware/auth");

require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Helper function to build customer object with all related data
async function buildCustomerObject(customerId) {
  try {
    // Get basic customer info
    const customerResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.created_at as registration_date, u.is_active,
              cl.loyalty_points, cl.loyalty_tier, cl.total_spent, cl.total_orders, cl.average_order_value, cl.last_purchase_date
       FROM users u
       LEFT JOIN customer_loyalty cl ON u.id = cl.customer_id
       WHERE u.id = $1 AND u.role = 'customer'`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return null;
    }

    const customer = customerResult.rows[0];

    // Get customer address
    const addressResult = await pool.query(
      "SELECT street, city, state, zip_code, country FROM customer_addresses WHERE customer_id = $1 AND is_default = true",
      [customerId]
    );

    // Get customer preferences
    const preferencesResult = await pool.query(
      "SELECT sizes, colors, brands, categories, price_min, price_max, email_notifications, sms_notifications, push_notifications FROM customer_preferences WHERE customer_id = $1",
      [customerId]
    );

    // Get customer tags
    const tagsResult = await pool.query(
      "SELECT tag FROM customer_tags WHERE customer_id = $1",
      [customerId]
    );

    // Get customer notes
    const notesResult = await pool.query(
      "SELECT note FROM customer_notes WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1",
      [customerId]
    );

    // Build the complete customer object
    const customerData = {
      id: customer.id.toString(),
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone || undefined,
      dateOfBirth: undefined, // Not stored in current schema
      gender: undefined, // Not stored in current schema
      address:
        addressResult.rows.length > 0
          ? {
              street: addressResult.rows[0].street,
              city: addressResult.rows[0].city,
              state: addressResult.rows[0].state,
              zipCode: addressResult.rows[0].zip_code,
              country: addressResult.rows[0].country,
            }
          : {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: "",
            },
      preferences:
        preferencesResult.rows.length > 0
          ? {
              size: preferencesResult.rows[0].sizes || [],
              colors: preferencesResult.rows[0].colors || [],
              brands: preferencesResult.rows[0].brands || [],
              categories: preferencesResult.rows[0].categories || [],
              priceRange: {
                min: preferencesResult.rows[0].price_min || 0,
                max: preferencesResult.rows[0].price_max || 1000,
              },
              communication: {
                email: preferencesResult.rows[0].email_notifications || false,
                sms: preferencesResult.rows[0].sms_notifications || false,
                push: preferencesResult.rows[0].push_notifications || false,
              },
            }
          : {
              size: [],
              colors: [],
              brands: [],
              categories: [],
              priceRange: { min: 0, max: 1000 },
              communication: { email: true, sms: false, push: true },
            },
      loyaltyPoints: customer.loyalty_points || 0,
      loyaltyTier: customer.loyalty_tier || "bronze",
      totalSpent: parseFloat(customer.total_spent) || 0,
      totalOrders: customer.total_orders || 0,
      averageOrderValue: parseFloat(customer.average_order_value) || 0,
      lastPurchaseDate: customer.last_purchase_date
        ? customer.last_purchase_date.toISOString()
        : undefined,
      registrationDate: customer.registration_date.toISOString(),
      status: customer.is_active ? "active" : "inactive",
      tags: tagsResult.rows.map((row) => row.tag),
      notes: notesResult.rows.length > 0 ? notesResult.rows[0].note : undefined,
      avatar: undefined, // Not stored in current schema
    };

    return customerData;
  } catch (error) {
    console.error("Error building customer object:", error);
    throw error;
  }
}

// GET /api/customers - Get all customers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.created_at as registration_date, u.is_active,
              cl.loyalty_points, cl.loyalty_tier, cl.total_spent, cl.total_orders, cl.average_order_value, cl.last_purchase_date
       FROM users u
       LEFT JOIN customer_loyalty cl ON u.id = cl.customer_id
       WHERE u.role = 'customer'
       ORDER BY u.created_at DESC`
    );

    const customers = await Promise.all(
      result.rows.map(async (row) => {
        return await buildCustomerObject(row.id);
      })
    );

    res.json({
      message: "Customers retrieved successfully",
      count: customers.length,
      customers: customers,
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      message: "Server error while fetching customers",
      error: error.message,
    });
  }
});

// GET /api/customers/segments - Get customer segments
router.get("/segments", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, criteria, customer_count, created_at FROM customer_segments ORDER BY created_at DESC"
    );

    const segments = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      criteria: row.criteria,
      customerCount: row.customer_count,
      createdAt: row.created_at.toISOString(),
    }));

    res.json({
      message: "Customer segments retrieved successfully",
      count: segments.length,
      segments: segments,
    });
  } catch (error) {
    console.error("Error fetching customer segments:", error);
    res.status(500).json({
      message: "Server error while fetching customer segments",
      error: error.message,
    });
  }
});

// GET /api/customers/loyalty - Get loyalty programs
router.get("/loyalty", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, type, start_date, end_date, tiers, rewards, is_active, created_at FROM loyalty_programs ORDER BY created_at DESC"
    );

    const programs = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      type: row.type,
      startDate: row.start_date.toISOString().split("T")[0],
      endDate: row.end_date.toISOString().split("T")[0],
      tiers: row.tiers,
      rewards: row.rewards,
      isActive: row.is_active,
      createdAt: row.created_at.toISOString(),
    }));

    res.json({
      message: "Loyalty programs retrieved successfully",
      count: programs.length,
      programs: programs,
    });
  } catch (error) {
    console.error("Error fetching loyalty programs:", error);
    res.status(500).json({
      message: "Server error while fetching loyalty programs",
      error: error.message,
    });
  }
});

// GET /api/customers/communications - Get communication campaigns
router.get("/communications", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, type, subject, content, target_segment, target_customers, scheduled_date, sent_date, status, open_rate, click_rate, delivery_rate, created_at FROM communication_campaigns ORDER BY created_at DESC"
    );

    const campaigns = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      type: row.type,
      subject: row.subject,
      content: row.content,
      targetSegment: row.target_segment,
      targetCustomers: row.target_customers,
      scheduledDate: row.scheduled_date
        ? row.scheduled_date.toISOString()
        : undefined,
      sentDate: row.sent_date ? row.sent_date.toISOString() : undefined,
      status: row.status,
      openRate: row.open_rate,
      clickRate: row.click_rate,
      deliveryRate: row.delivery_rate,
      createdAt: row.created_at.toISOString(),
    }));

    res.json({
      message: "Communication campaigns retrieved successfully",
      count: campaigns.length,
      campaigns: campaigns,
    });
  } catch (error) {
    console.error("Error fetching communication campaigns:", error);
    res.status(500).json({
      message: "Server error while fetching communication campaigns",
      error: error.message,
    });
  }
});

// GET /api/customers/:id - Get single customer
router.get("/:id", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID. Must be a number.",
      });
    }

    const customer = await buildCustomerObject(customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.json({
      message: "Customer retrieved successfully",
      customer: customer,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    res.status(500).json({
      message: "Server error while fetching customer",
      error: error.message,
    });
  }
});

// GET /api/customers/:id/purchases - Get customer purchase history
router.get("/:id/purchases", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID. Must be a number.",
      });
    }

    // Get purchase history
    const purchaseResult = await pool.query(
      `SELECT ph.id, ph.order_date, ph.total_amount, ph.status, ph.payment_method, ph.shipping_address
       FROM purchase_history ph
       WHERE ph.customer_id = $1
       ORDER BY ph.order_date DESC`,
      [customerId]
    );

    // Get purchase items for each purchase
    const purchases = await Promise.all(
      purchaseResult.rows.map(async (purchase) => {
        const itemsResult = await pool.query(
          `SELECT id, product_name, size, color, price, quantity, image_url
           FROM purchase_history_items
           WHERE purchase_id = $1`,
          [purchase.id]
        );

        return {
          id: purchase.id.toString(),
          customerId: customerId.toString(),
          orderDate: purchase.order_date.toISOString(),
          items: itemsResult.rows.map((item) => ({
            id: item.id.toString(),
            name: item.product_name,
            size: item.size,
            color: item.color,
            price: parseFloat(item.price),
            quantity: item.quantity,
            image: item.image_url,
          })),
          totalAmount: parseFloat(purchase.total_amount),
          status: purchase.status,
          paymentMethod: purchase.payment_method,
          shippingAddress: purchase.shipping_address,
        };
      })
    );

    res.json({
      message: "Customer purchase history retrieved successfully",
      count: purchases.length,
      purchases: purchases,
    });
  } catch (error) {
    console.error("Error fetching customer purchase history:", error);
    res.status(500).json({
      message: "Server error while fetching customer purchase history",
      error: error.message,
    });
  }
});

// GET /api/customers/:id/activity - Get customer activity
router.get("/:id/activity", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID. Must be a number.",
      });
    }

    const result = await pool.query(
      `SELECT id, type, description, metadata, created_at as timestamp
       FROM customer_activity
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customerId]
    );

    const activities = result.rows.map((row) => ({
      id: row.id.toString(),
      customerId: customerId.toString(),
      type: row.type,
      description: row.description,
      timestamp: row.timestamp.toISOString(),
      metadata: row.metadata,
    }));

    res.json({
      message: "Customer activity retrieved successfully",
      count: activities.length,
      activities: activities,
    });
  } catch (error) {
    console.error("Error fetching customer activity:", error);
    res.status(500).json({
      message: "Server error while fetching customer activity",
      error: error.message,
    });
  }
});

module.exports = router;
