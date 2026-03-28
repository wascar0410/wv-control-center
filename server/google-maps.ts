import axios from "axios";

export interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    bounds?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface DistanceResult {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  status: string;
}

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn("⚠️ GOOGLE_MAPS_API_KEY is not configured. Geocoding will not work.");
}

export function getGoogleMapsClient() {
  return {
    geocode: async (params: { params: Record<string, any> }) => {
      return axios.get("https://maps.googleapis.com/maps/api/geocode/json", params.params);
    },
    distancematrix: async (params: { params: Record<string, any> }) => {
      return axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", params.params);
    },
  };
}

/**
 * Geocode an address to get latitude and longitude
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API Key not configured. Cannot geocode address:", address);
    return null;
  }

  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }

    return null;
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

/**
 * Calculate distance between two addresses in miles
 */
export async function calculateDistance(
  origin: string,
  destination: string
): Promise<number | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API Key not configured. Cannot calculate distance.");
    return null;
  }

  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
      params: {
        origins: origin,
        destinations: destination,
        key: GOOGLE_MAPS_API_KEY,
        units: "imperial", // miles
      },
    });

    if (
      response.data.rows &&
      response.data.rows.length > 0 &&
      response.data.rows[0].elements &&
      response.data.rows[0].elements.length > 0
    ) {
      const element = response.data.rows[0].elements[0];
      if (element.status === "OK" && element.distance) {
        // Convert meters to miles
        return Math.round((element.distance.value / 1609.34) * 100) / 100;
      }
    }

    return null;
  } catch (error) {
    console.error("Error calculating distance:", error);
    return null;
  }
}

/**
 * Geocode both origin and destination, return coordinates
 */
export async function geocodeAddresses(
  origin: string,
  destination: string
): Promise<{
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
} | null> {
  try {
    const [originResult, destResult] = await Promise.all([
      geocodeAddress(origin),
      geocodeAddress(destination),
    ]);

    if (originResult && destResult) {
      return {
        originLat: originResult.geometry.location.lat,
        originLng: originResult.geometry.location.lng,
        destinationLat: destResult.geometry.location.lat,
        destinationLng: destResult.geometry.location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error("Error geocoding addresses:", error);
    return null;
  }
}
