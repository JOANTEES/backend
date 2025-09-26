# Reports & Analytics API

This section provides comprehensive reporting and analytics endpoints for business intelligence and decision-making. All endpoints require admin authentication.

## Overview

The Reports & Analytics system provides:

- **Profit Margin Analysis**: Detailed profit calculations for all products
- **Business Metrics**: Overall performance indicators and KPIs
- **Sales Trends**: Time-based sales analysis and patterns
- **Inventory Management**: Stock status, alerts, and valuation
- **Customer Insights**: Customer behavior and acquisition analytics

## Authentication

All endpoints require admin authentication. Include the admin JWT token in the Authorization header:

```
Authorization: Bearer <admin_jwt_token>
```

## Endpoints

### 1. Profit Margins Analysis

#### `GET /api/reports/profit-margins`

Get detailed profit margin analysis for all products with sales data.

**Query Parameters:**

- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 20)
- `sortBy` (optional): Sort field - `margin`, `profit`, `costPrice`, `sellingPrice`, `name` (default: `margin`)
- `sortOrder` (optional): Sort direction - `asc` or `desc` (default: `desc`)

**Response:**

```json
{
  "success": true,
  "message": "Profit margins retrieved successfully",
  "data": {
    "products": [
      {
        "id": "16",
        "name": "Nike Air Max",
        "sku": "NIKE-AM-001",
        "brand": "Nike",
        "category": "T-Shirts",
        "costPrice": 80,
        "originalPrice": 120,
        "discountPrice": 100,
        "discountPercent": 15,
        "effectivePrice": 100,
        "profitMargin": {
          "costPrice": 80,
          "sellingPrice": 100,
          "profit": 20,
          "margin": 25
        },
        "stockQuantity": 76,
        "sales": {
          "totalOrders": 6,
          "totalQuantitySold": 9,
          "totalRevenue": 1060
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "totalCount": 6,
      "totalPages": 2
    }
  }
}
```

**Key Fields:**

- `effectivePrice`: Final selling price after discounts
- `profitMargin`: Calculated profit and margin percentage
- `sales`: Historical sales performance data

### 2. Overall Business Metrics

#### `GET /api/reports/overall-metrics`

Get comprehensive business performance metrics and KPIs.

**Query Parameters:**

- `startDate` (optional): Start date for metrics (ISO format)
- `endDate` (optional): End date for metrics (ISO format)

**Response:**

```json
{
  "success": true,
  "message": "Overall metrics retrieved successfully",
  "data": {
    "summary": {
      "totalOrders": 4,
      "totalCustomers": 1,
      "totalRevenue": 1995,
      "averageOrderValue": 332.5,
      "totalItemsSold": 9,
      "grossRevenue": 1060,
      "totalCost": 720,
      "grossProfit": 340,
      "profitMarginPercent": 32.08
    },
    "topProducts": [
      {
        "id": "16",
        "name": "Nike Air Max",
        "sku": "NIKE-AM-001",
        "totalQuantitySold": 9,
        "totalRevenue": 1060,
        "orderCount": 4
      }
    ],
    "salesByDeliveryMethod": [
      {
        "method": "pickup",
        "orderCount": 4,
        "totalRevenue": 1113
      }
    ],
    "salesByPaymentMethod": [
      {
        "method": "on_pickup",
        "orderCount": 4,
        "totalRevenue": 1113
      }
    ]
  }
}
```

**Key Metrics:**

- `totalRevenue`: Total revenue from all orders
- `grossProfit`: Total profit after cost deduction
- `profitMarginPercent`: Overall profit margin percentage
- `topProducts`: Best-selling products by quantity
- `salesByDeliveryMethod`: Revenue breakdown by delivery type
- `salesByPaymentMethod`: Revenue breakdown by payment type

### 3. Sales Trends Analysis

#### `GET /api/reports/sales-trends`

Get sales trends and patterns over time.

**Query Parameters:**

- `period` (optional): Time period - `daily`, `weekly`, `monthly` (default: `daily`)
- `startDate` (optional): Start date for trends (ISO format)
- `endDate` (optional): End date for trends (ISO format)

**Response:**

```json
{
  "success": true,
  "message": "Sales trends retrieved successfully",
  "data": {
    "period": "daily",
    "trends": [
      {
        "period": "2025-09-26T00:00:00.000Z",
        "orderCount": 4,
        "totalRevenue": 1113,
        "averageOrderValue": 278.25,
        "uniqueCustomers": 1
      }
    ]
  }
}
```

**Trend Analysis:**

- `orderCount`: Number of orders in the period
- `totalRevenue`: Revenue generated in the period
- `averageOrderValue`: Average order value for the period
- `uniqueCustomers`: Number of unique customers who ordered

### 4. Inventory Status & Alerts

#### `GET /api/reports/inventory-status`

Get inventory status, low stock alerts, and valuation.

**Query Parameters:**

