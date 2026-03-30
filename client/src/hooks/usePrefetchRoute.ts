import { useEffect } from "react";
import { usePrefetchIdle } from "@/lib/prefetch";

/**
 * Map of routes to their required chunk URLs for prefetching
 * This ensures chunks are prefetched before user navigates to the route
 */
const ROUTE_CHUNK_MAP: Record<string, string[]> = {
  "/dashboard": [
    "/assets/ProjectionsCard-*.js",
    "/assets/TrendCharts-*.js",
    "/assets/ComparisonAnalytics-*.js",
    "/assets/DriverLocationMap-*.js",
    "/assets/ChatWidget-*.js",
  ],
  "/loads": [
    "/assets/LoadDetailsModal-*.js",
    "/assets/AssignLoadModal-*.js",
  ],
  "/finance": [
    "/assets/FinanceCharts-*.js",
    "/assets/ExpenseForm-*.js",
  ],
  "/drivers": [
    "/assets/DriverForm-*.js",
    "/assets/DriverLocationMap-*.js",
  ],
  "/admin": [
    "/assets/AdminDashboard-*.js",
    "/assets/UserManagement-*.js",
  ],
};

/**
 * Hook to prefetch chunks for a specific route
 * Prefetches chunks when browser is idle to avoid blocking user interactions
 *
 * Usage:
 * usePrefetchRoute("/dashboard");
 */
export function usePrefetchRoute(route: string): void {
  const chunks = ROUTE_CHUNK_MAP[route] || [];
  usePrefetchIdle(chunks);
}

/**
 * Hook to prefetch chunks for multiple routes
 * Useful for prefetching common navigation paths
 *
 * Usage:
 * usePrefetchRoutes(["/dashboard", "/loads", "/finance"]);
 */
export function usePrefetchRoutes(routes: string[]): void {
  const allChunks = routes.flatMap((route) => ROUTE_CHUNK_MAP[route] || []);
  // Remove duplicates
  const uniqueChunks = Array.from(new Set(allChunks));
  usePrefetchIdle(uniqueChunks);
}

/**
 * Hook to prefetch chunks for common user flows
 * Prefetches chunks that are likely to be used based on current route
 *
 * Usage:
 * usePrefetchCommonFlows(currentRoute);
 */
export function usePrefetchCommonFlows(currentRoute: string): void {
  useEffect(() => {
    // Define common navigation flows
    const flows: Record<string, string[]> = {
      "/dashboard": ["/loads", "/finance", "/drivers"],
      "/loads": ["/dashboard", "/finance"],
      "/finance": ["/dashboard", "/loads"],
      "/drivers": ["/dashboard"],
    };

    const nextRoutes = flows[currentRoute] || [];
    usePrefetchRoutes(nextRoutes);
  }, [currentRoute]);
}

/**
 * Hook to prefetch all dashboard-related chunks
 * Useful when user is likely to spend time on dashboard
 *
 * Usage:
 * usePrefetchDashboard();
 */
export function usePrefetchDashboard(): void {
  usePrefetchRoute("/dashboard");
}

/**
 * Hook to prefetch all admin-related chunks
 * Useful for admin users
 *
 * Usage:
 * usePrefetchAdmin();
 */
export function usePrefetchAdmin(): void {
  usePrefetchRoute("/admin");
  usePrefetchRoute("/drivers");
}
