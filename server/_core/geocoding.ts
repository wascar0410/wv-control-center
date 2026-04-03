import { ENV } from "./env";

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

// ─── Provider 1: Google Geocoding API ────────────────────────────────────────
async function geocodeWithGoogle(address: string): Promise<GeocodeResult | null> {
  if (!ENV.GOOGLE_MAPS_API_KEY) return null;
  try {
    const params = new URLSearchParams({
      address: address.trim(),
      key: ENV.GOOGLE_MAPS_API_KEY,
      components: "country:US",
    });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    console.log("[Geocoding] Google status:", data?.status);
    if (data?.status !== "OK" || !data?.results?.length) {
      console.warn("[Geocoding] Google returned:", data?.status, data?.error_message || "");
      return null;
    }
    const result = data.results[0];
    const location = result.geometry?.location;
    if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") return null;
    return {
      address: address.trim(),
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (error: any) {
    console.error("[Geocoding] Google error:", error?.message || error);
    return null;
  }
}

// ─── Provider 2: Nominatim (OpenStreetMap) — no API key required ─────────────
async function geocodeWithNominatim(address: string): Promise<GeocodeResult | null> {
  try {
    const params = new URLSearchParams({
      q: address.trim(),
      format: "json",
      limit: "1",
      countrycodes: "us",
      addressdetails: "1",
    });
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "WVTransportControlCenter/1.0 (wascardely@gmail.com)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("[Geocoding] Nominatim: no results for:", address);
      return null;
    }
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    return {
      address: address.trim(),
      latitude: lat,
      longitude: lng,
      formattedAddress: result.display_name || address.trim(),
    };
  } catch (error: any) {
    console.error("[Geocoding] Nominatim error:", error?.message || error);
    return null;
  }
}

// ─── Public geocodeAddress: tries Google first, falls back to Nominatim ──────
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    console.warn("[Geocoding] Empty address");
    return null;
  }

  // Try Google Geocoding API first
  const googleResult = await geocodeWithGoogle(address);
  if (googleResult) {
    console.log("[Geocoding] Resolved via Google:", address);
    return googleResult;
  }

  // Fall back to Nominatim (OpenStreetMap) — free, no key needed
  console.log("[Geocoding] Google unavailable, trying Nominatim for:", address);
  const nominatimResult = await geocodeWithNominatim(address);
  if (nominatimResult) {
    console.log("[Geocoding] Resolved via Nominatim:", address);
    return nominatimResult;
  }

  console.error("[Geocoding] Both providers failed for:", address);
  return null;
}

// ─── Reverse geocoding (coordinates → address) ───────────────────────────────
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string | null> {
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  // Try Google first
  if (ENV.GOOGLE_MAPS_API_KEY) {
    try {
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: ENV.GOOGLE_MAPS_API_KEY,
      });
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.status === "OK" && data?.results?.length) {
          return data.results[0].formatted_address;
        }
      }
    } catch (error: any) {
      console.error("[Reverse Geocoding] Google error:", error?.message || error);
    }
  }

  // Fall back to Nominatim reverse geocoding
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "json",
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "WVTransportControlCenter/1.0 (wascardely@gmail.com)",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data?.display_name) return data.display_name;
    }
  } catch (error: any) {
    console.error("[Reverse Geocoding] Nominatim error:", error?.message || error);
  }

  return null;
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
