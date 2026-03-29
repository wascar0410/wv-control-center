import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ContactStatsChart } from "@/components/ContactStatsChart";
import { ContactTrendsChart } from "@/components/ContactTrendsChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, BarChart3, TrendingUp } from "lucide-react";

export function AdminDashboard() {
  const { user } = useAuth();
  const [trendDays, setTrendDays] = useState("30");
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  // Check authorization
  if (!user || (user.role !== "admin" && user.role !== "owner")) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No tienes permiso para acceder a esta página
        </AlertDescription>
      </Alert>
    );
  }

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } =
    trpc.contact.getStatistics.useQuery({});

  // Fetch trends
  const { data: trends, isLoading: trendsLoading } =
    trpc.contact.getTrends.useQuery({
      days: parseInt(trendDays),
    });

  const isLoading = statsLoading || trendsLoading;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Dashboard de Análisis
        </h1>
        <p className="text-gray-600 mt-2">
          Visualiza estadísticas y tendencias de solicitudes de contacto
        </p>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Solicitudes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">
                Nuevas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {stats.byStatus.new}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600">
                Respondidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.byStatus.responded}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">
                Tasa de Respuesta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {stats.responseRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>
              Proporción de solicitudes por estado actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats && !statsLoading ? (
              <ContactStatsChart data={stats} />
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500">
                Cargando gráfico...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tendencias Temporales</CardTitle>
                <CardDescription>
                  Evolución de solicitudes en el tiempo
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={trendDays} onValueChange={setTrendDays}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 días</SelectItem>
                    <SelectItem value="30">Últimos 30 días</SelectItem>
                    <SelectItem value="90">Últimos 90 días</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={chartType} onValueChange={(v) => setChartType(v as "line" | "bar")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Línea</SelectItem>
                    <SelectItem value="bar">Barras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trends && !trendsLoading ? (
              <ContactTrendsChart data={trends} chartType={chartType} />
            ) : (
              <div className="h-96 flex items-center justify-center text-gray-500">
                Cargando gráfico...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Estado de Solicitudes
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>
                    <span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>
                    Nuevas: {stats.byStatus.new}
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-2"></span>
                    Leídas: {stats.byStatus.read}
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
                    Respondidas: {stats.byStatus.responded}
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 bg-gray-500 rounded mr-2"></span>
                    Archivadas: {stats.byStatus.archived}
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Métricas Clave
                </h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>
                    Total de solicitudes: <span className="font-semibold">{stats.total}</span>
                  </li>
                  <li>
                    Tasa de respuesta:{" "}
                    <span className="font-semibold">{stats.responseRate}%</span>
                  </li>
                  <li>
                    Pendientes de respuesta:{" "}
                    <span className="font-semibold">
                      {stats.byStatus.new + stats.byStatus.read}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
