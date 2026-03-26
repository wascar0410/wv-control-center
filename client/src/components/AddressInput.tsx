import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AddressInputProps {
  label: string;
  placeholder?: string;
  value: string;
  latitude: number;
  longitude: number;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  onFormattedAddressChange?: (address: string) => void;
}

export default function AddressInput({
  label,
  placeholder = "Ingresa una dirección",
  value,
  latitude,
  longitude,
  onAddressChange,
  onCoordinatesChange,
  onFormattedAddressChange,
}: AddressInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCoordinates, setShowCoordinates] = useState(false);

  const geocodeAddressMutation = trpc.geocoding.geocodeAddress.useQuery(
    { address: value },
    {
      enabled: false,
      retry: false,
    }
  );

  const handleGeocode = useCallback(async () => {
    if (!value || value.trim().length < 5) {
      setError("Ingresa una dirección válida (mínimo 5 caracteres)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await geocodeAddressMutation.refetch();
      
      if (result.error) {
        const errorMsg = result.error?.message || "No se pudieron obtener las coordenadas. Intenta ingresar manualmente.";
        setError(errorMsg);
        toast.warning(errorMsg);
        setIsLoading(false);
        return;
      }

      if (result.data) {
        onCoordinatesChange(result.data.latitude, result.data.longitude);
        if (onFormattedAddressChange) {
          onFormattedAddressChange(result.data.formattedAddress);
        }
        toast.success("✓ Coordenadas encontradas");
        setShowCoordinates(true);
      } else {
        setError("No se encontraron coordenadas. Intenta con una dirección más específica.");
        toast.warning("Dirección no encontrada. Intenta con más detalles.");
      }
    } catch (err: any) {
      console.error("[Geocoding Error]", err);
      const errorMessage = "Geocodificación no disponible. Ingresa las coordenadas manualmente.";
      setError(errorMessage);
      toast.info(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [value, geocodeAddressMutation, onCoordinatesChange, onFormattedAddressChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleGeocode();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`address-${label}`}>{label}</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id={`address-${label}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onAddressChange(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            className={error ? "border-red-500" : ""}
          />
          <Button
            type="button"
            onClick={handleGeocode}
            disabled={isLoading || !value || value.trim().length < 5}
            size="sm"
            variant="outline"
            title="Obtener coordenadas (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {showCoordinates && latitude !== 0 && longitude !== 0 && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            ✓ Coordenadas encontradas
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-green-700 dark:text-green-300">Latitud</p>
              <p className="font-mono font-semibold text-green-900 dark:text-green-100">
                {latitude.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-green-700 dark:text-green-300">Longitud</p>
              <p className="font-mono font-semibold text-green-900 dark:text-green-100">
                {longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual coordinate input */}
      <details className="text-xs text-muted-foreground cursor-pointer">
        <summary className="font-medium hover:text-foreground">📍 Ingresar coordenadas manualmente</summary>
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
          <div>
            <Label htmlFor={`lat-${label}`} className="text-xs">Latitud</Label>
            <Input
              id={`lat-${label}`}
              type="number"
              placeholder="40.7128"
              step="0.0001"
              value={latitude === 0 ? "" : latitude}
              onChange={(e) => onCoordinatesChange(parseFloat(e.target.value) || 0, longitude)}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor={`lng-${label}`} className="text-xs">Longitud</Label>
            <Input
              id={`lng-${label}`}
              type="number"
              placeholder="-74.0060"
              step="0.0001"
              value={longitude === 0 ? "" : longitude}
              onChange={(e) => onCoordinatesChange(latitude, parseFloat(e.target.value) || 0)}
              className="text-xs"
            />
          </div>
        </div>
      </details>

      <p className="text-xs text-muted-foreground">
        💡 Escribe la dirección y presiona Enter o haz clic en el botón de ubicación
      </p>
    </div>
  );
}
