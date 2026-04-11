/**
 * dispatchHelpers.ts
 * Utility functions for DispatchBoard
 * Filter, sort, group, and format operations
 */

export interface DispatchLoad {
  id: number;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  assignedDriverId?: number | null;
  weight: number;
  merchandiseType: string;
  totalPrice: number;
  createdAt: Date;
  financialSnapshot?: {
    margin: number;
    profit: number;
    ratePerMile: number;
    status: "healthy" | "at_risk" | "loss";
  };
  [key: string]: any;
}

export interface DispatchFilters {
  status: string[];
  broker?: string[];
  driver?: number[];
  marginRange: [number, number];
  dateRange?: [Date, Date];
  search: string;
  sortBy?: "id" | "margin" | "profit" | "date";
  sortOrder?: "asc" | "desc";
}

/**
 * Filter loads based on dispatch filters
 */
export function filterLoads(loads: DispatchLoad[], filters: Partial<DispatchFilters>): DispatchLoad[] {
  return loads.filter((load) => {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(load.status)) {
        return false;
      }
    }

    // Margin range filter
    if (filters.marginRange) {
      const margin = load.financialSnapshot?.margin ?? 0;
      if (margin < filters.marginRange[0] || margin > filters.marginRange[1]) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const loadDate = new Date(load.createdAt);
      if (loadDate < filters.dateRange[0] || loadDate > filters.dateRange[1]) {
        return false;
      }
    }

    // Search filter (load ID, client name, merchandise type)
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      const matchesId = String(load.id).includes(searchLower);
      const matchesClient = load.clientName.toLowerCase().includes(searchLower);
      const matchesMerchandise = load.merchandiseType.toLowerCase().includes(searchLower);

      if (!matchesId && !matchesClient && !matchesMerchandise) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort loads based on sort criteria
 */
export function sortLoads(
  loads: DispatchLoad[],
  sortBy: string = "date",
  sortOrder: "asc" | "desc" = "desc"
): DispatchLoad[] {
  const sorted = [...loads].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case "margin":
        aValue = a.financialSnapshot?.margin ?? 0;
        bValue = b.financialSnapshot?.margin ?? 0;
        break;
      case "profit":
        aValue = a.financialSnapshot?.profit ?? 0;
        bValue = b.financialSnapshot?.profit ?? 0;
        break;
      case "id":
        aValue = a.id;
        bValue = b.id;
        break;
      case "date":
      default:
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Group loads by status
 */
export function groupLoadsByStatus(
  loads: DispatchLoad[]
): Record<string, DispatchLoad[]> {
  const statusOrder = ["available", "quoted", "assigned", "in_transit", "delivered", "invoiced", "paid"];
  const grouped: Record<string, DispatchLoad[]> = {};

  // Initialize all status groups
  statusOrder.forEach((status) => {
    grouped[status] = [];
  });

  // Group loads
  loads.forEach((load) => {
    const status = load.status || "available";
    if (!grouped[status]) {
      grouped[status] = [];
    }
    grouped[status].push(load);
  });

  return grouped;
}

/**
 * Calculate KPI metrics from loads
 */
export function calculateKPIs(loads: DispatchLoad[]) {
  const totalLoads = loads.length;
  const margins = loads
    .map((l) => l.financialSnapshot?.margin ?? 0)
    .filter((m) => m > 0);
  const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  const atRisk = loads.filter((l) => {
    const margin = l.financialSnapshot?.margin ?? 0;
    return margin < 8 && margin > 0;
  }).length;

  const blocked = loads.filter((l) => l.financialSnapshot?.status === "loss").length;

  const pending = loads.filter((l) => l.status === "assigned").length;

  return {
    totalLoads,
    avgMargin: Math.round(avgMargin * 100) / 100,
    atRisk,
    blocked,
    pending,
    alerts: atRisk + blocked,
  };
}

/**
 * Get color for margin status
 */
export function calculateMarginColor(margin: number): "green" | "yellow" | "red" {
  if (margin >= 15) return "green";
  if (margin >= 8) return "yellow";
  return "red";
}

/**
 * Format margin as percentage
 */
export function formatMargin(margin: number): string {
  return `${Math.round(margin * 100) / 100}%`;
}

/**
 * Format rate per mile
 */
export function formatRate(rate: number): string {
  return `$${(Math.round(rate * 100) / 100).toFixed(2)}/mi`;
}

/**
 * Format profit as currency
 */
export function formatProfit(profit: number): string {
  return `$${(Math.round(profit * 100) / 100).toFixed(2)}`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: "bg-blue-500/15 text-blue-400",
    quoted: "bg-purple-500/15 text-purple-400",
    assigned: "bg-amber-500/15 text-amber-400",
    in_transit: "bg-orange-500/15 text-orange-400",
    delivered: "bg-green-500/15 text-green-400",
    invoiced: "bg-cyan-500/15 text-cyan-400",
    paid: "bg-emerald-500/15 text-emerald-400",
  };
  return colors[status] || "bg-gray-500/15 text-gray-400";
}

/**
 * Get financial status badge color
 */
export function getFinancialStatusColor(status: "healthy" | "at_risk" | "loss"): string {
  switch (status) {
    case "healthy":
      return "bg-green-500/15 text-green-400";
    case "at_risk":
      return "bg-yellow-500/15 text-yellow-400";
    case "loss":
      return "bg-red-500/15 text-red-400";
  }
}
