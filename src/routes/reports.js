const express = require("express");
const { Pool } = require("pg");
const { adminAuth } = require("../middleware/auth");
const { query, validationResult } = require("express-validator");
require("dotenv").config();

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper function to calculate profit margins
function calculateProfitMargin(costPrice, sellingPrice) {
  if (!costPrice || costPrice <= 0) return null;

  const profit = sellingPrice - costPrice;
  const margin = (profit / costPrice) * 100;

  return {
    costPrice: parseFloat(costPrice),
    sellingPrice: parseFloat(sellingPrice),
    profit: parseFloat(profit.toFixed(2)),
    margin: parseFloat(margin.toFixed(2)),
  };
}

// Helper function to calculate effective selling price
function calculateEffectivePrice(price, discountPrice, discountPercent) {
  if (discountPrice && discountPrice < price) {
    return parseFloat(discountPrice);
  } else if (discountPercent && discountPercent > 0) {
    return parseFloat((price - (price * discountPercent) / 100).toFixed(2));
  }
  return parseFloat(price);
}

// GET /api/reports/profit-margins - Get profit margins for all products
router.get("/profit-margins", adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "margin",
      sortOrder = "desc",
    } = req.query;
    const offset = (page - 1) * limit;

    // Validate sort parameters
    const validSortFields = [
      "margin",
      "profit",
      "costPrice",
      "sellingPrice",
      "name",
    ];
    const validSortOrders = ["asc", "desc"];

    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid sort field. Must be one of: margin, profit, costPrice, sellingPrice, name",
      });
    }

    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort order. Must be 'asc' or 'desc'",
      });
    }

    // Get products with profit margin calculations
    let orderClause;
    if (sortBy === "name") {
      orderClause = "p.name";
    } else if (sortBy === "margin" || sortBy === "profit") {
      // For calculated fields, we'll sort after calculation
      orderClause = "p.name";
    } else {
      orderClause = `p.${sortBy}`;
    }

    const result = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.cost_price,
        p.price,
        p.discount_price,
        p.discount_percent,
        COALESCE(SUM(pv.stock_quantity), 0) as stock_quantity,
        b.name as brand_name,
        c.name as category_name,
        COUNT(oi.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
        COALESCE(SUM(oi.subtotal), 0) as total_revenue
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      LEFT JOIN order_items oi ON p.id = oi.product_id
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, p.cost_price, p.price, p.discount_price, p.discount_percent, 
               b.name, c.name
      ORDER BY ${orderClause} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    // Calculate profit margins for each product
    let products = result.rows.map((product) => {
      const effectivePrice = calculateEffectivePrice(
        product.price,
        product.discount_price,
        product.discount_percent
      );

      const profitMargin = calculateProfitMargin(
        product.cost_price,
        effectivePrice
      );

      return {
        id: product.id.toString(),
        name: product.name,
        sku: product.sku,
        brand: product.brand_name,
        category: product.category_name,
        costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
        originalPrice: parseFloat(product.price),
        discountPrice: product.discount_price
          ? parseFloat(product.discount_price)
          : null,
        discountPercent: product.discount_percent
          ? parseFloat(product.discount_percent)
          : null,
        effectivePrice: effectivePrice,
        profitMargin: profitMargin,
        stockQuantity: product.stock_quantity,
        sales: {
          totalOrders: parseInt(product.total_orders),
          totalQuantitySold: parseInt(product.total_quantity_sold),
          totalRevenue: parseFloat(product.total_revenue),
        },
      };
    });

    // Sort by calculated fields if needed
    if (sortBy === "margin") {
      products.sort((a, b) => {
        const aMargin = a.profitMargin ? a.profitMargin.margin : 0;
        const bMargin = b.profitMargin ? b.profitMargin.margin : 0;
        return sortOrder === "desc" ? bMargin - aMargin : aMargin - bMargin;
      });
    } else if (sortBy === "profit") {
      products.sort((a, b) => {
        const aProfit = a.profitMargin ? a.profitMargin.profit : 0;
        const bProfit = b.profitMargin ? b.profitMargin.profit : 0;
        return sortOrder === "desc" ? bProfit - aProfit : aProfit - bProfit;
      });
    }

    // Get total count for pagination
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM products WHERE is_active = true"
    );
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      message: "Profit margins retrieved successfully",
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching profit margins:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profit margins",
      error: error.message,
    });
  }
});

