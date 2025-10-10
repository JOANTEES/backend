const { Resend } = require("resend");
const emailTemplates = require("./emailTemplates");
const { Pool } = require("pg");
require("dotenv").config();

// Helper function to convert status to human-readable format
const getStatusText = (status) => {
  const statusMap = {
    pending: "Pending",
    confirmed: "Confirmed",
    out_for_delivery: "Out for Delivery",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return (
    statusMap[status] ||
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
  );
};

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
    console.log(
      `📧 [EMAIL-STATUS] Starting sendOrderStatusEmail - orderId: ${orderId}, newStatus: ${newStatus}`
    );

    if (!resend) {
      console.error("❌ [EMAIL] Resend not initialized");
      return false;
    }

    // Only send emails for important statuses
    const importantStatuses = [
      "pending", // Initial order confirmation
      "confirmed", // Admin confirmed order
      "out_for_delivery", // Order out for delivery
      "delivered", // Order delivered
      "cancelled", // Order cancelled
    ];
    if (!importantStatuses.includes(newStatus)) {
      console.log(
        `📧 [EMAIL] Skipping email for status: ${newStatus} (not important)`
      );
      return true;
    }

    console.log(`📧 [EMAIL-STATUS] Status is important, proceeding with email`);

    try {
      // Get order details with customer info
      console.log(`📧 [EMAIL-STATUS] Fetching order details from database...`);
      console.log(`📧 [EMAIL-STATUS] Querying order ID: ${orderId}`);
      console.log(
        `📧 [EMAIL-STATUS] Pool connections - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`
      );

      const startTime = Date.now();
      console.log(
        `📧 [EMAIL-STATUS] Starting database query at ${new Date().toISOString()}`
      );

      const orderResult = await pool.query(
        `
        SELECT o.*, u.first_name, u.last_name, u.email, u.phone
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `,
        [orderId]
      );

      const queryTime = Date.now() - startTime;
      console.log(
        `📧 [EMAIL-STATUS] Query completed in ${queryTime}ms, rows found: ${orderResult.rows.length}`
      );

      if (orderResult.rows.length === 0) {
        console.error("❌ [EMAIL] Order not found:", orderId);
        return false;
      }

      const order = orderResult.rows[0];
      console.log(
        `📧 [EMAIL-STATUS] Order found - customer: ${order.email}, order_number: ${order.order_number}`
      );

      // Get order items with product details
      console.log(
        `📧 [EMAIL-STATUS] Fetching order items for order ${orderId}...`
      );
      const itemsStartTime = Date.now();

      const itemsResult = await pool.query(
        `
        SELECT oi.*, p.name as product_name, 
               COALESCE(pv.size || ' - ' || pv.color, '') as variant_name,
               oi.unit_price as price
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE oi.order_id = $1
      `,
        [orderId]
      );

      const itemsQueryTime = Date.now() - itemsStartTime;
      console.log(
        `📧 [EMAIL-STATUS] Order items query completed in ${itemsQueryTime}ms, items found: ${itemsResult.rows.length}`
      );

      const orderItems = itemsResult.rows;

      // Update order status in the object for template
      order.status = newStatus;

      console.log(`📧 [EMAIL-STATUS] Generating email template...`);
      const templateStartTime = Date.now();

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

      const templateTime = Date.now() - templateStartTime;
      console.log(
        `📧 [EMAIL-STATUS] Email template generated in ${templateTime}ms`
      );

      console.log(
        `📧 [EMAIL-STATUS] Sending email to ${order.email} via Resend...`
      );
      const emailStartTime = Date.now();

      const { data, error } = await resend.emails.send({
        from: this.from,
        to: [order.email],
        subject: `Order ${order.order_number} - ${getStatusText(newStatus)}`,
        html: html,
      });

      const emailSendTime = Date.now() - emailStartTime;
      console.log(`📧 [EMAIL-STATUS] Email sent in ${emailSendTime}ms`);

      if (error) {
        console.error("❌ [EMAIL] Order status email failed:", error);
        console.error("❌ [EMAIL] Error details:", JSON.stringify(error));
        return false;
      }

      console.log(
        `✅ [EMAIL] Order status email sent to: ${order.email} for status: ${newStatus}`
      );
      console.log(`✅ [EMAIL] Resend response:`, data);
      return true;
    } catch (error) {
      console.error("❌ [EMAIL] Order status email error:", error);
      console.error("❌ [EMAIL] Error stack:", error.stack);
      console.error("❌ [EMAIL] Error name:", error.name);
      console.error("❌ [EMAIL] Error message:", error.message);
      return false;
    }
  }

  // Send new order notification to all admins
  async sendNewOrderNotification(orderId) {
    console.log(
      `📧 [EMAIL-ADMIN] Starting sendNewOrderNotification - orderId: ${orderId}`
    );

    if (!resend) {
      console.error("❌ [EMAIL] Resend not initialized");
      return false;
    }

    try {
      // Get all admin users
      console.log(`📧 [EMAIL-ADMIN] Fetching admin users from database...`);
      const adminResult = await pool.query(`
        SELECT email, first_name, last_name
        FROM users
        WHERE role = 'admin' AND is_active = true
      `);

      console.log(
        `📧 [EMAIL-ADMIN] Found ${adminResult.rows.length} admin users`
      );
      if (adminResult.rows.length === 0) {
        console.log("📧 [EMAIL] No admin users found for notification");
        return true;
      }

      console.log(
        `📧 [EMAIL-ADMIN] Admin emails:`,
        adminResult.rows.map((a) => a.email).join(", ")
      );

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
        SELECT oi.*, p.name as product_name, 
               COALESCE(pv.size || ' - ' || pv.color, '') as variant_name,
               oi.unit_price as price
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

      console.log(
        `📧 [EMAIL-ADMIN] Sending email to ${adminEmails.length} admins via Resend...`
      );
      const { data, error } = await resend.emails.send({
        from: this.from,
        to: adminEmails,
        subject: `New Order: ${order.order_number}`,
        html: html,
      });

      if (error) {
        console.error("❌ [EMAIL] Admin notification failed:", error);
        console.error("❌ [EMAIL] Error details:", JSON.stringify(error));
        return false;
      }

      console.log(
        `✅ [EMAIL] Admin notification sent to ${adminEmails.length} admins for order: ${order.order_number}`
      );
      console.log(`✅ [EMAIL] Resend response:`, data);
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
