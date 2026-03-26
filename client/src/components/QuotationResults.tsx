import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";

interface QuotationResultsProps {
  emptyMiles: number;
  loadedMiles: number;
  returnEmptyMiles: number;
  totalMiles: number;
  totalPrice: number;
  estimatedFuelCost: number;
  estimatedOperatingCost: number;
  estimatedProfit: number;
  profitMarginPercent: number;
}

export default function QuotationResults({
  emptyMiles,
  loadedMiles,
  returnEmptyMiles,
  totalMiles,
  totalPrice,
  estimatedFuelCost,
  estimatedOperatingCost,
  estimatedProfit,
  profitMarginPercent,
}: QuotationResultsProps) {
  const isRentable = profitMarginPercent >= 15; // Minimum 15% margin

  return (
    <div className="space-y-6">
      {/* Distance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose de Distancia</CardTitle>
          <CardDescription>Cálculo de millas por segmento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="text-sm text-muted-foreground">Millas Vacías (Van → Recogida)</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{emptyMiles.toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-sm text-muted-foreground">Millas Cargadas (Recogida → Entrega)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{loadedMiles.toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
              <p className="text-sm text-muted-foreground">Millas Retorno Vacío</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{returnEmptyMiles.toFixed(1)}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
              <p className="text-sm text-muted-foreground">Total Millas</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMiles.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose de Precios</CardTitle>
          <CardDescription>Tarificación y costos estimados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <span className="font-medium">Tarifa Total</span>
              <span className="text-lg font-bold text-primary">${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
              <span className="text-muted-foreground">Costo Combustible ($0.35/milla)</span>
              <span className="font-semibold text-red-600 dark:text-red-400">-${estimatedFuelCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
              <span className="text-muted-foreground">Costo Operativo ($0.65/milla)</span>
              <span className="font-semibold text-red-600 dark:text-red-400">-${estimatedOperatingCost.toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
              <span className="font-bold">Ganancia Estimada</span>
              <span className={`text-lg font-bold ${estimatedProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                ${estimatedProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability Analysis */}
      <Card className={isRentable ? "border-green-200 dark:border-green-800" : "border-orange-200 dark:border-orange-800"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Análisis de Rentabilidad</CardTitle>
            {isRentable ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <CheckCircle className="w-4 h-4 mr-1" />
                Recomendado
              </Badge>
            ) : (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                <AlertCircle className="w-4 h-4 mr-1" />
                Bajo Margen
              </Badge>
            )}
          </div>
          <CardDescription>Evaluación de si la carga conviene hacerla</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
              <div className="flex items-center justify-between">
                <span className="font-medium">Margen de Ganancia</span>
                <div className="flex items-center gap-2">
                  {profitMarginPercent >= 15 ? (
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  )}
                  <span className={`text-2xl font-bold ${profitMarginPercent >= 15 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {profitMarginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Ingreso por Milla</p>
                <p className="text-lg font-bold">${(totalPrice / totalMiles).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-1">Costo por Milla</p>
                <p className="text-lg font-bold">${((estimatedFuelCost + estimatedOperatingCost) / totalMiles).toFixed(2)}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border-2 border-dashed border-muted">
              <p className="text-sm text-muted-foreground mb-2">Recomendación:</p>
              {isRentable ? (
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ✓ Esta carga tiene un margen saludable ({profitMarginPercent.toFixed(1)}%). Se recomienda aceptarla.
                </p>
              ) : (
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  ⚠ El margen es bajo ({profitMarginPercent.toFixed(1)}%). Considera negociar una tarifa mayor o rechazarla.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
