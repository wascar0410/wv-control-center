import { ENV } from "./env";

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode an address using Google Maps Geocoding API
 * Returns latitude, longitude, and formatted address
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  // Validate API key
  if (!ENV.GOOGLE_MAPS_API_KEY) {
    console.error("[Geocoding] Google Maps API key not configured");
    return null;
  }

  try {
    const params = new URLSearchParams({
      address: address.trim(),
      key: ENV.GOOGLE_MAPS_API_KEY,
      components: "country:US", // Restrict to US for better results
    });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error("[Geocoding] API error:", response.status, response.statusText, await response.text());
      return null;
    }

    const data = await response.json();

    // Check for API errors
    if (data.status === "REQUEST_DENIED") {
      console.error("[Geocoding] Request denied:", data.error_message);
      return null;
    }

    if (data.status === "ZERO_RESULTS") {
      console.warn("[Geocoding] No results found for address:", address);
      return null;
    }

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.warn("[Geocoding] Unexpected status:", data.status);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      address: address.trim(),
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[Geocoding] Request timeout");
    } else {
      console.error("[Geocoding] Error:", error?.message || error);
    }
    return null;
  }
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string | null> {
  if (!lat || !lng) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: ENV.GOOGLE_MAPS_API_KEY,
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("[Reverse Geocoding] API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.warn("[Reverse Geocoding] No results found for coordinates:", lat, lng);
      return null;
    }

    return data.results[0].formatted_address;
  } catch (error) {
    console.error("[Reverse Geocoding] Error:", error);
    return null;
  }
}

/**
 * Validate if coordinates are within reasonable bounds
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calculate distance between two coordinates using Haversine formula (in miles)
 */
export function calculateDistanceFromCoordinates(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
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
