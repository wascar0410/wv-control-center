import type { getLoads } from "./db";

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

export function buildLoadFinancialSnapshot(load: LoadItem): FinancialSnapshot {
  const revenue = Number(load.price ?? 0);
  const estimatedFuel = Number(load.estimatedFuel ?? 0);
  const estimatedTolls = Number(load.estimatedTolls ?? 0);

  const computedProfit = revenue - estimatedFuel - estimatedTolls;

  const rawNetMargin = load.netMargin;
  const parsedStoredNetMargin =
    rawNetMargin === null || rawNetMargin === undefined || rawNetMargin === ""
      ? null
      : Number(rawNetMargin);

  const profit =
    parsedStoredNetMargin !== null && Number.isFinite(parsedStoredNetMargin)
      ? parsedStoredNetMargin
      : computedProfit;

  const miles =
    Number((load as any).estimatedMiles ?? 0) ||
    Number((load as any).miles ?? 0) ||
    Number((load as any).totalMiles ?? 0) ||
    Number((load as any).distanceMiles ?? 0) ||
    0;

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const ratePerMile = miles > 0 ? revenue / miles : 0;

  let status: "healthy" | "at_risk" | "loss";
  if (margin >= 15) status = "healthy";
  else if (margin >= 8) status = "at_risk";
  else status = "loss";

  return {
    margin: round2(margin),
    profit: round2(profit),
    ratePerMile: round2(ratePerMile),
    status,
  };
}

export function attachFinancialSnapshots<T extends LoadItem>(loads: T[]) {
  return loads.map((load) => ({
    ...load,
    financialSnapshot: buildLoadFinancialSnapshot(load),
  }));
}
