# Address Management System

This document describes the address management system for both pickup locations (admin-managed) and customer delivery addresses.

## Overview

The address management system uses Ghana's structured location system with regions, cities, and areas. Both pickup locations and customer addresses automatically generate Google Maps links for easy navigation.

## Pickup Locations (Admin Managed)

### Endpoints

#### Get All Active Pickup Locations

```http
GET /api/pickup-locations
```

**Response:**

```json
{
  "success": true,
  "message": "Pickup locations retrieved successfully",
  "count": 2,
  "locations": [
    {
      "id": "1",
      "name": "Main Store - Accra",
      "description": "Our main store location in Accra",
      "regionName": "Greater Accra",
      "cityName": "Accra",
      "areaName": "Osu",
      "landmark": "Near Osu Castle",
      "additionalInstructions": "Look for the blue building",
      "contactPhone": "+233123456789",
      "contactEmail": "accra@joantee.com",
      "operatingHours": {
        "monday": "9:00 AM - 6:00 PM",
        "tuesday": "9:00 AM - 6:00 PM",
        "wednesday": "9:00 AM - 6:00 PM",
        "thursday": "9:00 AM - 6:00 PM",
        "friday": "9:00 AM - 6:00 PM",
        "saturday": "10:00 AM - 4:00 PM",
        "sunday": "Closed"
      },
      "googleMapsLink": "https://www.google.com/maps/search/?api=1&query=Near%20Osu%20Castle%2C%20Osu%2C%20Accra%2C%20Greater%20Accra%2C%20Ghana",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Get Single Pickup Location

```http
GET /api/pickup-locations/:id
```

#### Create Pickup Location (Admin Only)

```http
POST /api/pickup-locations
Authorization: Bearer <admin_token>
```

**Request Body:**

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
  "contactEmail": "accra@joantee.com",
  "operatingHours": {
    "monday": "9:00 AM - 6:00 PM",
    "tuesday": "9:00 AM - 6:00 PM",
    "wednesday": "9:00 AM - 6:00 PM",
    "thursday": "9:00 AM - 6:00 PM",
    "friday": "9:00 AM - 6:00 PM",
    "saturday": "10:00 AM - 4:00 PM",
    "sunday": "Closed"
  }
}
```

#### Update Pickup Location (Admin Only)

```http
PUT /api/pickup-locations/:id
Authorization: Bearer <admin_token>
```

#### Delete Pickup Location (Admin Only)

```http
DELETE /api/pickup-locations/:id
Authorization: Bearer <admin_token>
```

#### Get All Pickup Locations Including Inactive (Admin Only)

```http
GET /api/pickup-locations/admin
Authorization: Bearer <admin_token>
```

## Customer Addresses

### Endpoints

#### Get User's Addresses

```http
GET /api/customer-addresses
Authorization: Bearer <customer_token>
```

**Response:**

```json
{
  "success": true,
  "message": "Addresses retrieved successfully",
  "count": 2,
  "addresses": [
    {
      "id": "1",
      "regionId": "1",
      "regionName": "Greater Accra",
      "cityId": "1",
      "cityName": "Tema",
      "areaName": "Kpone",
      "landmark": "Near Top Oil Kpone",
      "additionalInstructions": "Call when you arrive",
      "contactPhone": "+233123456789",
      "isDefault": true,
      "googleMapsLink": "https://www.google.com/maps/search/?api=1&query=Near%20Top%20Oil%20Kpone%2C%20Kpone%2C%20Tema%2C%20Greater%20Accra%2C%20Ghana",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Get Single Address

```http
GET /api/customer-addresses/:id
Authorization: Bearer <customer_token>
```

#### Create New Address

```http
POST /api/customer-addresses
Authorization: Bearer <customer_token>
```

**Request Body:**

```json
{
  "regionId": 1,
  "cityId": 1,
  "areaName": "Kpone",
  "landmark": "Near Top Oil Kpone",
  "additionalInstructions": "Call when you arrive",
  "contactPhone": "+233123456789",
  "isDefault": true
}
```

#### Update Address

```http
PUT /api/customer-addresses/:id
Authorization: Bearer <customer_token>
```

#### Delete Address

```http
DELETE /api/customer-addresses/:id
Authorization: Bearer <customer_token>
```

#### Set Address as Default

```http
PUT /api/customer-addresses/:id/set-default
Authorization: Bearer <customer_token>
```

## Address Structure

### Required Fields

- `regionId` - ID of Ghana region
- `cityId` - ID of city within the region
- `areaName` - Specific area within the city (free text)

### Optional Fields

- `landmark` - Nearby landmark for easier identification
- `additionalInstructions` - Special delivery instructions
- `contactPhone` - Contact number for delivery

### Google Maps Integration

Both pickup locations and customer addresses automatically generate Google Maps links using the format:

```
https://www.google.com/maps/search/?api=1&query={landmark}, {areaName}, {cityName}, {regionName}, Ghana
```

## Frontend Integration

### For Admin Dashboard

1. Use Ghana regions/cities endpoints to populate dropdowns
2. Create pickup locations with structured addresses
3. Display Google Maps links for each location
4. Manage operating hours and contact information

### For Customer Web App

1. Let customers save multiple delivery addresses
2. Use structured address selection (region → city → area)
3. Allow landmark and instruction entry
4. Show Google Maps links for saved addresses
5. Set default address functionality

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common error scenarios:

- Invalid region/city ID
- Missing required fields
- Address not found (for updates/deletes)
- Unauthorized access (missing/invalid token)
