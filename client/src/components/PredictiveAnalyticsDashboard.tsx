import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Mock data for predictive analytics
const projectionData = [
  { month: "Ene", actual: 28659, projected: 28659, trend: "stable" },
  { month: "Feb", actual: 32100, projected: 32100, trend: "up" },
  { month: "Mar", actual: 29500, projected: 29500, trend: "stable" },
  { month: "Abr", actual: null, projected: 31200, trend: "up" },
  { month: "May", actual: null, projected: 33500, trend: "up" },
  { month: "Jun", actual: null, projected: 35200, trend: "up" },
];

const profitabilityData = [
  { load: "Carga 1", margin: 15.2, status: "good" },
  { load: "Carga 2", margin: 8.5, status: "warning" },
  { load: "Carga 3", margin: 22.1, status: "good" },
  { load: "Carga 4", margin: 5.2, status: "critical" },
  { load: "Carga 5", margin: 18.9, status: "good" },
];

export function PredictiveAnalyticsDashboard() {
  const avgMargin = (profitabilityData.reduce((sum, item) => sum + item.margin, 0) / profitabilityData.length).toFixed(1);
  const criticalCount = profitabilityData.filter(item => item.status === "critical").length;
  const projectedGrowth = ((35200 - 28659) / 28659 * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{avgMargin}%</div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Rentabilidad general</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cargas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-500">{criticalCount}</div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Bajo margen de ganancia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Crecimiento Proyectado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-500">+{projectedGrowth}%</div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">En 6 meses</p>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Proyección de Ingresos</CardTitle>
          <CardDescription>Ingresos actuales vs proyectados para los próximos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value?.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" name="Actual" strokeWidth={2} />
              <Line type="monotone" dataKey="projected" stroke="#10b981" name="Proyectado" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profitability by Load */}
      <Card>
        <CardHeader>
          <CardTitle>Rentabilidad por Carga</CardTitle>
          <CardDescription>Margen de ganancia de cargas recientes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitabilityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="load" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="margin" fill="#8b5cf6" name="Margen %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Alertas de Rentabilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profitabilityData.map((item) => (
            <div key={item.load} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
              <span className="text-sm font-medium">{item.load}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.margin}%</span>
                <Badge variant={item.status === "critical" ? "destructive" : item.status === "warning" ? "secondary" : "default"}>
                  {item.status === "critical" ? "Crítico" : item.status === "warning" ? "Advertencia" : "Bueno"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
