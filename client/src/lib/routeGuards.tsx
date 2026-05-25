/**
 * Route guard utilities for role-based access control
 * Wraps components with role checking and suspense handling
 */

import React, { ComponentType, Suspense, useRef, useEffect } from "react";
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
    const previousUserRef = useRef<any>(null);
    const hasRedirectedRef = useRef(false);

    // Track the previous user to detect auth state changes
    useEffect(() => {
      if (!loading && user) {
        previousUserRef.current = user;
        hasRedirectedRef.current = false;
      }
    }, [user, loading]);

    // If loading, show skeleton
    if (loading) {
      return <DashboardLayoutSkeleton />;
    }

    // If user is not loaded yet (null) but we had a previous user, show skeleton
    // This prevents redirect loops during route transitions
    if (!user && previousUserRef.current) {
      return <DashboardLayoutSkeleton />;
    }

    // If user is null and we never had a previous user, they're not logged in
    if (!user) {
      return <Redirect to="/login" />;
    }

    // Now that user is confirmed loaded, check if they have access
    if (!canAccessRoute(user, allowedRoles)) {
      // Only redirect once per auth state change
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        const redirectTo = getDefaultRouteForRole(user);
        return <Redirect to={redirectTo} />;
      }
      // After redirect, show skeleton to avoid flashing
      return <DashboardLayoutSkeleton />;
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
