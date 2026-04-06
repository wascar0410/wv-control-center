/**
 * ProtectedRoute.tsx
 * Role-based access control for routes
 */
import { useAuth } from "@/hooks/useAuth";
import { hasModuleAccess } from "@shared/rbac";
import { Navigate } from "wouter";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  requiredModule?: string;
  requiredRole?: string;
}

export function ProtectedRoute({
  component: Component,
  requiredModule,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <p className="text-sm text-muted-foreground">Required role: {requiredRole}</p>
        </div>
      </div>
    );
  }

  // Check module-based access
  if (requiredModule && !hasModuleAccess(user.role as any, requiredModule)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">Your role doesn't have access to this module.</p>
          <p className="text-sm text-muted-foreground">Your role: {user.role}</p>
        </div>
      </div>
    );
  }

  return <Component />;
}
