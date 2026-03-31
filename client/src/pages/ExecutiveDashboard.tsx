import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Truck,
  Target,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { es as esLocale } from "date-fns/locale";

type DateRangeType = {
  startDate: Date;
  endDate: Date;
  label: string;
};

type SafeLoad = {
  id?: number;
  status?: string;
  updatedAt?: string | Date | null;
  totalPrice?: number;
  estimatedOperatingCost?: number;
};

export default function ExecutiveDashboard() {
  const today = new Date();

  const [dateRange, setDateRange] = useState<DateRangeType>({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    endDate: today,
    label: "Este mes",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState(
    dateRange.startDate.toISOString().split("T")[0]
  );
  const [customEnd, setCustomEnd] = useState(
    dateRange.endDate.toISOString().split("T")[0]
  );

  const {
    data: loads,
    isLoading,
    error,
  } = trpc.loads.list.useQuery(
    {},
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const safeLoads: SafeLoad[] = Array.isArray(loads) ? loads : [];

  const datePresets = [
    {
      label: "Hoy",
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      endDate: new Date(),
    },
    {
      label: "Esta semana",
      startDate: new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    },
    {
      label: "Este mes",
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: new Date(),
    },
    {
      label: "Este trimestre",
      startDate: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
      endDate: new Date(),
    },
    {
      label: "Este año",
      startDate: new Date(today.getFullYear(), 0, 1),
      endDate: new Date(),
    },
    {
      label: "Últimos 30 días",
      startDate: subDays(today, 30),
      endDate: new Date(),
    },
    {
      label: "Últimos 90 días",
      startDate: subDays(today, 90),
      endDate: new Date(),
    },
  ];

  const kpis = useMemo(() => {
    const startDate = dateRange.startDate;
    const endDate = dateRange.endDate;

    const completedLoads = safeLoads.filter((load: SafeLoad) => {
      if (load.status !== "paid" || !load.updatedAt) return false;
      const updatedAt = new Date(load.updatedAt);
      return updatedAt >= startDate && updatedAt <= endDate;
    });

    const totalIncome = completedLoads.reduce(
      (sum: number, load: SafeLoad) => sum + Number(load.totalPrice ?? 0),
      0
    );

    const totalCost = completedLoads.reduce(
      (sum: number, load: SafeLoad) => sum + Number(load.estimatedOperatingCost ?? 0),
      0
    );

    const totalProfit = totalIncome - totalCost;
    const averageMargin =
      totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;

    const daysInRange =
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const safeDays = Math.max(daysInRange, 1);
    const loadsPerDay = completedLoads.length / safeDays;
    const incomePerDay = totalIncome / safeDays;

    const dailyData: Record<
      string,
      { date: string; income: number; profit: number; loads: number; margin: number }
    > = {};

    completedLoads.forEach((load: SafeLoad) => {
      if (!load.updatedAt) return;
      const day = format(new Date(load.updatedAt), "MMM dd", { locale: esLocale });

      if (!dailyData[day]) {
        dailyData[day] = {
          date: day,
          income: 0,
          profit: 0,
          loads: 0,
          margin: 0,
        };
      }

      const income = Number(load.totalPrice ?? 0);
      const cost = Number(load.estimatedOperatingCost ?? 0);

      dailyData[day].income += income;
      dailyData[day].profit += income - cost;
      dailyData[day].loads += 1;
    });

    const trendData = Object.values(dailyData).map((day) => ({
      ...day,
      margin: day.income > 0 ? (day.profit / day.income) * 100 : 0,
    }));

    const statusBreakdown = [
      {
        name: "Disponible",
        value: safeLoads.filter((l: SafeLoad) => l.status === "available").length,
        color: "#3b82f6",
      },
      {
        name: "En Tránsito",
        value: safeLoads.filter((l: SafeLoad) => l.status === "in_transit").length,
        color: "#f59e0b",
      },
      {
        name: "Entregada",
        value: safeLoads.filter((l: SafeLoad) => l.status === "delivered").length,
        color: "#10b981",
      },
      {
        name: "Facturada",
        value: safeLoads.filter((l: SafeLoad) => l.status === "invoiced").length,
        color: "#8b5cf6",
      },
      {
        name: "Pagada",
        value: safeLoads.filter((l: SafeLoad) => l.status === "paid").length,
        color: "#06b6d4",
      },
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
      totalLoads: safeLoads.length,
    };
  }, [safeLoads, dateRange]);

  const previousPeriodKpis = useMemo(() => {
    const daysInRange =
      Math.ceil(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    const previousStart = new Date(
      dateRange.startDate.getTime() - daysInRange * 24 * 60 * 60 * 1000
    );
    const previousEnd = new Date(dateRange.startDate.getTime() - 1);

    const previousLoads = safeLoads.filter((load: SafeLoad) => {
      if (load.status !== "paid" || !load.updatedAt) return false;
      const updatedAt = new Date(load.updatedAt);
      return updatedAt >= previousStart && updatedAt <= previousEnd;
    });

    const previousIncome = previousLoads.reduce(
      (sum: number, load: SafeLoad) => sum + Number(load.totalPrice ?? 0),
      0
    );

    const previousProfit =
      previousIncome -
      previousLoads.reduce(
        (sum: number, load: SafeLoad) =>
          sum + Number(load.estimatedOperatingCost ?? 0),
        0
      );

    return {
      income: previousIncome,
      profit: previousProfit,
      loads: previousLoads.length,
    };
  }, [safeLoads, dateRange]);

  const incomeChange =
    previousPeriodKpis.income > 0
      ? ((kpis.totalIncome - previousPeriodKpis.income) / previousPeriodKpis.income) *
        100
      : 0;

  const profitChange =
    previousPeriodKpis.profit > 0
      ? ((kpis.totalProfit - previousPeriodKpis.profit) / previousPeriodKpis.profit) *
        100
      : 0;

  const loadsChange =
    previousPeriodKpis.loads > 0
      ? ((kpis.completedLoads - previousPeriodKpis.loads) / previousPeriodKpis.loads) *
        100
      : 0;

  const efficiency =
    kpis.totalLoads > 0 ? (kpis.completedLoads / kpis.totalLoads) * 100 : 0;

  if (error) {
    console.error("ExecutiveDashboard error:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Dashboard Ejecutivo
          </h1>
          <p className="text-muted-foreground">
            Métricas en tiempo real de la empresa
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            {datePresets.map((preset) => (
              <Button
                key={preset.label}
                variant={dateRange.label === preset.label ? "default" : "outline"}
                onClick={() => setDateRange({ ...preset, label: preset.label })}
                size="sm"
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={dateRange.label === "Personalizado" ? "default" : "outline"}
              onClick={() => setShowDatePicker(!showDatePicker)}
              size="sm"
            >
              Personalizado
            </Button>
          </div>

          {showDatePicker && (
            <div className="p-4 bg-card border border-border rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Desde</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Hasta</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setDateRange({
                      startDate: new Date(customStart),
                      endDate: new Date(customEnd),
                      label: "Personalizado",
                    });
                    setShowDatePicker(false);
                  }}
                  size="sm"
                >
                  Aplicar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDatePicker(false)}
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Período: {format(dateRange.startDate, "dd MMM yyyy", { locale: esLocale })} -{" "}
            {format(dateRange.endDate, "dd MMM yyyy", { locale: esLocale })}
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">
              Cargando datos...
            </div>
          )}

          {!isLoading && safeLoads.length === 0 && (
            <div className="text-sm text-yellow-500">
              Datos no disponibles o sin cargas para analizar.
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400">
              No se pudieron cargar datos completos. Modo seguro activo.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <div
                className={`flex items-center mt-2 ${
                  incomeChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {incomeChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs">
                  {incomeChange >= 0 ? "+" : ""}
                  {incomeChange.toFixed(1)}% vs período anterior
                </span>
              </div>
            </CardContent>
          </Card>

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
              <div
                className={`flex items-center mt-2 ${
                  profitChange >= 0 ? "text-blue-600" : "text-orange-600"
                }`}
              >
                {profitChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs">
                  {profitChange >= 0 ? "+" : ""}
                  {profitChange.toFixed(1)}% vs período anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cargas Completadas</CardTitle>
              <Truck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.completedLoads}</div>
              <p className="text-xs text-muted-foreground">
                {kpis.loadsPerDay.toFixed(1)} cargas/día promedio
              </p>
              <div
                className={`flex items-center mt-2 ${
                  loadsChange >= 0 ? "text-purple-600" : "text-red-600"
                }`}
              >
                {loadsChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs">
                  {loadsChange >= 0 ? "+" : ""}
                  {loadsChange.toFixed(1)}% vs período anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.averageMargin.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Meta: 50%</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Ingresos</CardTitle>
              <CardDescription>
                Ingresos diarios en el período seleccionado
              </CardDescription>
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
                  <Tooltip
                    formatter={(value: any) =>
                      `$${typeof value === "number" ? value.toFixed(2) : value}`
                    }
                  />
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

          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Margen</CardTitle>
              <CardDescription>
                Margen de ganancia diario en el período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={kpis.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) =>
                      `${typeof value === "number" ? value.toFixed(1) : value}%`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="margin"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Margen %"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                  <span className="font-semibold">
                    {Math.ceil(
                      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1}{" "}
                    días
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Eficiencia</span>
                  <span className="font-semibold text-green-600">
                    {efficiency.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                  El margen promedio es {kpis.averageMargin.toFixed(1)}%, por debajo de la meta del 50%.
                  Considera negociar tarifas más altas o reducir costos operativos.
                </p>
              </div>
            )}

            {kpis.loadsPerDay < 1 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  📊 Volumen bajo
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                  Promedio de {kpis.loadsPerDay.toFixed(1)} cargas/día.
                  Aumenta el volumen para mejorar ingresos.
                </p>
              </div>
            )}

            {kpis.averageMargin >= 50 && kpis.loadsPerDay >= 1 && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✓ Operaciones saludables
                </p>
                <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                  La empresa está operando con márgenes saludables y volumen consistente.
                  Continúa con la estrategia actual.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
