import { AlertCircle, AlertTriangle, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export function AlertsWidget() {
  const { data: stats } = trpc.priceAlerts.getAlertStats.useQuery();
  const { data: unreadAlerts = [] } = trpc.priceAlerts.getUnreadAlerts.useQuery() as any;

  if (!stats || stats.unread === 0) {
    return null;
  }

  const criticalAlerts = (unreadAlerts || []).filter((a: any) => a.severity === "critical");
  const warningAlerts = (unreadAlerts || []).filter((a: any) => a.severity === "warning");

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <CardTitle className="text-base">Alertas de Precios</CardTitle>
          </div>
          <Badge variant="secondary">{stats.unread}</Badge>
        </div>
        <CardDescription>Cargas por debajo de tu ganancia mínima</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              Críticas ({criticalAlerts.length})
            </div>
            <div className="space-y-1">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="text-xs text-muted-foreground bg-white dark:bg-black/20 p-2 rounded">
                  <p className="font-medium">${Number(alert.ratePerLoadedMile).toFixed(2)}/mi</p>
                  <p className="truncate">{alert.pickupAddress}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {warningAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              Advertencias ({warningAlerts.length})
            </div>
            <div className="space-y-1">
              {warningAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="text-xs text-muted-foreground bg-white dark:bg-black/20 p-2 rounded">
                  <p className="font-medium">${Number(alert.ratePerLoadedMile).toFixed(2)}/mi</p>
                  <p className="truncate">{alert.deliveryAddress}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/quotation">
          <Button variant="outline" size="sm" className="w-full">
            Ver todas las alertas
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
