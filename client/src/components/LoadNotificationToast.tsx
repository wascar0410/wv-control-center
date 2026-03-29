import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Bell, X, Truck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: "loadAssigned" | "loadUpdated" | "loadCancelled";
  title: string;
  message: string;
  loadId?: number;
  clientName?: string;
  timestamp: number;
}

export function LoadNotificationToast() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      if (
        message.type === "loadAssigned" ||
        message.type === "loadUpdated" ||
        message.type === "loadCancelled"
      ) {
        handleLoadNotification(message);
      }
    },
  });

  const handleLoadNotification = (message: any) => {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      type: message.type,
      title: getNotificationTitle(message.type),
      message: getNotificationMessage(message),
      loadId: message.data?.loadId,
      clientName: message.data?.clientName,
      timestamp: message.timestamp || Date.now(),
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 10)); // Keep last 10
    setUnreadCount((prev) => prev + 1);

    // Play notification sound
    playNotificationSound();

    // Auto-dismiss after 5 seconds for loadAssigned
    if (message.type === "loadAssigned") {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }
  };

  const getNotificationTitle = (type: string): string => {
    switch (type) {
      case "loadAssigned":
        return "🚚 Nueva Carga Asignada";
      case "loadUpdated":
        return "📝 Carga Actualizada";
      case "loadCancelled":
        return "❌ Carga Cancelada";
      default:
        return "Notificación";
    }
  };

  const getNotificationMessage = (message: any): string => {
    const { data } = message;
    switch (message.type) {
      case "loadAssigned":
        return `Se te ha asignado una nueva carga de ${data?.clientName || "cliente"}. Recogida en ${data?.pickupAddress || "ubicación"}`;
      case "loadUpdated":
        return `La carga de ${data?.clientName || "cliente"} ha sido actualizada`;
      case "loadCancelled":
        return `La carga de ${data?.clientName || "cliente"} ha sido cancelada`;
      default:
        return "Tienes una nueva notificación";
    }
  };

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "loadAssigned":
        return <Truck className="w-5 h-5 text-green-500" />;
      case "loadUpdated":
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case "loadCancelled":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Notification Bell Button */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12 relative"
          onClick={() => setShowPanel(!showPanel)}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Connection Status */}
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
        </div>
      </div>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute bottom-16 right-0 w-96 bg-background border border-border rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Notificaciones</h3>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs"
              >
                Limpiar todo
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 bg-card border border-border rounded-lg flex items-start gap-3 hover:bg-accent transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(notification.id)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
