import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Gauge, Fuel, Info } from "lucide-react";
import { generateEvaluationPDF } from "@/lib/generateEvaluationPDF";
import { LoadEvaluatorFormData } from "@/hooks/useLoadEvaluatorForm";

// ─── Minimum profitable rate threshold (company rule) ─────────────────────────
const MIN_PROFIT_PER_MILE = 0.70;

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
  form: LoadEvaluatorFormData;
}

export function LoadEvaluatorResults({ result, form }: LoadEvaluatorResultsProps) {
  const handleDownloadPDF = () => {
    generateEvaluationPDF(form, result);
  };

  const profitPerMile = result.estimatedProfitPerMile;
  const isBelowMinimum = profitPerMile > 0 && profitPerMile < MIN_PROFIT_PER_MILE;
  const isAboveTarget = profitPerMile >= 0.90;
  const isGood = profitPerMile >= MIN_PROFIT_PER_MILE && profitPerMile < 0.90;

  const decisionStyles = {
    ACCEPT: "border-green-500 bg-green-50 dark:bg-green-950/40",
    NEGOTIATE: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/40",
    REJECT: "border-red-500 bg-red-50 dark:bg-red-950/40",
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
  const decisionIcons = {
    ACCEPT: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    NEGOTIATE: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    REJECT: <TrendingDown className="h-5 w-5 text-red-500" />,
  };

  return (
    <div className="space-y-4">

      {/* ── Profit/Mile Alert Banner ─────────────────────────────────────────── */}
      {isBelowMinimum && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">
              Ganancia por milla por debajo del mínimo
            </p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Esta carga genera <strong>${profitPerMile.toFixed(2)}/mi</strong> de ganancia, por debajo del mínimo recomendado de <strong>${MIN_PROFIT_PER_MILE.toFixed(2)}/mi</strong>.
              Considera negociar un precio más alto o reducir costos antes de aceptar.
            </p>
            <p className="text-xs text-amber-400/60 mt-1">
              Para alcanzar ${MIN_PROFIT_PER_MILE.toFixed(2)}/mi necesitas al menos{" "}
              <strong>${((result.totalCostPerMile + MIN_PROFIT_PER_MILE) * result.totalMiles).toFixed(0)}</strong> de ingreso total
              (actualmente ${(result.offeredRatePerMile * result.totalMiles).toFixed(0)}).
            </p>
          </div>
        </div>
      )}

      {isAboveTarget && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-sm font-medium text-emerald-300">
            Excelente ganancia por milla: <strong>${profitPerMile.toFixed(2)}/mi</strong> — por encima del objetivo de $0.90/mi
          </p>
        </div>
      )}

      {/* ── Decision Card ─────────────────────────────────────────────────────── */}
      <Card className={`border-2 ${decisionStyles[result.decision]}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            {decisionIcons[result.decision]}
            <CardTitle className={`text-lg ${decisionTextStyles[result.decision]}`}>
              {decisionLabels[result.decision]}
            </CardTitle>
          </div>
          <Button onClick={handleDownloadPDF} size="sm" variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-background/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Razón de la decisión</p>
            <p className="text-sm font-medium">{result.decisionReason}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/50 p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Ganancia Est.</p>
              <p className="text-lg font-bold text-green-500">${result.estimatedProfit.toFixed(2)}</p>
            </div>
            <div className="bg-background/50 p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Margen</p>
              <p className="text-lg font-bold">{result.estimatedMarginPercent.toFixed(1)}%</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${isBelowMinimum ? "bg-amber-500/10 border border-amber-500/30" : isAboveTarget ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-background/50"}`}>
              <p className="text-xs text-muted-foreground mb-1">Profit/Milla</p>
              <p className={`text-lg font-bold ${isBelowMinimum ? "text-amber-400" : isAboveTarget ? "text-emerald-400" : isGood ? "text-green-400" : "text-foreground"}`}>
                ${profitPerMile.toFixed(2)}/mi
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Key Metrics ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Métricas Clave
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow label="Millas totales" value={`${result.totalMiles.toFixed(0)} mi`} />
          <MetricRow label="Tarifa ofrecida" value={`$${result.offeredRatePerMile.toFixed(2)}/mi`} />
          <MetricRow label="Tarifa mínima recom." value={`$${result.recommendedMinRatePerMile.toFixed(2)}/mi`}
            highlight={result.offeredRatePerMile < result.recommendedMinRatePerMile} />
          <MetricRow label="Costo total/mi" value={`$${result.totalCostPerMile.toFixed(2)}/mi`} />
          <MetricRow
            label="Ganancia/mi"
            value={`$${profitPerMile.toFixed(2)}/mi`}
            highlight={isBelowMinimum}
            positive={isAboveTarget || isGood}
            badge={isBelowMinimum ? "⚠ Bajo mínimo" : isAboveTarget ? "✓ Excelente" : isGood ? "✓ Bueno" : undefined}
          />
        </CardContent>
      </Card>

      {/* ── Cost Breakdown ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            Desglose de Costos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow label="Costo combustible/mi" value={`$${result.fuelCostPerMile.toFixed(2)}`} />
          <MetricRow label="Costo variable/mi" value={`$${result.variableCostPerMile.toFixed(2)}`} />
          <MetricRow label="Costo fijo/mi" value={`$${result.fixedCostPerMile.toFixed(2)}`} />
          <MetricRow label="Recargo distancia/mi" value={`$${result.distanceSurchargePerMile.toFixed(2)}`} />
          <MetricRow label="Recargo peso/mi" value={`$${result.weightSurchargePerMile.toFixed(2)}`} />
          <div className="border-t pt-2 mt-1">
            <MetricRow label="Costo total estimado" value={`$${result.totalEstimatedCost.toFixed(2)}`} strong />
          </div>
        </CardContent>
      </Card>

      {/* ── Threshold Reference ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <strong>Regla de la empresa:</strong> Aceptar cargas con ganancia ≥ $0.70/mi. 
          Cargas entre $0.70–$0.89/mi son buenas. Cargas ≥ $0.90/mi son excelentes.
          Por debajo de $0.70/mi siempre negociar o rechazar.
        </p>
      </div>
    </div>
  );
}

function MetricRow({
  label, value, strong, highlight, positive, badge
}: {
  label: string; value: string; strong?: boolean;
  highlight?: boolean; positive?: boolean; badge?: string;
}) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className={`text-sm ${strong ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <div className="flex items-center gap-2">
        {badge && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            badge.startsWith("⚠") ? "bg-amber-500/15 text-amber-400" :
            badge.startsWith("✓") ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
          }`}>{badge}</span>
        )}
        <span className={`font-medium ${
          strong ? "font-bold" :
          highlight ? "text-amber-400" :
          positive ? "text-emerald-400" : ""
        }`}>{value}</span>
      </div>
    </div>
  );
}
