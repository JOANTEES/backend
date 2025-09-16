# Order & Delivery System

This section covers endpoints related to order processing and delivery management.

## Order Management System

The order management system supports 4 payment/delivery combinations with comprehensive order tracking and management.

### Order Creation

#### Create Order from Cart (Offline payments: on_delivery, on_pickup)

- **URL:** `POST /api/orders`
- **Description:** Create a new order from the user's cart with support for 4 payment/delivery combinations. Validates that all cart items support the selected delivery method.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "paymentMethod": "online", // "online", "on_delivery", "on_pickup"
    "deliveryMethod": "delivery", // "delivery", "pickup"
    "deliveryAddressId": 1, // Required for delivery
    "pickupLocationId": 1, // Required for pickup
    "customerNotes": "Please call before delivery"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Order created successfully",
    "order": {
      "id": "1",
      "orderNumber": "ORD-123456-001",
      "status": "pending",
      "paymentMethod": "online",
      "paymentStatus": "pending",
      "deliveryMethod": "delivery",
      "deliveryAddress": {
        "regionId": "1",
        "regionName": "Greater Accra",
        "cityId": "1",
        "cityName": "Tema",
        "areaName": "Kpone",
        "landmark": "Near Top Oil Kpone",
        "additionalInstructions": "Call when you arrive",
        "contactPhone": "+233123456789",
        "googleMapsLink": "https://www.google.com/maps/search/?api=1&query=..."
      },
      "pickupLocation": null,
      "totals": {
        "subtotal": 100.0,
        "taxAmount": 10.0,
        "shippingFee": 20.0,
        "largeOrderFee": 0.0,
        "specialDeliveryFee": 0.0,
        "totalAmount": 130.0
      },
      "customerNotes": "Please call before delivery",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

**Error Response (400) - Delivery Eligibility Issues:**

```json
{
  "success": false,
  "message": "Delivery method not compatible with cart items",
  "deliveryEligibilityIssues": [
    {
      "type": "not_delivery_eligible",
      "message": "Some items in your cart are not available for delivery",
      "items": [
        {
          "productId": 2,
          "productName": "Fragile Glass Vase",
          "message": "This item is not available for delivery"
        }
      ]
    }
  ]
}
```

#### Create Checkout Session (Online payments: Paystack modal/redirect)

- URL: `POST /api/orders`
- Description: When `paymentMethod` is `online`, this endpoint now creates a checkout session instead of an order. The cart is NOT cleared. Use the returned data to initialize Paystack.
- Headers: `Authorization: Bearer <token>`
- Request Body:
  ```json
  {
    "paymentMethod": "online",
    "deliveryMethod": "delivery",
    "deliveryAddressId": 1,
    "pickupLocationId": 1
  }
  ```
- Response (201):
  ```json
  {
    "success": true,
    "message": "Checkout session created. Initialize Paystack to proceed with payment.",
    "session": {
      "id": "123",
      "amount": 130.0,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
  ```

Order is created after Paystack success (via webhook/callback). Cart is cleared only after order creation.

#### Initialize Paystack for Checkout Session (Modal or Redirect)

- URL: `POST /api/payments/paystack/initialize-session`
- Description: Two modes supported.
  - Inline-only (default, recommended): Backend does not call Paystack. It generates and saves a fresh unique `reference` per attempt and returns inline params (no `authorization_url`).
  - Redirect (legacy): If you prefer server-side init + redirect, you can keep the older behavior; in that case the response includes `authorization_url`.
- Headers: `Authorization: Bearer <token>`
- Request Body:
  ```json
  {
    "sessionId": 123
  }
  ```
- Inline-only Response (200):
  ```json
  {
    "success": true,
    "message": "Session payment prepared",
    "data": {
      "reference": "JTN-123-...",
      "amount": 13000, // kobo/pesewas
      "currency": "GHS",
      "email": "customer@example.com"
    }
  }
  ```
- Redirect Response (200):
  ```json
  {
    "success": true,
    "message": "Session payment initialized",
    "data": {
      "reference": "psk_ref",
      "authorization_url": "https://checkout.paystack.com/...",
      "access_code": "..."
    }
  }
  ```

Frontend (Inline): open Paystack modal with public key, pass `reference`, `amount` (kobo), `currency: "GHS"`, and `email`. On success, rely on webhook/callback to create the order; if webhooks are not available in dev, call the verify endpoint below.

#### Verify Paystack Transaction (fallback for dev/local without webhooks)

- URL: `POST /api/payments/paystack/verify`
- Description: Client-triggered verification using the Paystack `reference`. Mirrors the callback logic to create the order from the checkout session and mark it paid.
- Headers: none required beyond standard auth if your app enforces it
- Request Body:
  ```json
  {
    "reference": "JTN-123-..."
  }
  ```
- Response (200):
  ```json
  {
    "success": true,
    "message": "Verification processed",
    "orderId": "456" // may be null if verification failed
  }
  ```

### Order Retrieval

#### Get User's Orders

- **URL:** `GET /api/orders`
- **Description:** Retrieve user's order history with optional filtering
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `status` (optional): Filter by order status
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Orders retrieved successfully",
    "count": 2,
    "orders": [
      {
        "id": "1",
        "orderNumber": "ORD-123456-001",
        "status": "pending",
        "paymentMethod": "online",
        "paymentStatus": "pending",
        "deliveryMethod": "delivery",
        "deliveryAddress": {
          /* address object */
        },
        "pickupLocationName": null,
        "deliveryZoneName": "Accra North",
        "totals": {
          /* totals object */
        },
        "customerNotes": "Please call before delivery",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": null,
        "confirmedAt": null,
        "shippedAt": null,
        "deliveredAt": null
      }
    ]
  }
  ```

#### Get Single Order

- **URL:** `GET /api/orders/:id`
- **Description:** Get detailed information for a single order including all items
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Order retrieved successfully",
    "order": {
      "id": "1",
      "orderNumber": "ORD-123456-001",
      "status": "pending",
      "paymentMethod": "online",
      "paymentStatus": "pending",
      "deliveryMethod": "delivery",
      "deliveryAddress": {
        /* full address object */
      },
      "pickupLocation": null,
      "deliveryZone": {
        "id": "1",
        "name": "Accra North",
        "deliveryFee": 20.0
      },
      "totals": {
        /* complete totals breakdown */
      },
      "customerNotes": "Please call before delivery",
      "notes": null,
      "estimatedDeliveryDate": null,
      "actualDeliveryDate": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": null,
      "confirmedAt": null,
      "shippedAt": null,
      "deliveredAt": null,
      "items": [
        {
          "id": "1",
          "productId": "1",
          "productName": "Classic White T-Shirt",
          "productDescription": "Premium cotton classic fit t-shirt",
          "productImageUrl": "https://example.com/image.jpg",
          "size": "M",
          "color": "White",
          "quantity": 2,
          "unitPrice": 29.99,
          "subtotal": 59.98,
          "requiresSpecialDelivery": false,
          "currentProductName": "Classic White T-Shirt",
          "currentImageUrl": "https://example.com/image.jpg"
        }
      ]
    }
  }
  ```

