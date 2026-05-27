import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, MapPin, Package, Clock, DollarSign } from "lucide-react";
import {
  calculateLoadEconomics,
  formatCurrency,
  formatMiles,
  formatTime,
  formatHourlyRate,
  getCalculationExplanation,
  LoadEconomicsInput,
} from "@/lib/driverLoadEconomics";
import { DriverLoadScoreBadge } from "./DriverLoadScoreBadge";
import { DriverEarningsBreakdown } from "./DriverEarningsBreakdown";

interface DriverLoadDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  loadId?: number;
  clientName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  price?: number | string;
  driverPay?: number | string;
  totalMiles?: number | string;
  miles?: number | string;
  itemCount?: number;
  weight?: number | string;
  weightUnit?: string;
  merchandiseType?: string;
  estimatedFuel?: number | string;
  estimatedTolls?: number | string;
  tolls?: number | string;
  tollAmount?: number | string;
  tollCost?: number | string;
  status?: string;
  vehicleType?: "cargo_van" | "sprinter" | "box_truck" | "default";
}

/**
 * Detailed breakdown drawer for driver loads - V2
 * 
 * Sections:
 * - Load summary
 * - Pickup and delivery
 * - Earnings breakdown (with fuel, maintenance, tolls)
 * - Time estimate
 * - Cost estimate
 * - Profitability explanation
 */
export function DriverLoadDetailDrawer({
  isOpen,
  onClose,
  loadId,
  clientName = "Carga",
  pickupAddress = "Origen",
  deliveryAddress = "Destino",
  price,
  driverPay,
  totalMiles,
  miles,
  itemCount,
  weight,
  weightUnit = "lbs",
  merchandiseType,
  estimatedFuel,
  estimatedTolls,
  tolls,
  tollAmount,
  tollCost,
  status = "available",
  vehicleType = "cargo_van",
}: DriverLoadDetailDrawerProps) {
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);

  // Calculate economics
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Detalles de Carga</SheetTitle>
          <SheetDescription>
            {clientName} - {status === "in_transit" ? "En Ruta" : "Disponible"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Load Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Resumen</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Cliente:</span> {clientName}
              </p>
              {merchandiseType && (
                <p className="text-gray-600">
                  <span className="font-medium">Tipo:</span> {merchandiseType}
                </p>
              )}
              {weight && (
                <p className="text-gray-600">
                  <span className="font-medium">Peso:</span> {weight} {weightUnit}
                </p>
              )}
              <p className="text-gray-600">
                <span className="font-medium">Vehículo:</span> {vehicleType}
              </p>
            </div>
          </div>

          <Separator />

          {/* Pickup and Delivery */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Ruta
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">ORIGEN</p>
                <p className="font-medium text-gray-900">{pickupAddress}</p>
              </div>
              <div className="text-center text-gray-400">↓</div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-xs text-gray-500 mb-1">DESTINO</p>
                <p className="font-medium text-gray-900">{deliveryAddress}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Earnings Breakdown - V2 */}
          <DriverEarningsBreakdown
            grossPay={economics.grossPay}
            fuelCost={economics.fuelCost}
            maintenanceCost={economics.maintenanceCost}
            tolls={economics.tolls}
            estimatedTotalCost={economics.estimatedTotalCost}
            netPay={economics.netPay}
            hourlyRate={economics.hourlyRate}
            payPerMile={economics.payPerMile}
          />

          <Separator />

          {/* Time Estimate */}
          {economics.estimatedTotalMinutes !== null && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Estimación de Tiempo
              </h3>
              <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiempo de manejo:</span>
                  <span className="font-medium">
                    {formatTime(economics.estimatedDriveMinutes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tiempo de servicio:</span>
                  <span className="font-medium">
                    {formatTime(economics.serviceMinutes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Buffer:</span>
                  <span className="font-medium">
                    {economics.bufferMinutes}m
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Tiempo total estimado:</span>
                  <span className="text-blue-600">
                    {formatTime(economics.estimatedTotalMinutes)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Cost Estimate - V2 */}
          {economics.totalMiles !== null && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Estimación de Costos
              </h3>
              <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-600">Millas:</span>
                  <span className="font-medium">
                    {formatMiles(economics.totalMiles)}
                  </span>
                </div>
                
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Combustible por milla:</span>
                    <span className="font-medium">
                      ${economics.fuelCostPerMile.toFixed(3)}/mi
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Mantenimiento por milla:</span>
                    <span className="font-medium">
                      ${economics.maintenanceCostPerMile.toFixed(3)}/mi
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total por milla:</span>
                    <span className="text-red-600">
                      ${economics.totalCostPerMile.toFixed(3)}/mi
                    </span>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Combustible (Est.):</span>
                    <span className="text-red-600">
                      -{formatCurrency(economics.fuelCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mantenimiento (Est.):</span>
                    <span className="text-red-600">
                      -{formatCurrency(economics.maintenanceCost)}
                    </span>
                  </div>
                  {economics.tolls !== null && economics.tolls > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peajes:</span>
                      <span className="text-red-600">
                        -{formatCurrency(economics.tolls)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Costo total estimado:</span>
                    <span className="text-red-600">
                      -{formatCurrency(economics.estimatedTotalCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Profitability Score */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Rentabilidad</h3>
            <div className="p-4 rounded border-2 border-gray-200 flex justify-between items-center">
              <span className="text-gray-700">Puntuación:</span>
              <DriverLoadScoreBadge
                score={economics.profitabilityScore}
                hourlyRate={economics.hourlyRate}
              />
            </div>
          </div>

          <Separator />

          {/* Calculation Details Toggle */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCalculationDetails(!showCalculationDetails)}
            >
              {showCalculationDetails
                ? "Ocultar Detalles de Cálculo"
                : "Ver Detalles de Cálculo"}
            </Button>

            {showCalculationDetails && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 whitespace-pre-wrap">
                {getCalculationExplanation()}
              </div>
            )}
          </div>

          {/* Final Disclaimer */}
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <p className="font-semibold mb-1">⚠️ Importante</p>
            <p>
              Estos valores son ESTIMACIONES. El pago final se calcula en
              Wallet/Settlements y puede variar según:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
              <li>Distancia real recorrida</li>
              <li>Tiempo real de entrega</li>
              <li>Combustible y peajes reales</li>
              <li>Políticas de comisión</li>
            </ul>
          </div>

          {/* Close Button */}
          <Button onClick={onClose} className="w-full">
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
