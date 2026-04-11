/**
 * db-dispatch-helpers.ts
 * Backend helpers for DispatchBoard - financial snapshot calculation
 * Keeps business logic separate from routers
 */

import { getDb } from "./db";

export interface FinancialSnapshot {
  margin: number;           // percentage (0-100)
  profit: number;           // dollars
  ratePerMile: number;      // dollars per mile
  status: "healthy" | "at_risk" | "loss";  // based on margin
}

/**
 * Calculate financial snapshot for a single load
 * Used by dispatch board to show inline financial metrics without N+1 queries
 * Inline calculation to avoid circular dependencies
 */
export async function getLoadFinancialSnapshot(loadId: number): Promise<FinancialSnapshot> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        margin: 0,
        profit: 0,
        ratePerMile: 0,
        status: "loss",
      };
    }

    const load = await db.query.loads.findFirst({
      where: (loads, { eq: eqOp }) => eqOp(loads.id, loadId),
    });

    if (!load) {
      return {
        margin: 0,
        profit: 0,
        ratePerMile: 0,
        status: "loss",
      };
    }

    // Get revenue from wallet transaction
    const paymentTx = await db.query.walletTransactions.findFirst({
      where: (wt, { eq: eqOp, and: andOp }) =>
        andOp(eqOp(wt.loadId, loadId), eqOp(wt.type, "load_payment")),
    });

    const revenue = paymentTx ? Number(paymentTx.amount) : 0;

    // Calculate expenses
    const miles = Number((load as any).miles) || 0;
    const fuelPrice = Number((load as any).fuelPrice) || 0;
    const mpg = Number((load as any).mpg) || 8;
    const maintenancePerMile = Number((load as any).maintenancePerMile) || 0.15;
    const tolls = Number((load as any).tolls) || 0;
    const driverPay = Number((load as any).driverPayAmount) || 0;
    const commission = Number((load as any).brokerCommission) || 0;

    const fuelCost = miles > 0 ? (miles / mpg) * fuelPrice : 0;
    const maintenanceCost = miles * maintenancePerMile;
    const totalExpenses = fuelCost + tolls + maintenanceCost + driverPay + commission;

    // Calculate profit metrics
    const profitAmount = revenue - totalExpenses;
    const margin = revenue > 0 ? (profitAmount / revenue) * 100 : 0;
    const ratePerMile = miles > 0 ? profitAmount / miles : 0;

    // Determine status based on margin
    let status: "healthy" | "at_risk" | "loss";
    if (margin >= 15) {
      status = "healthy";
    } else if (margin >= 8) {
      status = "at_risk";
    } else {
      status = "loss";
    }

    return {
      margin: Math.round(margin * 100) / 100, // Round to 2 decimals
      profit: Math.round(profitAmount * 100) / 100,
      ratePerMile: Math.round(ratePerMile * 100) / 100,
      status,
    };
  } catch (error) {
    console.error(`[getLoadFinancialSnapshot] Error for load ${loadId}:`, error);
    return {
      margin: 0,
      profit: 0,
      ratePerMile: 0,
      status: "loss",
    };
  }
}

/**
 * Calculate financial snapshots for multiple loads in parallel
 * Used by dispatch board list query
 */
export async function getLoadsFinancialSnapshots(
  loadIds: number[]
): Promise<Map<number, FinancialSnapshot>> {
  if (!loadIds || loadIds.length === 0) {
    return new Map();
  }

  try {
    const snapshots = await Promise.all(
      loadIds.map(async (id) => ({
        loadId: id,
        snapshot: await getLoadFinancialSnapshot(id),
      }))
    );

    const map = new Map<number, FinancialSnapshot>();
    snapshots.forEach(({ loadId, snapshot }) => {
      map.set(loadId, snapshot);
    });

    return map;
  } catch (error) {
    console.error("[getLoadsFinancialSnapshots] Error:", error);
    return new Map();
  }
}
