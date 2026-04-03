import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Truck } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/carrier-packet", "/quotation"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  const isPublicRoute = PUBLIC_ROUTES.some((r) => location.startsWith(r));

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      navigate("/login");
    }
  }, [loading, user, isPublicRoute, navigate]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl animate-pulse">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">WV Control Center</p>
            <p className="text-xs text-muted-foreground mt-1">Verificando sesión...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated and not on a public route → redirect handled by useEffect above
  if (!user && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
