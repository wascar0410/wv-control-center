import { useState } from "react";


// 🔥 SAFE HELPERS
const safeNum = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
const money = (v: any) => `$${safeNum(v).toFixed(2)}`;
const percent = (v: any) => `${safeNum(v).toFixed(1)}%`;
const fixed = (v: any, d = 2) => safeNum(v).toFixed(d);

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Historical Comparison Types
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

// Quarterly Comparison Types
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

function getTrendLabel(trend: "improving" | "declining" | "stable") {
  switch (trend) {
    case "improving":
      return "📈 Mejorando";
    case "declining":
      return "📉 Declinando";
    default:
      return "➡️ Estable";
  }
}

function getTrendColor(trend: "improving" | "declining" | "stable") {
  switch (trend) {
    case "improving":
      return "bg-green-500/10 text-green-600";
    case "declining":
      return "bg-red-500/10 text-red-600";
    default:
      return "bg-gray-500/10 text-gray-600";
  }
}

// Monthly View Component
function MonthlyView({ data }: { data: HistoricalComparisonData }) {
  const currentMonth = new Date();
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const currentMonthName = monthNames[currentMonth.getMonth()];
  const previousMonthName = monthNames[previousMonth.getMonth()];

  const milesQuotationsData = [
    {
      name: previousMonthName,
      miles: data.previousMonth.miles,
      cotizaciones: data.previousMonth.quotationsCount,
    },
    {
      name: currentMonthName,
      miles: data.currentMonth.miles,
      cotizaciones: data.currentMonth.quotationsCount,
    },
  ];

  const profitData = [
    {
      name: previousMonthName,
      ganancia: data.previousMonth.profit,
    },
    {
      name: currentMonthName,
      ganancia: data.currentMonth.profit,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ganancia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{previousMonthName}</div>
                <div className="text-lg font-semibold text-green-600">
                  ${fixed(data.previousMonth.profit, 2)}
                </div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{currentMonthName}</div>
                <div className="text-lg font-semibold text-green-600">
                  ${fixed(data.currentMonth.profit, 2)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-foreground/70">Variación</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {data.comparison.profitVariation >= 0 ? "+" : ""}${fixed(data.comparison.profitVariation, 2)}
                </span>
                <VariationBadge 
                  value={data.comparison.profitVariation} 
                  percent={data.comparison.profitVariationPercent}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cotizaciones</CardTitle>
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

        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ganancia/Milla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{previousMonthName}</div>
                <div className="text-lg font-semibold text-blue-600">
                  ${fixed(data.previousMonth.averageProfitPerMile, 2)}/mi
                </div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-foreground/60 text-xs mb-1">{currentMonthName}</div>
                <div className="text-lg font-semibold text-blue-600">
                  ${fixed(data.currentMonth.averageProfitPerMile, 2)}/mi
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-foreground/70">Variación</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {data.comparison.profitPerMileVariation >= 0 ? "+" : ""}${fixed(data.comparison.profitPerMileVariation, 2)}
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

      {/* Charts */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Comparación Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={milesQuotationsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
              <Legend />
              <Bar dataKey="miles" fill="#3b82f6" name="Millas" />
              <Bar dataKey="cotizaciones" fill="#10b981" name="Cotizaciones" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ganancia Total</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? `$${fixed(value, 2)}` : value)}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
              <Legend />
              <Bar dataKey="ganancia" fill="#8b5cf6" name="Ganancia ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// Quarterly View Component
function QuarterlyView({ data }: { data: QuarterlyComparisonData }) {
  const monthlyChartData = data.months.map(m => ({
    name: m.month,
    miles: m.miles,
    ganancia: m.profit,
    cotizaciones: m.quotationsCount,
  }));

  const trendData = data.months.map(m => ({
    name: m.month,
    "ganancia/milla": m.averageProfitPerMile,
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
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
                <span className="font-semibold text-green-600">${fixed(data.quarterlyTotals.totalProfit, 2)}</span>
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
                <span className="font-semibold text-green-600">${fixed(data.quarterlyTotals.averageProfitPerMonth, 2)}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Ganancia/Milla Promedio</span>
                <span className="font-semibold text-blue-600">${fixed(data.quarterlyTotals.averageProfitPerMile, 2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.months.map((month) => (
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
                  <span className="font-semibold text-green-600">${fixed(month.profit, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/70">Cotizaciones</span>
                  <span className="font-semibold">{month.quotationsCount}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-foreground/70">Ganancia/Milla</span>
                  <span className="font-semibold text-blue-600">${fixed(month.averageProfitPerMile, 2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Comparación Mensual</CardTitle>
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

      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tendencia de Ganancia/Milla</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: "Ganancia/Milla ($)", angle: -90, position: "insideLeft" }} />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? `$${fixed(value, 2)}` : value)}
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

      {/* Trend Analysis */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Análisis de Tendencia</CardTitle>
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
                    {data.comparison.profitVariation >= 0 ? "+" : ""}${fixed(data.comparison.profitVariation, 2)}
                  </span>
                  <VariationBadge 
                    value={data.comparison.profitVariation} 
                    percent={data.comparison.profitVariationPercent}
                  />
                </div>
              </div>
            </div>
          </div>

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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Annual View Component
function AnnualView({ data }: { data: AnnualComparisonData }) {
  const annualChartData = data.months.map(m => ({
    name: m.month,
    miles: m.miles,
    ganancia: m.profit,
    cotizaciones: m.quotationsCount,
  }));

  const profitPerMileData = data.months.map(m => ({
    name: m.month,
    "ganancia/milla": m.averageProfitPerMile,
  }));

  const quarterlyData = [
    { name: "Q1", miles: data.quarterlyBreakdown.q1.miles, ganancia: data.quarterlyBreakdown.q1.profit },
    { name: "Q2", miles: data.quarterlyBreakdown.q2.miles, ganancia: data.quarterlyBreakdown.q2.profit },
    { name: "Q3", miles: data.quarterlyBreakdown.q3.miles, ganancia: data.quarterlyBreakdown.q3.profit },
    { name: "Q4", miles: data.quarterlyBreakdown.q4.miles, ganancia: data.quarterlyBreakdown.q4.profit },
  ];

  return (
    <div className="space-y-4">
      {/* Annual Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Totales Anuales {data.year}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Total Millas</span>
                <span className="font-semibold">{data.annualTotals.totalMiles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Total Ganancia</span>
                <span className="font-semibold text-green-600">${fixed(data.annualTotals.totalProfit, 2)}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Total Cotizaciones</span>
                <span className="font-semibold">{data.annualTotals.totalQuotations}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Ganancia/Milla</span>
                <span className="font-semibold text-blue-600">${fixed(data.annualTotals.averageProfitPerMile, 2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Promedios Mensuales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Promedio Millas/Mes</span>
                <span className="font-semibold">{data.annualTotals.averageMilesPerMonth.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Promedio Ganancia/Mes</span>
                <span className="font-semibold text-green-600">${fixed(data.annualTotals.averageProfitPerMonth, 2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best and Worst Months */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border bg-card border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mejor Mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-green-500/10 rounded">
                <span className="text-foreground/70">Mes</span>
                <span className="font-semibold text-green-600">{data.bestMonth.month}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Millas</span>
                <span className="font-semibold">{data.bestMonth.miles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Ganancia</span>
                <span className="font-semibold text-green-600">${fixed(data.bestMonth.profit, 2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Peor Mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-red-500/10 rounded">
                <span className="text-foreground/70">Mes</span>
                <span className="font-semibold text-red-600">{data.worstMonth.month}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Millas</span>
                <span className="font-semibold">{data.worstMonth.miles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded">
                <span className="text-foreground/70">Ganancia</span>
                <span className="font-semibold text-red-600">${fixed(data.worstMonth.profit, 2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Breakdown */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Desglose Trimestral</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quarterlyData}>
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

      {/* Annual Trend */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tendencia Anual</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={annualChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="miles"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Millas"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit Trend */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ganancia por Milla (Anual)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={profitPerMileData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: "Ganancia/Milla ($)", angle: -90, position: "insideLeft" }} />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? `$${fixed(value, 2)}` : value)}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ganancia/milla"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Ganancia/Milla"
                dot={{ fill: "#8b5cf6", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Half-Year Comparison */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Comparación Primer vs Segundo Semestre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Primer Semestre (Ene-Jun)</h4>
              <div className="flex justify-between p-2 bg-background/50 rounded text-sm">
                <span className="text-foreground/70">Millas</span>
                <span className="font-semibold">{data.comparison.firstHalfMiles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded text-sm">
                <span className="text-foreground/70">Ganancia</span>
                <span className="font-semibold text-green-600">${fixed(data.comparison.firstHalfProfit, 2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Segundo Semestre (Jul-Dic)</h4>
              <div className="flex justify-between p-2 bg-background/50 rounded text-sm">
                <span className="text-foreground/70">Millas</span>
                <span className="font-semibold">{data.comparison.secondHalfMiles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-background/50 rounded text-sm">
                <span className="text-foreground/70">Ganancia</span>
                <span className="font-semibold text-green-600">${fixed(data.comparison.secondHalfProfit, 2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <h4 className="font-semibold text-sm mb-2">Variación</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 bg-background/50 rounded text-sm">
                <span className="text-foreground/70">Millas</span>
                <VariationBadge 
                  value={data.comparison.secondHalfMiles - data.comparison.firstHalfMiles}
                  percent={data.comparison.milesVariationPercent}
                />
              </div>
              <div className="flex items-center justify-between p-2 bg-background/50 rounded text-sm">
                <span className="text-foreground/70">Ganancia</span>
                <VariationBadge 
                  value={data.comparison.secondHalfProfit - data.comparison.firstHalfProfit}
                  percent={data.comparison.profitVariationPercent}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Component
// Annual Comparison Types
interface AnnualComparisonData {
  year: number;
  months: MonthlyMetrics[];
  annualTotals: {
    totalMiles: number;
    totalProfit: number;
    totalQuotations: number;
    averageMilesPerMonth: number;
    averageProfitPerMonth: number;
    averageProfitPerMile: number;
  };
  quarterlyBreakdown: {
    q1: { miles: number; profit: number; quotations: number };
    q2: { miles: number; profit: number; quotations: number };
    q3: { miles: number; profit: number; quotations: number };
    q4: { miles: number; profit: number; quotations: number };
  };
  bestMonth: {
    month: string;
    miles: number;
    profit: number;
  };
  worstMonth: {
    month: string;
    miles: number;
    profit: number;
  };
  comparison: {
    firstHalfMiles: number;
    secondHalfMiles: number;
    firstHalfProfit: number;
    secondHalfProfit: number;
    milesVariationPercent: number;
    profitVariationPercent: number;
    trend: "improving" | "declining" | "stable";
  };
}

export function ComparisonAnalytics({ 
  historicalData, 
  quarterlyData,
  annualData
}: { 
  historicalData: HistoricalComparisonData;
  quarterlyData: QuarterlyComparisonData;
  annualData?: AnnualComparisonData;
}) {
  const [activeTab, setActiveTab] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const trend = activeTab === "monthly" ? historicalData.comparison.trend : activeTab === "quarterly" ? quarterlyData.comparison.trend : annualData?.comparison.trend || "stable";

  return (
    <div className="space-y-4">
      {/* Header with Tabs and Trend */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Análisis de Tendencias</CardTitle>
              <CardDescription>
                {activeTab === "monthly" ? "Comparación mes anterior vs mes actual" : "Últimos 3 meses"}
              </CardDescription>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getTrendColor(trend)}`}>
              {getTrendLabel(trend)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("monthly")}
              className="text-xs"
            >
              Mensual
            </Button>
            <Button
              variant={activeTab === "quarterly" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("quarterly")}
              className="text-xs"
            >
              Trimestral
            </Button>
            {annualData && (
              <Button
                variant={activeTab === "annual" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("annual")}
                className="text-xs"
              >
                Anual
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeTab === "monthly" ? (
        <MonthlyView data={historicalData} />
      ) : activeTab === "quarterly" ? (
        <QuarterlyView data={quarterlyData} />
      ) : (
        annualData && <AnnualView data={annualData} />
      )}
    </div>
  );
}
