"use client";
import React, { useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package, DollarSign, Truck, ArrowRight, FileText,
  Plus, TrendingUp, TrendingDown, Gauge, Route,
  BarChart3, AlertTriangle, CheckCircle2, Fuel,
  PiggyBank, Wrench, Megaphone, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Design: Dark industrial dashboard — slate/zinc palette, amber accents ───

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: "Disponible", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  in_transit: { label: "En Tránsito", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  delivered: { label: "Entregada", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  invoiced: { label: "Facturada", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  paid: { label: "Pagada", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function fmt$(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(isFinite(n) ? n : 0);
}
function fmtMile(value: number) {
  return `$${isFinite(value) && value > 0 ? value.toFixed(2) : "—"}/mi`;
}
function fmtPct(value: number) {
  return `${isFinite(value) ? value : 0}%`;
}

// ─── 50/20/20/10 Distribution Calculator ─────────────────────────────────────
function DistributionPanel({ income }: { income: number }) {
  const categories = [
    {
      pct: 50, label: "Operación", color: "bg-blue-500", textColor: "text-blue-400",
      icon: Fuel, desc: "Gas, seguro, mantenimiento, peajes",
      items: ["Combustible", "Seguros", "Mantenimiento", "Peajes", "Load boards"],
    },
    {
      pct: 20, label: "Owner Pay", color: "bg-emerald-500", textColor: "text-emerald-400",
      icon: DollarSign, desc: "Tu salario como operador",
      items: ["Salario del dueño"],
    },
    {
      pct: 20, label: "Reserva", color: "bg-amber-500", textColor: "text-amber-400",
      icon: PiggyBank, desc: "Emergencias y semanas malas",
      items: ["Fondo de emergencia", "Reparaciones grandes", "Semanas lentas"],
    },
    {
      pct: 10, label: "Crecimiento", color: "bg-purple-500", textColor: "text-purple-400",
      icon: Zap, desc: "Marketing, herramientas, expansión",
      items: ["Marketing", "Tecnología", "Segunda van (futuro)"],
    },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Distribución Financiera
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">50/20/20/10</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Basado en ingresos del mes: <span className="font-semibold text-foreground">{fmt$(income)}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((cat) => {
          const amount = income * (cat.pct / 100);
          const CatIcon = cat.icon;
          return (
            <div key={cat.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CatIcon className={`h-3.5 w-3.5 ${cat.textColor}`} />
                  <span className="text-sm font-medium">{cat.label}</span>
                  <span className="text-xs text-muted-foreground">({cat.pct}%)</span>
                </div>
                <span className={`text-sm font-bold ${cat.textColor}`}>{fmt$(amount)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${cat.color} transition-all duration-700`}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{cat.desc}</p>
            </div>
          );
        })}
        {income === 0 && (
          <p className="text-xs text-center text-muted-foreground py-2">
            Registra ingresos en Finanzas para ver la distribución
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Pro KPI Row ─────────────────────────────────────────────────────────────
function ProKPIRow({ kpis, loading }: { kpis: any; loading: boolean }) {
  const profitPerMile = kpis?.profitPerMile ?? 0;
  const costPerMile = kpis?.costPerMile ?? 0;
  const revenuePerMile = kpis?.revenuePerMile ?? 0;
  const utilization = kpis?.utilizationPercent ?? 0;
  const avgRevenue = kpis?.avgRevenuePerLoad ?? 0;
  const monthLoads = kpis?.monthLoadsCompleted ?? 0;

  // Profit/mile health indicator
  const profitHealth = profitPerMile >= 0.90 ? "excellent"
    : profitPerMile >= 0.70 ? "good"
    : profitPerMile > 0 ? "warn"
    : "neutral";

  const healthConfig = {
    excellent: { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2, label: "Excelente" },
    good: { color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2, label: "Bueno" },
    warn: { color: "text-amber-400", bg: "bg-amber-500/10", icon: AlertTriangle, label: "Bajo" },
    neutral: { color: "text-muted-foreground", bg: "bg-muted/30", icon: Gauge, label: "Sin datos" },
  };
  const health = healthConfig[profitHealth];
  const HealthIcon = health.icon;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {/* Profit/Mile — the critical KPI */}
      <div className={`col-span-2 sm:col-span-1 rounded-xl border border-border p-3 ${health.bg}`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Profit/Milla</p>
          <HealthIcon className={`h-3.5 w-3.5 ${health.color}`} />
        </div>
        <p className={`text-xl font-bold ${health.color}`}>
          {loading ? "..." : fmtMile(profitPerMile)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Meta: ≥ $0.70/mi
        </p>
        {!loading && profitPerMile > 0 && profitPerMile < 0.70 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span>Por debajo del mínimo</span>
          </div>
        )}
      </div>

      {/* Revenue/Mile */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Revenue/Milla</p>
        <p className="text-xl font-bold text-foreground">{loading ? "..." : fmtMile(revenuePerMile)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Ingreso bruto</p>
      </div>

      {/* Cost/Mile */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Costo/Milla</p>
        <p className="text-xl font-bold text-red-400">{loading ? "..." : fmtMile(costPerMile)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Gas + peajes</p>
      </div>

      {/* Fleet Utilization */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Utilización</p>
        <p className={`text-xl font-bold ${utilization >= 70 ? "text-emerald-400" : utilization >= 40 ? "text-amber-400" : "text-foreground"}`}>
          {loading ? "..." : fmtPct(utilization)}
        </p>
        <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${utilization >= 70 ? "bg-emerald-500" : utilization >= 40 ? "bg-amber-500" : "bg-muted-foreground"}`}
            style={{ width: `${utilization}%` }}
          />
        </div>
      </div>

      {/* Avg Revenue/Load */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Avg/Carga</p>
        <p className="text-xl font-bold text-foreground">{loading ? "..." : fmt$(avgRevenue)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Ingreso promedio</p>
      </div>

      {/* Loads Completed */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Cargas/Mes</p>
        <p className="text-xl font-bold text-foreground">{loading ? "..." : monthLoads}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Completadas este mes</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: kpis, isLoading: kpisLoading } =
    trpc.dashboard.kpis.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });

  const { data: loads, isLoading: loadsLoading, error: loadsError } =
    trpc.dashboard.recentLoads.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });

  const recentLoads = useMemo(() => (loads?.slice(0, 5) ?? []), [loads]);

  const safeKpis = {
    activeLoads: kpis?.activeLoads ?? 0,
    monthIncome: kpis?.monthIncome ?? 0,
    monthExpenses: kpis?.monthExpenses ?? 0,
    monthProfit: kpis?.monthProfit ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenido, {user?.name?.split(" ")[0] ?? "Usuario"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panel de control — WV Transport & Logistics, LLC
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button onClick={() => setLocation("/quotation")} className="gap-2">
            <Package className="h-4 w-4" />
            Nueva Carga
          </Button>
          <Button onClick={() => setLocation("/loads")} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Asignar Carga
          </Button>
        </div>
      </div>

      {/* Primary KPIs — 4 cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Cargas Activas" value={kpisLoading ? "..." : String(safeKpis.activeLoads)}
          icon={Truck} iconColor="text-amber-400" iconBg="bg-amber-500/10" subtitle="En tránsito ahora" />
        <KPICard title="Ingresos del Mes" value={kpisLoading ? "..." : fmt$(safeKpis.monthIncome)}
          icon={TrendingUp} iconColor="text-green-400" iconBg="bg-green-500/10" subtitle="Cargas pagadas" />
        <KPICard title="Gastos del Mes" value={kpisLoading ? "..." : fmt$(safeKpis.monthExpenses)}
          icon={TrendingDown} iconColor="text-red-400" iconBg="bg-red-500/10" subtitle="Total de egresos" />
        <KPICard title="Utilidad Neta" value={kpisLoading ? "..." : fmt$(safeKpis.monthProfit)}
          icon={DollarSign} iconColor="text-primary" iconBg="bg-primary/10" subtitle="Este mes" highlight />
      </div>

      {/* Pro KPI Row — Profit/Mile, Cost/Mile, Utilization, Avg/Load */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">KPIs Operacionales</h2>
        </div>
        <ProKPIRow kpis={kpis} loading={kpisLoading} />
      </div>

      {/* Main content: Recent loads + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent loads */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Cargas Recientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/loads")}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadsLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Cargando...</div>
              ) : loadsError ? (
                <div className="p-6 text-center text-sm text-red-400">No se pudieron cargar las cargas recientes.</div>
              ) : recentLoads.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No hay cargas registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentLoads.map((load: any) => {
                    const statusCfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;
                    return (
                      <div key={load.id} onClick={() => setLocation(`/loads/${load.id}`)}
                        className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent/30 cursor-pointer group">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{load.clientName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {load.pickupAddress} → {load.deliveryAddress}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-foreground">{fmt$(load.price)}</span>
                          <span className={`rounded border px-2 py-0 text-xs ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Quick actions + Distribution */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickAction icon={Package} label="Nueva Carga" desc="Cotizar y crear carga" onClick={() => setLocation("/quotation")} />
              <QuickAction icon={Route} label="Evaluar Carga" desc="¿Aceptar o negociar?" onClick={() => setLocation("/load-evaluator")} />
              <QuickAction icon={DollarSign} label="Registrar Gasto" desc="Combustible, mantenimiento..." onClick={() => setLocation("/finance")} />
              <QuickAction icon={FileText} label="Ver Finanzas" desc="Flujo de caja mensual" onClick={() => setLocation("/finance")} />
              <QuickAction icon={BarChart3} label="Rendimiento Choferes" desc="Score y eficiencia" onClick={() => setLocation("/driver-performance")} />
            </CardContent>
          </Card>

          {/* 50/20/20/10 Distribution */}
          <DistributionPanel income={safeKpis.monthIncome} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KPICard({ title, value, icon: Icon, iconColor, iconBg, subtitle, highlight }: {
  title: string; value: string; icon: LucideIcon; iconColor: string;
  iconBg: string; subtitle: string; highlight?: boolean;
}) {
  return (
    <Card className={`border-border bg-card ${highlight ? "ring-1 ring-primary/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className={`mt-1 truncate text-xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick }: {
  icon: LucideIcon; label: string; desc: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent"
      type="button">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
