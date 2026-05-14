import { getLoads } from "./db";
import { calculateVehicleOperatingCost, type VehicleType } from "./core/financial/vehicle-cost-engine";

export interface FinancialSnapshot {
  margin: number;
  profit: number;
  ratePerMile: number;
  status: "healthy" | "at_risk" | "loss";
}

type LoadItem = Awaited<ReturnType<typeof getLoads>>[number];

function round2(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

// Haversine formula to calculate distance between two coordinates (in miles)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function buildLoadFinancialSnapshot(load: LoadItem): FinancialSnapshot {
  const revenue = Number(load.price ?? 0);
  const estimatedTolls = Number(load.estimatedTolls ?? 0);
  
  // 🚗 UNIFIED VEHICLE COST ENGINE - Single source of truth for all calculations
  // Uses realistic cargo van operating costs ($0.95/mile total)
  const vehicleType: VehicleType = (load as any).vehicleType || "cargo_van";

  const rawNetMargin = load.netMargin;
  const parsedStoredNetMargin =
    rawNetMargin === null || rawNetMargin === undefined || rawNetMargin === ""
      ? null
      : Number(rawNetMargin);

  // Calculate miles from explicit fields or coordinates
  let miles =
    Number((load as any).estimatedMiles ?? 0) ||
    Number((load as any).miles ?? 0) ||
    Number((load as any).totalMiles ?? 0) ||
    Number((load as any).distanceMiles ?? 0) ||
    0;

  // If no explicit miles, calculate from coordinates using Haversine
  if (miles === 0 && load.pickupLat && load.pickupLng && load.deliveryLat && load.deliveryLng) {
    const pickupLatNum = Number(load.pickupLat);
    const pickupLngNum = Number(load.pickupLng);
    const deliveryLatNum = Number(load.deliveryLat);
    const deliveryLngNum = Number(load.deliveryLng);

    if (!isNaN(pickupLatNum) && !isNaN(pickupLngNum) && !isNaN(deliveryLatNum) && !isNaN(deliveryLngNum)) {
      miles = calculateDistance(
        pickupLatNum,
        pickupLngNum,
        deliveryLatNum,
        deliveryLngNum
      );
      miles = miles * 1.15; // Trucking adjustment
    }
  }

  // Fallback: never use 0 miles
  if (miles <= 0 || isNaN(miles)) {
    miles = 120;
  }

  // 🚗 USE UNIFIED VEHICLE COST ENGINE - Single source of truth
  const operatingCost = calculateVehicleOperatingCost(miles, vehicleType);
  const computedProfit = revenue - operatingCost - estimatedTolls;

  const profit =
    parsedStoredNetMargin !== null && Number.isFinite(parsedStoredNetMargin)
      ? parsedStoredNetMargin
      : computedProfit;

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const ratePerMile = revenue / miles; // SIEMPRE > 0 porque miles >= 120

  let status: "healthy" | "at_risk" | "loss";
  if (margin >= 15) status = "healthy";
  else if (margin >= 8) status = "at_risk";
  else status = "loss";

  // 🔅 LOG DE DEBUG
  console.log("[buildLoadFinancialSnapshot]", {
    id: (load as any).id,
    miles: Math.round(miles * 10) / 10,
    ratePerMile: Math.round(ratePerMile * 100) / 100,
    revenue,
  });

  return {
    margin: round2(margin),
    profit: round2(profit),
    ratePerMile: round2(ratePerMile),
    status,
  };
}

export function attachFinancialSnapshots<T extends LoadItem>(loads: T[]) {
  try {
    return loads.map((load, idx) => {
      // Log first load to see actual field values
      if (idx === 0) {
        console.log("[attachFinancialSnapshots] Sample load fields:", {
          id: load.id,
          price: load.price,
          estimatedFuel: load.estimatedFuel,
          estimatedTolls: load.estimatedTolls,
          netMargin: load.netMargin,
          estimatedMiles: (load as any).estimatedMiles,
          miles: (load as any).miles,
          totalMiles: (load as any).totalMiles,
          distanceMiles: (load as any).distanceMiles,
          pickupLat: load.pickupLat,
          pickupLng: load.pickupLng,
          deliveryLat: load.deliveryLat,
          deliveryLng: load.deliveryLng,
        });
      }
      try {
        return {
          ...load,
          financialSnapshot: buildLoadFinancialSnapshot(load),
        };
      } catch (err) {
        console.error("[attachFinancialSnapshots] Error building snapshot for load", load.id, err);
        return {
          ...load,
          financialSnapshot: {
            margin: 0,
            profit: 0,
            ratePerMile: 0,
            status: "loss" as const,
          },
        };
      }
    });
  } catch (err) {
    console.error("[attachFinancialSnapshots] Fatal error:", err);
    return loads.map((load) => ({
      ...load,
      financialSnapshot: {
        margin: 0,
        profit: 0,
        ratePerMile: 0,
        status: "loss" as const,
      },
    }));
  }
}
