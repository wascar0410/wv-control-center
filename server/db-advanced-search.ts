import { getDb } from "./db";
import { loads } from "../drizzle/schema";

export interface AdvancedSearchFilters {
  status?: string;
  clientName?: string;
  brokerName?: string;
  minMiles?: number;
  maxMiles?: number;
  minPrice?: number;
  maxPrice?: number;
  pickupCity?: string;
  deliveryCity?: string;
  pickupState?: string;
  deliveryState?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "price" | "miles" | "date" | "status";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Advanced search for loads with filtering
 * Note: Uses in-memory filtering for complex queries
 */
export async function searchLoads(filters: AdvancedSearchFilters) {
  // Get all loads first
  const db = await getDb();
  if (!db) return { data: [], total: 0, limit: filters.limit || 50, offset: filters.offset || 0 };
  const allLoads = await db.select().from(loads);

  // Apply filters in memory
  let filtered = allLoads.filter((load: any) => {
    // Status filter
    if (filters.status && filters.status !== "all" && load.status !== filters.status) {
      return false;
    }

    // Client name filter
    if (filters.clientName && !load.clientName?.toLowerCase().includes(filters.clientName.toLowerCase())) {
      return false;
    }

    // Broker name filter
    if (filters.brokerName && !load.brokerName?.toLowerCase().includes(filters.brokerName.toLowerCase())) {
      return false;
    }

    // Miles range filter
    if (filters.minMiles !== undefined && (load.miles || 0) < filters.minMiles) {
      return false;
    }
    if (filters.maxMiles !== undefined && (load.miles || 0) > filters.maxMiles) {
      return false;
    }

    // Price range filter
    if (filters.minPrice !== undefined && Number(load.price || 0) < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && Number(load.price || 0) > filters.maxPrice) {
      return false;
    }

    // Pickup city filter
    if (filters.pickupCity && !load.pickupCity?.toLowerCase().includes(filters.pickupCity.toLowerCase())) {
      return false;
    }

    // Delivery city filter
    if (filters.deliveryCity && !load.deliveryCity?.toLowerCase().includes(filters.deliveryCity.toLowerCase())) {
      return false;
    }

    // Pickup state filter
    if (filters.pickupState && load.pickupState !== filters.pickupState) {
      return false;
    }

    // Delivery state filter
    if (filters.deliveryState && load.deliveryState !== filters.deliveryState) {
      return false;
    }

    // Date range filter
    if (filters.startDate && load.createdAt < filters.startDate) {
      return false;
    }
    if (filters.endDate && load.createdAt > filters.endDate) {
      return false;
    }

    return true;
  });

  // Sort
  const sortBy = filters.sortBy || "date";
  const sortOrder = filters.sortOrder || "desc";

  filtered.sort((a: any, b: any) => {
    let aVal: any = a.createdAt;
    let bVal: any = b.createdAt;

    if (sortBy === "price") {
      aVal = Number(a.price || 0);
      bVal = Number(b.price || 0);
    } else if (sortBy === "miles") {
      aVal = a.miles || 0;
      bVal = b.miles || 0;
    } else if (sortBy === "status") {
      aVal = a.status;
      bVal = b.status;
    }

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Pagination
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  return {
    data: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  };
}

/**
 * Get search suggestions for autocomplete
 */
export async function getSearchSuggestions(field: "clientName" | "brokerName" | "pickupCity" | "deliveryCity", query: string) {
  const db = await getDb();
  if (!db) return [];
  const allLoads = await db.select().from(loads);

  const fieldMap: Record<string, string> = {
    clientName: "clientName",
    brokerName: "brokerName",
    pickupCity: "pickupCity",
    deliveryCity: "deliveryCity",
  };

  const fieldKey = fieldMap[field];
  const suggestions = allLoads
    .map((load: any) => load[fieldKey])
    .filter((val: any) => val && val.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  // Remove duplicates
  return Array.from(new Set(suggestions));
}

/**
 * Get load statistics for dashboard
 */
export async function getLoadStatistics(filters?: Partial<AdvancedSearchFilters>) {
  const db = await getDb();
  if (!db) return { totalLoads: 0, totalMiles: 0, totalRevenue: 0, averagePrice: 0, averageMiles: 0, byStatus: { available: 0, in_transit: 0, delivered: 0, invoiced: 0, paid: 0 } };
  const searchResult = await searchLoads({ ...filters, limit: 10000 });
  const results = searchResult.data;

  return {
    totalLoads: results.length,
    totalMiles: results.reduce((sum: number, l: any) => sum + (l.miles || 0), 0),
    totalRevenue: results.reduce((sum: number, l: any) => sum + (Number(l.price) || 0), 0),
    averagePrice: results.length > 0 ? results.reduce((sum: number, l: any) => sum + (Number(l.price) || 0), 0) / results.length : 0,
    averageMiles: results.length > 0 ? results.reduce((sum: number, l: any) => sum + (l.miles || 0), 0) / results.length : 0,
    byStatus: {
      available: results.filter((l: any) => l.status === "available").length,
      in_transit: results.filter((l: any) => l.status === "in_transit").length,
      delivered: results.filter((l: any) => l.status === "delivered").length,
      invoiced: results.filter((l: any) => l.status === "invoiced").length,
      paid: results.filter((l: any) => l.status === "paid").length,
    },
  };
}
