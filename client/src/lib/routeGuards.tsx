/**
 * Route guard utilities for role-based access control
 * Wraps components with role checking and suspense handling
 */

import React, { ComponentType, Suspense } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Redirect } from "wouter";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { canAccessRoute, getDefaultRouteForRole } from "./routeUtils";

/**
 * Wraps a component with role-based access control
 * Redirects to default route if user doesn't have required role
 */
export function withRoleGuard<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: string[]
) {
  return function RoleGuardedComponent(props: P) {
    const { user, loading } = useAuth();

    // If loading, show skeleton
    if (loading) {
      return <DashboardLayoutSkeleton />;
    }

    // If user is not loaded yet (null), show skeleton instead of redirecting
    // This prevents redirect loops during route transitions
    if (!user) {
      return <DashboardLayoutSkeleton />;
    }

    // Now that user is confirmed loaded, check if they have access
    if (!canAccessRoute(user, allowedRoles)) {
      // Redirect to default route for their role
      const redirectTo = getDefaultRouteForRole(user);
      return <Redirect to={redirectTo} />;
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
