import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EvaluationResult {
  decision: "ACCEPT" | "NEGOTIATE" | "REJECT";
  decisionReason: string;
  estimatedProfit: number;
  estimatedMarginPercent: number;
  totalMiles: number;
  offeredRatePerMile: number;
  recommendedMinRatePerMile: number;
  totalCostPerMile: number;
  estimatedProfitPerMile: number;
  fuelCostPerMile: number;
  variableCostPerMile: number;
  fixedCostPerMile: number;
  distanceSurchargePerMile: number;
  weightSurchargePerMile: number;
  totalEstimatedCost: number;
}

interface LoadEvaluatorResultsProps {
  result: EvaluationResult;
}

export function LoadEvaluatorResults({ result }: LoadEvaluatorResultsProps) {
  const decisionStyles = {
    ACCEPT: "border-green-500 bg-green-50 dark:bg-green-950",
    NEGOTIATE: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
    REJECT: "border-red-500 bg-red-50 dark:bg-red-950",
  };

  const decisionTextStyles = {
    ACCEPT: "text-green-700 dark:text-green-300",
    NEGOTIATE: "text-yellow-700 dark:text-yellow-300",
    REJECT: "text-red-700 dark:text-red-300",
  };

  const decisionLabels = {
    ACCEPT: "✓ ACEPTAR",
    NEGOTIATE: "⚠ NEGOCIAR",
    REJECT: "✕ RECHAZAR",
  };

  return (
    <div className="space-y-6">
      {/* Decision Card */}
      <Card className={`border-2 ${decisionStyles[result.decision]}`}>
        <CardHeader>
          <CardTitle className={decisionTextStyles[result.decision]}>
            {decisionLabels[result.decision]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Razón</p>
            <p className="font-medium">{result.decisionReason}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 p-3 rounded">
              <p className="text-xs text-muted-foreground">Ganancia Est.</p>
              <p className="text-lg font-bold text-green-600">
                ${result.estimatedProfit.toFixed(2)}
              </p>
            </div>
            <div className="bg-background/50 p-3 rounded">
              <p className="text-xs text-muted-foreground">Margen</p>
              <p className="text-lg font-bold">{result.estimatedMarginPercent.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas Clave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetricRow label="Millas totales" value={`${result.totalMiles.toFixed(0)} mi`} />
          <MetricRow label="Tarifa ofrecida" value={`$${result.offeredRatePerMile.toFixed(2)}/mi`} />
          <MetricRow
            label="Tarifa mínima recom."
            value={`$${result.recommendedMinRatePerMile.toFixed(2)}/mi`}
          />
          <MetricRow label="Costo total/mi" value={`$${result.totalCostPerMile.toFixed(2)}/mi`} />
          <MetricRow
            label="Ganancia/mi"
            value={`$${result.estimatedProfitPerMile.toFixed(2)}/mi`}
          />
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desglose de Costos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetricRow label="Costo combustible/mi" value={`$${result.fuelCostPerMile.toFixed(2)}`} />
          <MetricRow
            label="Costo variable/mi"
            value={`$${result.variableCostPerMile.toFixed(2)}`}
          />
          <MetricRow label="Costo fijo/mi" value={`$${result.fixedCostPerMile.toFixed(2)}`} />
          <MetricRow
            label="Recargo distancia/mi"
            value={`$${result.distanceSurchargePerMile.toFixed(2)}`}
          />
          <MetricRow
            label="Recargo peso/mi"
            value={`$${result.weightSurchargePerMile.toFixed(2)}`}
          />
          <div className="border-t pt-3">
            <MetricRow
              label="Costo total estimado"
              value={`$${result.totalEstimatedCost.toFixed(2)}`}
              strong
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={strong ? "font-semibold" : "text-sm text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
