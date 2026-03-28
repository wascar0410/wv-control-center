import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Alert {
  id: number;
  severity: "warning" | "critical";
  pickupAddress: string;
  deliveryAddress: string;
  offeredPrice: number;
  ratePerLoadedMile: number;
  minimumProfitPerMile: number;
  differenceFromMinimum: number;
  isRead: boolean;
}

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss?: (alertId: number) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const utils = trpc.useUtils();
  const markAsReadMutation = trpc.priceAlerts.markAsRead.useMutation({
    onSuccess: () => {
      utils.priceAlerts.getUnreadAlerts.invalidate();
      utils.priceAlerts.getAlertStats.invalidate();
    },
  });

  const deleteAlertMutation = trpc.priceAlerts.deleteAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta eliminada");
      utils.priceAlerts.getAlerts.invalidate();
      utils.priceAlerts.getUnreadAlerts.invalidate();
      utils.priceAlerts.getAlertStats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (alerts.length === 0) return null;

  const handleDismiss = async (alertId: number) => {
    await markAsReadMutation.mutateAsync({ alertId });
    onDismiss?.(alertId);
  };

  const handleDelete = async (alertId: number) => {
    await deleteAlertMutation.mutateAsync({ alertId });
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={`p-4 border-l-4 ${
            alert.severity === "critical"
              ? "border-l-red-500 bg-red-50 dark:bg-red-950/20"
              : "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {alert.severity === "critical" ? (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">
                    {alert.severity === "critical"
                      ? "⚠️ Carga por debajo del mínimo"
                      : "⚡ Carga cerca del mínimo"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {alert.pickupAddress} → {alert.deliveryAddress}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Precio ofrecido:</span>
                    <p className="font-semibold">${alert.offeredPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tarifa por milla:</span>
                    <p className={`font-semibold ${alert.severity === "critical" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                      ${alert.ratePerLoadedMile.toFixed(2)}/mi
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mínimo deseado:</span>
                    <p className="font-semibold">${alert.minimumProfitPerMile.toFixed(2)}/mi</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Diferencia:</span>
                    <p className={`font-semibold ${alert.differenceFromMinimum < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      ${alert.differenceFromMinimum.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={() => handleDismiss(alert.id)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Entendido
              </Button>
              <Button
                onClick={() => handleDelete(alert.id)}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
