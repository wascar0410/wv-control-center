import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Wifi, WifiOff, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface NearbyDriversModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: number;
  pickupLat: number;
  pickupLng: number;
  onAssignSuccess?: () => void;
}

export function NearbyDriversModal({
  open,
  onOpenChange,
  loadId,
  pickupLat,
  pickupLng,
  onAssignSuccess,
}: NearbyDriversModalProps) {
  const { data: fleetLocations } = trpc.fleet.getFleetLocations.useQuery(undefined, {
    enabled: open,
  });
  const { data: allDrivers } = trpc.admin.getDrivers.useQuery(undefined, {
    enabled: open,
  });
  const assignMutation = trpc.assignment.assign.useMutation();
  const [assigningDriverId, setAssigningDriverId] = React.useState<number | null>(null);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Enrich drivers with location and distance data
  const nearbyDrivers = useMemo(() => {
    if (!allDrivers || !fleetLocations) return [];

    return allDrivers
      .filter((driver: any) => {
        // Only drivers
        if (driver.role !== "driver") return false;
        // Exclude archived
        if (driver.email?.startsWith("archived+")) return false;
        // Exclude test/demo
        if (
          driver.email?.includes("test") ||
          driver.email?.includes("demo") ||
          driver.name?.includes("Test") ||
          driver.name?.includes("Demo")
        ) {
          return false;
        }
        return true;
      })
      .map((driver: any) => {
        const location = fleetLocations.find((loc: any) => loc.driverId === driver.id);
        const distance = location
          ? calculateDistance(pickupLat, pickupLng, location.lat, location.lng)
          : null;
        const lastPing = location ? new Date(location.timestamp) : null;

        return {
          ...driver,
          location,
          distance,
          lastPing,
          hasGps: !!location,
        };
      })
      .sort((a: any, b: any) => {
        // Prioritize drivers with GPS
        if (a.hasGps && !b.hasGps) return -1;
        if (!a.hasGps && b.hasGps) return 1;
        // Sort by distance if both have GPS
        if (a.hasGps && b.hasGps) {
          return (a.distance || Infinity) - (b.distance || Infinity);
        }
        return 0;
      });
  }, [allDrivers, fleetLocations, pickupLat, pickupLng]);

  const handleAssign = async (driverId: number, driverName: string, isAvailable: boolean) => {
    if (!isAvailable) {
      toast.error(`${driverName} no está disponible para cargas`);
      return;
    }

    setAssigningDriverId(driverId);
    try {
      await assignMutation.mutateAsync({
        loadId,
        driverId,
        notes: "Asignado por dispatcher - Nearby Assignment",
      });
      toast.success(`Carga asignada a ${driverName}`);
      onOpenChange(false);
      onAssignSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "Error al asignar carga");
    } finally {
      setAssigningDriverId(null);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "—";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Choferes Cercanos al Pickup
          </DialogTitle>
        </DialogHeader>

        {nearbyDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay choferes disponibles cercanos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyDrivers.map((driver: any) => (
              <div
                key={driver.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left side - Driver info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-xs text-muted-foreground">{driver.email}</p>
                      </div>
                      {driver.hasGps && driver.distance !== null && (
                        <Badge variant="outline" className="ml-2 whitespace-nowrap">
                          {driver.distance.toFixed(1)} mi
                        </Badge>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-wrap gap-2">
                      {/* Availability */}
                      <Badge
                        variant={driver.availableForLoads ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {driver.availableForLoads ? "Activo para cargas" : "No disponible"}
                      </Badge>

                      {/* GPS Status */}
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {driver.hasGps ? (
                          <>
                            <Wifi className="h-3 w-3" />
                            GPS Activo
                          </>
                        ) : (
                          <>
                            <WifiOff className="h-3 w-3" />
                            GPS Inactivo
                          </>
                        )}
                      </Badge>

                      {/* Operation Status */}
                      <Badge variant="outline" className="text-xs">
                        {driver.__operation?.loadStatus === "in_transit"
                          ? "Con carga"
                          : "Sin carga"}
                      </Badge>

                      {/* Compliance */}
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {driver.dotNumber && driver.licenseUrl && driver.insuranceUrl ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            Docs básicos
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            Docs pendientes
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  {/* Right side - Distance and action */}
                  <div className="flex flex-col justify-between">
                    <div className="space-y-1">
                      {driver.hasGps && driver.distance !== null ? (
                        <>
                          <p className="text-sm font-medium">
                            {driver.distance.toFixed(1)} millas al pickup
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Último ping: {formatTime(driver.lastPing)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin ubicación reciente</p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      onClick={() =>
                        handleAssign(driver.id, driver.name, driver.availableForLoads)
                      }
                      disabled={assigningDriverId === driver.id}
                      className="mt-2"
                    >
                      {assigningDriverId === driver.id ? "Asignando..." : "Asignar"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
