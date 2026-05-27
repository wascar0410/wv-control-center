import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/driverLoadEconomics";

interface DriverEarningsBreakdownProps {
  grossPay: number | null;
  vehicleCost: number | null;
  netPay: number | null;
  hourlyRate: number | null;
  payPerMile: number | null;
  className?: string;
}

/**
 * Visual breakdown of driver earnings and costs
 * Shows:
 * - Pago bruto
 * - Costo estimado vehículo
 * - Pago neto estimado
 * - Tarifa por hora estimada
 * - Pago por milla estimado
 */
export function DriverEarningsBreakdown({
  grossPay,
  vehicleCost,
  netPay,
  hourlyRate,
  payPerMile,
  className = "",
}: DriverEarningsBreakdownProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Desglose de Ganancias (Estimado)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gross Pay */}
        <div className="flex justify-between items-center pb-3 border-b">
          <span className="text-gray-700">Pago Bruto</span>
          <span className="font-semibold text-lg">
            {formatCurrency(grossPay)}
          </span>
        </div>

        {/* Vehicle Cost */}
        {vehicleCost !== null && (
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-700">Costo Vehículo (Est.)</span>
            <span className="text-red-600 font-semibold">
              -{formatCurrency(vehicleCost)}
            </span>
          </div>
        )}

        {/* Net Pay */}
        <div className="flex justify-between items-center pb-3 border-b bg-blue-50 p-3 rounded">
          <span className="text-gray-900 font-semibold">Pago Neto (Est.)</span>
          <span className="font-bold text-lg text-blue-600">
            {formatCurrency(netPay)}
          </span>
        </div>

        {/* Hourly Rate */}
        {hourlyRate !== null && (
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-700">Tarifa por Hora (Est.)</span>
            <span className="font-semibold">
              ${hourlyRate.toFixed(2)}/h
            </span>
          </div>
        )}

        {/* Pay Per Mile */}
        {payPerMile !== null && (
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Pago por Milla (Est.)</span>
            <span className="font-semibold">
              ${payPerMile.toFixed(2)}/mi
            </span>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <p className="font-semibold mb-1">⚠️ Estimado</p>
          <p>
            Estos valores son estimaciones basadas en distancia y tiempo promedio.
            El pago final se calcula en Wallet/Settlements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
