# Frontend Updates Required

This document outlines the specific updates needed in both frontend applications based on recent backend enhancements.

## Recent Backend Updates Summary

The backend has been enhanced with:

1. **Enhanced Product Management** - Pricing, brands, categories, variants
2. **Product Variants System** - Size/color combinations with individual stock
3. **Effective Pricing** - Discount calculations and profit tracking
4. **Reports & Analytics** - Business intelligence for admin dashboard
5. **Updated Cart System** - Variant-based cart with delivery eligibility

---

## 1. Admin Dashboard Updates

### 1.1 Product Management Enhancements

#### **NEW: Product Pricing Fields**

Update product forms to include:

```typescript
// Add to existing Product interface
interface Product {
  // ... existing fields
  costPrice: number; // NEW
  price: number; // UPDATED (was just price)
  discountPrice?: number; // NEW
  discountPercent?: number; // NEW
  effectivePrice: number; // NEW (calculated)
  profitMargin: {
    // NEW (calculated)
    costPrice: number;
    sellingPrice: number;
    profit: number;
    margin: number;
  } | null;
}
```

#### **NEW: Brand Management**

Add brand selection to product forms:

```typescript
// New Brand interface
interface Brand {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
}

// Add to product form
brandId?: string;  // NEW field
```

#### **NEW: Category Management**

Replace simple category string with hierarchical categories:

```typescript
// New Category interface
interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
}

// Add to product form
categoryId?: string;  // NEW field (replace old category string)
```

#### **NEW: Product Variants Management**

Add variants management page for each product:

```typescript
// New ProductVariant interface
interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  stockQuantity: number;
  imageUrl?: string;
  isActive: boolean;
}
```

**Required Pages:**

- `/admin/brands` - Brand CRUD operations
- `/admin/categories` - Hierarchical category management
- `/admin/products/:id/variants` - Product variants management

### 1.2 Inventory Summary Update

#### **UPDATED: Products API Response**

The `GET /api/products` endpoint now includes an `inventorySummary` object:

```typescript
// Updated Products API response
interface ProductsResponse {
  success: boolean;
  message: string;
  count: number;
  inventorySummary: {
    // NEW
    totalInventoryValue: number; // Total value based on variants + effective prices
    totalItemsInStock: number; // Total items across all variants
    totalVariants: number; // Total number of active variants
  };
  products: Product[];
}
```

**Frontend Action Required:**

- **Replace manual calculation** of total inventory value
- **Use `inventorySummary.totalInventoryValue`** instead of calculating from individual products
- **This ensures accuracy** with the new variant-based stock system

### 1.3 Cart System Updates

#### **UPDATED: Cart Items Structure**

Update cart items to use variants:

```typescript
// Updated CartItem interface
interface CartItem {
  id: string;
  productId: string;
  variantId: string; // NEW - now required
  productName: string;
  variantSku: string; // NEW
  size: string; // NEW
  color: string; // NEW
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl: string;
  stockQuantity: number;
  deliveryEligible: boolean; // NEW
  pickupEligible: boolean; // NEW
}
```

#### **UPDATED: Add to Cart API**

```typescript
// Updated add to cart request
interface AddToCartRequest {
  variantId: string; // CHANGED from productId, size, color
  quantity: number;
}
```

### 1.3 NEW: Reports & Analytics Dashboard

Add new reports section with these pages:

- `/admin/reports/profit-margins` - Product profitability analysis
- `/admin/reports/overall-metrics` - Business KPIs
- `/admin/reports/sales-trends` - Sales performance over time
- `/admin/reports/inventory-status` - Stock alerts and valuation
- `/admin/reports/customer-insights` - Customer analytics

**Key Metrics to Display:**

- Total revenue, profit margins, top products
- Low stock alerts, inventory valuation
- Sales trends, customer acquisition
- Order breakdown by delivery/payment method

---

## 2. Customer Website Updates

