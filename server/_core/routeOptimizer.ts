import { calculateRoute } from "./routes";

export interface Stop {
  id?: number;
  type: "pickup" | "delivery";
  address: string;
  latitude: number;
  longitude: number;
  weight?: number;
  description?: string;
}

export interface OptimizedStop extends Stop {
  stopOrder: number;
  distanceFromPrevious: number;
  durationFromPrevious: number;
}

export interface OptimizedRoute {
  stops: OptimizedStop[];
  totalDistance: number;
  totalDuration: number;
  totalWeight: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula (fallback)
 * Used when Google Routes API is unavailable
 */
function calculateHaversineDistance(
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

/**
 * Estimate driving time based on distance (average 55 mph highway speed)
 */
function estimateDuration(distanceMiles: number): number {
  const averageSpeed = 55; // mph
  return distanceMiles / averageSpeed;
}

/**
 * Nearest neighbor algorithm for route optimization
 * Starts from van location and greedily selects nearest unvisited stop
 * Time complexity: O(n²)
 */
export async function optimizeRouteNearestNeighbor(
  vanLat: number,
  vanLng: number,
  stops: Stop[]
): Promise<OptimizedRoute | null> {
  if (!stops || stops.length === 0) {
    return null;
  }

  const optimizedStops: OptimizedStop[] = [];
  const unvisited = [...stops];
  let currentLat = vanLat;
  let currentLng = vanLng;
  let totalDistance = 0;
  let totalDuration = 0;
  let totalWeight = 0;

  let stopOrder = 1;

  // Greedy nearest neighbor approach
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    // Find nearest unvisited stop
    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateHaversineDistance(
        currentLat,
        currentLng,
        unvisited[i].latitude,
        unvisited[i].longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    const nearestStop = unvisited[nearestIndex];
    const duration = estimateDuration(minDistance);

    optimizedStops.push({
      ...nearestStop,
      stopOrder,
      distanceFromPrevious: Math.round(minDistance * 100) / 100,
      durationFromPrevious: Math.round(duration * 100) / 100,
    });

    totalDistance += minDistance;
    totalDuration += duration;
    if (nearestStop.weight) {
      totalWeight += nearestStop.weight;
    }

    currentLat = nearestStop.latitude;
    currentLng = nearestStop.longitude;
    unvisited.splice(nearestIndex, 1);
    stopOrder++;
  }

  // Add return to van distance
  const returnDistance = calculateHaversineDistance(currentLat, currentLng, vanLat, vanLng);
  const returnDuration = estimateDuration(returnDistance);
  totalDistance += returnDistance;
  totalDuration += returnDuration;

  return {
    stops: optimizedStops,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalDuration: Math.round(totalDuration * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
  };
}

/**
 * 2-opt local search improvement algorithm
 * Improves upon initial solution by swapping edges to reduce total distance
 * Time complexity: O(n²) per iteration
 */
export async function improveRouteWith2Opt(
  route: OptimizedRoute,
  maxIterations: number = 100
): Promise<OptimizedRoute> {
  const stops = [...route.stops];
  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < stops.length - 1; i++) {
      for (let k = i + 2; k < stops.length; k++) {
        const stop1 = stops[i];
        const stop2 = stops[i + 1];
        const stop3 = stops[k];
        const stop4 = stops[k + 1] || { latitude: 0, longitude: 0 }; // Van location

        // Calculate current distance
        const currentDist =
          calculateHaversineDistance(stop1.latitude, stop1.longitude, stop2.latitude, stop2.longitude) +
          calculateHaversineDistance(stop3.latitude, stop3.longitude, stop4.latitude, stop4.longitude);

        // Calculate new distance after swap
        const newDist =
          calculateHaversineDistance(stop1.latitude, stop1.longitude, stop3.latitude, stop3.longitude) +
          calculateHaversineDistance(stop2.latitude, stop2.longitude, stop4.latitude, stop4.longitude);

        // If improvement found, perform swap
        if (newDist < currentDist) {
          // Reverse the segment between i+1 and k
          const segment = stops.slice(i + 1, k + 1).reverse();
          stops.splice(i + 1, k - i, ...segment);
          improved = true;
        }
      }
    }
  }

  // Recalculate distances and durations
  let totalDistance = 0;
  let totalDuration = 0;
  let currentLat = 0; // Van location
  let currentLng = 0;

  const updatedStops = stops.map((stop, index) => {
    const distance = calculateHaversineDistance(currentLat, currentLng, stop.latitude, stop.longitude);
    const duration = estimateDuration(distance);

    totalDistance += distance;
    totalDuration += duration;

    currentLat = stop.latitude;
    currentLng = stop.longitude;

    return {
      ...stop,
      stopOrder: index + 1,
      distanceFromPrevious: Math.round(distance * 100) / 100,
      durationFromPrevious: Math.round(duration * 100) / 100,
    };
  });

  // Add return to van
  const returnDistance = calculateHaversineDistance(currentLat, currentLng, 0, 0);
  const returnDuration = estimateDuration(returnDistance);
  totalDistance += returnDistance;
  totalDuration += returnDuration;

  return {
    stops: updatedStops,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalDuration: Math.round(totalDuration * 100) / 100,
    totalWeight: route.totalWeight,
  };
}

/**
 * Optimize route using nearest neighbor followed by 2-opt improvement
 */
export async function optimizeRoute(
  vanLat: number,
  vanLng: number,
  stops: Stop[]
): Promise<OptimizedRoute | null> {
  // Step 1: Get initial solution using nearest neighbor
  const initialRoute = await optimizeRouteNearestNeighbor(vanLat, vanLng, stops);

  if (!initialRoute) {
    return null;
  }

  // Step 2: Improve with 2-opt local search
  const improvedRoute = await improveRouteWith2Opt(initialRoute, 100);

  return improvedRoute;
}

/**
 * Separate stops into pickup and delivery groups, then optimize
 */
export async function optimizeRouteWithGroups(
  vanLat: number,
  vanLng: number,
  stops: Stop[]
): Promise<OptimizedRoute | null> {
  // Separate pickups and deliveries
  const pickups = stops.filter((s) => s.type === "pickup");
  const deliveries = stops.filter((s) => s.type === "delivery");

  // Optimize pickups first, then deliveries
  const combinedStops = [...pickups, ...deliveries];

  return optimizeRoute(vanLat, vanLng, combinedStops);
}