### Admin: Orders Listing

#### Get All Orders (Admin Only)

- **URL:** `GET /api/orders/admin`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Query Params (optional):**
  - `status` — filter by order status
  - `paymentStatus` — filter by payment status
  - `deliveryMethod` — `delivery | pickup`
  - `paymentMethod` — `online | on_delivery | on_pickup`
  - `startDate` — ISO date/time
  - `endDate` — ISO date/time
  - `q` — search by order number or customer email
  - `page` — default 1
  - `limit` — default 20
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Admin orders retrieved successfully",
    "count": 2,
    "orders": [
      {
        "id": "1",
        "orderNumber": "ORD-123456-001",
        "status": "pending",
        "paymentMethod": "online",
        "paymentStatus": "pending",
        "deliveryMethod": "delivery",
        "totals": {
          "subtotal": 100.0,
          "taxAmount": 10.0,
          "shippingFee": 20.0,
          "totalAmount": 130.0
        },
        "customerEmail": "customer@example.com",
        "pickupLocationName": null,
        "deliveryZoneName": "Accra North",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": null
      }
    ],
    "page": 1,
    "limit": 20
  }
  ```

### Order Status Flow

The system supports the following order statuses:

1. **pending** - Order created, awaiting confirmation
2. **confirmed** - Order confirmed by admin
3. **processing** - Order being prepared
4. **ready_for_pickup** - Order ready for customer pickup
5. **shipped** - Order shipped for delivery
6. **out_for_delivery** - Order out for delivery
7. **delivered** - Order successfully delivered
8. **cancelled** - Order cancelled
9. **refunded** - Order refunded

### Payment & Delivery Combinations

The system supports 4 combinations:

1. **Pay Online + Delivery** - Customer pays instantly, gets delivery
2. **Pay Online + Pickup** - Customer pays instantly, picks up from store
3. **Pay on Delivery + Delivery** - Customer pays when item arrives
4. **Pay on Delivery + Pickup** - Customer pays when picking up

### Order Features

- **Dynamic Calculations:** Uses admin-defined settings for tax, shipping, and free shipping
- **Stock Management:** Automatically reduces product stock on order creation
- **Product Snapshots:** Preserves product details at time of order
- **Transaction Safety:** Database transactions ensure data consistency
- **Address Integration:** Works with customer addresses and pickup locations
- **Google Maps Links:** Automatic generation for delivery addresses

### Payments for Orders

**Automatic Payment Creation:** Orders and bookings now automatically create payment records when created. No manual payment creation needed.

#### Admin: Add Partial Payment to Existing Payment

```http
PATCH /api/payments/:id/add-payment
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "amount": 50.0,
  "method": "cash", // cash | bank_transfer | check | paystack
  "notes": "Partial payment received"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payment added successfully",
  "payment": {
    "id": 456,
    "order_id": 123,
    "amount": 200.0,
    "currency": "GHS",
    "status": "completed",
    "payment_history": {
      "transactions": [
        {
          "amount": 150.0,
          "method": "bank_transfer",
          "timestamp": "2024-01-15T10:30:00Z",
          "notes": "Initial payment"
        },
        {
          "amount": 50.0,
          "method": "cash",
          "timestamp": "2024-01-20T14:15:00Z",
          "notes": "Partial payment received"
        }
      ]
    }
  }
}
```

#### Admin: List All Payments

```http
GET /api/payments
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "payments": [
    {
      "id": 456,
      "booking_id": 789,
      "order_id": null,
      "amount": 5000.00,
      "currency": "GHS",
      "status": "partial",
      "method": "cash",
      "provider": "manual",
      "payment_history": {
        "transactions": [...]
      },
      "booking_title": "Wedding Event",
      "booking_customer": "John Doe",
      "order_number": null,
      "order_customer": null,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

Response:

```json
{
  "payment": {
    "id": 1,
    "order_id": 123,
    "amount": 100.0,
    "currency": "GHS",
    "method": "cash",
    "status": "completed",
    "provider": "paystack",
    "created_at": "..."
  }
}
```

On creation/update, the backend recalculates the order's `payment_status` by summing all completed payments for the order and comparing against `orders.total_amount`.

#### Admin: Update Payment Status

```http
PATCH /api/payments/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "status": "completed" }
```

This also triggers an automatic recalculation of the linked order's `payment_status`.

#### Customer: Initialize Online Payment (Paystack)

```http
POST /api/orders/:id/pay/initialize
Authorization: Bearer <customer_token>
```

Response:

```json
{
  "success": true,
  "message": "Payment initialized",
  "data": {
    "reference": "abc123",
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "..."
  }
}
```

Notes:

- The backend saves the Paystack `reference` into `orders.payment_reference`.
- On Paystack webhook `charge.success`, the backend:
  - Inserts a `payments` row linked to the order.
  - Sets `orders.payment_status = 'paid'`.

Callback URL (redirect) setup

- Backend includes `callback_url` when initializing Paystack (from `PAYSTACK_CALLBACK_URL` or `test_callback_url`).
- Paystack redirects the user to this URL after payment.
- The backend handles `GET /api/payments/paystack/callback` to:
  - Verify the transaction with Paystack using the `reference` query param.
  - Update the order to `payment_status = 'paid'` on success.
  - Redirect user to a frontend success/failure page (`PAYSTACK_SUCCESS_URL`/`PAYSTACK_FAILURE_URL` or test variants).

Environment variables

- Server:
  - `test_secret_key` — Paystack test secret key
  - `PAYSTACK_SECRET_KEY` — live secret (fallback)
  - `PAYSTACK_CALLBACK_URL` — live redirect URL (e.g., `https://yourapp.com/api/payments/paystack/callback`)
  - `test_callback_url` — test redirect URL (e.g., `http://localhost:3000/api/payments/paystack/callback`)
  - `PAYSTACK_SUCCESS_URL` / `test_success_url` — frontend success page
  - `PAYSTACK_FAILURE_URL` / `test_failure_url` — frontend failure page
- Client:
  - `test_public_key`

### Frontend/Dev Setup for Paystack (Test Mode)

Environment variables

- Backend (server):
  - `test_secret_key` (required in test) — Paystack test secret key used by the server.
  - `PAYSTACK_SECRET_KEY` (optional fallback) — used if `test_secret_key` is not set.
- Frontend (client):
  - `test_public_key` — Paystack test public key used by the browser checkout widget/SDK.

Local testing with webhook

1. Start the backend locally.
2. Expose your local server with a tunnel (e.g., `ngrok http 3000`).
3. Copy the public URL (e.g., `https://abcd.ngrok.io`).
4. In Paystack Dashboard, set the webhook URL to `https://abcd.ngrok.io/api/payments/paystack/webhook`.
5. Create an order and initialize payment:
   - POST `/api/orders` (with `paymentMethod: "online"`).
   - POST `/api/orders/:id/pay/initialize` and redirect to `authorization_url`.
6. Complete the Paystack test payment; the webhook will hit your tunnel and the backend will mark the order as paid.

If you cannot receive webhooks locally

- You can simulate completion via admin API:
  - After Paystack init (or for cash flows), use `PATCH /api/payments/:id/status` with `{ "status": "completed" }`.
  - This recalculates and updates the linked order's `payment_status`.

Frontend flow summary (test)

1. User checks out and chooses Online Payment.
2. Create order: `POST /api/orders`.
3. Initialize Paystack: `POST /api/orders/:id/pay/initialize` → open `authorization_url`.
4. On success, either rely on webhook to update the order, or (if no webhook in dev) call admin endpoint to simulate completion.
5. Confirm: `GET /api/orders/:id` → `payment_status` should be `paid`.

---

### Payments Lifecycle & Admin Flows

Offline orders (on_delivery, on_pickup)

- When an order is created with `paymentMethod: on_delivery | on_pickup`, the backend now also inserts a pending payment row:
  - `payments`: { order_id, amount=order.total_amount, currency="GHS", method="cash", provider="manual", status="pending" }
- Admin can later mark the payment as completed in the Payments table or by updating the order status (see below).

Online orders (Paystack)

- Inline (recommended):
  1. `POST /api/orders` with `paymentMethod: "online"` → creates a checkout session (no order yet)
  2. `POST /api/payments/paystack/initialize-session` → returns `{ reference, amount (kobo), currency:"GHS", email }`
  3. Frontend opens Paystack modal with those values
  4. On success, webhook/callback creates a paid order and inserts a completed payment. If webhooks are unavailable locally, call `POST /api/payments/paystack/verify` with `{ reference }` to finalize.
- Redirect (legacy): If you prefer server-side init, response includes `authorization_url` and you redirect the user.

Provider mapping (admin-created payments)

- `POST /api/payments` now sets `provider` based on `method`:
  - `method` in ["cash","bank_transfer","check"] → `provider: "manual"`
  - `method === "paystack"` → `provider: "paystack"`

Bidirectional status sync

- Payment -> Order: When a payment's status becomes `completed`:
  - Order `payment_status` is recalculated to `paid` or `partial` based on total paid vs order total.
  - Order `amount_paid` is updated to reflect the sum of completed payments.
  - Order `status` is advanced to `completed` if it is not already terminal (`completed|cancelled|refunded`).
- Order -> Payments: Admin can update an order's status:
  - `PATCH /api/orders/:id/status` (admin-only)
  - When the order is set to `completed`, any linked non-completed payments are set to `completed`, and `payment_status` becomes `paid`.

Partial payments support

- Orders now support partial payments for large bookings (e.g., deposits):
  - `orders.amount_paid` tracks the total amount paid across all completed payments.
  - `orders.payment_status` can be `pending`, `partial`, or `paid`.
  - Multiple payments can be made against the same order.
- Admin workflow for partial payments:
  1. Create order for large booking (e.g., ₵5,000 event)
  2. Customer pays ₵2,000 deposit → order shows `payment_status: "partial"`, `amount_paid: 2000`
  3. Customer pays remaining ₵3,000 → order shows `payment_status: "paid"`, `amount_paid: 5000`
- Frontend can display payment progress: `amount_paid / total_amount * 100`

Admin endpoints recap

- `PATCH /api/orders/:id/status` (admin)
  - Body: `{ "status": "completed" | "processing" | ... }`
  - On `completed`: marks linked payments as `completed` and order `payment_status` as `paid`.
- `POST /api/payments` (admin)
  - Creates manual payments. Use `method` to set the payment type; `provider` is auto-derived.

Frontend notes

- Inline: Always use the initializer response for `reference`, `amount` (kobo), `currency: "GHS"`, and `email`.
- After inline success in local dev: call `POST /api/payments/paystack/verify` with `{ reference }` when webhooks cannot reach your machine.

## New Payment Management Flow

### Key Changes

1. **No Manual Payment Creation**: Payments are automatically created when bookings/orders are created
2. **Update-Only Payments Manager**: Frontend should remove "Add Payment" button, only show "Update Payment" functionality
3. **Partial Payment Support**: Use `PATCH /api/payments/:id/add-payment` to add partial amounts
4. **Payment History Tracking**: Each payment record includes `payment_history` JSONB field with transaction details

### Frontend Implementation

**Payments Manager UI should:**

- Show existing payments (from `GET /api/payments`)
- For each payment, show "Add Payment" button to add partial amounts
- Display payment history in a collapsible section
- Show payment progress: `(amount / total) * 100`

**Payment History Display:**

```javascript
// Example payment_history structure
{
  "transactions": [
    {
      "amount": 2000,
      "method": "cash",
      "timestamp": "2024-01-15T10:30:00Z",
      "notes": "Initial deposit"
    },
    {
      "amount": 3000,
      "method": "bank_transfer",
      "timestamp": "2024-01-20T14:15:00Z",
      "notes": "Final payment"
    }
  ]
}
```

Database changes (migration required)

- Added `orders.amount_paid` column to track partial payments.
- Updated `orders.payment_status` constraint to include `'partial'` status.
- Run migrations: `node src/database/migrate.js` after pulling latest changes.

Order response fields

- Orders now include `amount_paid` field showing total amount paid.
- `payment_status` can be `pending`, `partial`, or `paid`.
- Calculate payment progress: `(amount_paid / total_amount) * 100`

## Delivery Zones System (Available Now)

These endpoints allow admins to manage delivery zones and customers to view them.

### 1. Get Available Delivery Zones

- **URL:** `GET /api/delivery-zones`
- **Description:** Retrieve all active delivery zones for customer selection with structured area coverage.
- **Headers:** None required.
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Delivery zones retrieved successfully",
    "count": 1,
    "zones": [
      {
        "id": "1",
        "name": "Accra North",
        "description": "Accra North and surrounding areas",
        "deliveryFee": 20.0,
        "estimatedDays": "1-2 days",
        "coverageAreas": ["East Legon", "Labone"],
        "structuredAreas": [
          {
            "id": 1,
            "regionId": 1,
            "regionName": "Greater Accra",
            "cityId": 1,
            "cityName": "Accra",
            "areaName": "East Legon"
          },
          {
            "id": 2,
            "regionId": 1,
            "regionName": "Greater Accra",
            "cityId": 1,
            "cityName": "Accra",
            "areaName": "Labone"
          }
        ],
        "isActive": true,
        "createdAt": "2024-01-16T14:00:00.000Z"
      }
    ]
  }
  ```

### 2. Get Single Delivery Zone

- **URL:** `GET /api/delivery-zones/:id`
- **Description:** Retrieve details of a specific delivery zone by its ID.
- **Headers:** None required.
- **Response (200):** A single delivery zone object.

### 3. Create Delivery Zone (Admin Only)

- **URL:** `POST /api/delivery-zones`
- **Description:** Create a new delivery zone.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "name": "Tema",
    "description": "Tema and surrounding areas",
    "deliveryFee": 25.0,
    "estimatedDays": "2-3 days",
    "coverageAreas": ["Tema", "Kpone", "Ashaiman"]
  }
  ```
- **Response (201):** The newly created delivery zone object.

### 4. Update Delivery Zone (Admin Only)

- **URL:** `PUT /api/delivery-zones/:id`
- **Description:** Update an existing delivery zone.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:** (Include only the fields to be updated)
  ```json
  {
    "deliveryFee": 20.0,
    "isActive": false
  }
  ```
- **Response (200):** The updated delivery zone object.

### 5. Delete Delivery Zone (Admin Only)

- **URL:** `DELETE /api/delivery-zones/:id`
- **Description:** Deactivates a delivery zone (soft delete). It is not permanently removed from the database.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Delivery zone deactivated successfully",
    "zone": {
      "id": "2",
      "name": "Tema",
      "isActive": false
    }
  }
  ```

### 6. Get All Delivery Zones (Admin Only)

- **URL:** `GET /api/delivery-zones/admin`
- **Description:** Retrieve all delivery zones, including inactive ones.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):** A list of all delivery zone objects.

### 7. Add Area to Delivery Zone (Admin Only)

- **URL:** `POST /api/delivery-zones/:id/areas`
- **Description:** Add a specific area to a delivery zone's coverage.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "regionId": 1,
    "cityId": 1,
    "areaName": "East Legon"
  }
  ```
