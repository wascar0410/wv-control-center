import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ProjectionsData {
  completedMiles: number;
  quotedMiles: number;
  totalMilesActual: number;
  projectedTotalMiles: number;
  milesPercentage: number;
  willReachGoal: boolean;
  
  completedProfit: number;
  quotedProfit: number;
  totalProfitActual: number;
  projectedTotalProfit: number;
  
  dailyAverageMiles: number;
  dailyAverageProfit: number;
  daysPassed: number;
  daysRemaining: number;
  daysInMonth: number;
}

export function TrendCharts({ data }: { data: ProjectionsData }) {
  // Prepare data for miles projection chart
  const milesProjectionData = [
    {
      name: "Completadas",
      value: data.completedMiles,
      fill: "#10b981",
    },
    {
      name: "En Cotización",
      value: data.quotedMiles,
      fill: "#3b82f6",
    },
    {
      name: "Proyectado (Falta)",
      value: Math.max(0, data.projectedTotalMiles - data.totalMilesActual),
      fill: "#f3f4f6",
    },
  ];

  // Prepare data for profit breakdown
  const profitBreakdownData = [
    {
      name: "Completada",
      value: Math.abs(data.completedProfit),
      fill: "#10b981",
    },
    {
      name: "En Cotización",
      value: Math.abs(data.quotedProfit),
      fill: "#3b82f6",
    },
  ];

  // Prepare data for daily trend (simulated)
  const dailyTrendData = [];
  const avgMilesPerDay = data.dailyAverageMiles;
  const avgProfitPerDay = data.dailyAverageProfit;
  
  for (let i = 1; i <= data.daysPassed; i++) {
    dailyTrendData.push({
      day: `Día ${i}`,
      miles: Math.round(avgMilesPerDay),
      profit: Math.round(avgProfitPerDay),
    });
  }

  // Prepare data for monthly projection timeline
  const projectionTimelineData = [
    {
      name: "Hoy",
      miles: data.totalMilesActual,
      goal: 4000,
    },
    {
      name: "Fin de Mes",
      miles: data.projectedTotalMiles,
      goal: 4000,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Miles Composition Pie Chart */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Composición de Millas</CardTitle>
          <CardDescription>Desglose de millas completadas y proyectadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={milesProjectionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {milesProjectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit Composition Pie Chart */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Composición de Ganancia</CardTitle>
          <CardDescription>Desglose de ganancia completada y en cotización</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={profitBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${typeof value === 'number' ? value.toFixed(0) : value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {profitBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => (typeof value === 'number' ? `$${value.toFixed(2)}` : value)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Miles vs Goal Projection */}
      <Card className="border border-border bg-card lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Proyección de Millas vs Meta</CardTitle>
          <CardDescription>Comparación de millas actuales vs meta de 4,000 millas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectionTimelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
              <Legend />
              <Bar dataKey="miles" fill="#3b82f6" name="Millas Proyectadas" />
              <Bar dataKey="goal" fill="#10b981" name="Meta (4,000 mi)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Metrics Trend */}
      {dailyTrendData.length > 0 && (
        <Card className="border border-border bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tendencia Diaria (Promedio)</CardTitle>
            <CardDescription>Millas y ganancia promedio por día</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis yAxisId="left" stroke="#9ca3af" />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                  formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : value)}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="miles" 
                  stroke="#3b82f6" 
                  name="Millas/día"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  name="Ganancia/día ($)"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
