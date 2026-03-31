import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Wifi, WifiOff, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function OfflineQueueIndicator() {
  const { isOnline, isSyncing, pendingCount, queue, syncQueue } = useOfflineQueue();

  if (isOnline && pendingCount === 0) {
    return null; // Don't show if online and no pending items
  }

  const handleSync = async () => {
    try {
      await syncQueue((delivery, success) => {
        if (success) {
          toast.success(`Entrega #${delivery.loadId} sincronizada`);
        } else {
          toast.error(`Error sincronizando entrega #${delivery.loadId}`);
        }
      });
    } catch (error) {
      toast.error("Error durante sincronización");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {!isOnline && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30 flex gap-3 items-start mb-2">
          <WifiOff className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-900 dark:text-red-200">Sin conexión</p>
            <p className="text-sm text-red-800 dark:text-red-300 mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} entrega${pendingCount !== 1 ? "s" : ""} en cola`
                : "Las entregas se enviarán cuando vuelva la conexión"}
            </p>
          </div>
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Sincronizando entregas
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
              {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            </p>

            {/* Queue items list */}
            {queue.length > 0 && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {queue.map(item => (
                  <div
                    key={item.id}
                    className="text-xs bg-white/50 dark:bg-black/20 rounded px-2 py-1 flex items-center gap-2"
                  >
                    {item.status === "syncing" && (
                      <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                    )}
                    {item.status === "pending" && (
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                    )}
                    {item.status === "failed" && (
                      <AlertCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span className="flex-1">Carga #{item.loadId}</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {item.retries > 0 && `(${item.retries})`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Sync button */}
            {!isSyncing && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                className="mt-2 w-full"
              >
                <Wifi className="mr-2 h-3 w-3" />
                Sincronizar Ahora
              </Button>
            )}

            {isSyncing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sincronizando...
              </div>
            )}
          </div>
        </div>
      )}

      {isOnline && pendingCount === 0 && queue.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30 flex gap-3 items-start">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-200">
              Todas sincronizadas
            </p>
            <p className="text-sm text-green-800 dark:text-green-300 mt-0.5">
              Tus entregas fueron enviadas correctamente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
