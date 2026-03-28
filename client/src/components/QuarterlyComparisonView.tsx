import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MonthlyMetrics {
  month: string;
  monthNum: number;
  miles: number;
  profit: number;
  quotationsCount: number;
  averageProfitPerMile: number;
}

interface QuarterlyComparisonData {
  months: MonthlyMetrics[];
  quarterlyTotals: {
    totalMiles: number;
    totalProfit: number;
    totalQuotations: number;
    averageMilesPerMonth: number;
    averageProfitPerMonth: number;
    averageProfitPerMile: number;
  };
  comparison: {
    milesVariation: number;
    milesVariationPercent: number;
    profitVariation: number;
    profitVariationPercent: number;
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

export function QuarterlyComparisonView({ data }: { data: QuarterlyComparisonData }) {
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("quarterly");

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

  // Data for monthly comparison chart
  const monthlyChartData = data.months.map(m => ({
    name: m.month,
    miles: m.miles,
    ganancia: m.profit,
    cotizaciones: m.quotationsCount,
  }));

  // Data for trend line
  const trendData = data.months.map(m => ({
    name: m.month,
    "ganancia/milla": m.averageProfitPerMile,
  }));

  return (
    <div className="space-y-4">
      {/* View Toggle and Trend */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Análisis de Tendencias</CardTitle>
              <CardDescription>Últimos 3 meses</CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("monthly")}
              className="text-xs"
            >
              Vista Mensual
            </Button>
            <Button
              variant={viewMode === "quarterly" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("quarterly")}
              className="text-xs"
            >
              Vista Trimestral
            </Button>
          </div>
        </CardContent>
      </Card>

      {viewMode === "monthly" ? (
        <>
          {/* Monthly Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.months.map((month, idx) => (
              <Card key={month.month} className="border border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{month.month}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Millas</span>
                      <span className="font-semibold">{month.miles.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Ganancia</span>
                      <span className="font-semibold text-green-600">${month.profit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Cotizaciones</span>
                      <span className="font-semibold">{month.quotationsCount}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-foreground/70">Ganancia/Milla</span>
                      <span className="font-semibold text-blue-600">${month.averageProfitPerMile.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly Comparison Charts */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comparación Mensual</CardTitle>
              <CardDescription>Millas, ganancia y cotizaciones por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  />
                  <Legend />
                  <Bar dataKey="miles" fill="#3b82f6" name="Millas" />
                  <Bar dataKey="ganancia" fill="#10b981" name="Ganancia ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit per Mile Trend */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tendencia de Ganancia/Milla</CardTitle>
              <CardDescription>Eficiencia a lo largo del trimestre</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" label={{ value: "Ganancia/Milla ($)", angle: -90, position: "insideLeft" }} />
                  <Tooltip 
                    formatter={(value) => (typeof value === 'number' ? `$${value.toFixed(2)}` : value)}
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ganancia/milla"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Ganancia/Milla"
                    dot={{ fill: "#8b5cf6", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Quarterly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Totales Trimestrales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-foreground/70">Total Millas</span>
                    <span className="font-semibold">{data.quarterlyTotals.totalMiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-foreground/70">Total Ganancia</span>
                    <span className="font-semibold text-green-600">${data.quarterlyTotals.totalProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-foreground/70">Total Cotizaciones</span>
                    <span className="font-semibold">{data.quarterlyTotals.totalQuotations}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Promedios Trimestrales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-foreground/70">Promedio Millas/Mes</span>
                    <span className="font-semibold">{data.quarterlyTotals.averageMilesPerMonth.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-foreground/70">Promedio Ganancia/Mes</span>
                    <span className="font-semibold text-green-600">${data.quarterlyTotals.averageProfitPerMonth.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-foreground/70">Ganancia/Milla Promedio</span>
                    <span className="font-semibold text-blue-600">${data.quarterlyTotals.averageProfitPerMile.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quarterly Trend Analysis */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Análisis de Tendencia</CardTitle>
              <CardDescription>Comparación primer mes vs último mes del trimestre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Variación de Millas</h4>
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded">
                    <span className="text-sm text-foreground/70">
                      {data.months[0].month} → {data.months[2].month}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {data.comparison.milesVariation >= 0 ? "+" : ""}{data.comparison.milesVariation.toLocaleString()} mi
                      </span>
                      <VariationBadge 
                        value={data.comparison.milesVariation} 
                        percent={data.comparison.milesVariationPercent}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Variación de Ganancia</h4>
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded">
                    <span className="text-sm text-foreground/70">
                      {data.months[0].month} → {data.months[2].month}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {data.comparison.profitVariation >= 0 ? "+" : ""}${data.comparison.profitVariation.toFixed(2)}
                      </span>
                      <VariationBadge 
                        value={data.comparison.profitVariation} 
                        percent={data.comparison.profitVariationPercent}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="pt-2 border-t border-border">
                <h4 className="font-semibold text-sm mb-2">Insights del Trimestre</h4>
                <div className="space-y-2">
                  {data.comparison.trend === "improving" && (
                    <div className="flex items-start gap-2 p-2 rounded bg-green-500/10 text-green-700 text-sm">
                      <span>✓</span>
                      <span>Excelente: Tendencia positiva en millas y ganancia durante el trimestre</span>
                    </div>
                  )}
                  {data.comparison.trend === "declining" && (
                    <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 text-red-700 text-sm">
                      <span>!</span>
                      <span>Atención: Tendencia declinante en millas y ganancia durante el trimestre</span>
                    </div>
                  )}
                  {data.comparison.trend === "stable" && (
                    <div className="flex items-start gap-2 p-2 rounded bg-gray-500/10 text-gray-700 text-sm">
                      <span>→</span>
                      <span>Desempeño estable: Métricas consistentes durante el trimestre</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 p-2 rounded bg-blue-500/10 text-blue-700 text-sm">
                    <span>ℹ</span>
                    <span>Promedio trimestral: {data.quarterlyTotals.averageMilesPerMonth.toLocaleString()} millas/mes y ${data.quarterlyTotals.averageProfitPerMonth.toFixed(2)}/mes</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
