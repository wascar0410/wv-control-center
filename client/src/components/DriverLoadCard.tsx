import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, TrendingUp } from "lucide-react";
import {
  calculateLoadEconomics,
  formatCurrency,
  formatMiles,
  formatTime,
  LoadEconomicsInput,
} from "@/lib/driverLoadEconomics";
import { DriverLoadScoreBadge } from "./DriverLoadScoreBadge";

interface DriverLoadCardProps {
  loadId: number;
  clientName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  price?: number | string;
  driverPay?: number | string;
  totalMiles?: number | string;
  miles?: number | string;
  itemCount?: number;
  status?: string;
  weight?: number | string;
  merchandiseType?: string;
  estimatedFuel?: number | string;
  estimatedTolls?: number | string;
  tolls?: number | string;
  tollAmount?: number | string;
  tollCost?: number | string;
  vehicleType?: "cargo_van" | "sprinter" | "box_truck" | "default";
  onViewDetail?: (loadId: number) => void;
  className?: string;
}

/**
 * Professional driver load card with earnings summary - V2
 * 
 * Shows:
 * - Route/client
 * - Pickup → delivery
 * - Gross pay
 * - Estimated net pay (after fuel, maintenance, tolls)
 * - Estimated hourly rate
 * - Estimated miles
 * - Estimated time
 * - Score badge
 * - "Ver detalle" button
 */
export function DriverLoadCard({
  loadId,
  clientName = "Carga",
  pickupAddress = "Origen",
  deliveryAddress = "Destino",
  price,
  driverPay,
  totalMiles,
  miles,
  itemCount,
  status = "available",
  weight,
  merchandiseType,
  estimatedFuel,
  estimatedTolls,
  tolls,
  tollAmount,
  tollCost,
  vehicleType = "cargo_van",
  onViewDetail,
  className = "",
}: DriverLoadCardProps) {
  // Calculate economics - V2
  const economics = calculateLoadEconomics({
    driverPay,
    price,
    totalMiles,
    miles,
    itemCount,
    estimatedFuel,
    estimatedTolls,
    tolls,
    tollAmount,
    tollCost,
    vehicleType,
  } as LoadEconomicsInput);

  const isAvailable = status === "available";
  const isActive = status === "in_transit" || status === "active";

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg ${
        isActive ? "border-blue-300 bg-blue-50" : ""
      } ${className}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Client and Status */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {clientName}
            </h3>
            {merchandiseType && (
              <p className="text-xs text-gray-500">{merchandiseType}</p>
            )}
          </div>
          <div className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 whitespace-nowrap">
            {isActive ? "En Ruta" : isAvailable ? "Disponible" : status}
          </div>
        </div>

        {/* Route */}
        <div className="space-y-1 text-sm">
          <div className="flex gap-2 text-gray-600">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="truncate">{pickupAddress}</p>
              <p className="text-gray-400">↓</p>
              <p className="truncate">{deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 py-2 border-t border-b">
          {/* Gross Pay */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Pago Bruto</p>
            <p className="font-bold text-green-600">
              {formatCurrency(economics.grossPay)}
            </p>
          </div>

          {/* Net Pay (Estimated) - V2 */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Pago Neto (Est.)</p>
            <p className="font-bold text-blue-600">
              {formatCurrency(economics.netPay)}
            </p>
          </div>

          {/* Miles */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Millas
            </p>
            <p className="font-semibold text-gray-900">
              {formatMiles(economics.totalMiles)}
            </p>
          </div>

          {/* Time */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Tiempo (Est.)
            </p>
            <p className="font-semibold text-gray-900">
              {formatTime(economics.estimatedTotalMinutes)}
            </p>
          </div>
        </div>

        {/* Cost Breakdown Summary - V2 */}
        {economics.estimatedTotalCost !== null && (
          <div className="text-xs space-y-1 p-2 bg-gray-50 rounded">
            <div className="flex justify-between">
              <span className="text-gray-600">Combustible (Est.):</span>
              <span className="text-red-600">-{formatCurrency(economics.fuelCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mantenimiento (Est.):</span>
              <span className="text-red-600">-{formatCurrency(economics.maintenanceCost)}</span>
            </div>
            {economics.tolls !== null && economics.tolls > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Peajes:</span>
                <span className="text-red-600">-{formatCurrency(economics.tolls)}</span>
              </div>
            )}
            <div className="border-t pt-1 flex justify-between font-semibold">
              <span>Costo Total:</span>
              <span className="text-red-600">-{formatCurrency(economics.estimatedTotalCost)}</span>
            </div>
          </div>
        )}

        {/* Hourly Rate and Score */}
        <div className="flex justify-between items-center pt-2">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Tarifa/Hora (Est.)</p>
            <p className="font-bold text-lg">
              {economics.hourlyRate !== null
                ? `$${economics.hourlyRate.toFixed(0)}/h`
                : "N/A"}
            </p>
          </div>
          <DriverLoadScoreBadge
            score={economics.profitabilityScore}
            hourlyRate={economics.hourlyRate}
          />
        </div>

        {/* Action Button */}
        {onViewDetail && (
          <Button
            onClick={() => onViewDetail(loadId)}
            variant="outline"
            className="w-full mt-2"
          >
            Ver Detalle
          </Button>
        )}

        {/* Weight Info */}
        {weight && (
          <p className="text-xs text-gray-500 text-center">
            Peso: {weight} lbs
          </p>
        )}

        {/* Disclaimer - V2 */}
        <p className="text-xs text-gray-400 text-center italic">
          Estimado basado en vehículo, millas y peajes. Pago final en Wallet.
        </p>
      </CardContent>
    </Card>
  );
}