// GET /api/reports/overall-metrics - Get overall business metrics
router.get("/overall-metrics", adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    let params = [];

    if (startDate && endDate) {
      dateFilter = "WHERE o.created_at >= $1 AND o.created_at <= $2";
      params = [startDate, endDate];
    }

    // Get overall metrics
    const metricsResult = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT o.user_id) as total_customers,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as average_order_value,
        COALESCE(SUM(oi.quantity), 0) as total_items_sold,
        COALESCE(SUM(oi.subtotal), 0) as gross_revenue,
        COALESCE(SUM(p.cost_price * oi.quantity), 0) as total_cost,
        COALESCE(SUM(oi.subtotal - (p.cost_price * oi.quantity)), 0) as gross_profit
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      ${dateFilter}
      `,
      params
    );

    const metrics = metricsResult.rows[0];

    // Calculate profit margin percentage
    const grossProfit = parseFloat(metrics.gross_profit);
    const grossRevenue = parseFloat(metrics.gross_revenue);
    const profitMarginPercent =
      grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    // Get top selling products
    const topProductsResult = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.sku,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.subtotal) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      ${dateFilter.replace("o.created_at", "o.created_at")}
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_quantity_sold DESC
      LIMIT 10
      `,
      params
    );

    // Get sales by delivery method
    const deliveryMethodResult = await pool.query(
      `
      SELECT 
        delivery_method,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue
      FROM orders
      ${dateFilter}
      GROUP BY delivery_method
      `,
      params
    );

    // Get sales by payment method
    const paymentMethodResult = await pool.query(
      `
      SELECT 
        payment_method,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue
      FROM orders
      ${dateFilter}
      GROUP BY payment_method
      `,
      params
    );

    res.json({
      success: true,
      message: "Overall metrics retrieved successfully",
      data: {
        summary: {
          totalOrders: parseInt(metrics.total_orders),
          totalCustomers: parseInt(metrics.total_customers),
          totalRevenue: parseFloat(metrics.total_revenue),
          averageOrderValue: parseFloat(metrics.average_order_value),
          totalItemsSold: parseInt(metrics.total_items_sold),
          grossRevenue: parseFloat(metrics.gross_revenue),
          totalCost: parseFloat(metrics.total_cost),
          grossProfit: grossProfit,
          profitMarginPercent: parseFloat(profitMarginPercent.toFixed(2)),
        },
        topProducts: topProductsResult.rows.map((product) => ({
          id: product.id.toString(),
          name: product.name,
          sku: product.sku,
          totalQuantitySold: parseInt(product.total_quantity_sold),
          totalRevenue: parseFloat(product.total_revenue),
          orderCount: parseInt(product.order_count),
        })),
        salesByDeliveryMethod: deliveryMethodResult.rows.map((method) => ({
          method: method.delivery_method,
          orderCount: parseInt(method.order_count),
          totalRevenue: parseFloat(method.total_revenue),
        })),
        salesByPaymentMethod: paymentMethodResult.rows.map((method) => ({
          method: method.payment_method,
          orderCount: parseInt(method.order_count),
          totalRevenue: parseFloat(method.total_revenue),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching overall metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overall metrics",
      error: error.message,
    });
  }
});

// GET /api/reports/sales-trends - Get sales trends over time
router.get("/sales-trends", adminAuth, async (req, res) => {
  try {
    const { period = "daily", startDate, endDate } = req.query;

    // Validate period
    const validPeriods = ["daily", "weekly", "monthly"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period. Must be one of: daily, weekly, monthly",
      });
    }

    let dateFormat, groupBy;
    switch (period) {
      case "daily":
        dateFormat = "DATE(o.created_at)";
        groupBy = "DATE(o.created_at)";
        break;
      case "weekly":
        dateFormat = "DATE_TRUNC('week', o.created_at)";
        groupBy = "DATE_TRUNC('week', o.created_at)";
        break;
      case "monthly":
        dateFormat = "DATE_TRUNC('month', o.created_at)";
        groupBy = "DATE_TRUNC('month', o.created_at)";
        break;
    }

    let dateFilter = "";
    let params = [];

    if (startDate && endDate) {
      dateFilter = "WHERE o.created_at >= $1 AND o.created_at <= $2";
      params = [startDate, endDate];
    }

    const trendsResult = await pool.query(
      `
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(DISTINCT user_id) as unique_customers
      FROM orders o
      ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period ASC
      `,
      params
    );

    res.json({
      success: true,
      message: "Sales trends retrieved successfully",
      data: {
        period,
        trends: trendsResult.rows.map((trend) => ({
          period: trend.period,
          orderCount: parseInt(trend.order_count),
          totalRevenue: parseFloat(trend.total_revenue),
          averageOrderValue: parseFloat(trend.average_order_value),
          uniqueCustomers: parseInt(trend.unique_customers),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching sales trends:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sales trends",
      error: error.message,
    });
  }
});

// GET /api/reports/inventory-status - Get inventory status and alerts
router.get("/inventory-status", adminAuth, async (req, res) => {
  try {
    const { lowStockThreshold = 10 } = req.query;

    // Get products with low stock
    const lowStockResult = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.sku,
        COALESCE(SUM(pv.stock_quantity), 0) as stock_quantity,
        b.name as brand_name,
        c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, b.name, c.name
      HAVING COALESCE(SUM(pv.stock_quantity), 0) <= $1
      ORDER BY stock_quantity ASC
      `,
      [lowStockThreshold]
    );

    // Get out of stock products
    const outOfStockResult = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.sku,
        COALESCE(SUM(pv.stock_quantity), 0) as stock_quantity,
        b.name as brand_name,
        c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = true
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, b.name, c.name
      HAVING COALESCE(SUM(pv.stock_quantity), 0) = 0
      ORDER BY p.name ASC
      `
    );

    // Get inventory value based on variants and effective prices
    const inventoryValueResult = await pool.query(
      `
      SELECT 
        SUM(
          CASE 
            WHEN p.discount_price IS NOT NULL AND p.discount_price < p.price 
            THEN p.discount_price * COALESCE(variant_stock.total_stock, 0)
            WHEN p.discount_percent IS NOT NULL AND p.discount_percent > 0 
            THEN (p.price * (1 - p.discount_percent / 100)) * COALESCE(variant_stock.total_stock, 0)
            ELSE p.price * COALESCE(variant_stock.total_stock, 0)
          END
        ) as total_inventory_value,
        SUM(COALESCE(variant_stock.total_stock, 0)) as total_items_in_stock,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT pv.id) as total_variants
      FROM products p
      LEFT JOIN (
        SELECT 
          product_id, 
          SUM(stock_quantity) as total_stock
        FROM product_variants 
        WHERE is_active = true
        GROUP BY product_id
      ) variant_stock ON p.id = variant_stock.product_id
      WHERE p.is_active = true
      `
    );

    const inventoryValue = inventoryValueResult.rows[0];

    res.json({
      success: true,
      message: "Inventory status retrieved successfully",
      data: {
        summary: {
          totalInventoryValue: parseFloat(
            inventoryValue.total_inventory_value || 0
          ),
          totalItemsInStock: parseInt(inventoryValue.total_items_in_stock || 0),
          totalProducts: parseInt(inventoryValue.total_products || 0),
          totalVariants: parseInt(inventoryValue.total_variants || 0),
          lowStockThreshold: parseInt(lowStockThreshold),
        },
        lowStockProducts: lowStockResult.rows.map((product) => ({
          id: product.id.toString(),
          name: product.name,
          sku: product.sku,
          stockQuantity: product.stock_quantity,
          brand: product.brand_name,
          category: product.category_name,
        })),
        outOfStockProducts: outOfStockResult.rows.map((product) => ({
          id: product.id.toString(),
          name: product.name,
          sku: product.sku,
          stockQuantity: product.stock_quantity,
          brand: product.brand_name,
          category: product.category_name,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching inventory status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory status",
      error: error.message,
    });
  }
});

// GET /api/reports/inventory-summary - Get detailed inventory summary with variants
router.get("/inventory-summary", adminAuth, async (req, res) => {
  try {
    // Get detailed inventory summary with variants
    const inventorySummaryResult = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        p.discount_price,
        p.discount_percent,
        p.cost_price,
        b.name as brand_name,
        c.name as category_name,
        COALESCE(variant_summary.total_stock, 0) as total_stock,
        COALESCE(variant_summary.variant_count, 0) as variant_count,
        CASE 
          WHEN p.discount_price IS NOT NULL AND p.discount_price < p.price 
          THEN p.discount_price
          WHEN p.discount_percent IS NOT NULL AND p.discount_percent > 0 
          THEN p.price * (1 - p.discount_percent / 100)
          ELSE p.price
        END as effective_price,
        CASE 
          WHEN p.discount_price IS NOT NULL AND p.discount_price < p.price 
          THEN p.discount_price * COALESCE(variant_summary.total_stock, 0)
          WHEN p.discount_percent IS NOT NULL AND p.discount_percent > 0 
          THEN (p.price * (1 - p.discount_percent / 100)) * COALESCE(variant_summary.total_stock, 0)
          ELSE p.price * COALESCE(variant_summary.total_stock, 0)
        END as inventory_value,
        CASE 
          WHEN p.cost_price IS NOT NULL AND p.cost_price > 0
          THEN (
            CASE 
              WHEN p.discount_price IS NOT NULL AND p.discount_price < p.price 
              THEN p.discount_price
              WHEN p.discount_percent IS NOT NULL AND p.discount_percent > 0 
              THEN p.price * (1 - p.discount_percent / 100)
              ELSE p.price
            END - p.cost_price
          )
          ELSE NULL
        END as profit_per_unit,
        CASE 
          WHEN p.cost_price IS NOT NULL AND p.cost_price > 0
          THEN (
            (
              CASE 
                WHEN p.discount_price IS NOT NULL AND p.discount_price < p.price 
                THEN p.discount_price
                WHEN p.discount_percent IS NOT NULL AND p.discount_percent > 0 
                THEN p.price * (1 - p.discount_percent / 100)
                ELSE p.price
              END - p.cost_price
            ) / p.cost_price * 100
          )
          ELSE NULL
        END as margin_percent
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          product_id, 
          SUM(stock_quantity) as total_stock,
          COUNT(*) as variant_count
        FROM product_variants 
        WHERE is_active = true
        GROUP BY product_id
      ) variant_summary ON p.id = variant_summary.product_id
      WHERE p.is_active = true
      ORDER BY inventory_value DESC
      `
    );

    // Get variant details for each product
    const variantDetailsResult = await pool.query(
      `
      SELECT 
        pv.product_id,
        pv.id as variant_id,
        pv.sku as variant_sku,
        pv.size,
        pv.color,
        pv.stock_quantity,
        pv.image_url as variant_image_url,
        p.price,
        p.discount_price,
        p.discount_percent,
        CASE 
          WHEN p.discount_price IS NOT NULL AND p.discount_price < p.price 
          THEN p.discount_price
          WHEN p.discount_percent IS NOT NULL AND p.discount_percent > 0 
          THEN p.price * (1 - p.discount_percent / 100)
          ELSE p.price
        END as effective_price
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.is_active = true AND p.is_active = true
      ORDER BY pv.product_id, pv.size, pv.color
      `
    );

    // Group variants by product
    const variantsByProduct = {};
    variantDetailsResult.rows.forEach((variant) => {
      if (!variantsByProduct[variant.product_id]) {
        variantsByProduct[variant.product_id] = [];
      }
      variantsByProduct[variant.product_id].push({
        id: variant.variant_id.toString(),
        sku: variant.variant_sku,
        size: variant.size,
        color: variant.color,
        stockQuantity: variant.stock_quantity,
        imageUrl: variant.variant_image_url,
        effectivePrice: parseFloat(variant.effective_price),
        originalPrice: parseFloat(variant.price),
        discountPrice: variant.discount_price
          ? parseFloat(variant.discount_price)
          : null,
        discountPercent: variant.discount_percent
          ? parseFloat(variant.discount_percent)
          : null,
      });
    });

    // Calculate totals
    const totalInventoryValue = inventorySummaryResult.rows.reduce(
      (sum, product) => sum + parseFloat(product.inventory_value || 0),
      0
    );
    const totalItemsInStock = inventorySummaryResult.rows.reduce(
      (sum, product) => sum + parseInt(product.total_stock || 0),
      0
    );
    const totalProducts = inventorySummaryResult.rows.length;
    const totalVariants = inventorySummaryResult.rows.reduce(
      (sum, product) => sum + parseInt(product.variant_count || 0),
      0
    );

    res.json({
      success: true,
      message: "Inventory summary retrieved successfully",
      data: {
        summary: {
          totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
          totalItemsInStock: totalItemsInStock,
          totalProducts: totalProducts,
          totalVariants: totalVariants,
        },
        products: inventorySummaryResult.rows.map((product) => ({
          id: product.id.toString(),
          name: product.name,
          sku: product.sku,
          brand: product.brand_name,
          category: product.category_name,
          originalPrice: parseFloat(product.price),
          discountPrice: product.discount_price
            ? parseFloat(product.discount_price)
            : null,
          discountPercent: product.discount_percent
            ? parseFloat(product.discount_percent)
            : null,
          effectivePrice: parseFloat(product.effective_price),
          costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
          profitPerUnit: product.profit_per_unit
            ? parseFloat(Number(product.profit_per_unit).toFixed(2))
            : null,
          marginPercent: product.margin_percent
            ? parseFloat(Number(product.margin_percent).toFixed(2))
            : null,
          totalStock: parseInt(product.total_stock),
          variantCount: parseInt(product.variant_count),
          inventoryValue: parseFloat(
            Number(product.inventory_value).toFixed(2)
          ),
          variants: variantsByProduct[product.id] || [],
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching inventory summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory summary",
      error: error.message,
    });
  }
});

// GET /api/reports/customer-insights - Get customer insights and analytics
router.get("/customer-insights", adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = "";
    let params = [];

    if (startDate && endDate) {
      dateFilter = "WHERE o.created_at >= $1 AND o.created_at <= $2";
      params = [startDate, endDate];
    }

    // Get customer metrics
    const customerMetricsResult = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT u.id) as total_customers,
        COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN u.id END) as active_customers,
        COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as recent_customers,
        AVG(CASE WHEN o.id IS NOT NULL THEN o.total_amount END) as average_customer_value,
        MAX(CASE WHEN o.id IS NOT NULL THEN o.total_amount END) as highest_order_value
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'customer'
      ${dateFilter}
      `,
      params
    );

    // Get top customers by revenue
    const topCustomersResult = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as average_order_value,
        MAX(o.created_at) as last_order_date
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'customer'
      ${dateFilter}
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY total_spent DESC
      LIMIT 10
      `,
      params
    );

    // Get customer acquisition trends
    const acquisitionResult = await pool.query(
      `
      SELECT 
        DATE_TRUNC('month', u.created_at) as month,
        COUNT(*) as new_customers
      FROM users u
      WHERE u.role = 'customer'
      GROUP BY DATE_TRUNC('month', u.created_at)
      ORDER BY month DESC
      LIMIT 12
      `
    );

    const metrics = customerMetricsResult.rows[0];

    res.json({
      success: true,
      message: "Customer insights retrieved successfully",
      data: {
        summary: {
          totalCustomers: parseInt(metrics.total_customers),
          activeCustomers: parseInt(metrics.active_customers),
          recentCustomers: parseInt(metrics.recent_customers),
          averageCustomerValue: parseFloat(metrics.average_customer_value || 0),
          highestOrderValue: parseFloat(metrics.highest_order_value || 0),
        },
        topCustomers: topCustomersResult.rows.map((customer) => ({
          id: customer.id.toString(),
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          totalOrders: parseInt(customer.total_orders),
          totalSpent: parseFloat(customer.total_spent),
          averageOrderValue: parseFloat(customer.average_order_value),
          lastOrderDate: customer.last_order_date,
        })),
        acquisitionTrends: acquisitionResult.rows.map((trend) => ({
          month: trend.month,
          newCustomers: parseInt(trend.new_customers),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching customer insights:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer insights",
      error: error.message,
    });
  }
});

module.exports = router;
