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

````

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
````

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

## Payment Management System

### ⚠️ IMPORTANT: Frontend Changes Required

**The payment system has been updated to properly handle partial payments. The frontend MUST be updated to display the correct information.**

**Key Changes:**

- **`payment.amount`** = Total amount due (e.g., ₵1,000 for a booking)
- **Amount Paid** = Calculate from `payment_history.transactions` (starts at ₵0)
- **Payment History** = All individual transactions are stored in `payment_history.transactions`

**Frontend Must:**

1. Calculate amount paid from `payment_history.transactions` (not from `payment.amount`)
2. Display payment progress correctly
3. Show individual transaction history
4. Handle "partial" status properly

### Understanding Payment Structure

**IMPORTANT**: The payment system has been updated to properly handle partial payments. Here's how it works:

#### Payment Record Structure

Each payment record has these key fields:

- **`amount`**: Total amount due (e.g., 1000 for a ₵1000 booking)
- **`status`**: Payment status (`pending`, `partial`, `completed`, `failed`, `refunded`, `cancelled`)
- **`payment_history`**: JSONB field containing all individual transactions
- **`customer_email`**: Customer's email (auto-populated)
- **`notes`**: Customer's full name (auto-populated)

#### How to Calculate Amount Paid

**DO NOT** use the `amount` field to show how much has been paid. Instead, calculate it from `payment_history`:

```javascript
// Calculate total amount paid from payment history
function calculateAmountPaid(payment) {
  if (!payment.payment_history?.transactions) return 0;

  return payment.payment_history.transactions.reduce((total, transaction) => {
    return total + Number(transaction.amount || 0);
  }, 0);
}

// Example usage
const payment = {
  id: 10,
  amount: 1000, // Total due
  status: "partial",
  payment_history: {
    transactions: [
      {
        amount: 100,
        method: "cash",
        timestamp: "2024-01-15T10:30:00Z",
        notes: "First payment",
      },
      {
        amount: 400,
        method: "bank_transfer",
        timestamp: "2024-01-20T14:15:00Z",
        notes: "Second payment",
      },
    ],
  },
};

const amountPaid = calculateAmountPaid(payment); // Returns 500
const totalDue = payment.amount; // Returns 1000
const remaining = totalDue - amountPaid; // Returns 500
const progress = (amountPaid / totalDue) * 100; // Returns 50%
```

### Frontend Implementation

#### Payment Display Logic

**For each payment record, display:**

1. **Total Due**: `payment.amount` (e.g., "₵1,000.00")
2. **Amount Paid**: Calculate from `payment_history` (e.g., "₵500.00")
3. **Remaining**: `totalDue - amountPaid` (e.g., "₵500.00")
4. **Progress**: `(amountPaid / totalDue) * 100` (e.g., "50%")
5. **Status**: `payment.status` (e.g., "Partial")

#### Payment History Display

```javascript
// Example payment_history structure
{
  "transactions": [
    {
      "amount": 100,
      "method": "cash",
      "timestamp": "2024-01-15T10:30:00Z",
      "notes": "First partial payment"
    },
    {
      "amount": 400,
      "method": "bank_transfer",
      "timestamp": "2024-01-20T14:15:00Z",
      "notes": "Second partial payment"
    },
    {
      "amount": 500,
      "method": "cash",
      "timestamp": "2024-01-25T16:45:00Z",
      "notes": "Final payment - completed"
    }
  ]
}
```

#### UI Components

**Payment Card Example:**