### 2.1 Product Catalog Updates

#### **UPDATED: Product Display**

Update product cards to show:

```typescript
// Updated Product interface for customer
interface Product {
  // ... existing fields
  price: number;
  discountPrice?: number; // NEW
  discountPercent?: number; // NEW
  effectivePrice: number; // NEW
  hasDiscount: boolean; // NEW
  discountAmount: number; // NEW
  variants: ProductVariant[]; // NEW
  deliveryEligible: boolean; // NEW
  pickupEligible: boolean; // NEW
  imageUrl: string; // Main product image
  images: string[]; // NEW - All product and variant images combined
}
```

#### **NEW: Multiple Product Images**

Implement enhanced image display for better customer experience:

```typescript
// Image handling utilities
interface ProductImageDisplay {
  mainImage: string; // imageUrl field
  allImages: string[]; // images array
  variantImages: string[]; // filtered variant images
}

// Image gallery component props
interface ImageGalleryProps {
  images: string[];
  mainImage: string;
  onImageSelect: (imageUrl: string) => void;
  showThumbnails?: boolean;
  maxThumbnails?: number;
}
```

**Required Image Features:**

1. **Product Listings (Grid/List View)**

   - Display `imageUrl` as primary thumbnail
   - Show hover effects with additional images from `images` array
   - Display first 3-4 images as small thumbnails
   - Fallback to first `images` array item if `imageUrl` is null

2. **Product Detail Pages**

   - Full image gallery with all images from `images` array
   - Thumbnail navigation below main image
   - Zoom functionality on individual images
   - Responsive design for mobile devices
   - Smooth transitions between images

3. **Variant Selection Integration**
   - Highlight variant-specific images when variant is selected
   - Filter `images` array to show relevant variant images
   - Animate between different variant images
   - Show variant-specific images in selection interface

#### **NEW: Variant Selection**

Add variant selection to product detail pages:

- Size dropdown
- Color selection
- Stock availability per variant
- Variant-specific images (integrated with image gallery)

### 2.2 Cart System Updates

#### **UPDATED: Add to Cart Flow**

Change from product-based to variant-based:

```typescript
// OLD: Add by product + size + color
// NEW: Add by variantId only
const addToCart = async (variantId: string, quantity: number) => {
  // API call to POST /api/cart/add
  // Body: { variantId, quantity }
};
```

#### **UPDATED: Cart Display**

Update cart to show:

- Variant information (size, color, SKU)
- Individual variant stock levels
- Delivery eligibility warnings
- Effective pricing with discounts

### 2.3 NEW: Delivery Eligibility Validation

Add validation to prevent cart issues:

```typescript
// Check delivery eligibility before adding to cart
if (selectedDeliveryMethod === "delivery" && !variant.deliveryEligible) {
  showError("This item is only available for pickup");
  return;
}
```

### 2.4 Image Display Requirements

#### **API Data Structure**

The backend now provides:

- `imageUrl`: Main product image (string)
- `images`: Array of all product and variant images (string[])

#### **Required Frontend Features**

1. **Product Listings**

   - Display `imageUrl` as primary thumbnail
   - Show additional images from `images` array on hover
   - Fallback to first `images` array item if `imageUrl` is null

2. **Product Detail Pages**

   - Create image gallery component using `images` array
   - Implement thumbnail navigation
   - Add zoom functionality
   - Make responsive for mobile devices

3. **Variant Integration**
   - Filter `images` array based on selected variant
   - Update gallery when variant selection changes
   - Show variant-specific images in selection interface

#### **Technical Requirements**

- Handle empty/null image arrays gracefully
- Implement proper error handling for broken image URLs
- Optimize image loading (lazy loading, compression)
- Ensure mobile responsiveness
- Maintain good UX with smooth transitions

---

## 3. API Endpoints to Integrate

### 3.1 NEW Endpoints for Admin Dashboard

