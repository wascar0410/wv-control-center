import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, AlertCircle, Loader2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Load {
  id: number;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  price: number;
  merchandiseType: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
}

interface LoadsMapProps {
  loads: Load[];
  selectedLoadId?: number;
  onSelectLoad?: (loadId: number) => void;
  isLoading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  available: "#3b82f6",
  in_transit: "#f59e0b",
  delivered: "#10b981",
  invoiced: "#a855f7",
  paid: "#059669",
};

export function LoadsMap({ loads, selectedLoadId, onSelectLoad, isLoading }: LoadsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    if (typeof window.google === "undefined") {
      setMapError("Google Maps no está disponible. Por favor, recarga la página.");
      return;
    }

    try {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: { lat: 18.4861, lng: -69.9312 }, // Default to Dominican Republic
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
      });

      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true,
      });

      setMapError(null);
    } catch (error) {
      setMapError("Error al inicializar el mapa");
      console.error(error);
    }
  }, []);

  // Update markers and routes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null as any));
    markersRef.current.clear();

    // Filter loads by search
    const filteredLoads = loads.filter(
      (load) =>
        load.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        load.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add markers for each load
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    filteredLoads.forEach((load) => {
      // Pickup marker
      if (load.pickupLat && load.pickupLng) {
        const pickupMarker = new window.google.maps.Marker({
          position: { lat: load.pickupLat, lng: load.pickupLng },
          map: mapInstanceRef.current,
          title: `Recogida: ${load.clientName}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: STATUS_COLORS[load.status] || "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          } as any,
        });

        pickupMarker.addListener("click", () => {
          setSelectedLoad(load);
          onSelectLoad?.(load.id);
        });

        markersRef.current.set(`pickup-${load.id}`, pickupMarker);
        bounds.extend(pickupMarker.getPosition()!);
        hasValidCoordinates = true;
      }

      // Delivery marker
      if (load.deliveryLat && load.deliveryLng) {
        const deliveryMarker = new window.google.maps.Marker({
          position: { lat: load.deliveryLat, lng: load.deliveryLng },
          map: mapInstanceRef.current,
          title: `Entrega: ${load.clientName}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: STATUS_COLORS[load.status] || "#3b82f6",
            fillOpacity: 0.6,
            strokeColor: "#fff",
            strokeWeight: 2,
          } as any,
        });

        deliveryMarker.addListener("click", () => {
          setSelectedLoad(load);
          onSelectLoad?.(load.id);
        });

        markersRef.current.set(`delivery-${load.id}`, deliveryMarker);
        bounds.extend(deliveryMarker.getPosition()!);
        hasValidCoordinates = true;
      }
    });

    // Fit bounds if we have markers
    if (hasValidCoordinates && filteredLoads.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
    }

    // Draw route if a load is selected
    if (selectedLoad && selectedLoad.pickupLat && selectedLoad.pickupLng && selectedLoad.deliveryLat && selectedLoad.deliveryLng) {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: { lat: selectedLoad.pickupLat, lng: selectedLoad.pickupLng },
          destination: { lat: selectedLoad.deliveryLat, lng: selectedLoad.deliveryLng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          }
        }
      );
    } else {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(null);
      }
    }
  }, [loads, selectedLoadId, searchQuery, selectedLoad, onSelectLoad]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Rutas de Cargas en Tiempo Real
        </CardTitle>
        <CardDescription>Visualiza todas tus cargas en el mapa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mapError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{mapError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Buscar por cliente, origen o destino..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background border-border"
          />
          {searchQuery && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSearchQuery("")}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="relative bg-muted rounded-lg overflow-hidden border border-border" style={{ height: "500px" }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando mapa...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {selectedLoad && (
          <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{selectedLoad.clientName}</p>
                <p className="text-sm text-muted-foreground">{selectedLoad.merchandiseType}</p>
              </div>
              <Badge variant="outline" className={`text-xs`}>
                {selectedLoad.status}
              </Badge>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Recogida:</span>
                <span>{selectedLoad.pickupAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                <span className="text-muted-foreground">Entrega:</span>
                <span>{selectedLoad.deliveryAddress}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium">Precio: ${selectedLoad.price}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedLoad(null)}
              >
                Limpiar ruta
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Círculos azules: Recogida</p>
          <p>• Círculos semitransparentes: Entrega</p>
          <p>• Haz clic en un marcador para ver la ruta</p>
        </div>
      </CardContent>
    </Card>
  );
}
