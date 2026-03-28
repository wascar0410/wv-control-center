import { describe, it, expect } from "vitest";
import { getGoogleMapsClient } from "./google-maps";

describe("Google Maps API", () => {
  it("should validate Google Maps API Key is configured", async () => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toBeTruthy();
    expect(apiKey?.length).toBeGreaterThan(0);
  });

  it("should be able to geocode a valid address", async () => {
    const client = getGoogleMapsClient();
    
    // Test geocoding with a simple address
    const response = await client.geocode({
      params: {
        address: "1600 Amphitheatre Parkway, Mountain View, CA",
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.results).toBeDefined();
    expect(response.data.results.length).toBeGreaterThan(0);
    
    const result = response.data.results[0];
    expect(result.geometry).toBeDefined();
    expect(result.geometry.location).toBeDefined();
    expect(result.geometry.location.lat).toBeDefined();
    expect(result.geometry.location.lng).toBeDefined();
  });

  it("should be able to calculate distance between two points", async () => {
    const client = getGoogleMapsClient();
    
    // Test distance matrix between two addresses
    const response = await client.distancematrix({
      params: {
        origins: ["1600 Amphitheatre Parkway, Mountain View, CA"],
        destinations: ["1 Market St, San Francisco, CA"],
        key: process.env.GOOGLE_MAPS_API_KEY!,
        units: "imperial", // miles
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.rows).toBeDefined();
    expect(response.data.rows.length).toBeGreaterThan(0);
    
    const row = response.data.rows[0];
    expect(row.elements).toBeDefined();
    expect(row.elements.length).toBeGreaterThan(0);
    
    const element = row.elements[0];
    expect(element.distance).toBeDefined();
    expect(element.distance.value).toBeGreaterThan(0);
  });
});
