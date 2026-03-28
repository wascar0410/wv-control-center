import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

export function HistoricalComparisonCharts({ data }: { data: HistoricalComparisonData }) {
  const currentMonth = new Date();
  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
  
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const currentMonthName = monthNames[currentMonth.getMonth()];
  const previousMonthName = monthNames[previousMonth.getMonth()];

  // Data for miles and quotations comparison
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

  // Data for profit comparison
  const profitData = [
    {
      name: previousMonthName,
      ganancia: data.previousMonth.profit,
      "ganancia/milla": data.previousMonth.averageProfitPerMile * 100, // Scale for visibility
    },
    {
      name: currentMonthName,
      ganancia: data.currentMonth.profit,
      "ganancia/milla": data.currentMonth.averageProfitPerMile * 100, // Scale for visibility
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Miles vs Quotations Comparison */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Millas y Cotizaciones</CardTitle>
          <CardDescription>Comparación mes anterior vs mes actual</CardDescription>
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

      {/* Profit Comparison */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ganancia Total</CardTitle>
          <CardDescription>Comparación mes anterior vs mes actual</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? `$${value.toFixed(2)}` : value)}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
              <Legend />
              <Bar dataKey="ganancia" fill="#8b5cf6" name="Ganancia Total ($)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Variation Trends */}
      <Card className="border border-border bg-card lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tendencia de Variaciones</CardTitle>
          <CardDescription>Cambio porcentual en métricas clave</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={[
                {
                  metric: "Millas",
                  variacion: data.comparison.milesVariationPercent,
                },
                {
                  metric: "Ganancia",
                  variacion: data.comparison.profitVariationPercent,
                },
                {
                  metric: "Cotizaciones",
                  variacion: data.comparison.quotationsVariationPercent,
                },
                {
                  metric: "Ganancia/Milla",
                  variacion: data.comparison.profitPerMileVariationPercent,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="metric" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" label={{ value: "% Variación", angle: -90, position: "insideLeft" }} />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)}%` : value)}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="variacion"
                stroke="#f59e0b"
                strokeWidth={2}
                name="% Variación"
                dot={{ fill: "#f59e0b", r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Efficiency Comparison */}
      <Card className="border border-border bg-card lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Análisis de Eficiencia</CardTitle>
          <CardDescription>Ganancia por milla y rentabilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profit per Mile */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Ganancia por Milla</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background/50 rounded p-3">
                  <div className="text-foreground/60 text-xs mb-1">{previousMonthName}</div>
                  <div className="text-lg font-semibold text-blue-600">
                    ${data.previousMonth.averageProfitPerMile.toFixed(2)}
                  </div>
                </div>
                <div className="bg-background/50 rounded p-3">
                  <div className="text-foreground/60 text-xs mb-1">{currentMonthName}</div>
                  <div className="text-lg font-semibold text-blue-600">
                    ${data.currentMonth.averageProfitPerMile.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className={`p-2 rounded text-sm font-semibold text-center ${
                data.comparison.profitPerMileVariation >= 0
                  ? "bg-green-500/10 text-green-700"
                  : "bg-red-500/10 text-red-700"
              }`}>
                {data.comparison.profitPerMileVariation >= 0 ? "+" : ""}{data.comparison.profitPerMileVariation.toFixed(2)} ({data.comparison.profitPerMileVariationPercent.toFixed(1)}%)
              </div>
            </div>

            {/* Efficiency Metrics */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Métricas de Eficiencia</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                  <span className="text-foreground/70">Carga por Cotización</span>
                  <span className="font-semibold">
                    {data.previousMonth.quotationsCount > 0 
                      ? (data.previousMonth.miles / data.previousMonth.quotationsCount).toFixed(0)
                      : 0
                    } → {data.currentMonth.quotationsCount > 0 
                      ? (data.currentMonth.miles / data.currentMonth.quotationsCount).toFixed(0)
                      : 0
                    } mi
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                  <span className="text-foreground/70">Ganancia Promedio</span>
                  <span className="font-semibold">
                    ${data.previousMonth.quotationsCount > 0 
                      ? (data.previousMonth.profit / data.previousMonth.quotationsCount).toFixed(0)
                      : 0
                    } → ${data.currentMonth.quotationsCount > 0 
                      ? (data.currentMonth.profit / data.currentMonth.quotationsCount).toFixed(0)
                      : 0
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
