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

/**
 * Calculate route distance and duration using Google Routes API
 * Returns distance in miles and duration in hours
 */
export async function calculateRoute(request: RouteRequest): Promise<RouteResult | null> {
  const { originLat, originLng, destinationLat, destinationLng } = request;

  if (!isValidCoordinate(originLat, originLng) || !isValidCoordinate(destinationLat, destinationLng)) {
    console.error("[Routes] Invalid coordinates provided");
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

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": ENV.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Routes] API error:", response.status, errorData);
      return null;
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("[Routes] No routes found for coordinates");
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = parseInt(route.distanceMeters, 10);
    const durationSeconds = parseInt(route.duration.replace("s", ""), 10);

    return {
      distanceMeters,
      distanceMiles: metersToMiles(distanceMeters),
      durationSeconds,
      durationMinutes: secondsToMinutes(durationSeconds),
      durationHours: secondsToHours(durationSeconds),
      polyline: route.polyline?.encodedPolyline,
    };
  } catch (error) {
    console.error("[Routes] Error:", error);
    return null;
  }
}

/**
 * Calculate multiple routes (van to pickup, pickup to delivery, delivery to van)
 */
export async function calculateMultipleRoutes(
  vanLat: number,
  vanLng: number,
  pickupLat: number,
  pickupLng: number,
  deliveryLat: number,
  deliveryLng: number,
  includeReturnEmpty: boolean
): Promise<{
  emptyRoute: RouteResult | null;
  loadedRoute: RouteResult | null;
  returnRoute: RouteResult | null;
  totalDistanceMiles: number;
  totalDurationHours: number;
} | null> {
  try {
    // Van to Pickup (empty miles)
    const emptyRoute = await calculateRoute({
      originLat: vanLat,
      originLng: vanLng,
      destinationLat: pickupLat,
      destinationLng: pickupLng,
    });

    // Pickup to Delivery (loaded miles)
    const loadedRoute = await calculateRoute({
      originLat: pickupLat,
      originLng: pickupLng,
      destinationLat: deliveryLat,
      destinationLng: deliveryLng,
    });

    // Delivery to Van (return empty miles) - optional
    let returnRoute = null;
    if (includeReturnEmpty) {
      returnRoute = await calculateRoute({
        originLat: deliveryLat,
        originLng: deliveryLng,
        destinationLat: vanLat,
        destinationLng: vanLng,
      });
    }

    const totalDistanceMiles =
      (emptyRoute?.distanceMiles || 0) +
      (loadedRoute?.distanceMiles || 0) +
      (returnRoute?.distanceMiles || 0);

    const totalDurationHours =
      (emptyRoute?.durationHours || 0) +
      (loadedRoute?.durationHours || 0) +
      (returnRoute?.durationHours || 0);

    return {
      emptyRoute,
      loadedRoute,
      returnRoute,
      totalDistanceMiles,
      totalDurationHours,
    };
  } catch (error) {
    console.error("[Routes] Error calculating multiple routes:", error);
    return null;
  }
}

/**
 * Helper functions for unit conversion
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

function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