```typescript
// Brand Management
GET    /api/brands
POST   /api/brands
PUT    /api/brands/:id
DELETE /api/brands/:id

// Category Management
GET    /api/categories
GET    /api/categories/flat
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

// Product Variants
GET    /api/product-variants/product/:productId
POST   /api/product-variants
PUT    /api/product-variants/:id
DELETE /api/product-variants/:id

// Reports & Analytics
GET    /api/reports/profit-margins
GET    /api/reports/overall-metrics
GET    /api/reports/sales-trends
GET    /api/reports/inventory-status
GET    /api/reports/customer-insights
```

### 3.2 UPDATED Endpoints

```typescript
// Updated Product endpoints (now include pricing fields)
GET    /api/products          // Now returns costPrice, discountPrice, etc. + inventorySummary
POST   /api/products          // Now accepts brandId, categoryId, pricing fields
PUT    /api/products/:id      // Updated with new fields

// Updated Cart endpoints (now variant-based)
POST   /api/cart/add          // Now requires variantId instead of productId + size + color
GET    /api/cart              // Now returns variant information
```

---

## 4. Database Schema Changes

### 4.1 NEW Tables

- `brands` - Brand management
- `categories` - Hierarchical categories
- `product_variants` - Size/color combinations
- `ghana_regions` - Ghana regions (pre-populated)
- `ghana_cities` - Ghana cities (pre-populated)

### 4.2 UPDATED Tables

- `products` - Added pricing fields, brand/category links
- `cart_items` - Now references variants instead of products directly
- `order_items` - Now includes variant snapshots

---

## 5. Implementation Priority

### Phase 1: Core Updates (Week 1)

1. **Update Product Forms** - Add pricing, brand, category fields
2. **Update Cart System** - Switch to variant-based cart
3. **Add Variant Selection** - Product detail pages

### Phase 2: Management Features (Week 2)

1. **Brand Management** - CRUD operations
2. **Category Management** - Hierarchical categories
3. **Product Variants** - Variant management per product

### Phase 3: Analytics (Week 3)

1. **Reports Dashboard** - Profit margins, sales trends
2. **Inventory Alerts** - Low stock notifications
3. **Business Metrics** - Overall performance indicators

---

## 6. Breaking Changes

### 6.1 Cart API Changes

- **BREAKING**: `POST /api/cart/add` now requires `variantId` instead of `productId + size + color`
- **BREAKING**: Cart items now include variant information

### 6.2 Product API Changes

- **BREAKING**: Products now require `brandId` and `categoryId` instead of string fields
- **NEW**: Products now include calculated `effectivePrice` and `profitMargin`

### 6.3 Order API Changes

- **NEW**: Order items now include variant snapshots
- **NEW**: Orders now track delivery eligibility

---

## 7. Testing Checklist

### 7.1 Admin Dashboard

- [ ] Product forms include all new fields
- [ ] Brand and category management works
- [ ] Product variants can be created and managed
- [ ] Reports display correctly
- [ ] Cart system works with variants

### 7.2 Customer Website

- [ ] Product pages show variant selection
- [ ] Cart works with variants
- [ ] Discount pricing displays correctly
- [ ] Delivery eligibility validation works
- [ ] Checkout process handles variants
- [ ] **NEW**: Product image galleries display correctly
- [ ] **NEW**: Multiple images show in product listings
- [ ] **NEW**: Variant selection updates image display
- [ ] **NEW**: Image zoom functionality works
- [ ] **NEW**: Mobile responsive image galleries

---

## 8. Migration Notes

### 8.1 Existing Data

- Existing products will have `null` values for new pricing fields
- Existing cart items will need to be migrated to use variants
- Categories will need to be created and linked to products

### 8.2 Backward Compatibility

- Old product API responses still work but include new fields
- Cart API changes are breaking and require frontend updates
- Order API includes new fields but maintains existing structure

This focused update guide covers only the recent changes that need to be implemented in the existing frontend applications.
