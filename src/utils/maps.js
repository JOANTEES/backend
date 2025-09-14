/**
 * Google Maps Link Generator
 *
 * This utility generates Google Maps links for addresses in Ghana
 * without requiring API integration - just standard URL construction
 */

/**
 * Generate a Google Maps link for a Ghana address
 * @param {Object} address - Address object with region, city, area, landmark
 * @returns {string} Google Maps URL
 */
function generateGoogleMapsLink(address) {
  const { regionName, cityName, areaName, landmark, additionalInstructions } =
    address;

  // Build the search query for Google Maps
  let searchQuery = `${areaName}, ${cityName}, ${regionName}, Ghana`;

  // Add landmark if provided
  if (landmark) {
    searchQuery = `${landmark}, ${searchQuery}`;
  }

  // Add additional instructions if provided
  if (additionalInstructions) {
    searchQuery += `, ${additionalInstructions}`;
  }

  // URL encode the search query
  const encodedQuery = encodeURIComponent(searchQuery);

  // Generate Google Maps URL
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return mapsUrl;
}

/**
 * Generate a Google Maps link for pickup locations
 * @param {Object} pickupLocation - Pickup location object
 * @returns {string} Google Maps URL
 */
function generatePickupMapsLink(pickupLocation) {
  const { regionName, cityName, areaName, landmark, additionalInstructions } =
    pickupLocation;

  return generateGoogleMapsLink({
    regionName,
    cityName,
    areaName,
    landmark,
    additionalInstructions,
  });
}

/**
 * Generate a Google Maps link for customer delivery addresses
 * @param {Object} customerAddress - Customer address object
 * @returns {string} Google Maps URL
 */
function generateCustomerMapsLink(customerAddress) {
  const { regionName, cityName, areaName, landmark, additionalInstructions } =
    customerAddress;

  return generateGoogleMapsLink({
    regionName,
    cityName,
    areaName,
    landmark,
    additionalInstructions,
  });
}

/**
 * Generate a Google Maps link with coordinates (if available)
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {string} label - Optional label for the location
 * @returns {string} Google Maps URL with coordinates
 */
function generateMapsLinkWithCoordinates(latitude, longitude, label = "") {
  const coords = `${latitude},${longitude}`;
  const labelParam = label
    ? `&query_place_id=${encodeURIComponent(label)}`
    : "";

  return `https://www.google.com/maps/search/?api=1&query=${coords}${labelParam}`;
}

/**
 * Generate a Google Maps directions link from one address to another
 * @param {Object} fromAddress - Starting address
 * @param {Object} toAddress - Destination address
 * @returns {string} Google Maps directions URL
 */
function generateDirectionsLink(fromAddress, toAddress) {
  const fromQuery = generateGoogleMapsLink(fromAddress).split("query=")[1];
  const toQuery = generateGoogleMapsLink(toAddress).split("query=")[1];

  return `https://www.google.com/maps/dir/?api=1&origin=${fromQuery}&destination=${toQuery}`;
}

module.exports = {
  generateGoogleMapsLink,
  generatePickupMapsLink,
  generateCustomerMapsLink,
  generateMapsLinkWithCoordinates,
  generateDirectionsLink,
};