- **Response (201):**
  ```json
  {
    "success": true,
    "message": "Area added to delivery zone successfully",
    "area": {
      "id": "1",
      "deliveryZoneId": "1",
      "regionId": "1",
      "cityId": "1",
      "areaName": "East Legon",
      "createdAt": "2024-01-16T15:00:00.000Z"
    }
  }
  ```

### 8. Remove Area from Delivery Zone (Admin Only)

- **URL:** `DELETE /api/delivery-zones/:id/areas/:areaId`
- **Description:** Remove a specific area from a delivery zone's coverage.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Area removed from delivery zone successfully",
    "area": {
      "id": "1",
      "areaName": "East Legon"
    }
  }
  ```

### 9. Get Areas for Delivery Zone (Admin Only)

- **URL:** `GET /api/delivery-zones/:id/areas`
- **Description:** Get all areas covered by a specific delivery zone.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Delivery zone areas retrieved successfully",
    "count": 2,
    "areas": [
      {
        "id": "1",
        "deliveryZoneId": "1",
        "regionId": "1",
        "regionName": "Greater Accra",
        "cityId": "1",
        "cityName": "Accra",
        "areaName": "East Legon",
        "createdAt": "2024-01-16T15:00:00.000Z"
      }
    ]
  }
  ```

---

## Admin Settings System (Available Now)

These endpoints allow admins to manage application-wide business settings.

### 1. Get App Settings

- **URL:** `GET /api/admin/settings`
- **Description:** Retrieve current application settings.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Settings retrieved successfully",
    "settings": {
      "id": 1,
      "taxRate": 10.0,
      "freeShippingThreshold": 100.0,
      "largeOrderQuantityThreshold": 10,
      "largeOrderDeliveryFee": 50.0,
      "pickupAddress": "123 Main St, Accra",
      "currencySymbol": "$",
      "currencyCode": "USD",
      "updatedAt": "2024-01-16T15:00:00.000Z"
    }
  }
  ```

### 2. Update App Settings

- **URL:** `PUT /api/admin/settings`
- **Description:** Update application settings.
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "taxRate": 12.5,
    "freeShippingThreshold": 150.0,
    "largeOrderQuantityThreshold": 15,
    "largeOrderDeliveryFee": 75.0,
    "pickupAddress": "456 New St, Accra",
    "currencySymbol": "₵",
    "currencyCode": "GHS"
  }
  ```
- **Response (200):** The updated settings object.
