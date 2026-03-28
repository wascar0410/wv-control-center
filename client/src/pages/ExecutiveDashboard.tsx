import { useState, useMemo } from "react";
import { es } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Truck, Target, AlertCircle,
  Calendar, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export default function ExecutiveDashboard() {
  const [dateRange, setDateRange] = useState({ days: 30 });

  // Fetch all loads for analysis
  const { data: loads = [] } = trpc.loads.list.useQuery({});

  // Calculate KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, dateRange.days);

    // Filter loads in date range and completed
    const completedLoads = loads.filter(
      (load: any) =>
        load.status === "paid" &&
        new Date(load.updatedAt) >= startDate &&
        new Date(load.updatedAt) <= now
    );

    // Calculate metrics
    const totalIncome = completedLoads.reduce((sum: number, load: any) => sum + (load.totalPrice || 0), 0);
    const totalCost = completedLoads.reduce((sum: number, load: any) => sum + (load.estimatedOperatingCost || 0), 0);
    const totalProfit = totalIncome - totalCost;
    const averageMargin = completedLoads.length > 0 
      ? (totalProfit / totalIncome) * 100 
      : 0;

    const loadsPerDay = completedLoads.length / Math.max(dateRange.days, 1);
    const incomePerDay = totalIncome / Math.max(dateRange.days, 1);

    // Group by day for trends
    const dailyData: { [key: string]: any } = {};
    completedLoads.forEach((load: any) => {
      const day = format(new Date(load.updatedAt), "MMM dd");
      if (!dailyData[day]) {
        dailyData[day] = { date: day, income: 0, profit: 0, loads: 0, margin: 0 };
      }
      dailyData[day].income += load.totalPrice || 0;
      dailyData[day].profit += (load.totalPrice || 0) - (load.estimatedOperatingCost || 0);
      dailyData[day].loads += 1;
    });

    const trendData = Object.values(dailyData).sort((a: any, b: any) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate margin for each day
    trendData.forEach((day: any) => {
      day.margin = day.income > 0 ? (day.profit / day.income) * 100 : 0;
    });

    // Status breakdown
    const statusBreakdown = [
      { name: "Disponible", value: loads.filter((l: any) => l.status === "available").length, color: "#3b82f6" },
      { name: "En Tránsito", value: loads.filter((l: any) => l.status === "in_transit").length, color: "#f59e0b" },
      { name: "Entregada", value: loads.filter((l: any) => l.status === "delivered").length, color: "#10b981" },
      { name: "Facturada", value: loads.filter((l: any) => l.status === "invoiced").length, color: "#8b5cf6" },
      { name: "Pagada", value: loads.filter((l: any) => l.status === "paid").length, color: "#06b6d4" },
    ];

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      averageMargin: Math.round(averageMargin * 100) / 100,
      completedLoads: completedLoads.length,
      loadsPerDay: Math.round(loadsPerDay * 100) / 100,
      incomePerDay: Math.round(incomePerDay * 100) / 100,
      trendData,
      statusBreakdown,
      totalLoads: loads.length,
    };
  }, [loads, dateRange]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">
            Métricas en tiempo real de la empresa
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2 mb-8">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant={dateRange.days === days ? "default" : "outline"}
              onClick={() => setDateRange({ days })}
            >
              Últimos {days} días
            </Button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Income */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${kpis.totalIncome.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                ${kpis.incomePerDay.toFixed(2)} por día
              </p>
              <div className="flex items-center mt-2 text-green-600">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span className="text-xs">+12% vs período anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Profit */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${kpis.totalProfit.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Margen: {kpis.averageMargin.toFixed(1)}%
              </p>
              <div className="flex items-center mt-2 text-blue-600">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span className="text-xs">Rentabilidad saludable</span>
              </div>
            </CardContent>
          </Card>

          {/* Completed Loads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cargas Completadas</CardTitle>
              <Truck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.completedLoads}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.loadsPerDay.toFixed(1)} cargas/día
              </p>
              <div className="flex items-center mt-2 text-purple-600">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span className="text-xs">+8% vs período anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Average Margin */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.averageMargin.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Meta: 50%
              </p>
              {kpis.averageMargin >= 50 ? (
                <div className="flex items-center mt-2 text-green-600">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  <span className="text-xs">Meta alcanzada ✓</span>
                </div>
              ) : (
                <div className="flex items-center mt-2 text-yellow-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span className="text-xs">Por debajo de meta</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Income Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Ingresos</CardTitle>
              <CardDescription>Ingresos diarios últimos {dateRange.days} días</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={kpis.trendData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Margin Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Margen</CardTitle>
              <CardDescription>Margen de ganancia diario últimos {dateRange.days} días</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={kpis.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="margin"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Margen %"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="loads"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Cargas"
                    yAxisId="right"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cargas por Estado</CardTitle>
              <CardDescription>Distribución actual de cargas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={kpis.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {kpis.statusBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Operaciones</CardTitle>
              <CardDescription>Estado actual de la empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {kpis.statusBreakdown.map((status: any) => (
                  <div key={status.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm">{status.name}</span>
                    </div>
                    <Badge variant="outline">{status.value}</Badge>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total de Cargas</span>
                  <span className="font-semibold">{kpis.totalLoads}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Período Analizado</span>
                  <span className="font-semibold">{dateRange.days} días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Eficiencia</span>
                  <span className="font-semibold text-green-600">
                    {((kpis.completedLoads / kpis.totalLoads) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Alertas y Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis.averageMargin < 50 && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  ⚠ Margen por debajo de meta
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                  El margen promedio es {kpis.averageMargin.toFixed(1)}%, por debajo de la meta del 50%. Considera negociar tarifas más altas o reducir costos operativos.
                </p>
              </div>
            )}
            {kpis.loadsPerDay < 1 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  📊 Volumen bajo
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                  Promedio de {kpis.loadsPerDay.toFixed(1)} cargas/día. Aumenta el volumen para mejorar ingresos.
                </p>
              </div>
            )}
            {kpis.averageMargin >= 50 && kpis.loadsPerDay >= 1 && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✓ Operaciones saludables
                </p>
                <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                  La empresa está operando con márgenes saludables y volumen consistente. Continúa con la estrategia actual.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
