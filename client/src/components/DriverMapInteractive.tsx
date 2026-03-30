import { useEffect, useRef, useState } from "react";
import { MapView } from "./Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Truck, AlertCircle, Filter } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";

interface DriverMarker {
  id: number;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: string;
  loadId?: number;
  markerElement?: google.maps.marker.AdvancedMarkerElement;
  infoWindow?: google.maps.InfoWindow;
}

type FilterType = 'all' | 'in-service' | 'available';

export function DriverMapInteractive() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, DriverMarker>>(new Map());
  const [selectedDriver, setSelectedDriver] = useState<DriverMarker | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');

  const { data: drivers, isLoading, error } = trpc.location.getAllActiveDrivers.useQuery(
    undefined,
    { refetchInterval: 30000, staleTime: 30000, refetchOnWindowFocus: false, retry: 1 }
  );

  // Initialize map
  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  // Update markers on driver data change
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
  }, [drivers]);

  const getFilteredDrivers = (): typeof drivers => {
    if (!drivers) return [];
    
    switch (filterType) {
      case 'in-service':
        return drivers.filter(d => d.loadId !== undefined && d.loadId !== null);
      case 'available':
        return drivers.filter(d => !d.loadId);
      case 'all':
      default:
        return drivers;
    }
  };

  const updateMarkers = () => {
    if (!mapRef.current || !drivers) return;

    const filteredDrivers = getFilteredDrivers() || [];
    const activeDriverIds = new Set<number>();

    filteredDrivers.forEach((driver) => {
      activeDriverIds.add(driver.id);

      const existing = markersRef.current.get(driver.id);

      if (existing) {
        // Update existing marker position
        if (existing.markerElement) {
          const marker = existing.markerElement;
          marker.position = {
            lat: driver.latitude,
            lng: driver.longitude,
          };
        }
      } else {
        // Create new marker
        const markerElement = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: { lat: driver.latitude, lng: driver.longitude },
          title: driver.name,
        });

        // Create info window
        const infoWindow = new google.maps.InfoWindow({
          content: createInfoWindowContent(driver),
        });

        // Add click listener
        markerElement.addEventListener("click", () => {
          // Close previous info windows
          markersRef.current.forEach((d) => {
            if (d.infoWindow) d.infoWindow.close();
          });

          infoWindow.open({
            anchor: markerElement,
            map: mapRef.current,
          });

          setSelectedDriver(driver);
          mapRef.current?.panTo({
            lat: driver.latitude,
            lng: driver.longitude,
          });
        });

        markersRef.current.set(driver.id, {
          ...driver,
          markerElement,
          infoWindow,
        });
      }
    });

        // Remove markers for drivers no longer active
    markersRef.current.forEach((marker, driverId) => {
      if (!activeDriverIds.has(driverId)) {
        if (marker.markerElement) {
          marker.markerElement.map = null;
        }
        marker.infoWindow?.close();
        markersRef.current.delete(driverId);
      }
    });

    // Fit bounds to show all markers
    const displayedDrivers = getFilteredDrivers() || [];
    if (displayedDrivers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      displayedDrivers.forEach((driver) => {
        bounds.extend({
          lat: driver.latitude,
          lng: driver.longitude,
        });
      });
      mapRef.current?.fitBounds(bounds, 100);
    }
  };

  const createInfoWindowContent = (driver: DriverMarker): string => {
    const speed = driver.speed ? `${driver.speed.toFixed(1)} km/h` : "N/A";
    const lastUpdate = Math.round((Date.now() - new Date(driver.timestamp).getTime()) / 1000);

    return `
      <div style="padding: 12px; font-family: system-ui; font-size: 13px; max-width: 250px;">
        <div style="font-weight: 600; margin-bottom: 8px;">${driver.name}</div>
        <div style="color: #666; margin-bottom: 4px;">${driver.email}</div>
        <div style="margin: 8px 0; padding: 8px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
          <div style="margin-bottom: 4px;">📍 ${driver.latitude.toFixed(4)}, ${driver.longitude.toFixed(4)}</div>
          <div style="margin-bottom: 4px;">⚡ Velocidad: ${speed}</div>
          <div>⏱️ Actualizado hace ${lastUpdate}s</div>
        </div>
        ${driver.loadId ? `<div style="color: #0066cc; margin-top: 8px;">Carga activa: #${driver.loadId}</div>` : ""}
      </div>
    `;
  };

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa de Choferes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error?.message || "Error al cargar mapa"}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const activeDrivers = getFilteredDrivers() || [];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Mapa de Choferes en Tiempo Real
              </CardTitle>
              <CardDescription>
                {activeDrivers.length} conductor{activeDrivers.length !== 1 ? "es" : ""} activo{activeDrivers.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Todos ({activeDrivers.length})
            </Button>
            <Button
              variant={filterType === 'in-service' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('in-service')}
              className="gap-2"
            >
              En Servicio ({activeDrivers.filter(d => d.loadId).length})
            </Button>
            <Button
              variant={filterType === 'available' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('available')}
              className="gap-2"
            >
              Disponibles ({activeDrivers.filter(d => !d.loadId).length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="w-full h-96 rounded-lg bg-muted/30 flex items-center justify-center">
              <div className="text-center">
                <Truck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Cargando mapa...</p>
              </div>
            </div>
          ) : !activeDrivers || activeDrivers.length === 0 ? (
            <div className="w-full h-96 rounded-lg bg-muted/30 flex items-center justify-center">
              <div className="text-center">
                <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {filterType === 'in-service' && 'No hay choferes en servicio en este momento'}
                  {filterType === 'available' && 'No hay choferes disponibles en este momento'}
                  {filterType === 'all' && 'No hay choferes activos en este momento'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="w-full h-96">
                <MapView
                  initialCenter={{ lat: 40.7128, lng: -74.006 }}
                  initialZoom={12}
                  onMapReady={handleMapReady}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Driver Details */}
      {selectedDriver && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {selectedDriver.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium">{selectedDriver.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estado</p>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  Activo
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ubicación</p>
                <p className="text-sm font-mono">
                  {selectedDriver.latitude.toFixed(4)}, {selectedDriver.longitude.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Velocidad</p>
                <p className="text-sm font-medium">
                  {selectedDriver.speed ? `${selectedDriver.speed.toFixed(1)} km/h` : "N/A"}
                </p>
              </div>
              {selectedDriver.loadId && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Carga Activa</p>
                  <Badge variant="secondary">#{selectedDriver.loadId}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
