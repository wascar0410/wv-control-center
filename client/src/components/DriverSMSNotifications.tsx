import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, AlertCircle, CheckCircle } from "lucide-react";

interface SMSNotification {
  id: number;
  type: "new_load" | "urgent" | "payment" | "message";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function DriverSMSNotifications() {
  const notifications: SMSNotification[] = [
    {
      id: 1,
      type: "new_load",
      title: "Nueva Carga Asignada",
      message: "Se te asignó una carga de ABC Logistics: $850 (2,500 lbs)",
      timestamp: "Hace 5 minutos",
      read: false,
    },
    {
      id: 2,
      type: "message",
      title: "Mensaje del Dispatcher",
      message: "¿Puedes confirmar que recibiste la carga?",
      timestamp: "Hace 15 minutos",
      read: false,
    },
    {
      id: 3,
      type: "payment",
      title: "Pago Procesado",
      message: "Se procesó tu pago de $9,250. Transferencia en 1-2 días hábiles.",
      timestamp: "Hace 2 horas",
      read: true,
    },
    {
      id: 4,
      type: "urgent",
      title: "Alerta Urgente",
      message: "La entrega debe completarse antes de las 5 PM. Contacta al dispatcher si hay problemas.",
      timestamp: "Hace 3 horas",
      read: true,
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_load":
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case "urgent":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "payment":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "new_load":
        return "bg-blue-100 text-blue-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      case "payment":
        return "bg-green-100 text-green-800";
      case "message":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones SMS
            </CardTitle>
            <CardDescription>Alertas importantes sobre tus cargas y pagos</CardDescription>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border-l-4 ${
              notification.read ? "bg-gray-50" : "bg-blue-50 border-blue-400"
            }`}
          >
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{notification.title}</h4>
                  <Badge className={getNotificationBadge(notification.type)}>
                    {notification.type === "new_load" && "Nueva Carga"}
                    {notification.type === "urgent" && "Urgente"}
                    {notification.type === "payment" && "Pago"}
                    {notification.type === "message" && "Mensaje"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
              </div>
              {!notification.read && (
                <Button size="sm" variant="outline">
                  Marcar como leído
                </Button>
              )}
            </div>
          </div>
        ))}

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Habilita notificaciones SMS en tu teléfono para recibir alertas instantáneas sobre nuevas cargas y mensajes urgentes del dispatcher.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
