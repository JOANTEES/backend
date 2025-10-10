// Helper function to safely parse delivery address
const parseAddress = (address) => {
  if (!address) return null;
  try {
    return typeof address === "string" ? JSON.parse(address) : address;
  } catch (e) {
    console.error("Failed to parse address:", address, e);
    return null;
  }
};

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

// Email templates for various notifications
const emailTemplates = {
  // Welcome email for new user registration
  welcome: (user) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to JoanTee</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .highlight { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">JoanTee</div>
          <h1>Welcome to JoanTee!</h1>
        </div>
        <div class="content">
          <p>Hello ${user.first_name} ${user.last_name},</p>
          <p>Welcome to JoanTee! We're excited to have you as part of our community.</p>
          
          <div class="highlight">
            <h3>Your Account Details:</h3>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Account Type:</strong> ${
              user.role === "customer" ? "Customer" : user.role
            }</p>
          </div>
          
          <p>You can now:</p>
          <ul>
            <li>Browse our collection of quality products</li>
            <li>Place orders for delivery across Greater Accra</li>
            <li>Track your orders in real-time</li>
            <li>Manage your profile and delivery addresses</li>
          </ul>
          
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Thank you for choosing JoanTee!</p>
          
          <p>Best regards,<br>The JoanTee Team</p>
        </div>
        <div class="footer">
          <p>This email was sent to ${
            user.email
          }. If you did not create an account, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} JoanTee. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Order confirmation email
  orderConfirmation: (order, customer, orderItems) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - JoanTee</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        .order-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #dee2e6; padding: 12px; text-align: left; }
        .items-table th { background-color: #e9ecef; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #e3f2fd; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-confirmed { background-color: #d4edda; color: #155724; }
        .status-shipped { background-color: #cce7ff; color: #004085; }
        .status-delivered { background-color: #d1ecf1; color: #0c5460; }
        .status-cancelled { background-color: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">JoanTee</div>
          <h1>Order ${order.order_number}</h1>
          <p>Status: <span class="status-badge status-${
            order.status
          }">${getStatusText(order.status).toUpperCase()}</span></p>
        </div>
        <div class="content">
          <p>Hello ${customer.first_name} ${customer.last_name},</p>
          <p>Your order has been <strong>${getStatusText(
            order.status
          )}</strong>!</p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Order Date:</strong> ${new Date(
              order.created_at
            ).toLocaleDateString()}</p>
            <p><strong>Payment Status:</strong> ${order.payment_status}</p>
            <p><strong>Delivery Method:</strong> ${order.delivery_method}</p>
            ${
              order.delivery_address
                ? (() => {
                    const addr = parseAddress(order.delivery_address);
                    return `
              <p><strong>Delivery Address:</strong><br>
              ${addr.areaName}, ${addr.cityName}<br>
              ${addr.regionName}<br>
              ${addr.contactPhone ? `Phone: ${addr.contactPhone}<br>` : ""}
              ${addr.landmark ? `Landmark: ${addr.landmark}<br>` : ""}
              ${
                addr.additionalInstructions
                  ? `Instructions: ${addr.additionalInstructions}`
                  : ""
              }</p>
            `;
                  })()
                : ""
            }
          </div>
          
          <h3>Order Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems
                .map(
                  (item) => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.variant_name || "Default"}</td>
                  <td>${item.quantity}</td>
                  <td>GH₵${parseFloat(item.price).toFixed(2)}</td>
                  <td>GH₵${parseFloat(item.price * item.quantity).toFixed(
                    2
                  )}</td>
                </tr>
              `
                )
                .join("")}
              <tr>
                <td colspan="4"><strong>Subtotal</strong></td>
                <td><strong>GH₵${parseFloat(order.subtotal).toFixed(
                  2
                )}</strong></td>
              </tr>
              ${
                parseFloat(order.shipping_fee) > 0
                  ? `
              <tr>
                <td colspan="4">Shipping Fee</td>
                <td>GH₵${parseFloat(order.shipping_fee).toFixed(2)}</td>
              </tr>
              `
                  : ""
              }
              ${
                parseFloat(order.tax_amount) > 0
                  ? `
              <tr>
                <td colspan="4">Tax</td>
                <td>GH₵${parseFloat(order.tax_amount).toFixed(2)}</td>
              </tr>
              `
                  : ""
              }
              <tr class="total-row">
                <td colspan="4"><strong>Total Amount</strong></td>
                <td><strong>GH₵${parseFloat(order.total_amount).toFixed(
                  2
                )}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${
            order.status === "pending"
              ? `
            <p><strong>Payment successful!</strong> Thank you for your order. We have received your payment and your order is being processed. You will receive another notification once we confirm and prepare your order for delivery.</p>
          `
              : ""
          }
          ${
            order.status === "confirmed"
              ? `
            <p>Your order has been confirmed and is being prepared. We'll notify you when it's ready for shipping.</p>
          `
              : ""
          }
          ${
            order.status === "out_for_delivery"
              ? `
            <p><strong>Your order is out for delivery!</strong> Please keep your phone close as our delivery person will be calling you soon to confirm your location and arrange delivery.</p>
          `
              : ""
          }
          ${
            order.status === "shipped"
              ? `
            <p>Great news! Your order has been shipped and is on its way to you.</p>
          `
              : ""
          }
          ${
            order.status === "delivered"
              ? `
            <p>Your order has been delivered! Thank you for choosing JoanTee.</p>
          `
              : ""
          }
          ${
            order.status === "cancelled"
              ? `
            <p>Your order has been cancelled. If you have any questions, please contact our support team.</p>
          `
              : ""
          }
          
          <p>If you have any questions about your order, please don't hesitate to contact us.</p>
          <p>Thank you for choosing JoanTee!</p>
          
          <p>Best regards,<br>The JoanTee Team</p>
        </div>
        <div class="footer">
          <p>This email was sent regarding order ${order.order_number} for ${
    customer.email
  }</p>
          <p>&copy; ${new Date().getFullYear()} JoanTee. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Admin notification for new order
  adminNewOrder: (order, customer, orderItems) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order - JoanTee Admin</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #fff; padding: 20px; border-bottom: 2px solid #333; }
        .content { background-color: #ffffff; padding: 30px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        h1 { font-size: 20px; color: #333; margin: 0 0 10px 0; }
        .order-details { padding: 15px 0; border-bottom: 1px solid #ddd; margin: 15px 0; }
        .customer-details { padding: 15px 0; border-bottom: 1px solid #ddd; margin: 15px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .items-table th { background-color: #f5f5f5; font-weight: bold; }
        .total-row { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Order Notification</h1>
          <p>Order ${order.order_number} - ${order.status.toUpperCase()}</p>
        </div>
        <div class="content">
          <p><strong>A new order has been placed and requires your attention.</strong></p>
          
          <div class="order-details">
            <h3>Order Information</h3>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Order Date:</strong> ${new Date(
              order.created_at
            ).toLocaleString()}</p>
            <p><strong>Payment Status:</strong> ${order.payment_status}</p>
            <p><strong>Payment Method:</strong> ${order.payment_method}</p>
            <p><strong>Delivery Method:</strong> ${order.delivery_method}</p>
            <p><strong>Total Amount:</strong> GH₵${parseFloat(
              order.total_amount
            ).toFixed(2)}</p>
            ${
              order.delivery_address
                ? (() => {
                    const addr = parseAddress(order.delivery_address);
                    return `
              <p><strong>Delivery Address:</strong><br>
              ${addr.areaName}, ${addr.cityName}<br>
              ${addr.regionName}<br>
              ${addr.contactPhone ? `Phone: ${addr.contactPhone}<br>` : ""}
              ${addr.landmark ? `Landmark: ${addr.landmark}<br>` : ""}
              ${
                addr.additionalInstructions
                  ? `Instructions: ${addr.additionalInstructions}`
                  : ""
              }</p>
            `;
                  })()
                : ""
            }
          </div>
          
          <div class="customer-details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${customer.first_name} ${
    customer.last_name
  }</p>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Phone:</strong> ${customer.phone || "Not provided"}</p>
            <p><strong>Customer Since:</strong> ${new Date(
              customer.created_at
            ).toLocaleDateString()}</p>
          </div>
          
          <h3>🛍️ Order Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems
                .map(
                  (item) => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.variant_name || "Default"}</td>
                  <td>${item.quantity}</td>
                  <td>GH₵${parseFloat(item.price).toFixed(2)}</td>
                  <td>GH₵${parseFloat(item.price * item.quantity).toFixed(
                    2
                  )}</td>
                </tr>
              `
                )
                .join("")}
              <tr class="total-row">
                <td colspan="4"><strong>Total Amount</strong></td>
                <td><strong>GH₵${parseFloat(order.total_amount).toFixed(
                  2
                )}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Review the order details</li>
            <li>Confirm payment if needed</li>
            <li>Prepare the order for ${order.delivery_method}</li>
            <li>Update order status as it progresses</li>
          </ul>
          
          <p>Please log into the admin dashboard to manage this order.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification for order ${
            order.order_number
          }</p>
          <p>&copy; ${new Date().getFullYear()} JoanTee Admin System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

module.exports = emailTemplates;