```javascript
function PaymentCard({ payment }) {
  const amountPaid = calculateAmountPaid(payment);
  const totalDue = payment.amount;
  const remaining = totalDue - amountPaid;
  const progress = (amountPaid / totalDue) * 100;

  return (
    <div className="payment-card">
      <div className="payment-header">
        <h3>Payment #{payment.id}</h3>
        <span className={`status status-${payment.status}`}>
          {payment.status.toUpperCase()}
        </span>
      </div>

      <div className="payment-amounts">
        <div className="amount-row">
          <span>Total Due:</span>
          <span>₵{totalDue.toFixed(2)}</span>
        </div>
        <div className="amount-row">
          <span>Amount Paid:</span>
          <span>₵{amountPaid.toFixed(2)}</span>
        </div>
        <div className="amount-row">
          <span>Remaining:</span>
          <span>₵{remaining.toFixed(2)}</span>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
        <span className="progress-text">{progress.toFixed(1)}%</span>
      </div>

      <div className="payment-actions">
        <button onClick={() => addPartialPayment(payment.id)}>
          Add Payment
        </button>
        <button onClick={() => toggleHistory(payment.id)}>View History</button>
      </div>

      {showHistory && (
        <div className="payment-history">
          {payment.payment_history?.transactions?.map((txn, index) => (
            <div key={index} className="transaction">
              <div className="transaction-amount">₵{txn.amount}</div>
              <div className="transaction-details">
                <div>
                  {txn.method} • {txn.notes}
                </div>
                <div className="transaction-time">
                  {new Date(txn.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Key Changes

1. **No Manual Payment Creation**: Payments are automatically created when bookings/orders are created
2. **Update-Only Payments Manager**: Frontend should remove "Add Payment" button, only show "Add Partial Payment" functionality
3. **Partial Payment Support**: Use `PATCH /api/payments/:id/add-payment` to add partial amounts
4. **Payment History Tracking**: Each payment record includes `payment_history` JSONB field with transaction details
5. **Amount Calculation**: Always calculate amount paid from `payment_history`, never use `amount` field directly

### API Endpoints for Payment Management

#### Get All Payments (Admin Only)

- **URL:** `GET /api/payments`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200):**
  ```json
  {
    "payments": [
      {
        "id": 10,
        "booking_id": 4,
        "order_id": null,
        "amount": 1000.0,
        "currency": "GHS",
        "status": "partial",
        "method": "cash",
        "provider": "manual",
        "customer_email": "customer@example.com",
        "notes": "John Doe",
        "payment_history": {
          "transactions": [
            {
              "amount": 100,
              "method": "cash",
              "timestamp": "2024-01-15T10:30:00Z",
              "notes": "First partial payment"
            },
            {
              "amount": 400,
              "method": "bank_transfer",
              "timestamp": "2024-01-20T14:15:00Z",
              "notes": "Second partial payment"
            }
          ]
        },
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-20T14:15:00Z",
        "booking_title": "Wedding Photography",
        "booking_customer": "John Doe",
        "order_number": null,
        "order_customer": null
      }
    ]
  }
  ```

#### Add Partial Payment (Admin Only)

- **URL:** `PATCH /api/payments/:id/add-payment`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Body:**
  ```json
  {
    "amount": 200,
    "method": "cash",
    "notes": "Additional partial payment"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Payment added successfully",
    "payment": {
      "id": 10,
      "amount": 1000.0,
      "status": "partial",
      "payment_history": {
        "transactions": [
          {
            "amount": 100,
            "method": "cash",
            "timestamp": "2024-01-15T10:30:00Z",
            "notes": "First partial payment"
          },
          {
            "amount": 400,
            "method": "bank_transfer",
            "timestamp": "2024-01-20T14:15:00Z",
            "notes": "Second partial payment"
          },
          {
            "amount": 200,
            "method": "cash",
            "timestamp": "2024-01-25T16:45:00Z",
            "notes": "Additional partial payment"
          }
        ]
      }
    }
  }
  ```

#### Update Payment Status (Admin Only)

- **URL:** `PATCH /api/payments/:id/status`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Body:**
  ```json
  {
    "status": "partial"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Payment status updated successfully",
    "payment": {
      "id": 10,
      "status": "partial"
    }
  }
  ```

### Frontend Implementation Checklist

**✅ Required Changes:**

1. **Update Payment Display Logic:**

   - Calculate `amountPaid` from `payment_history.transactions`
   - Show `totalDue` from `payment.amount`
   - Calculate `remaining` as `totalDue - amountPaid`
   - Show progress as `(amountPaid / totalDue) * 100`

2. **Update Payment History Display:**

   - Display all transactions from `payment_history.transactions`
   - Show transaction amount, method, timestamp, and notes
   - Format timestamps properly for user display

3. **Update Payment Actions:**

   - Remove "Create Payment" button (payments are auto-created)
   - Add "Add Partial Payment" button for existing payments
   - Add "View History" toggle for payment details

4. **Update Status Handling:**
   - Support "partial" status in status updates
   - Auto-calculate status based on payment progress
   - Show appropriate status indicators

**❌ Common Mistakes to Avoid:**

- Don't use `payment.amount` to show amount paid
- Don't assume payment history is always present
- Don't forget to handle empty transaction arrays
- Don't use `amount_paid` field from orders (it's for orders, not payments)

### Status Synchronization

**IMPORTANT**: Payment status and booking/order status are automatically synchronized.

#### How Status Synchronization Works

When you update a payment or add partial payments, the system automatically:

1. **Updates Payment Status**: Based on payment history transactions
2. **Updates Booking/Order Status**: Automatically recalculates and updates linked booking/order payment status
3. **Maintains Consistency**: Payment and booking/order statuses stay in sync

#### Status Calculation Logic

**Payment Status:**

- `pending`: No transactions in payment history
- `partial`: Has transactions but total paid < total due
- `completed`: Total paid >= total due

**Booking/Order Status:**

- `pending`: No payments made
- `partial`: Some payments made but not full amount
- `paid`: Full amount has been paid

#### Automatic Updates

**When you add a partial payment:**

```javascript
// 1. Payment history is updated
payment.payment_history.transactions.push(newTransaction);

