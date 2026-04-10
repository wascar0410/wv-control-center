import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Bell } from "lucide-react";
import { toast } from "sonner";

export function AlertsBadge() {
  const { data: alerts, refetch } = trpc.financialExtended.getFinancialAlerts.useQuery();
  const [lastAlertCount, setLastAlertCount] = useState(0);
  const [showToasts, setShowToasts] = useState(false);

  // Auto-refetch every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Trigger toasts when new alerts appear
  useEffect(() => {
    if (!alerts || !showToasts) return;

    const currentAlertCount = alerts.alerts?.length || 0;

    // Only show toasts if alerts increased
    if (currentAlertCount > lastAlertCount) {
      const newAlerts = alerts.alerts?.slice(lastAlertCount);
      newAlerts?.forEach((alert) => {
        // Determine toast type based on severity
        if (alert.severity === "critical") {
          toast.error(alert.title, {
            description: alert.message,
            duration: 5000,
          });
        } else if (alert.severity === "warning") {
          toast.warning(alert.title, {
            description: alert.message,
            duration: 4000,
          });
        }
      });
    }

    setLastAlertCount(currentAlertCount);
  }, [alerts, lastAlertCount, showToasts]);

  // Enable toasts on mount
  useEffect(() => {
    setShowToasts(true);
  }, []);

  if (!alerts || alerts.alerts.length === 0) {
    return null;
  }

  const criticalCount = alerts.criticalCount || 0;
  const warningCount = alerts.warningCount || 0;
  const totalCount = criticalCount + warningCount;

  return (
    <div className="flex items-center gap-2">
      {criticalCount > 0 && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {criticalCount} Crítica{criticalCount !== 1 ? "s" : ""}
        </Badge>
      )}

      {warningCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
          <Bell className="h-3 w-3" />
          {warningCount} Advertencia{warningCount !== 1 ? "s" : ""}
        </Badge>
      )}

      {totalCount > 0 && (
        <Button size="sm" variant="ghost" onClick={() => void refetch()}>
          🔄 Actualizar
        </Button>
      )}
    </div>
  );
}
