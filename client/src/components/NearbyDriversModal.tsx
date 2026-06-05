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
  deliveryLat?: number;
  deliveryLng?: number;
  loadPrice?: number;
  estimatedTolls?: number;
  onAssignSuccess?: () => void;
}

export function NearbyDriversModal({
  open,
  onOpenChange,
  loadId,
  pickupLat,
  pickupLng,
  deliveryLat,
  deliveryLng,
  loadPrice,
  estimatedTolls,
  onAssignSuccess,
}: NearbyDriversModalProps) {
  const { data: nearbyDriversData, isLoading } = trpc.nearby.getDrivers.useQuery(
    {
      loadId,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      loadPrice,
      estimatedTolls,
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

    // Find the closest driver with GPS
    let closestDriverId: number | null = null;
    let minDistance = Infinity;
    
    nearbyDriversData.forEach((driver: any) => {
      if (!driver.gpsInactive && driver.distanceToPickupMiles !== null && driver.distanceToPickupMiles < minDistance) {
        minDistance = driver.distanceToPickupMiles;
        closestDriverId = driver.id;
      }
    });

    return nearbyDriversData.map((driver: any) => ({
      ...driver,
      hasGps: !!driver.lastLocationUpdate && !driver.gpsInactive,
      isClosest: driver.id === closestDriverId,
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

  const formatCurrency = (value: number | null): string => {
    if (value === null) return "—";
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatMinutes = (minutes: number | null): string => {
    if (minutes === null) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
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
                className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                  driver.isClosest
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header: Name, Distance, GPS Status, Closest Badge */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{driver.name}</h4>
                      {driver.isClosest && (
                        <Badge variant="default" className="text-xs bg-green-600 text-white">
                          ✓ Más cercano
                        </Badge>
                      )}
                      {driver.hasGps ? (
                        <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          <Wifi className="h-3 w-3 mr-1" />
                          GPS Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Sin ubicación reciente
                        </Badge>
                      )}
                    </div>

                    {/* Deadhead Distance and ETA */}
                    {driver.hasGps ? (
                      <div className="mb-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distancia al pickup:</span>
                          <span className="font-mono font-semibold">{formatDistance(driver.distanceToPickupMiles)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ETA al pickup:</span>
                          <span className="font-mono font-semibold">{formatMinutes(driver.etaToPickupMinutes)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground italic">
                        Sin ubicación reciente - no se puede calcular distancia
                      </div>
                    )}

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

                    {/* Operational Miles and Economics */}
                    {driver.hasGps && driver.totalOperationalMiles !== null ? (
                      <div className="mb-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                        <div className="text-muted-foreground font-semibold mb-1">📊 Estimado operativo</div>
                        <div className="flex justify-between">
                          <span>Millas vacías:</span>
                          <span className="font-mono">{formatDistance(driver.distanceToPickupMiles)}</span>
                        </div>
                        {driver.loadedMiles !== null && (
                          <div className="flex justify-between">
                            <span>Millas cargadas:</span>
                            <span className="font-mono">{formatDistance(driver.loadedMiles)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t border-muted pt-1 mt-1">
                          <span>Total operativo:</span>
                          <span className="font-mono">{formatDistance(driver.totalOperationalMiles)}</span>
                        </div>
                        {driver.payPerOperationalMile !== null && (
                          <div className="flex justify-between">
                            <span>Pago/milla operativa:</span>
                            <span className="font-mono">{formatCurrency(driver.payPerOperationalMile)}</span>
                          </div>
                        )}
                        {driver.estimatedOperationalCost !== null && (
                          <div className="flex justify-between">
                            <span>Costo operativo est.:</span>
                            <span className="font-mono">{formatCurrency(driver.estimatedOperationalCost)}</span>
                          </div>
                        )}
                        {driver.adjustedEstimatedNet !== null && (
                          <div className="flex justify-between font-semibold text-green-400 border-t border-muted pt-1 mt-1">
                            <span>Ganancia neta est.:</span>
                            <span className="font-mono">{formatCurrency(driver.adjustedEstimatedNet)}</span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* GPS Last Update */}
                    {driver.lastLocationUpdate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Último ping: {formatTime(driver.lastLocationUpdate)}
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
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAssign(driver.id, driver.name, driver.availableForLoads)}
                      disabled={assigningDriverId !== null || !driver.availableForLoads}
                      variant={driver.isClosest ? "default" : "outline"}
                    >
                      {assigningDriverId === driver.id ? "Asignando..." : "Asignar"}
                    </Button>
                    {!driver.availableForLoads && (
                      <p className="text-xs text-amber-400 text-center">No disponible</p>
                    )}
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