// 2. Payment status is recalculated
if (totalPaid < totalDue) payment.status = "partial";
else if (totalPaid >= totalDue) payment.status = "completed";

// 3. Booking/Order status is automatically updated
if (totalPaid < totalDue) booking.payment_status = "partial";
else if (totalPaid >= totalDue) booking.payment_status = "paid";
```

**When you manually update payment status:**

```javascript
// 1. Payment status is updated
payment.status = "partial";

// 2. Booking/Order status is automatically recalculated
// System looks at payment_history to determine correct status
```

#### Frontend Benefits

**No Manual Status Management Required:**

- ✅ Payment status updates automatically
- ✅ Booking/Order status updates automatically
- ✅ Statuses stay synchronized
- ✅ No need to manually update multiple records

**What Frontend Should Do:**

- Display the current status from the API response
- Trust that statuses are automatically synchronized
- No need to manually sync payment and booking statuses

Database changes (migration required)

- Added `orders.amount_paid` column to track partial payments.
- Updated `orders.payment_status` constraint to include `'partial'` status.
- Run migrations: `node src/database/migrate.js` after pulling latest changes.

## Orders List Responses – itemsCount

Both orders list endpoints now include an `itemsCount` field per order (number of distinct line items in the order):

- GET `/api/orders` (customer)
- GET `/api/orders/admin` (admin)

Example shape (admin list item):

```json
{
  "id": "6",
  "orderNumber": "ORD-167038-117",
  "status": "pending",
  "paymentMethod": "online",
  "paymentStatus": "pending",
  "deliveryMethod": "delivery",
  "itemsCount": 3,
  "totals": {
    "subtotal": 79.99,
    "taxAmount": 1.5,
    "shippingFee": 20.0,
    "totalAmount": 101.49
  },
  "customerEmail": "customer@example.com",
  "deliveryZoneName": "tm zone",
  "pickupLocationName": null,
  "createdAt": "2025-09-16T22:46:38.000Z",
  "updatedAt": "2025-09-16T22:46:38.000Z"
}
```

Frontend display guidance (list views):

- **Items column**: show `{order.itemsCount} items`.
- **Total column**: format `{order.totals.totalAmount}` to two decimals (e.g., `₵{order.totals.totalAmount.toFixed(2)}`).
- **Payment column**: show `{order.paymentStatus}` (`pending`, `partial`, `paid`).
- **Delivery column**: show `{order.deliveryMethod}` and either `{order.deliveryZoneName}` (delivery) or `{order.pickupLocationName}` (pickup).

Notes:

- Single order endpoint `GET /api/orders/:id` returns full `items` array; you can compute different items as `items.length` and units as `sum(item.quantity)`.

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