- `lowStockThreshold` (optional): Threshold for low stock alert (default: 10)

**Response:**

```json
{
  "success": true,
  "message": "Inventory status retrieved successfully",
  "data": {
    "summary": {
      "totalInventoryValue": 6080,
      "totalItemsInStock": 116,
      "totalProducts": 6,
      "lowStockThreshold": 20
    },
    "lowStockProducts": [
      {
        "id": "5",
        "name": "Denim Jeans",
        "sku": null,
        "stockQuantity": 14,
        "brand": null,
        "category": null
      }
    ],
    "outOfStockProducts": [
      {
        "id": "17",
        "name": "Adidas Ultraboost",
        "sku": "ADIDAS-UB-001",
        "stockQuantity": 0,
        "brand": "Adidas",
        "category": "T-Shirts"
      }
    ]
  }
}
```

**Inventory Insights:**

- `totalInventoryValue`: Total value of current inventory
- `lowStockProducts`: Products below threshold requiring restocking
- `outOfStockProducts`: Products with zero stock

### 5. Customer Insights & Analytics

#### `GET /api/reports/customer-insights`

Get customer behavior analysis and acquisition trends.

**Query Parameters:**

- `startDate` (optional): Start date for customer analysis (ISO format)
- `endDate` (optional): End date for customer analysis (ISO format)

**Response:**

```json
{
  "success": true,
  "message": "Customer insights retrieved successfully",
  "data": {
    "summary": {
      "totalCustomers": 6,
      "activeCustomers": 1,
      "recentCustomers": 1,
      "averageCustomerValue": 278.25,
      "highestOrderValue": 504
    },
    "topCustomers": [
      {
        "id": "10",
        "name": "Admin Five",
        "email": "admin5@jt.com",
        "totalOrders": 4,
        "totalSpent": 1113,
        "averageOrderValue": 278.25,
        "lastOrderDate": "2025-09-26T02:26:58.633Z"
      }
    ],
    "acquisitionTrends": [
      {
        "month": "2025-09-01T00:00:00.000Z",
        "newCustomers": 5
      }
    ]
  }
}
```

**Customer Analytics:**

- `activeCustomers`: Customers who have made at least one order
- `recentCustomers`: Customers who ordered in the last 30 days
- `topCustomers`: Highest value customers by total spent
- `acquisitionTrends`: Monthly customer acquisition data

## Business Intelligence Features

### Profit Margin Calculations

The system automatically calculates:

- **Effective Price**: Final selling price after applying discounts
- **Profit**: Difference between effective price and cost price
- **Margin**: Profit as percentage of cost price

**Discount Priority:**

1. `discount_price` (if set and lower than original price)
2. `discount_percent` (if set and no discount price)
3. Original price (if no discounts)

### Sales Performance Tracking

- **Revenue Tracking**: Total revenue from all orders
- **Cost Analysis**: Total cost based on product cost prices
- **Profit Analysis**: Gross profit and margin calculations
- **Trend Analysis**: Time-based performance patterns

### Inventory Management

- **Stock Alerts**: Automatic low stock and out-of-stock alerts
- **Inventory Valuation**: Total inventory value based on cost prices
- **Restocking Insights**: Products requiring immediate attention

### Customer Analytics

- **Customer Segmentation**: Active vs inactive customers
- **Value Analysis**: Customer lifetime value and order patterns
- **Acquisition Tracking**: New customer acquisition trends

## Frontend Integration

### Dashboard Widgets

Use these endpoints to create:

- **Profit Margin Dashboard**: Product profitability overview
- **Sales Performance Charts**: Revenue and order trends
- **Inventory Alerts**: Low stock and restocking notifications
- **Customer Analytics**: Customer behavior insights

### Data Visualization

Recommended chart types:

- **Profit Margins**: Bar charts or tables with sorting
- **Sales Trends**: Line charts for time-based data
- **Inventory Status**: Alert cards and status indicators
- **Customer Insights**: Customer value tables and acquisition charts

### Real-time Updates

Consider implementing:

- **Periodic Refresh**: Update reports every 5-10 minutes
- **Date Range Filters**: Allow users to filter by date ranges
- **Export Functionality**: CSV/PDF export for reports
- **Scheduled Reports**: Automated report generation

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common Error Scenarios:**

- **401 Unauthorized**: Invalid or missing admin token
- **400 Bad Request**: Invalid query parameters
- **500 Internal Server Error**: Database or server errors

## Performance Considerations

- **Pagination**: Use pagination for large datasets
- **Date Filtering**: Filter by date ranges to improve performance
- **Caching**: Consider caching frequently accessed reports
- **Indexing**: Database indexes on commonly queried fields

## Security

- **Admin Only**: All endpoints require admin authentication
- **Data Privacy**: Customer data is anonymized in reports
- **Access Control**: Ensure proper admin role verification
- **Audit Logging**: Consider logging report access for compliance
