/**
 * dispatchHelpers.ts
 * Utility functions for DispatchBoard
 * Filter, sort, group, and format operations
 */
export interface DispatchLoad {
  id: number;
  clientName?: string | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  status?: string | null;
  assignedDriverId?: number | null;
  weight?: number | string | null;
  merchandiseType?: string | null;
  price?: number | string | null;
  createdAt?: Date | string | null;
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

function safeString(value: unknown): string {
  return String(value ?? "").trim();
}

function safeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function safeDateMs(value: unknown): number {
  if (!value) return 0;
  const ms = new Date(value as any).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Filter loads based on dispatch filters
 */
export function filterLoads(
  loads: DispatchLoad[],
  filters: Partial<DispatchFilters>
): DispatchLoad[] {
  if (!Array.isArray(loads)) return [];

  return loads.filter((load) => {
    const status = safeString(load.status);

    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(status)) {
        return false;
      }
    }

    if (filters.marginRange) {
      const margin = safeNumber(load.financialSnapshot?.margin);
      if (margin < filters.marginRange[0] || margin > filters.marginRange[1]) {
        return false;
      }
    }

    if (filters.dateRange) {
      const loadDateMs = safeDateMs(load.createdAt);
      const startMs = filters.dateRange[0]?.getTime?.() ?? 0;
      const endMs = filters.dateRange[1]?.getTime?.() ?? 0;

      if (!loadDateMs || loadDateMs < startMs || loadDateMs > endMs) {
        return false;
      }
    }

    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      const matchesId = String(load.id ?? "").includes(searchLower);
      const matchesClient = safeString(load.clientName).toLowerCase().includes(searchLower);
      const matchesMerchandise = safeString(load.merchandiseType)
        .toLowerCase()
        .includes(searchLower);
      const matchesPickup = safeString(load.pickupAddress).toLowerCase().includes(searchLower);
      const matchesDelivery = safeString(load.deliveryAddress).toLowerCase().includes(searchLower);

      if (
        !matchesId &&
        !matchesClient &&
        !matchesMerchandise &&
        !matchesPickup &&
        !matchesDelivery
      ) {
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
  if (!Array.isArray(loads)) return [];

  return [...loads].sort((a, b) => {
    let aValue: number | string = 0;
    let bValue: number | string = 0;

    switch (sortBy) {
      case "margin":
        aValue = safeNumber(a.financialSnapshot?.margin);
        bValue = safeNumber(b.financialSnapshot?.margin);
        break;
      case "profit":
        aValue = safeNumber(a.financialSnapshot?.profit);
        bValue = safeNumber(b.financialSnapshot?.profit);
        break;
      case "id":
        aValue = safeNumber(a.id);
        bValue = safeNumber(b.id);
        break;
      case "date":
      default:
        aValue = safeDateMs(a.createdAt);
        bValue = safeDateMs(b.createdAt);
        break;
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });
}

/**
 * Group loads by status
 */
export function groupLoadsByStatus(loads: DispatchLoad[]): Record<string, DispatchLoad[]> {
  const statusOrder = [
    "available",
    "quoted",
    "assigned",
    "in_transit",
    "delivered",
    "invoiced",
    "paid",
  ];

  const grouped: Record<string, DispatchLoad[]> = {};
  statusOrder.forEach((status) => {
    grouped[status] = [];
  });

  if (!Array.isArray(loads)) return grouped;

  loads.forEach((load) => {
    const status = safeString(load.status) || "available";
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
  if (!Array.isArray(loads)) {
    return {
      totalLoads: 0,
      avgMargin: 0,
      atRisk: 0,
      blocked: 0,
      pending: 0,
      alerts: 0,
    };
  }

  const totalLoads = loads.length;
  const margins = loads
    .map((l) => safeNumber(l.financialSnapshot?.margin))
    .filter((m) => m > 0);

  const avgMargin =
    margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  const atRisk = loads.filter((l) => {
    const margin = safeNumber(l.financialSnapshot?.margin);
    return margin < 8 && margin > 0;
  }).length;

  const blocked = loads.filter((l) => l.financialSnapshot?.status === "loss").length;
  const pending = loads.filter((l) => safeString(l.status) === "assigned").length;

  return {
    totalLoads,
    avgMargin: Math.round(avgMargin * 100) / 100,
    atRisk,
    blocked,
    pending,
    alerts: atRisk + blocked,
  };
}

export function calculateMarginColor(margin: number): "green" | "yellow" | "red" {
  if (safeNumber(margin) >= 15) return "green";
  if (safeNumber(margin) >= 8) return "yellow";
  return "red";
}

export function formatMargin(margin: number): string {
  return `${(Math.round(safeNumber(margin) * 100) / 100).toFixed(2)}%`;
}

export function formatRate(rate: number): string {
  return `$${(Math.round(safeNumber(rate) * 100) / 100).toFixed(2)}/mi`;
}

export function formatProfit(profit: number): string {
  return `$${(Math.round(safeNumber(profit) * 100) / 100).toFixed(2)}`;
}

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
  return colors[safeString(status)] || "bg-gray-500/15 text-gray-400";
}

export function getFinancialStatusColor(
  status: "healthy" | "at_risk" | "loss"
): string {
  switch (status) {
    case "healthy":
      return "bg-green-500/15 text-green-400";
    case "at_risk":
      return "bg-yellow-500/15 text-yellow-400";
    case "loss":
    default:
      return "bg-red-500/15 text-red-400";
  }
}
