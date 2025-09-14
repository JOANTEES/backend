# Ghana Locations Endpoints

These endpoints provide access to Ghana's administrative regions and cities for address selection and delivery zone management.

## Overview

The system includes all 16 regions of Ghana with their major cities pre-populated in the database. This ensures consistent address data and enables automatic delivery zone determination.

### Available Regions

1. Greater Accra
2. Ashanti
3. Western
4. Eastern
5. Volta
6. Central
7. Northern
8. Upper East
9. Upper West
10. Brong-Ahafo
11. Western North
12. Ahafo
13. Bono
14. Bono East
15. Oti
16. Savannah

## Endpoints

### 1. Get All Regions

- **URL:** `GET /api/ghana/regions`
- **Description:** Retrieves all active Ghana regions.
- **Headers:** None required
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Regions retrieved successfully",
    "count": 16,
    "regions": [
      {
        "id": 1,
        "name": "Greater Accra",
        "code": "GA"
      },
      {
        "id": 2,
        "name": "Ashanti",
        "code": "AS"
      }
    ]
  }
  ```

### 2. Get All Cities

- **URL:** `GET /api/ghana/cities`
- **Description:** Retrieves all active cities, optionally filtered by region.
- **Headers:** None required
- **Query Parameters:**
  - `region_id` (optional): Filter cities by region ID
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cities retrieved successfully",
    "count": 64,
    "cities": [
      {
        "id": 1,
        "name": "Accra",
        "region_id": 1,
        "region_name": "Greater Accra",
        "region_code": "GA"
      },
      {
        "id": 2,
        "name": "Tema",
        "region_id": 1,
        "region_name": "Greater Accra",
        "region_code": "GA"
      }
    ]
  }
  ```

### 3. Get Cities by Region

- **URL:** `GET /api/ghana/cities/:regionId`
- **Description:** Retrieves all cities for a specific region.
- **Headers:** None required
- **Parameters:** `:regionId` - The ID of the region
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Cities retrieved successfully",
    "count": 4,
    "cities": [
      {
        "id": 1,
        "name": "Accra",
        "region_id": 1,
        "region_name": "Greater Accra",
        "region_code": "GA"
      },
      {
        "id": 2,
        "name": "Tema",
        "region_id": 1,
        "region_name": "Greater Accra",
        "region_code": "GA"
      }
    ]
  }
  ```
- **Response (400):**
  ```json
  {
    "success": false,
    "message": "Invalid region ID. Must be a number."
  }
  ```

## Usage Examples

### Frontend Integration

```javascript
// Get all regions for dropdown
const regions = await fetch("/api/ghana/regions").then((r) => r.json());

// Get cities for a specific region
const cities = await fetch(`/api/ghana/cities/${regionId}`).then((r) =>
  r.json()
);

// Get all cities (for search functionality)
const allCities = await fetch("/api/ghana/cities").then((r) => r.json());
```

### Address Selection Flow

1. User selects a region from the regions dropdown
2. Frontend fetches cities for that region using `GET /api/ghana/cities/:regionId`
3. User selects a city from the cities dropdown
4. User enters the specific area/landmark name
5. Frontend sends the complete address to `PUT /api/cart/delivery-address` for automatic zone determination

## Database Schema

### ghana_regions Table

- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(100) NOT NULL UNIQUE)
- `code` (VARCHAR(10) NOT NULL UNIQUE)
- `is_active` (BOOLEAN DEFAULT true)
- `created_at` (TIMESTAMP)

### ghana_cities Table

- `id` (SERIAL PRIMARY KEY)
- `region_id` (INTEGER REFERENCES ghana_regions(id))
- `name` (VARCHAR(100) NOT NULL)
- `is_active` (BOOLEAN DEFAULT true)
- `created_at` (TIMESTAMP)

## Notes

- All regions and cities are pre-populated in the database
- The system uses these structured locations for automatic delivery zone determination
- Frontend should use these endpoints to provide consistent address selection UI
- The area name is free-form text entered by the user (e.g., "Near Top Oil Kpone")
