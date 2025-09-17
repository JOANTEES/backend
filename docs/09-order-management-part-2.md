## Order Management – Part 2 (Details & Single-Order Views)

This document adds on to `09-order-management.md` with endpoint details for single-order views and recent changes.

### 1) Admin: Get Single Order (Full Details)

- URL: `GET /api/orders/admin/:id`
- Auth: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- Description: Returns a complete snapshot of a single order, including items, totals (with `amountPaid`), delivery/pickup info, and timestamps.
- Response (200):

```json
{
  "success": true,
  "order": {
    "id": "8",
    "orderNumber": "ORD-285537-730",
    "status": "pending",
    "paymentMethod": "online",
    "paymentStatus": "paid",
    "deliveryMethod": "pickup",
    "deliveryZone": null,
    "pickupLocation": {
      "id": "3",
      "name": "Kwapong",
      "contactPhone": "+233-...",
      "mapsLink": "https://maps.google.com/..."
    },
    "deliveryAddress": null,
    "totals": {
      "subtotal": 109.98,
      "taxAmount": 5.5,
      "shippingFee": 0,
      "largeOrderFee": 0,
      "specialDeliveryFee": 0,
      "totalAmount": 115.48,
      "amountPaid": 115.48
    },
    "customerNotes": null,
    "notes": null,
    "customerEmail": "customer@example.com",
    "estimatedDeliveryDate": null,
    "actualDeliveryDate": null,
    "createdAt": "2025-09-17T10:01:26.000Z",
    "updatedAt": "2025-09-17T10:01:26.000Z",
    "confirmedAt": null,
    "shippedAt": null,
    "deliveredAt": null,
    "items": [
      {
        "id": "21",
        "productId": "14",
        "productName": "Basic Tee",
        "productDescription": "...",
        "productImageUrl": "https://.../image.jpg",
        "size": "M",
        "color": "Black",
        "quantity": 2,
        "unitPrice": 54.99,
        "subtotal": 109.98,
        "requiresSpecialDelivery": false,
        "currentProductName": "Basic Tee",
        "currentImageUrl": "https://.../image.jpg"
      }
    ]
  }
}
```

Notes:

- For delivery orders, `deliveryZone` is populated and `pickupLocation` is `null`.
- For pickup orders, `pickupLocation` is populated.
- `amountPaid` reflects total of completed payments (online or offline).

### 2) Users: Get Single Order (Owner Only)

- URL: `GET /api/orders/:id`
- Auth: `Authorization: Bearer <USER_JWT_TOKEN>`
- Description: Returns a single order owned by the authenticated user. Shape matches the admin version (minus internal fields), including `items`, `totals`, delivery/pickup, and timestamps.

### 3) Orders List – itemsCount (Recap)

Both list endpoints include `itemsCount`:

- `GET /api/orders` (user)
- `GET /api/orders/admin` (admin)

Frontend list guidance:

- Items: render `{order.itemsCount} items`
- Total: use `{order.totals.totalAmount}` (format to 2 decimals)
- Payment: `{order.paymentStatus}` (pending | partial | paid)
- Delivery: `{order.deliveryMethod}` with `{order.deliveryZoneName}` or `{order.pickupLocationName}`

### 4) Status & Payments (Behavior Summary)

- Allowed order statuses: `pending`, `confirmed`, `processing`, `ready_for_pickup`, `shipped`, `out_for_delivery`, `delivered`, `completed`, `cancelled`, `refunded`.
- Setting status to `completed` (admin):
  - For offline orders (`on_delivery`, `on_pickup`): pending payments auto-mark `completed`, and `order.payment_status = 'paid'`.
  - For online orders: `order.payment_status` is already `paid`.
- Setting status to `delivered` does not auto-complete payments by design (manual policy).

### 5) Dev vs Prod – Online Payments

- Webhook (prod): creates order (from session), inserts `order_items`, upserts a completed payment, clears cart.
- Verify (dev): now mirrors webhook behavior, so it creates the order, inserts `order_items`, upserts a completed payment, clears cart.

### 6) Error Handling & Logging (Verify Flow)

- Server logs include reference, Paystack status, order/session creation, item insert counts (via mirrored logic), payment upserts, and cart clears to aid debugging.

### 7) Location Links (Admin & Users)

This section clarifies how Google Maps links are supplied or generated for both pickup and delivery flows, and the precedence rules used by the backend.

#### Admin (Pickup Locations)

- Endpoints: `POST /api/pickup-locations`, `PUT /api/pickup-locations/:id`
- Optional field: `googleMapsLink` (string)
- Behavior:
  - If `googleMapsLink` is provided, it is stored as-is on the pickup location.
  - If omitted, the server auto-generates a link from region/city/area/landmark.

Request example (create):

```json
{
  "name": "Main Store - Accra",
  "description": "Our main store location in Accra",
  "regionId": 1,
  "cityId": 1,
  "areaName": "Osu",
  "landmark": "Near Osu Castle",
  "additionalInstructions": "Look for the blue building",
  "contactPhone": "+233123456789",
  "googleMapsLink": "https://maps.google.com/?q=5.6037,-0.1870"
}
```

#### Users (Delivery Orders – Ad‑Hoc Per Order)

- Endpoint: `POST /api/orders` (delivery)
- Optional field: `locationLink` (string)
- Behavior (precedence):
  1. If `locationLink` is provided, it overrides any saved address link for this order only (stored at `order.delivery_address.googleMapsLink`).
  2. Else, if the saved address has a `google_maps_link`, that is used.
  3. Else, the backend may auto-generate a link from region/city/area/landmark when building the `delivery_address` JSON (verify/webhook or offline creation).

Request example (order create):

```json
{
  "paymentMethod": "on_delivery",
  "deliveryMethod": "delivery",
  "deliveryAddressId": 123,
  "locationLink": "https://maps.google.com/?q=5.6037,-0.1870",
  "customerNotes": "Ring the bell"
}
```

#### Users (Saved Addresses – Persistent)

- See Address Management (docs/14-address-management.md) for creating/updating a saved address with an optional `googleMapsLink` so future orders use the exact link without auto-generation.
