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
  const { data: nearbyDriversData, isLoading } = trpc.nearby.getDrivers.useQuery(
    {
      loadId,
      pickupLat,
      pickupLng,
    },
    {
      enabled: open,
    }
  );
  const assignMutation = trpc.assignment.assign.useMutation();
  const [assigningDriverId, setAssigningDriverId] = React.useState<number | null>(null);

  // Use nearby drivers from backend
  const nearbyDrivers = useMemo(() => {
    if (!nearbyDriversData) return [];

    return nearbyDriversData.map((driver: any) => ({
      ...driver,
      hasGps: !!driver.lastLocationUpdate,
    }));
  }, [nearbyDriversData]);

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
      });
      toast.success(`Carga asignada a ${driverName}`);
      onOpenChange(false);
      onAssignSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || "Error al asignar la carga");
    } finally {
      setAssigningDriverId(null);
    }
  };

  const formatDistance = (distance: number | null): string => {
    if (distance === null) return "—";
    return distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`;
  };

  const formatTime = (date: Date | string | null): string => {
    if (!date) return "—";
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Ahora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return d.toLocaleDateString();
  };

  const isComplianceExpired = (expiry: Date | string | null): boolean => {
    if (!expiry) return false;
    const d = typeof expiry === "string" ? new Date(expiry) : expiry;
    return d < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Choferes Cercanos para Asignación
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : nearbyDrivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p>No hay choferes disponibles en este momento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyDrivers.map((driver: any) => (
              <div
                key={driver.id}
                className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header: Name, Distance, GPS Status */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{driver.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {formatDistance(driver.distance)}
                      </Badge>
                      {driver.hasGps ? (
                        <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          <Wifi className="h-3 w-3 mr-1" />
                          GPS Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Sin GPS
                        </Badge>
                      )}
                    </div>

                    {/* Availability Status */}
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      {driver.availableForLoads ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-green-400">Disponible para cargas</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-amber-400">No disponible</span>
                        </>
                      )}
                    </div>

                    {/* Vehicle Info */}
                    <div className="text-xs text-muted-foreground mb-2">
                      {driver.vehicleType && driver.vehicleType !== "Unknown" && (
                        <p>{driver.vehicleType} {driver.vehicleName && `• ${driver.vehicleName}`}</p>
                      )}
                      {driver.vehiclePlate && <p className="font-mono">Placa: {driver.vehiclePlate}</p>}
                    </div>

                    {/* GPS Last Update */}
                    {driver.lastLocationUpdate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Última ubicación: {formatTime(driver.lastLocationUpdate)}
                      </div>
                    )}

                    {/* Compliance Status */}
                    <div className="mt-2 space-y-1 text-xs">
                      {isComplianceExpired(driver.dotCertification) && (
                        <p className="text-red-400">⚠️ DOT vencido</p>
                      )}
                      {isComplianceExpired(driver.licenseExpiry) && (
                        <p className="text-red-400">⚠️ Licencia vencida</p>
                      )}
                      {isComplianceExpired(driver.insuranceExpiry) && (
                        <p className="text-red-400">⚠️ Seguro vencido</p>
                      )}
                      {isComplianceExpired(driver.leaseContractExpiry) && (
                        <p className="text-red-400">⚠️ Contrato de arrendamiento vencido</p>
                      )}
                    </div>
                  </div>

                  {/* Assign Button */}
                  <Button
                    size="sm"
                    onClick={() => handleAssign(driver.id, driver.name, driver.availableForLoads)}
                    disabled={assigningDriverId !== null || !driver.availableForLoads}
                    className="shrink-0"
                  >
                    {assigningDriverId === driver.id ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
