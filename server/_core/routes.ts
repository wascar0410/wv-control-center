import { ENV } from "./env";

export interface RouteResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
  durationHours: number;
  polyline?: string;
}

export interface RouteRequest {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}

export interface MultipleRoutesInput {
  vanLat: number;
  vanLng: number;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  includeReturnEmpty?: boolean;
}

export interface MultipleRoutesResult {
  emptyRoute: RouteResult | null;
  loadedRoute: RouteResult | null;
  returnRoute: RouteResult | null;
  emptyMiles: number;
  loadedMiles: number;
  returnEmptyMiles: number;
  totalMiles: number;
  totalDistanceMiles: number;
  totalDurationHours: number;
}

// ─── Haversine fallback ───────────────────────────────────────────────────────
// Used when Google Routes API is unavailable or returns an error.
// Applies a 1.25x road-correction factor over straight-line distance.
// Average speed assumed: 55 mph (highway cargo van).
function haversineRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): RouteResult {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineMiles = R * c;
  const roadMiles = roundTo2(straightLineMiles * 1.25); // road correction factor
  const distanceMeters = Math.round(roadMiles * 1609.344);
  const avgSpeedMph = 55;
  const durationHours = roundTo2(roadMiles / avgSpeedMph);
  const durationSeconds = Math.round(durationHours * 3600);
  return {
    distanceMeters,
    distanceMiles: roadMiles,
    durationSeconds,
    durationMinutes: roundTo2(durationSeconds / 60),
    durationHours,
  };
}

// ─── Google Routes API ────────────────────────────────────────────────────────
async function calculateRouteWithGoogle(
  request: RouteRequest
): Promise<RouteResult | null> {
  const { originLat, originLng, destinationLat, destinationLng } = request;
  if (!ENV.GOOGLE_MAPS_API_KEY) return null;
  try {
    const requestBody = {
      origin: {
        location: { latLng: { latitude: originLat, longitude: originLng } },
      },
      destination: {
        location: { latLng: { latitude: destinationLat, longitude: destinationLng } },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
    };

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": ENV.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      let errorData: any = null;
      try { errorData = await response.json(); } catch { errorData = await response.text(); }
      console.error("[Routes] Google API error:", response.status, errorData);
      return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      console.warn("[Routes] Google: no routes found");
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = Number(route.distanceMeters ?? 0);
    const rawDuration = String(route.duration ?? "0s").replace("s", "");
    const durationSeconds = Math.round(parseFloat(rawDuration) || 0);

    return {
      distanceMeters,
      distanceMiles: roundTo2(metersToMiles(distanceMeters)),
      durationSeconds,
      durationMinutes: roundTo2(durationSeconds / 60),
      durationHours: roundTo2(durationSeconds / 3600),
      polyline: route.polyline?.encodedPolyline,
    };
  } catch (error) {
    console.error("[Routes] Google error:", error);
    return null;
  }
}

/**
 * Calculate route distance and duration.
 * Tries Google Routes API first; falls back to Haversine formula if unavailable.
 */
export async function calculateRoute(
  request: RouteRequest
): Promise<RouteResult | null> {
  const { originLat, originLng, destinationLat, destinationLng } = request;

  if (
    !isValidCoordinate(originLat, originLng) ||
    !isValidCoordinate(destinationLat, destinationLng)
  ) {
    console.error("[Routes] Invalid coordinates provided", request);
    return null;
  }

  // Try Google Routes API first
  const googleResult = await calculateRouteWithGoogle(request);
  if (googleResult) {
    console.log("[Routes] Resolved via Google Routes API");
    return googleResult;
  }

  // Fall back to Haversine formula
  console.log("[Routes] Google unavailable, using Haversine fallback");
  return haversineRoute(originLat, originLng, destinationLat, destinationLng);
}

/**
 * Calculate multiple routes:
 * - Van -> Pickup (empty)
 * - Pickup -> Delivery (loaded)
 * - Delivery -> Van (optional return empty)
 */
export async function calculateMultipleRoutes(
  input: MultipleRoutesInput
): Promise<MultipleRoutesResult | null> {
  const {
    vanLat,
    vanLng,
    pickupLat,
    pickupLng,
    deliveryLat,
    deliveryLng,
    includeReturnEmpty = false,
  } = input;

  if (
    !isValidCoordinate(vanLat, vanLng) ||
    !isValidCoordinate(pickupLat, pickupLng) ||
    !isValidCoordinate(deliveryLat, deliveryLng)
  ) {
    console.error("[Routes] Invalid coordinates provided", {
      vanLat, vanLng, pickupLat, pickupLng, deliveryLat, deliveryLng,
    });
    return null;
  }

  try {
    const emptyRoute = await calculateRoute({
      originLat: vanLat,
      originLng: vanLng,
      destinationLat: pickupLat,
      destinationLng: pickupLng,
    });

    const loadedRoute = await calculateRoute({
      originLat: pickupLat,
      originLng: pickupLng,
      destinationLat: deliveryLat,
      destinationLng: deliveryLng,
    });

    let returnRoute: RouteResult | null = null;
    if (includeReturnEmpty) {
      returnRoute = await calculateRoute({
        originLat: deliveryLat,
        originLng: deliveryLng,
        destinationLat: vanLat,
        destinationLng: vanLng,
      });
    }

    // Loaded route is critical — but with Haversine fallback it should never be null
    if (!loadedRoute) {
      console.error("[Routes] Loaded route could not be calculated");
      return null;
    }

    const emptyMiles = roundTo2(emptyRoute?.distanceMiles ?? 0);
    const loadedMiles = roundTo2(loadedRoute.distanceMiles ?? 0);
    const returnEmptyMiles = roundTo2(returnRoute?.distanceMiles ?? 0);
    const totalMiles = roundTo2(emptyMiles + loadedMiles + returnEmptyMiles);
    const totalDurationHours = roundTo2(
      (emptyRoute?.durationHours ?? 0) +
        (loadedRoute?.durationHours ?? 0) +
        (returnRoute?.durationHours ?? 0)
    );

    return {
      emptyRoute,
      loadedRoute,
      returnRoute,
      emptyMiles,
      loadedMiles,
      returnEmptyMiles,
      totalMiles,
      totalDistanceMiles: totalMiles,
      totalDurationHours,
    };
  } catch (error) {
    console.error("[Routes] Error calculating multiple routes:", error);
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
