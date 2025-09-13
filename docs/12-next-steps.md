# Roadmap & Next Steps

This document outlines the development roadmap and planned features for the JoanTee backend.

### Completed Features

- [x] User Authentication (Customer & Admin)
- [x] Product & Category Management
- [x] Admin User Management
- [x] Advanced Customer Management (CRM)
- [x] Shopping Cart System
- [x] Delivery Zones Management

### In Progress

- [ ] **Admin Settings:** Building the API for admins to control tax, shipping, pickup locations, etc.

### Planned Features

- [ ] **Full Order Management:**
  - Implement the `POST /api/orders` endpoint to create orders from the cart.
  - Develop customer endpoints to view order history.
  - Develop admin endpoints to manage and update order statuses.
- [ ] **Payment Integration:**
  - Integrate a payment gateway (e.g., Stripe, Paystack) for online payments.
  - Implement logic for "Cash on Delivery" orders.
- [ ] **Customer Profile Management:**
  - Endpoints for customers to update their profile, address, and preferences.
- [ ] **Notifications:**
  - Set up an email or SMS service for order confirmations and status updates.
- [ ] **Advanced Features:**
  - Product reviews and ratings.
  - More complex loyalty and reward features.
  - Enhanced analytics for the admin dashboard.
