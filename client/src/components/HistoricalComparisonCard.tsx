import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HistoricalComparisonData {
  currentMonth: {
    miles: number;
    profit: number;
    quotationsCount: number;
    averageProfitPerMile: number;
  };
  previousMonth: {
    miles: number;
    profit: number;
    quotationsCount: number;
    averageProfitPerMile: number;
  };
  comparison: {
    milesVariation: number;
    milesVariationPercent: number;
    profitVariation: number;
    profitVariationPercent: number;
    quotationsVariation: number;
    quotationsVariationPercent: number;
    profitPerMileVariation: number;
    profitPerMileVariationPercent: number;
    trend: "improving" | "declining" | "stable";
  };
}

function VariationBadge({ value, percent }: { value: number; percent: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : value === 0 ? Minus : TrendingDown;
  const color = isPositive 
    ? "text-green-500 bg-green-500/10" 
    : value === 0 
    ? "text-gray-500 bg-gray-500/10"
    : "text-red-500 bg-red-500/10";

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded ${color} text-xs font-semibold`}>
      <Icon className="w-3 h-3" />
      <span>{isPositive ? "+" : ""}{percent.toFixed(1)}%</span>
    </div>
  );
}

export function HistoricalComparisonCard({ data }: { data: HistoricalComparisonData }) {
  const currentMonth = new Date();
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
  
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const currentMonthName = monthNames[currentMonth.getMonth()];
  const previousMonthName = monthNames[previousMonth.getMonth()];

  const getTrendLabel = () => {
    switch (data.comparison.trend) {
      case "improving":
        return "📈 Mejorando";
      case "declining":
        return "📉 Declinando";
      default:
        return "➡️ Estable";
    }
  };

  return (
    <div className="space-y-4">
      {/* Trend Overview */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Comparación Histórica</CardTitle>
              <CardDescription>{previousMonthName} vs {currentMonthName}</CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              data.comparison.trend === "improving" 
                ? "bg-green-500/10 text-green-600"
                : data.comparison.trend === "declining"
                ? "bg-red-500/10 text-red-600"
                : "bg-gray-500/10 text-gray-600"
            }`}>
              {getTrendLabel()}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Millas Comparison */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Millas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{previousMonthName}</div>
                <div className="text-lg font-semibold">{data.previousMonth.miles.toLocaleString()}</div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{currentMonthName}</div>
                <div className="text-lg font-semibold">{data.currentMonth.miles.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-foreground/70">Variación</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {data.comparison.milesVariation >= 0 ? "+" : ""}{data.comparison.milesVariation.toLocaleString()} mi
                </span>
                <VariationBadge 
                  value={data.comparison.milesVariation} 
                  percent={data.comparison.milesVariationPercent}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ganancia Comparison */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ganancia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{previousMonthName}</div>
                <div className="text-lg font-semibold text-green-600">
                  ${data.previousMonth.profit.toFixed(2)}
                </div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{currentMonthName}</div>
                <div className="text-lg font-semibold text-green-600">
                  ${data.currentMonth.profit.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-foreground/70">Variación</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {data.comparison.profitVariation >= 0 ? "+" : ""}${data.comparison.profitVariation.toFixed(2)}
                </span>
                <VariationBadge 
                  value={data.comparison.profitVariation} 
                  percent={data.comparison.profitVariationPercent}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cotizaciones Comparison */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cotizaciones Aceptadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{previousMonthName}</div>
                <div className="text-lg font-semibold">{data.previousMonth.quotationsCount}</div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{currentMonthName}</div>
                <div className="text-lg font-semibold">{data.currentMonth.quotationsCount}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-foreground/70">Variación</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {data.comparison.quotationsVariation >= 0 ? "+" : ""}{data.comparison.quotationsVariation}
                </span>
                <VariationBadge 
                  value={data.comparison.quotationsVariation} 
                  percent={data.comparison.quotationsVariationPercent}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ganancia por Milla Comparison */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ganancia/Milla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{previousMonthName}</div>
                <div className="text-lg font-semibold text-blue-600">
                  ${data.previousMonth.averageProfitPerMile.toFixed(2)}/mi
                </div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{currentMonthName}</div>
                <div className="text-lg font-semibold text-blue-600">
                  ${data.currentMonth.averageProfitPerMile.toFixed(2)}/mi
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-foreground/70">Variación</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {data.comparison.profitPerMileVariation >= 0 ? "+" : ""}${data.comparison.profitPerMileVariation.toFixed(2)}
                </span>
                <VariationBadge 
                  value={data.comparison.profitPerMileVariation} 
                  percent={data.comparison.profitPerMileVariationPercent}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.comparison.milesVariationPercent > 10 && (
            <div className="flex items-start gap-2 p-2 rounded bg-green-500/10 text-green-700">
              <span>✓</span>
              <span>Excelente: Millas aumentaron más del 10% respecto al mes anterior</span>
            </div>
          )}
          {data.comparison.profitPerMileVariationPercent > 5 && (
            <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 text-blue-700">
              <span>✓</span>
              <span>Mejora en eficiencia: Ganancia por milla aumentó {data.comparison.profitPerMileVariationPercent.toFixed(1)}%</span>
            </div>
          )}
          {data.comparison.milesVariationPercent < -10 && (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 text-amber-700">
              <span>⚠</span>
              <span>Atención: Millas disminuyeron más del 10% respecto al mes anterior</span>
            </div>
          )}
          {data.comparison.profitPerMileVariationPercent < -5 && (
            <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 text-red-700">
              <span>!</span>
              <span>Revisar: Ganancia por milla disminuyó {Math.abs(data.comparison.profitPerMileVariationPercent).toFixed(1)}%</span>
            </div>
          )}
          {Math.abs(data.comparison.milesVariationPercent) <= 10 && 
           Math.abs(data.comparison.profitPerMileVariationPercent) <= 5 && (
            <div className="flex items-start gap-2 p-2 rounded bg-gray-500/10 text-gray-700">
              <span>→</span>
              <span>Desempeño estable: Métricas similares al mes anterior</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
