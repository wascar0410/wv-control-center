import { ENV } from "./env";

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    console.warn("[Geocoding] Empty address");
    return null;
  }

  if (!ENV.GOOGLE_MAPS_API_KEY) {
    console.error("[Geocoding] GOOGLE_MAPS_API_KEY not configured");
    return null;
  }

  try {
    const params = new URLSearchParams({
      address: address.trim(),
      key: ENV.GOOGLE_MAPS_API_KEY,
      components: "country:US",
    });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error("[Geocoding] HTTP error:", response.status, response.statusText, raw);
      return null;
    }

    const data = await response.json();

    console.log("[Geocoding] Google status:", data?.status);

    if (data?.status === "REQUEST_DENIED") {
      console.error("[Geocoding] Request denied:", data?.error_message || "No error message");
      return null;
    }

    if (data?.status === "OVER_QUERY_LIMIT") {
      console.error("[Geocoding] Over query limit");
      return null;
    }

    if (data?.status === "ZERO_RESULTS") {
      console.warn("[Geocoding] No results for address:", address);
      return null;
    }

    if (data?.status !== "OK" || !data?.results?.length) {
      console.error("[Geocoding] Unexpected response:", JSON.stringify(data));
      return null;
    }

    const result = data.results[0];
    const location = result.geometry?.location;

    if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
      console.error("[Geocoding] Missing location in response");
      return null;
    }

    return {
      address: address.trim(),
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.error("[Geocoding] Request timeout");
    } else {
      console.error("[Geocoding] Unexpected error:", error?.message || error);
    }
    return null;
  }
}

export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string | null> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  if (!ENV.GOOGLE_MAPS_API_KEY) {
    console.error("[Reverse Geocoding] GOOGLE_MAPS_API_KEY not configured");
    return null;
  }

  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: ENV.GOOGLE_MAPS_API_KEY,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const raw = await response.text();
      console.error("[Reverse Geocoding] HTTP error:", response.status, response.statusText, raw);
      return null;
    }

    const data = await response.json();

    if (data?.status !== "OK" || !data?.results?.length) {
      console.error("[Reverse Geocoding] Unexpected response:", JSON.stringify(data));
      return null;
    }

    return data.results[0].formatted_address;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.error("[Reverse Geocoding] Request timeout");
    } else {
      console.error("[Reverse Geocoding] Error:", error?.message || error);
    }
    return null;
  }
}

export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function calculateDistanceFromCoordinates(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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
  return R * c;
}
