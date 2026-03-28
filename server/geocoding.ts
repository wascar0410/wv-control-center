import axios from "axios";

/**
 * Haversine formula to calculate distance between two coordinates in miles
 */
export function calculateDistanceFromCoordinates(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimals
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

/**
 * Geocode an address using OpenStreetMap Nominatim API (free, no API key required)
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: address,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "WV-Control-Center/1.0",
      },
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name,
      };
    }

    return null;
  } catch (error) {
    console.error("Error geocoding address with Nominatim:", error);
    return null;
  }
}

/**
 * Geocode both origin and destination addresses
 */
export async function geocodeAddresses(
  originAddress: string,
  destinationAddress: string
): Promise<{
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: number;
} | null> {
  try {
    const [originResult, destResult] = await Promise.all([
      geocodeAddress(originAddress),
      geocodeAddress(destinationAddress),
    ]);

    if (originResult && destResult) {
      const distance = calculateDistanceFromCoordinates(
        originResult.lat,
        originResult.lng,
        destResult.lat,
        destResult.lng
      );

      return {
        originLat: originResult.lat,
        originLng: originResult.lng,
        destinationLat: destResult.lat,
        destinationLng: destResult.lng,
        distance,
      };
    }

    return null;
  } catch (error) {
    console.error("Error geocoding addresses:", error);
    return null;
  }
}

/**
 * Calculate distance between two addresses
 */
export async function calculateDistance(
  originAddress: string,
  destinationAddress: string
): Promise<number | null> {
  try {
    const result = await geocodeAddresses(originAddress, destinationAddress);
    return result ? result.distance : null;
  } catch (error) {
    console.error("Error calculating distance:", error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        lat,
        lon: lng,
        format: "json",
      },
      headers: {
        "User-Agent": "WV-Control-Center/1.0",
      },
    });

    if (response.data && response.data.address) {
      return response.data.display_name;
    }

    return null;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
}
