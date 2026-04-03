import { ENV } from "./env";

export interface RouteResult {
  distanceMeters: number;
  distanceMiles: number;
  durationSeconds: number;
  durationMinutes: number;
  durationHours: number;
  polyline?: string;
  /** Estimated toll cost in USD (from Google Routes API). Null if unavailable. */
  tollCostUSD: number | null;
  /** Whether toll data came from Google (true) or is estimated/unknown (false) */
  tollDataSource: "google" | "estimated" | "none";
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
  /** Total estimated toll cost for all segments in USD */
  estimatedTollCost: number;
  /** Whether toll data is from Google API or not available */
  tollDataSource: "google" | "estimated" | "none";
}

// --- Haversine fallback ---
function haversineRoute(lat1: number, lng1: number, lat2: number, lng2: number): RouteResult {
  const R = 3959;
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
  const roadMiles = roundTo2(straightLineMiles * 1.25);
  const distanceMeters = Math.round(roadMiles * 1609.344);
  const durationHours = roundTo2(roadMiles / 55);
  const durationSeconds = Math.round(durationHours * 3600);
  return {
    distanceMeters,
    distanceMiles: roadMiles,
    durationSeconds,
    durationMinutes: roundTo2(durationSeconds / 60),
    durationHours,
    tollCostUSD: null,
    tollDataSource: "none",
  };
}

// --- Extract toll cost from Google Routes API response ---
function extractTollCost(route: any): number | null {
  try {
    const prices: any[] = route?.travelAdvisory?.tollInfo?.estimatedPrice ?? [];
    if (prices.length === 0) return null;
    let totalUSD = 0;
    let foundUSD = false;
    for (const price of prices) {
      if (price.currencyCode === "USD") {
        totalUSD += Number(price.units ?? 0) + Number(price.nanos ?? 0) / 1_000_000_000;
        foundUSD = true;
      }
    }
    return foundUSD ? roundTo2(totalUSD) : null;
  } catch {
    return null;
  }
}

// --- Google Routes API v2 with TOLLS extraComputation ---
async function calculateRouteWithGoogle(request: RouteRequest): Promise<RouteResult | null> {
  const { originLat, originLng, destinationLat, destinationLng } = request;
  if (!ENV.GOOGLE_MAPS_API_KEY) return null;
  try {
    const requestBody = {
      origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
      destination: { location: { latLng: { latitude: destinationLat, longitude: destinationLng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      extraComputations: ["TOLLS"],
      routeModifiers: {
        vehicleInfo: { emissionType: "GASOLINE" },
        tollPasses: ["US_NJ_EZPASS", "US_PA_EZPASS", "US_NY_EZPASS", "US_MA_EZPASS", "US_CT_EZPASS", "US_DE_EZPASS"],
      },
    };

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": ENV.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000),
    });

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
    const tollCostUSD = extractTollCost(route);

    console.log(`[Routes] Google: ${roundTo2(metersToMiles(distanceMeters))} mi, tolls: ${tollCostUSD !== null ? "$" + tollCostUSD : "none"}`);

    return {
      distanceMeters,
      distanceMiles: roundTo2(metersToMiles(distanceMeters)),
      durationSeconds,
      durationMinutes: roundTo2(durationSeconds / 60),
      durationHours: roundTo2(durationSeconds / 3600),
      polyline: route.polyline?.encodedPolyline,
      tollCostUSD,
      tollDataSource: "google",
    };
  } catch (error) {
    console.error("[Routes] Google error:", error);
    return null;
  }
}

export async function calculateRoute(request: RouteRequest): Promise<RouteResult | null> {
  const { originLat, originLng, destinationLat, destinationLng } = request;
  if (!isValidCoordinate(originLat, originLng) || !isValidCoordinate(destinationLat, destinationLng)) {
    console.error("[Routes] Invalid coordinates provided", request);
    return null;
  }
  const googleResult = await calculateRouteWithGoogle(request);
  if (googleResult) return googleResult;
  console.log("[Routes] Google unavailable, using Haversine fallback");
  return haversineRoute(originLat, originLng, destinationLat, destinationLng);
}

export async function calculateMultipleRoutes(input: MultipleRoutesInput): Promise<MultipleRoutesResult | null> {
  const { vanLat, vanLng, pickupLat, pickupLng, deliveryLat, deliveryLng, includeReturnEmpty = false } = input;

  if (!isValidCoordinate(vanLat, vanLng) || !isValidCoordinate(pickupLat, pickupLng) || !isValidCoordinate(deliveryLat, deliveryLng)) {
    console.error("[Routes] Invalid coordinates provided", { vanLat, vanLng, pickupLat, pickupLng, deliveryLat, deliveryLng });
    return null;
  }

  try {
    const emptyRoute = await calculateRoute({ originLat: vanLat, originLng: vanLng, destinationLat: pickupLat, destinationLng: pickupLng });
    const loadedRoute = await calculateRoute({ originLat: pickupLat, originLng: pickupLng, destinationLat: deliveryLat, destinationLng: deliveryLng });
    let returnRoute: RouteResult | null = null;
    if (includeReturnEmpty) {
      returnRoute = await calculateRoute({ originLat: deliveryLat, originLng: deliveryLng, destinationLat: vanLat, destinationLng: vanLng });
    }

    if (!loadedRoute) {
      console.error("[Routes] Loaded route could not be calculated");
      return null;
    }

    const emptyMiles = roundTo2(emptyRoute?.distanceMiles ?? 0);
    const loadedMiles = roundTo2(loadedRoute.distanceMiles ?? 0);
    const returnEmptyMiles = roundTo2(returnRoute?.distanceMiles ?? 0);
    const totalMiles = roundTo2(emptyMiles + loadedMiles + returnEmptyMiles);
    const totalDurationHours = roundTo2(
      (emptyRoute?.durationHours ?? 0) + (loadedRoute?.durationHours ?? 0) + (returnRoute?.durationHours ?? 0)
    );

    // Sum tolls across all segments
    const estimatedTollCost = roundTo2(
      (loadedRoute.tollCostUSD ?? 0) +
      (emptyRoute?.tollCostUSD ?? 0) +
      (returnRoute?.tollCostUSD ?? 0)
    );
    const tollDataSource = loadedRoute.tollDataSource;

    return {
      emptyRoute, loadedRoute, returnRoute,
      emptyMiles, loadedMiles, returnEmptyMiles,
      totalMiles, totalDistanceMiles: totalMiles, totalDurationHours,
      estimatedTollCost, tollDataSource,
    };
  } catch (error) {
    console.error("[Routes] Error calculating multiple routes:", error);
    return null;
  }
}

function metersToMiles(meters: number): number { return meters * 0.000621371; }
function roundTo2(value: number): number { return Math.round(value * 100) / 100; }
function isValidCoordinate(lat: number, lng: number): boolean {
  return typeof lat === "number" && typeof lng === "number" &&
    !Number.isNaN(lat) && !Number.isNaN(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
