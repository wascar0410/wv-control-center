import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { calculateRouteMiles } from "@/lib/route-utils";
import LiveMap from "@/components/LiveMap";
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
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Truck,
  Target,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MapPinned,
  Brain,
  Route,
  Activity,
  CheckCircle2,
  Clock3,
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
  totalPrice?: number | string | null;
  estimatedOperatingCost?: number | string | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  clientName?: string | null;
  loadedMiles?: number | string | null;
  miles?: number | string | null;
  distance?: number | string | null;
  estimatedMiles?: number | string | null;
  tripMiles?: number | string | null;
};

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getLoadMiles(load: any) {
  if (load.stops && load.stops.length > 1) {
    return calculateRouteMiles(load.stops);
  }

  return (
    Number(load.loadedMiles) ||
    Number(load.miles) ||
    Number(load.distance) ||
    0
  );
}

function currency(value: number) {
  const num = toNumber(value);
  return `$${num.toFixed(2)}`;
}

function percent(value: number) {
  const num = toNumber(value);
  return `${num.toFixed(1)}%`;
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  change,
  positiveColor = "#16A34A",
  negativeColor = "#DC2626",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  change?: number;
  positiveColor?: string;
  negativeColor?: string;
}) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#64748B]">{title}</p>
            <h3 className="mt-1 text-2xl font-bold text-[#0B1F3A]">{value}</h3>
            {subtitle ? <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p> : null}

            {typeof change === "number" && (
              <div
                className="mt-2 flex items-center text-xs font-medium"
                style={{ color: isPositive ? positiveColor : negativeColor }}
              >
                {isPositive ? (
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4" />
                )}
                {isPositive ? "+" : ""}
                {change.toFixed(1)}% vs período anterior
              </div>
            )}
          </div>

          <div className="rounded-xl bg-[#EEF5FF] p-3">
            <Icon className="h-5 w-5 text-[#1D4ED8]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
      (sum: number, load: SafeLoad) => sum + toNumber(load.totalPrice),
      0
    );

    const totalCost = completedLoads.reduce(
      (sum: number, load: SafeLoad) => sum + toNumber(load.estimatedOperatingCost),
      0
    );

    const totalMiles = completedLoads.reduce(
      (sum: number, load: SafeLoad) => sum + getLoadMiles(load),
      0
    );

    const totalProfit = totalIncome - totalCost;
    const averageMargin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;
    const profitPerMile = totalMiles > 0 ? totalProfit / totalMiles : 0;
    const revenuePerMile = totalMiles > 0 ? totalIncome / totalMiles : 0;
    const costPerMile = totalMiles > 0 ? totalCost / totalMiles : 0;

    const daysInRange =
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const safeDays = Math.max(daysInRange, 1);
    const loadsPerDay = completedLoads.length / safeDays;
    const incomePerDay = totalIncome / safeDays;

    const dailyData: Record<
      string,
      {
        date: string;
        income: number;
        profit: number;
        loads: number;
        margin: number;
        miles: number;
        profitPerMile: number;
      }
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
          miles: 0,
          profitPerMile: 0,
        };
      }

      const income = toNumber(load.totalPrice);
      const cost = toNumber(load.estimatedOperatingCost);
      const miles = getLoadMiles(load);

      dailyData[day].income += income;
      dailyData[day].profit += income - cost;
      dailyData[day].loads += 1;
      dailyData[day].miles += miles;
    });

    const trendData = Object.values(dailyData).map((day) => ({
      ...day,
      margin: day.income > 0 ? (day.profit / day.income) * 100 : 0,
      profitPerMile: day.miles > 0 ? day.profit / day.miles : 0,
    }));

    const statusBreakdown = [
      {
        name: "Disponible",
        value: safeLoads.filter((l: SafeLoad) => l.status === "available").length,
        color: "#1D4ED8",
      },
      {
        name: "En Tránsito",
        value: safeLoads.filter((l: SafeLoad) => l.status === "in_transit").length,
        color: "#123D7A",
      },
      {
        name: "Entregada",
        value: safeLoads.filter((l: SafeLoad) => l.status === "delivered").length,
        color: "#16A34A",
      },
      {
        name: "Facturada",
        value: safeLoads.filter((l: SafeLoad) => l.status === "invoiced").length,
        color: "#F59E0B",
      },
      {
        name: "Pagada",
        value: safeLoads.filter((l: SafeLoad) => l.status === "paid").length,
        color: "#0B1F3A",
      },
    ];

    const activeLoads = safeLoads.filter(
      (l) => l.status === "in_transit" || l.status === "delivered" || l.status === "invoiced"
    );

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalMiles: Math.round(totalMiles * 100) / 100,
      averageMargin: Math.round(averageMargin * 100) / 100,
      completedLoads: completedLoads.length,
      loadsPerDay: Math.round(loadsPerDay * 100) / 100,
      incomePerDay: Math.round(incomePerDay * 100) / 100,
      trendData,
      statusBreakdown,
      totalLoads: safeLoads.length,
      activeLoads,
      profitPerMile: Math.round(profitPerMile * 100) / 100,
      revenuePerMile: Math.round(revenuePerMile * 100) / 100,
      costPerMile: Math.round(costPerMile * 100) / 100,
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
      (sum: number, load: SafeLoad) => sum + toNumber(load.totalPrice),
      0
    );

    const previousCost = previousLoads.reduce(
      (sum: number, load: SafeLoad) => sum + toNumber(load.estimatedOperatingCost),
      0
    );

    const previousProfit = previousIncome - previousCost;

    return {
      income: previousIncome,
      profit: previousProfit,
      loads: previousLoads.length,
    };
  }, [safeLoads, dateRange]);

  const incomeChange =
    previousPeriodKpis.income > 0
      ? ((kpis.totalIncome - previousPeriodKpis.income) / previousPeriodKpis.income) * 100
      : 0;

  const profitChange =
    previousPeriodKpis.profit > 0
      ? ((kpis.totalProfit - previousPeriodKpis.profit) / previousPeriodKpis.profit) * 100
      : 0;

  const loadsChange =
    previousPeriodKpis.loads > 0
      ? ((kpis.completedLoads - previousPeriodKpis.loads) / previousPeriodKpis.loads) * 100
      : 0;

  const efficiency =
    kpis.totalLoads > 0 ? (kpis.completedLoads / kpis.totalLoads) * 100 : 0;

  const aiRecommendations = useMemo(() => {
    const recs: { title: string; body: string; tone: "success" | "warning" | "danger" | "info" }[] = [];

    if (kpis.averageMargin < 50) {
      recs.push({
        title: "Ajusta tarifas o costos operativos",
        body: `El margen promedio está en ${percent(
          kpis.averageMargin
        )}. Prioriza cargas con mejor rentabilidad y revisa costos por viaje.`,
        tone: "warning",
      });
    }

    if (kpis.profitPerMile < 1.5) {
      recs.push({
        title: "Profit por milla bajo",
        body: `El profit por milla actual es ${currency(
          kpis.profitPerMile
        )}. Enfócate en rutas con mejor precio por milla y menor costo operativo.`,
        tone: "danger",
      });
    }

    if (kpis.loadsPerDay < 1) {
      recs.push({
        title: "Incrementa volumen operativo",
        body: `El promedio actual es ${kpis.loadsPerDay.toFixed(
          1
        )} cargas por día. Incrementar volumen puede estabilizar ingresos.`,
        tone: "info",
      });
    }

    if (kpis.averageMargin >= 50 && kpis.profitPerMile >= 1.5) {
      recs.push({
        title: "Operación saludable",
        body: "El negocio mantiene margen sólido y buena rentabilidad por milla. Continúa con esta estrategia.",
        tone: "success",
      });
    }

    if (recs.length === 0) {
      recs.push({
        title: "Sin alertas críticas",
        body: "La operación se encuentra estable en el período seleccionado.",
        tone: "success",
      });
    }

    return recs;
  }, [kpis]);

  if (error) {
    console.error("ExecutiveDashboard error:", error);
  }

  return (
    <div className="min-h-screen bg-[#F8FBFF]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-[#0B1F3A]">
            Dashboard Ejecutivo
          </h1>
          <p className="text-[#64748B]">
            Métricas en tiempo real para operaciones, finanzas y rentabilidad
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
            <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[#0F172A]">Desde</label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0F172A]">Hasta</label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1"
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

          <div className="text-sm text-[#64748B]">
            Período: {format(dateRange.startDate, "dd MMM yyyy", { locale: esLocale })} -{" "}
            {format(dateRange.endDate, "dd MMM yyyy", { locale: esLocale })}
          </div>

          {isLoading && (
            <div className="text-sm text-[#64748B]">Cargando datos...</div>
          )}

          {!isLoading && safeLoads.length === 0 && (
            <div className="text-sm text-yellow-700">
              Datos no disponibles o sin cargas para analizar.
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">
              No se pudieron cargar datos completos. Modo seguro activo.
            </div>
          )}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KPICard
            title="Ingresos Totales"
            value={currency(kpis.totalIncome)}
            subtitle={`${currency(kpis.incomePerDay)} por día`}
            icon={DollarSign}
            change={incomeChange}
          />

          <KPICard
            title="Ganancia Total"
            value={currency(kpis.totalProfit)}
            subtitle={`Margen: ${percent(kpis.averageMargin)}`}
            icon={TrendingUp}
            change={profitChange}
            positiveColor="#1D4ED8"
            negativeColor="#F59E0B"
          />

          <KPICard
            title="Cargas Completadas"
            value={String(kpis.completedLoads)}
            subtitle={`${kpis.loadsPerDay.toFixed(1)} cargas/día`}
            icon={Truck}
            change={loadsChange}
            positiveColor="#123D7A"
            negativeColor="#DC2626"
          />

          <KPICard
            title="Profit por Milla"
            value={currency(kpis.profitPerMile)}
            subtitle={`Revenue/mi: ${currency(kpis.revenuePerMile)}`}
            icon={Route}
          />

          <KPICard
            title="Margen Promedio"
            value={percent(kpis.averageMargin)}
            subtitle={kpis.averageMargin >= 50 ? "Meta alcanzada" : "Meta 50%"}
            icon={Target}
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
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
                    <linearGradient id="colorIncomeWV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    formatter={(value: any) =>
                      `$${typeof value === "number" ? value.toFixed(2) : value}`
                    }
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#1D4ED8"
                    fillOpacity={1}
                    fill="url(#colorIncomeWV)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Mapa en Tiempo Real</CardTitle>
              <CardDescription>
                Vista operativa estilo control center
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-[#E5E7EB] bg-[#EEF5FF] p-4">
                <div className="mb-4 flex items-center gap-2 text-[#0B1F3A]">
                  <MapPinned className="h-5 w-5 text-[#1D4ED8]" />
                  <span className="font-semibold">Operación activa</span>
                </div>

                <div className="mb-4 rounded-xl border border-dashed border-[#123D7A]/30 bg-white p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF5FF]">
                    <MapPinned className="h-6 w-6 text-[#1D4ED8]" />
                  </div>
                  <p className="font-medium text-[#0B1F3A]">Mapa en vivo listo para conectar</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Esta tarjeta ya está preparada para integrarse con tracking real de choferes y cargas.
                  </p>
                </div>

                <div className="space-y-3">
                  {kpis.activeLoads.slice(0, 4).map((load, idx) => (
                    <div
                      key={load.id ?? idx}
                      className="flex items-start justify-between rounded-xl border border-[#E5E7EB] bg-white p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#0F172A]">
                          {load.clientName || `Carga #${load.id ?? idx + 1}`}
                        </p>
                        <p className="truncate text-xs text-[#64748B]">
                          {load.pickupAddress || "Origen pendiente"} →{" "}
                          {load.deliveryAddress || "Destino pendiente"}
                        </p>
                      </div>
                      <Badge variant="outline">{load.status || "N/A"}</Badge>
                    </div>
                  ))}

                  {kpis.activeLoads.length === 0 && (
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#64748B]">
                      No hay cargas activas para mostrar en el mapa.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Tendencia de Margen</CardTitle>
              <CardDescription>
                Margen de ganancia diario en el período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={kpis.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    formatter={(value: any) =>
                      `${typeof value === "number" ? value.toFixed(1) : value}%`
                    }
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="margin"
                    stroke="#123D7A"
                    strokeWidth={3}
                    name="Margen %"
                    dot={{ r: 4, fill: "#123D7A" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Profit por Milla</CardTitle>
              <CardDescription>
                Rentabilidad operativa por día
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpis.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    formatter={(value: any) =>
                      `$${typeof value === "number" ? value.toFixed(2) : value}/mi`
                    }
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="profitPerMile" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
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
                    outerRadius={85}
                    dataKey="value"
                  >
                    {kpis.statusBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
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
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-sm text-[#0F172A]">{status.name}</span>
                    </div>
                    <Badge variant="outline">{status.value}</Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-[#E5E7EB] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Total de Cargas</span>
                  <span className="font-semibold text-[#0B1F3A]">{kpis.totalLoads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Período Analizado</span>
                  <span className="font-semibold text-[#0B1F3A]">
                    {Math.ceil(
                      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1}{" "}
                    días
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Eficiencia</span>
                  <span className="font-semibold text-[#16A34A]">
                    {efficiency.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Costo por Milla</span>
                  <span className="font-semibold text-[#0B1F3A]">
                    {currency(kpis.costPerMile)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#1D4ED8]" />
              IA y Recomendaciones Inteligentes
            </CardTitle>
            <CardDescription>
              Sugerencias automáticas basadas en margen, volumen y rentabilidad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiRecommendations.map((rec, idx) => {
              const toneStyles =
                rec.tone === "success"
                  ? {
                      bg: "#ECFDF5",
                      border: "#BBF7D0",
                      title: "#166534",
                      text: "#166534",
                      icon: <CheckCircle2 className="h-4 w-4" />,
                    }
                  : rec.tone === "warning"
                  ? {
                      bg: "#FFF7ED",
                      border: "#FED7AA",
                      title: "#9A3412",
                      text: "#9A3412",
                      icon: <AlertCircle className="h-4 w-4" />,
                    }
                  : rec.tone === "danger"
                  ? {
                      bg: "#FEF2F2",
                      border: "#FECACA",
                      title: "#991B1B",
                      text: "#991B1B",
                      icon: <AlertCircle className="h-4 w-4" />,
                    }
                  : {
                      bg: "#EEF5FF",
                      border: "#BFDBFE",
                      title: "#1E3A8A",
                      text: "#1E3A8A",
                      icon: <Activity className="h-4 w-4" />,
                    };

              return (
                <div
                  key={idx}
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: toneStyles.bg,
                    borderColor: toneStyles.border,
                  }}
                >
                  <div className="flex items-center gap-2" style={{ color: toneStyles.title }}>
                    {toneStyles.icon}
                    <p className="text-sm font-semibold">{rec.title}</p>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: toneStyles.text }}>
                    {rec.body}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-[#1D4ED8]" />
              Alertas y Recomendaciones Operativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis.averageMargin < 50 && (
              <div className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-3">
                <p className="text-sm font-medium text-[#9A3412]">
                  ⚠ Margen por debajo de meta
                </p>
                <p className="mt-1 text-xs text-[#9A3412]">
                  El margen promedio es {kpis.averageMargin.toFixed(1)}%, por debajo de la meta del 50%.
                  Considera negociar tarifas más altas o reducir costos operativos.
                </p>
              </div>
            )}

            {kpis.loadsPerDay < 1 && (
              <div className="rounded-lg border border-[#BFDBFE] bg-[#EEF5FF] p-3">
                <p className="text-sm font-medium text-[#1E3A8A]">
                  📊 Volumen bajo
                </p>
                <p className="mt-1 text-xs text-[#1E3A8A]">
                  Promedio de {kpis.loadsPerDay.toFixed(1)} cargas/día.
                  Aumenta el volumen para mejorar ingresos.
                </p>
              </div>
            )}

            {kpis.averageMargin >= 50 && kpis.loadsPerDay >= 1 && (
              <div className="rounded-lg border border-[#BBF7D0] bg-[#ECFDF5] p-3">
                <p className="text-sm font-medium text-[#166534]">
                  ✓ Operaciones saludables
                </p>
                <p className="mt-1 text-xs text-[#166534]">
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
