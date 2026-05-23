/**
 * Central route management utilities
 * Ensures consistent role-based routing across the application
 */

export type UserRole = "driver" | "owner" | "admin" | "dispatcher" | null | undefined;

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  role: UserRole;
  profileImageUrl?: string | null;
}

/**
 * Determines the default route for a user based on their role
 * This is the single source of truth for role-based routing
 */
export function getDefaultRouteForRole(user: AuthUser | null | undefined): string {
  if (!user) {
    return "/login";
  }

  // Drivers go to driver dashboard
  if (user.role === "driver") {
    return "/driver";
  }

  // Owners and admins go to command center
  if (user.role === "owner" || user.role === "admin" || user.role === "dispatcher") {
    return "/command-center";
  }

  // Default fallback
  return "/command-center";
}

/**
 * Checks if a user can access a specific route
 */
export function canAccessRoute(user: AuthUser | null | undefined, allowedRoles: string[]): boolean {
  if (!user) {
    return false;
  }

  return allowedRoles.includes(user.role || "");
}

/**
 * Debug logging for route guards
 * Logs role-based routing decisions for troubleshooting
 */
export function logRouteGuardDecision(
  userRole: UserRole,
  currentPath: string,
  targetRoute: string,
  allowed: boolean
): void {
  const debugInfo = {
    userRole: userRole || "unknown",
    currentPath,
    targetRoute,
    allowed,
    timestamp: new Date().toISOString(),
  };

  console.log("[RouteGuard]", debugInfo);

  // Also store in window for inspection
  if (typeof window !== "undefined") {
    (window as any).__routeGuardDebug = debugInfo;
  }
}

/**
 * Gets the redirect target for a driver trying to access an owner route
 */
export function getDriverRedirectTarget(user: AuthUser | null | undefined): string {
  if (user?.role === "driver") {
    return "/driver";
  }
  return "/command-center";
}
