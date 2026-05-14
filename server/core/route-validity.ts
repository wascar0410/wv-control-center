/**
 * Route Validity Helper
 * 
 * Determines if a load's route data is reliable for AI decisions.
 * Fallback 120-mile distance must NEVER be treated as reliable.
 */

import { resolveLoadDistance } from "./distance-resolver";

export interface RouteValidityResult {
  isReliable: boolean;
  routeStatus: "real" | "fallback" | "missing_coords" | "invalid";
  distanceConfidence: "high" | "low";
  distanceSource: "haversine" | "fallback_120" | "manual" | "unknown";
  blockedReason?: string;
}

export function isRouteReliable(load: any): RouteValidityResult {
  // 🎯 USE CANONICAL DISTANCE RESOLVER
  const distanceResult = resolveLoadDistance(load);
  const miles = distanceResult.miles;

  const pickupLat = Number(load.pickupLat);
  const pickupLng = Number(load.pickupLng);
  const deliveryLat = Number(load.deliveryLat);
  const deliveryLng = Number(load.deliveryLng);

  // Check if coordinates are missing, null, zero, or invalid
  const hasValidPickup =
    !isNaN(pickupLat) &&
    !isNaN(pickupLng) &&
    pickupLat !== 0 &&
    pickupLng !== 0 &&
    pickupLat !== null &&
    pickupLng !== null;

  const hasValidDelivery =
    !isNaN(deliveryLat) &&
    !isNaN(deliveryLng) &&
    deliveryLat !== 0 &&
    deliveryLng !== 0 &&
    deliveryLat !== null &&
    deliveryLng !== null;

  // 🎯 USE DISTANCE RESOLVER RELIABILITY FLAG
  const isFallbackDistance = distanceResult.source === "fallback_120";

  if (!hasValidPickup || !hasValidDelivery) {
    return {
      isReliable: false,
      routeStatus: "missing_coords",
      distanceConfidence: "low",
      distanceSource: distanceResult.source as any,
      blockedReason: "Missing route coordinates. Run geocoding backfill before decision.",
    };
  }

  if (isFallbackDistance) {
    return {
      isReliable: false,
      routeStatus: "fallback",
      distanceConfidence: "low",
      distanceSource: "fallback_120",
      blockedReason: "Using fallback 120-mile distance. Route data unreliable.",
    };
  }

  // Route is real and reliable
  return {
    isReliable: true,
    routeStatus: "real",
    distanceConfidence: "high",
    distanceSource: "haversine",
  };
}

/**
 * Attach route validity metadata to a load
 */
export function attachRouteValidity(load: any): any {
  const validity = isRouteReliable(load);
  return {
    ...load,
    routeStatus: validity.routeStatus,
    distanceConfidence: validity.distanceConfidence,
    distanceSource: validity.distanceSource,
    isDecisionBlocked: !validity.isReliable,
    blockedReason: validity.blockedReason,
  };
}
