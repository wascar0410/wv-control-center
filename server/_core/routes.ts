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

/**
 * Calculate route distance and duration using Google Routes API
 * Returns distance in miles and duration in hours
 */
export async function calculateRoute(
  request: RouteRequest
): Promise<RouteResult | null> {
  const { originLat, originLng, destinationLat, destinationLng } = request;

  if (
    !isValidCoordinate(originLat, originLng) ||
    !isValidCoordinate(destinationLat, destinationLng)
  ) {
    console.error("[Routes] Invalid coordinates provided", {
      originLat,
      originLng,
      destinationLat,
      destinationLng,
    });
    return null;
  }

  if (!ENV.GOOGLE_MAPS_API_KEY) {
    console.error("[Routes] GOOGLE_MAPS_API_KEY not configured");
    return null;
  }

  try {
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: originLat,
            longitude: originLng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destinationLat,
            longitude: destinationLng,
          },
        },
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
      }
    );

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      console.error("[Routes] API error:", response.status, errorData);
      return null;
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("[Routes] No routes found for coordinates");
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = Number(route.distanceMeters ?? 0);

    // Google suele devolver duration como "123s" o "123.456s"
    const rawDuration = String(route.duration ?? "0s").replace("s", "");
    const durationSeconds = Math.round(parseFloat(rawDuration) || 0);

    return {
      distanceMeters,
      distanceMiles: roundTo2(metersToMiles(distanceMeters)),
      durationSeconds,
      durationMinutes: roundTo2(secondsToMinutes(durationSeconds)),
      durationHours: roundTo2(secondsToHours(durationSeconds)),
      polyline: route.polyline?.encodedPolyline,
    };
  } catch (error) {
    console.error("[Routes] Error:", error);
    return null;
  }
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
      vanLat,
      vanLng,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
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

    // La ruta cargada es la crítica. Si falla, no tiene sentido continuar.
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

/**
 * Helper functions
 */
function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

function secondsToHours(seconds: number): number {
  return seconds / 3600;
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
