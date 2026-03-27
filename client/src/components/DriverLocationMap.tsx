import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Truck, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DriverLocationMap() {
  const { data: drivers, isLoading, error } = trpc.location.getAllActiveDrivers.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Seguimiento de Ubicación
          </CardTitle>
          <CardDescription>Conductores activos en tiempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error?.message || "Error al cargar ubicaciones"}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const activeDrivers = drivers || [];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Seguimiento de Ubicación
        </CardTitle>
        <CardDescription>
          {activeDrivers.length} conductor{activeDrivers.length !== 1 ? "es" : ""} activo{activeDrivers.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando ubicaciones...</div>
        ) : activeDrivers.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay conductores activos en este momento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDrivers.map((driver: any) => (
              <div
                key={driver.id}
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{driver.name || `Conductor #${driver.id}`}</p>
                      <p className="text-xs text-muted-foreground">{driver.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    Activo
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {driver.latitude?.toFixed(4)}, {driver.longitude?.toFixed(4)}
                    </span>
                  </div>
                  {driver.speed !== undefined && (
                    <div className="text-muted-foreground">
                      Velocidad: {driver.speed.toFixed(1)} km/h
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      Actualizado hace{" "}
                      {Math.round((Date.now() - new Date(driver.timestamp).getTime()) / 1000)}s
                    </span>
                  </div>
                </div>

                {driver.loadId && (
                  <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    Carga activa: #{driver.loadId}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
