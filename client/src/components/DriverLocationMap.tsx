import React, { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DriverLocation {
  id: number;
  driverId: number;
  loadId: number | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  timestamp: Date;
  createdAt: Date;
}

export function DriverLocationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Fetch all active drivers
  const { data: drivers, isLoading, error } = trpc.location.getAllActiveDrivers.useQuery(
    undefined,
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Google Maps is loaded
    if (typeof window.google === "undefined") {
      setMapError("Google Maps no está disponible");
      return;
    }

    try {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 40.7128, lng: -74.006 }, // Default to NYC
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });
    } catch (err) {
      setMapError("Error al inicializar el mapa");
      console.error(err);
    }
  }, []);

  // Update driver markers
  useEffect(() => {
    if (!mapInstanceRef.current || !drivers) return;

    const map = mapInstanceRef.current;
    const currentDriverIds = new Set(drivers.map((d) => d.driverId));

    // Remove markers for drivers no longer active
    markersRef.current.forEach((marker, driverId) => {
      if (!currentDriverIds.has(driverId)) {
        marker.setMap(null);
        markersRef.current.delete(driverId);
      }
    });

    // Update or create markers
    drivers.forEach((driver) => {
      const position = {
        lat: Number(driver.latitude),
        lng: Number(driver.longitude),
      };

      let marker = markersRef.current.get(driver.driverId);

      if (marker) {
        // Update existing marker
        marker.setPosition(position);
      } else {
        // Create new marker
        marker = new window.google.maps.Marker({
          position,
          map,
          title: `Driver ${driver.driverId}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: selectedDriver === driver.driverId ? "#ef4444" : "#3b82f6",
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        // Add click listener
        marker.addListener("click", () => {
          setSelectedDriver(driver.driverId);
          map.panTo(position);
          map.setZoom(15);
        });

        markersRef.current.set(driver.driverId, marker);
      }

      // Update marker color based on selection
      marker.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: selectedDriver === driver.driverId ? 10 : 8,
        fillColor: selectedDriver === driver.driverId ? "#ef4444" : "#3b82f6",
        fillOpacity: 0.8,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      });
    });

    // Center map on first driver if none selected
    if (drivers.length > 0 && !selectedDriver) {
      const firstDriver = drivers[0];
      map.setCenter({
        lat: Number(firstDriver.latitude),
        lng: Number(firstDriver.longitude),
      });
    }
  }, [drivers, selectedDriver]);

  if (mapError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seguimiento de Ubicación</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{mapError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguimiento de Ubicación en Tiempo Real</CardTitle>
        <CardDescription>
          {drivers?.length || 0} chofer(es) activo(s) en los últimos 5 minutos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map */}
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-border"
          style={{ minHeight: "400px" }}
        />

        {/* Driver List */}
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground">
            Cargando ubicaciones...
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error al cargar ubicaciones de choferes</AlertDescription>
          </Alert>
        ) : drivers && drivers.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Choferes Activos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {drivers.map((driver) => (
                <div
                  key={driver.driverId}
                  onClick={() => setSelectedDriver(driver.driverId)}
                  className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedDriver === driver.driverId
                      ? "bg-red-50 border-red-300"
                      : "bg-blue-50 border-blue-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Chofer #{driver.driverId}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Number(driver.latitude).toFixed(4)}, {Number(driver.longitude).toFixed(4)}
                      </div>
                      {driver.speed && (
                        <div className="flex items-center gap-1 mt-1 text-xs">
                          <Zap className="h-3 w-3 text-yellow-600" />
                          <span>{Number(driver.speed).toFixed(1)} km/h</span>
                        </div>
                      )}
                    </div>
                    {driver.loadId && (
                      <Badge variant="outline" className="text-xs">
                        Carga #{driver.loadId}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(driver.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            No hay choferes activos en este momento
          </div>
        )}
      </CardContent>
    </Card>
  );
}
