/**
 * Helper: Determine if a load is route/data blocked (not economically rejected)
 * Returns true ONLY for loads with missing/invalid/fallback route data
 * Returns false for loads with valid routes but poor economics
 */
export function isLoadRouteBlocked(load: any, advice: any): boolean {
  const snapshot = load.financialSnapshot || {};

  // Check if advice explicitly marks as blocked
  if (advice?.recommendation === "blocked" || advice?.status === "blocked") {
    return true;
  }

  // Check route/data issues
  if (snapshot.isDecisionBlocked) return true;
  if (snapshot.routeStatus === "missing_coords") return true;
  if (snapshot.routeStatus === "invalid") return true;
  if (snapshot.distanceSource === "fallback_120") return true;
  if (snapshot.distanceConfidence === "low") return true;

  // Check if advice has blocked reason
  if (advice?.blockedReason) return true;

  return false;
}
