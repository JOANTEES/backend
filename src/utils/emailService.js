const { Resend } = require("resend");
const emailTemplates = require("./emailTemplates");
const { Pool } = require("pg");
require("dotenv").config();

// Initialize Resend
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

class EmailService {
  constructor() {
    this.from = process.env.RESEND_DOMAIN
      ? `JoanTee <noreply@${process.env.RESEND_DOMAIN}>`
      : "JoanTee <onboarding@resend.dev>";
  }

  // Send welcome email to new user
  async sendWelcomeEmail(user) {
    if (!resend) {
      console.error("❌ [EMAIL] Resend not initialized");
      return false;
    }

    try {
      const html = emailTemplates.welcome(user);

      const { data, error } = await resend.emails.send({
        from: this.from,
        to: [user.email],
        subject: "Welcome to JoanTee! 🎉",
        html: html,
      });

      if (error) {
        console.error("❌ [EMAIL] Welcome email failed:", error);
        return false;
      }

      console.log("✅ [EMAIL] Welcome email sent to:", user.email);
      return true;
    } catch (error) {
      console.error("❌ [EMAIL] Welcome email error:", error);
      return false;
    }
  }

  // Send order status update email to customer
  async sendOrderStatusEmail(orderId, newStatus) {
    if (!resend) {
      console.error("❌ [EMAIL] Resend not initialized");
      return false;
    }

    // Only send emails for important statuses
    const importantStatuses = [
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!importantStatuses.includes(newStatus)) {
      console.log(
        `📧 [EMAIL] Skipping email for status: ${newStatus} (not important)`
      );
      return true;
    }

    try {
      // Get order details with customer info
      const orderResult = await pool.query(
        `
        SELECT o.*, u.first_name, u.last_name, u.email, u.phone
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        console.error("❌ [EMAIL] Order not found:", orderId);
        return false;
      }

      const order = orderResult.rows[0];

      // Get order items with product details
      const itemsResult = await pool.query(
        `
        SELECT oi.*, p.name as product_name, pv.name as variant_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = $1
      `,
        [orderId]
      );

      const orderItems = itemsResult.rows;

      // Update order status in the object for template
      order.status = newStatus;

      const html = emailTemplates.orderConfirmation(
        order,
        {
          first_name: order.first_name,
          last_name: order.last_name,
          email: order.email,
          phone: order.phone,
        },
        orderItems
      );

      const { data, error } = await resend.emails.send({
        from: this.from,
        to: [order.email],
        subject: `Order ${order.order_number} - ${newStatus.toUpperCase()}`,
        html: html,
      });

      if (error) {
        console.error("❌ [EMAIL] Order status email failed:", error);
        return false;
      }

      console.log(
        `✅ [EMAIL] Order status email sent to: ${order.email} for status: ${newStatus}`
      );
      return true;
    } catch (error) {
      console.error("❌ [EMAIL] Order status email error:", error);
      return false;
    }
  }

  // Send new order notification to all admins
  async sendNewOrderNotification(orderId) {
    if (!resend) {
      console.error("❌ [EMAIL] Resend not initialized");
      return false;
    }

    try {
      // Get all admin users
      const adminResult = await pool.query(`
        SELECT email, first_name, last_name
        FROM users
        WHERE is_admin = true AND is_active = true
      `);

      if (adminResult.rows.length === 0) {
        console.log("📧 [EMAIL] No admin users found for notification");
        return true;
      }

      // Get order details with customer info
      const orderResult = await pool.query(
        `
        SELECT o.*, u.first_name, u.last_name, u.email, u.phone, u.created_at as customer_since
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        console.error(
          "❌ [EMAIL] Order not found for admin notification:",
          orderId
        );
        return false;
      }

      const order = orderResult.rows[0];

      // Get order items with product details
      const itemsResult = await pool.query(
        `
        SELECT oi.*, p.name as product_name, pv.name as variant_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = $1
      `,
        [orderId]
      );

      const orderItems = itemsResult.rows;

      const html = emailTemplates.adminNewOrder(
        order,
        {
          first_name: order.first_name,
          last_name: order.last_name,
          email: order.email,
          phone: order.phone,
          created_at: order.customer_since,
        },
        orderItems
      );

      // Send to all admins
      const adminEmails = adminResult.rows.map((admin) => admin.email);

      const { data, error } = await resend.emails.send({
        from: this.from,
        to: adminEmails,
        subject: `🚨 New Order Alert: ${order.order_number}`,
        html: html,
      });

      if (error) {
        console.error("❌ [EMAIL] Admin notification failed:", error);
        return false;
      }

      console.log(
        `✅ [EMAIL] Admin notification sent to ${adminEmails.length} admins for order: ${order.order_number}`
      );
      return true;
    } catch (error) {
      console.error("❌ [EMAIL] Admin notification error:", error);
      return false;
    }
  }

  // Test email functionality
  async sendTestEmail(to) {
    if (!resend) {
      console.error("❌ [EMAIL] Resend not initialized");
      return false;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: this.from,
        to: [to],
        subject: "JoanTee Email Test",
        html: `
          <h2>JoanTee Email Test</h2>
          <p>This is a test email to verify that the email service is working correctly.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
          <p>If you received this email, the email service is working! ✅</p>
        `,
      });

      if (error) {
        console.error("❌ [EMAIL] Test email failed:", error);
        return false;
      }

      console.log("✅ [EMAIL] Test email sent to:", to);
      return true;
    } catch (error) {
      console.error("❌ [EMAIL] Test email error:", error);
      return false;
    }
  }
}

module.exports = new EmailService();
