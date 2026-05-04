/**
 * geo.ts
 * Strict geographic coordinate validation
 * 
 * CRITICAL: Never fallback to 0 for coordinates
 * Lat 0, Lng 0 = Golfo de Guinea (invalid for trucking)
 */

/**
 * Parse coordinate value to number, returns null if invalid
 * NEVER returns 0 for coordinates
 */
export const parseCoord = (value: any): number | null => {
  const num = Number(value);
  
  // Invalid if NaN
  if (isNaN(num)) {
    return null;
  }
  
  // Invalid if exactly 0 (no valid load starts at 0,0)
  if (num === 0) {
    return null;
  }
  
  // Valid latitude: -90 to 90
  // Valid longitude: -180 to 180
  return num;
};

/**
 * Validate a complete coordinate pair
 * Returns true ONLY if both lat and lng are valid
 */
export const hasValidCoords = (lat: any, lng: any): boolean => {
  const latNum = parseCoord(lat);
  const lngNum = parseCoord(lng);
  
  if (latNum === null || lngNum === null) {
    return false;
  }
  
  // Additional validation: check ranges
  if (latNum < -90 || latNum > 90) {
    console.warn("🚨 [geo] Invalid latitude:", lat);
    return false;
  }
  
  if (lngNum < -180 || lngNum > 180) {
    console.warn("🚨 [geo] Invalid longitude:", lng);
    return false;
  }
  
  return true;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns null if coordinates are invalid
 */
export const calculateDistance = (
  lat1: any,
  lng1: any,
  lat2: any,
  lng2: any
): number | null => {
  const startLat = parseCoord(lat1);
  const startLng = parseCoord(lng1);
  const endLat = parseCoord(lat2);
  const endLng = parseCoord(lng2);
  
  if (!startLat || !startLng || !endLat || !endLng) {
    console.warn("🚨 [geo] Invalid coordinates for distance calculation");
    return null;
  }
  
  const R = 3958.8; // Earth radius in miles
  
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLng = ((endLng - startLng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((startLat * Math.PI) / 180) *
      Math.cos((endLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Apply 1.15x adjustment for real trucking routes
  const miles = R * c * 1.15;
  
  return miles;
};

/**
 * Check if load has valid geographic data
 * Logs warning if invalid
 */
export const validateLoadCoords = (
  loadId: number,
  pickupLat: any,
  pickupLng: any,
  deliveryLat: any,
  deliveryLng: any
): boolean => {
  const isValid = hasValidCoords(pickupLat, pickupLng) &&
                  hasValidCoords(deliveryLat, deliveryLng);
  
  if (!isValid) {
    console.warn("🚨 [geo] Invalid coordinates for load", {
      loadId,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
    });
  }
  
  return isValid;
};
