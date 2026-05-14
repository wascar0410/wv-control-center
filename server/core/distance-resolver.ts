/**
 * distance-resolver.ts
 * 
 * CANONICAL distance resolution for all load distance calculations
 * Single source of truth to prevent inconsistencies across advisor, dispatch, and financial calculations
 * 
 * Priority order:
 * 1. load.miles (calculated from coordinates or explicit field)
 * 2. load.totalMiles (fallback if miles missing)
 * 3. load.distanceMiles (legacy field)
 * 4. load.estimatedMiles (legacy field)
 * 5. Fallback 120 miles (only if no valid coordinates)
 */

export interface LoadDistanceResult {
  miles: number;
  source: "calculated" | "explicit" | "fallback_120";
  isReliable: boolean;
  hasValidCoordinates: boolean;
}

/**
 * Resolve load distance using canonical priority
 * @param load Load object with distance fields
 * @returns Resolved distance with metadata
 */
export function resolveLoadDistance(load: any): LoadDistanceResult {
  // 🎯 Priority 1: load.miles (primary field)
  const miles = Number(load?.miles);
  if (Number.isFinite(miles) && miles > 0) {
    return {
      miles,
      source: "explicit",
      isReliable: true,
      hasValidCoordinates: hasValidCoordinates(load),
    };
  }

  // 🎯 Priority 2: load.totalMiles (fallback if miles missing)
  const totalMiles = Number(load?.totalMiles);
  if (Number.isFinite(totalMiles) && totalMiles > 0) {
    return {
      miles: totalMiles,
      source: "explicit",
      isReliable: true,
      hasValidCoordinates: hasValidCoordinates(load),
    };
  }

  // 🎯 Priority 3: load.distanceMiles (legacy field)
  const distanceMiles = Number(load?.distanceMiles);
  if (Number.isFinite(distanceMiles) && distanceMiles > 0) {
    return {
      miles: distanceMiles,
      source: "explicit",
      isReliable: true,
      hasValidCoordinates: hasValidCoordinates(load),
    };
  }

  // 🎯 Priority 4: load.estimatedMiles (legacy field)
  const estimatedMiles = Number(load?.estimatedMiles);
  if (Number.isFinite(estimatedMiles) && estimatedMiles > 0) {
    return {
      miles: estimatedMiles,
      source: "explicit",
      isReliable: true,
      hasValidCoordinates: hasValidCoordinates(load),
    };
  }

  // 🚨 FALLBACK: No valid distance field found
  const coords = hasValidCoordinates(load);
  if (!coords) {
    // No coordinates = fallback 120 is unreliable
    return {
      miles: 120,
      source: "fallback_120",
      isReliable: false,
      hasValidCoordinates: false,
    };
  }

  // Has coordinates but no distance field = should not happen
  // Log warning and return fallback
  console.warn("[resolveLoadDistance] Load has coordinates but no distance field", {
    loadId: load?.id,
    pickupLat: load?.pickupLat,
    pickupLng: load?.pickupLng,
    deliveryLat: load?.deliveryLat,
    deliveryLng: load?.deliveryLng,
  });

  return {
    miles: 120,
    source: "fallback_120",
    isReliable: false,
    hasValidCoordinates: coords,
  };
}

/**
 * Check if load has valid coordinates
 * @param load Load object
 * @returns true if all 4 coordinates are valid finite numbers
 */
function hasValidCoordinates(load: any): boolean {
  const pickupLat = Number(load?.pickupLat);
  const pickupLng = Number(load?.pickupLng);
  const deliveryLat = Number(load?.deliveryLat);
  const deliveryLng = Number(load?.deliveryLng);

  return (
    Number.isFinite(pickupLat) &&
    Number.isFinite(pickupLng) &&
    Number.isFinite(deliveryLat) &&
    Number.isFinite(deliveryLng) &&
    pickupLat !== 0 &&
    pickupLng !== 0 &&
    deliveryLat !== 0 &&
    deliveryLng !== 0
  );
}

/**
 * Quick check if load has valid coordinates (boolean only)
 * @param load Load object
 * @returns true if coordinates are valid
 */
export function hasValidLoadCoordinates(load: any): boolean {
  return hasValidCoordinates(load);
}

/**
 * Get distance with fallback (simple version for quick checks)
 * @param load Load object
 * @returns Distance in miles (never undefined)
 */
export function getLoadDistance(load: any): number {
  return resolveLoadDistance(load).miles;
}
