/**
 * Route guard utilities for role-based access control
 * Wraps components with role checking and suspense handling
 */

import React, { ComponentType, Suspense } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { canAccessRoute, getDefaultRouteForRole, logRouteGuardDecision } from "./routeUtils";

/**
 * Wraps a component with role-based access control
 * Redirects to default route if user doesn't have required role
 */
export function withRoleGuard<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: string[]
) {
  return function RoleGuardedComponent(props: P) {
    const { user, loading, authChecked } = useAuth();

    // Debug logging if enabled
    const debugEnabled = typeof window !== "undefined" && localStorage.getItem("debugRouteGuard") === "1";

    // Phase 1: Auth is still loading or hasn't been checked yet
    // Show skeleton, do NOT redirect
    if (loading || !authChecked) {
      if (debugEnabled) {
        console.log("[RouteGuard] Auth not ready", {
          path: window.location.pathname,
          loading,
          authChecked,
          userEmail: user?.email,
          userRole: user?.role,
          allowedRoles,
        });
      }
      return <DashboardLayoutSkeleton />;
    }

    // Phase 2: Auth check completed but user is null (not logged in)
    if (!user) {
      if (debugEnabled) {
        console.log("[RouteGuard] User not authenticated", {
          path: window.location.pathname,
          redirectTo: "/login",
        });
      }
      return <Redirect to="/login" />;
    }

    // Phase 3: User exists but doesn't have required role
    if (!canAccessRoute(user, allowedRoles)) {
      const redirectTo = getDefaultRouteForRole(user);
      if (debugEnabled) {
        console.log("[RouteGuard] User role not allowed", {
          path: window.location.pathname,
          userRole: user.role,
          allowedRoles,
          redirectTo,
        });
      }
      return <Redirect to={redirectTo} />;
    }

    // Phase 4: User is authenticated and has required role
    if (debugEnabled) {
      console.log("[RouteGuard] Access granted", {
        path: window.location.pathname,
        userEmail: user.email,
        userRole: user.role,
        allowedRoles,
      });
    }

    return (
      <DashboardLayout>
        <Component {...props} />
      </DashboardLayout>
    );
  };
}

/**
 * Wraps a component with Suspense for lazy loading
 */
export function withSuspense<P extends object>(Component: ComponentType<P>) {
  return function SuspenseWrappedComponent(props: P) {
    return (
      <Suspense fallback={<DashboardLayoutSkeleton />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
