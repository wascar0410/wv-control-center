/**
 * GPSTracker.tsx
 * Driver GPS sharing component
 * - Activate/stop GPS sharing
 * - Show GPS status and last location update
 * - Handle geolocation permissions and errors
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Navigation, Loader2 } from "lucide-react";

export function GPSTracker() {
  const { toast } = useToast();
  const [gpsActive, setGpsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [lastCoordinates, setLastCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const updateMutationRef = useRef<any>(null);

  const updateLocationMutation = trpc.driver.updateLocation.useMutation({
    onSuccess: () => {
      setLastUpdate(new Date().toLocaleTimeString("es-ES"));
    },
    onError: (err) => {
      console.error("[GPS] Location update error:", err);
      toast({
        title: "Error",
        description: "No se pudo enviar la ubicación",
        variant: "destructive",
      });
    },
  });

  updateMutationRef.current = updateLocationMutation;

  const handleStartGPS = async () => {
    setError(null);
    setIsLoading(true);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización");
      setIsLoading(false);
      toast({
        title: "No soportado",
        description: "Tu navegador no soporta geolocalización",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request permission and start watching position
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy: acc, heading, speed } = position.coords;

          setLastCoordinates({ lat: latitude, lng: longitude });
          setAccuracy(acc);
          setGpsActive(true);
          setError(null);
          setIsLoading(false);

          // Send location to backend
          updateMutationRef.current.mutate({
            latitude,
            longitude,
            accuracy: acc,
            speed: speed || undefined,
            heading: heading || undefined,
          });
        },
        (err) => {
          setIsLoading(false);

          // Handle specific error cases
          if (err.code === err.PERMISSION_DENIED) {
            setError("Permiso de ubicación denegado. Por favor, habilita la ubicación en tu navegador.");
            toast({
              title: "Permiso denegado",
              description: "No se pudo acceder a tu ubicación",
              variant: "destructive",
            });
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setError("Tu ubicación no está disponible");
            toast({
              title: "Ubicación no disponible",
              description: "No se pudo determinar tu ubicación",
              variant: "destructive",
            });
          } else if (err.code === err.TIMEOUT) {
            setError("Tiempo de espera agotado al obtener ubicación");
            toast({
              title: "Tiempo agotado",
              description: "Intenta de nuevo",
              variant: "destructive",
            });
          } else {
            setError("Error al obtener ubicación: " + err.message);
          }

          setGpsActive(false);
          console.error("[GPS] Geolocation error:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      watchIdRef.current = watchId;
      setGpsActive(true);
      toast({
        title: "GPS Activado",
        description: "Tu ubicación se está compartiendo",
      });
    } catch (err) {
      setError("Error al iniciar GPS: " + (err instanceof Error ? err.message : "Desconocido"));
      setIsLoading(false);
      console.error("[GPS] Error starting GPS:", err);
    }
  };

  const handleStopGPS = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setGpsActive(false);
    setLastCoordinates(null);
    setAccuracy(null);
    setLastUpdate(null);
    setError(null);

    toast({
      title: "GPS Detenido",
      description: "Tu ubicación dejó de compartirse",
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            <CardTitle>Compartir Ubicación GPS</CardTitle>
          </div>
          <Badge variant={gpsActive ? "default" : "secondary"}>
            {gpsActive ? "GPS Activo" : "GPS Inactivo"}
          </Badge>
        </div>
        <CardDescription>
          Activa tu GPS para que los despachadores puedan verte en el mapa
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="flex gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Status Information */}
        {gpsActive && lastCoordinates && (
          <div className="space-y-2 rounded-lg bg-blue-500/10 p-3">
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <MapPin className="h-4 w-4" />
              <span>
                Ubicación: {lastCoordinates.lat.toFixed(4)}, {lastCoordinates.lng.toFixed(4)}
              </span>
            </div>
            {accuracy !== null && (
              <div className="text-xs text-blue-300">
                Precisión: ±{accuracy.toFixed(0)} metros
              </div>
            )}
            {lastUpdate && (
              <div className="text-xs text-blue-300">
                Última actualización: {lastUpdate}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!gpsActive ? (
            <Button
              onClick={handleStartGPS}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando GPS...
                </>
              ) : (
                "Activar GPS"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleStopGPS}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              Detener GPS
            </Button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground">
          {gpsActive
            ? "Tu ubicación se está actualizando cada 45-60 segundos"
            : "Activa el GPS para compartir tu ubicación con los despachadores"}
        </p>
      </CardContent>
    </Card>
  );
}
