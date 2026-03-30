"use client";

import React, { useState, useMemo, Suspense, lazy, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { usePrefetchDashboard, usePrefetchCommonFlows } from "@/hooks/usePrefetchRoute";
import { usePrefetchOnHover } from "@/lib/prefetch";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { AssignLoadModal } from "@/components/AssignLoadModal";
import { AlertsWidget } from "@/components/AlertsWidget";
import { LazyLoad, ChartSkeleton, MapSkeleton, WidgetSkeleton } from "@/components/LazyLoad";

// Lazy load heavy components
const ProjectionsCard = lazy(() =>
  import("@/components/ProjectionsCard").then((m) => ({
    default: m.ProjectionsCard,
  }))
);

const TrendCharts = lazy(() =>
  import("@/components/TrendCharts").then((m) => ({
    default: m.TrendCharts,
  }))
);

const ComparisonAnalytics = lazy(() =>
  import("@/components/ComparisonAnalytics").then((m) => ({
    default: m.ComparisonAnalytics,
  }))
);

const DriverLocationMap = lazy(() =>
  import("@/components/DriverLocationMap").then((m) => ({
    default: m.DriverLocationMap,
  }))
);

const ChatWidget = lazy(() =>
  import("@/components/ChatWidget").then((m) => ({
    default: m.ChatWidget,
  }))
);

import {
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Truck,
  ArrowRight,
  FileText,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: {
    label: "Disponible",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  in_transit: {
    label: "En Tránsito",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  delivered: {
    label: "Entregada",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  invoiced: {
    label: "Facturada",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  paid: {
    label: "Pagada",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

function formatCurrency(value: number | string | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const isDriver = user?.role === "driver";
  const isAdmin = user?.role === "admin";

  // Prefetch dashboard chunks on idle
  usePrefetchDashboard();

  // Prefetch common navigation flows
  usePrefetchCommonFlows("/dashboard");

  // Create refs for prefetch on hover
  const newLoadBtnRef = useRef<HTMLButtonElement>(null);
  const assignLoadBtnRef = useRef<HTMLButtonElement>(null);
  const expenseBtnRef = useRef<HTMLButtonElement>(null);
  const financeBtnRef = useRef<HTMLButtonElement>(null);

  // Prefetch chunks on button hover
  usePrefetchOnHover(newLoadBtnRef as React.RefObject<HTMLElement>, ["/assets/LoadDetailsModal-*.js"]);
  usePrefetchOnHover(assignLoadBtnRef as React.RefObject<HTMLElement>, ["/assets/AssignLoadModal-*.js"]);
  usePrefetchOnHover(expenseBtnRef as React.RefObject<HTMLElement>, ["/assets/ExpenseForm-*.js"]);
  usePrefetchOnHover(financeBtnRef as React.RefObject<HTMLElement>, ["/assets/FinanceCharts-*.js"])

  React.useEffect(() => {
    if (isDriver) {
      setLocation("/driver");
    }
  }, [isDriver, setLocation]);

  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery(
    undefined,
    { enabled: !isDriver }
  );

  const { data: loads, isLoading: loadsLoading } =
    trpc.dashboard.recentLoads.useQuery(undefined, {
      enabled: !isDriver,
    });

  const { data: projections, isLoading: projectionsLoading } =
    trpc.dashboard.monthlyProjections.useQuery(undefined, {
      enabled: !isDriver,
    });

  const { data: historicalComparison, isLoading: historicalLoading } =
    trpc.dashboard.historicalComparison.useQuery(undefined, {
      enabled: !isDriver,
    });

  const { data: quarterlyComparison, isLoading: quarterlyLoading } =
    trpc.dashboard.quarterlyComparison.useQuery(undefined, {
      enabled: !isDriver,
    });

  const { data: annualComparison, isLoading: annualLoading } =
    trpc.dashboard.annualComparison.useQuery(undefined, {
      enabled: !isDriver,
    });

  const recentLoads = useMemo(() => (loads?.slice(0, 5) ?? []), [loads]);

  const statusSummary = useMemo(() => {
    return (loads ?? []).reduce((acc, load) => {
      acc[load.status] = (acc[load.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [loads]);

  const handleAssignSuccess = async () => {
    await Promise.all([
      utils.dashboard.recentLoads.invalidate(),
      utils.assignment.availableLoads.invalidate(),
    ]);
  };

  if (isDriver) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenido, {user?.name?.split(" ")[0] ?? "Usuario"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panel de control — WV Transport, LLC
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          <Button ref={newLoadBtnRef} onClick={() => setLocation("/loads")} className="gap-2">
            <Package className="h-4 w-4" />
            Nueva Carga
          </Button>

          <Button
            ref={assignLoadBtnRef}
            onClick={() => setAssignModalOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Asignar Carga
          </Button>
        </div>
      </div>

      {/* KPI Cards - Always visible, not lazy loaded */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Cargas Activas"
          value={kpisLoading ? "..." : String(kpis?.activeLoads ?? 0)}
          icon={Truck}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          subtitle="En tránsito ahora"
        />

        <KPICard
          title="Ingresos del Mes"
          value={kpisLoading ? "..." : formatCurrency(kpis?.monthIncome)}
          icon={TrendingUp}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
          subtitle="Cargas pagadas"
        />

        <KPICard
          title="Gastos del Mes"
          value={kpisLoading ? "..." : formatCurrency(kpis?.monthExpenses)}
          icon={TrendingDown}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
          subtitle="Total de egresos"
        />

        <KPICard
          title="Utilidad Neta"
          value={kpisLoading ? "..." : formatCurrency(kpis?.monthProfit)}
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          subtitle="Este mes"
          highlight
        />
      </div>

      {/* Monthly Projections - Lazy loaded */}
      {projections && !projectionsLoading && (
        <>
          <LazyLoad fallback={<ChartSkeleton height="h-96" />}>
            <ProjectionsCard data={projections} />
          </LazyLoad>
          <LazyLoad fallback={<ChartSkeleton height="h-full" />}>
            <TrendCharts data={projections} />
          </LazyLoad>
        </>
      )}

      {/* Comparison Analytics - Lazy loaded */}
      {historicalComparison &&
        quarterlyComparison &&
        !historicalLoading &&
        !quarterlyLoading && (
          <LazyLoad fallback={<ChartSkeleton height="h-96" />}>
            <ComparisonAnalytics
              historicalData={historicalComparison}
              quarterlyData={quarterlyComparison}
              annualData={annualComparison}
            />
          </LazyLoad>
        )}

      {/* Driver Location Tracking - Lazy loaded */}
      {isAdmin && (
        <LazyLoad fallback={<MapSkeleton height="h-96" />}>
          <DriverLocationMap />
        </LazyLoad>
      )}

      {/* Chat Widget - Lazy loaded */}
      {isAdmin && (
        <LazyLoad fallback={<WidgetSkeleton height="h-64" />}>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Chat con Choferes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ChatWidget />
            </CardContent>
          </Card>
        </LazyLoad>
      )}

      {/* Recent Loads + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Loads */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">
                Cargas Recientes
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/loads")}
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loadsLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </div>
              ) : recentLoads.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No hay cargas registradas
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setLocation("/loads")}
                  >
                    Registrar primera carga
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentLoads.map((load) => {
                    const statusCfg =
                      STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;

                    return (
                      <div
                        key={load.id}
                        className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent/30"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {load.clientName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {load.pickupAddress} → {load.deliveryAddress}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(load.price)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`border px-2 py-0 text-xs ${statusCfg.className}`}
                          >
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AlertsWidget />

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickAction
                icon={Package}
                label="Nueva Carga"
                desc="Registrar envío"
                onClick={() => setLocation("/loads")}
              />
              <QuickAction
                icon={Plus}
                label="Asignar Carga"
                desc="Asignar al chofer"
                onClick={() => setAssignModalOpen(true)}
              />
              <QuickAction
                icon={DollarSign}
                label="Registrar Gasto"
                desc="Combustible, mantenimiento..."
                onClick={() => setLocation("/finance")}
              />
              <QuickAction
                icon={FileText}
                label="Ver Finanzas"
                desc="Flujo de caja mensual"
                onClick={() => setLocation("/finance")}
              />
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Estado de Cargas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadsLoading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : Object.keys(statusSummary).length > 0 ? (
                Object.entries(statusSummary).map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.available;

                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <Badge
                        variant="outline"
                        className={`border text-xs ${cfg.className}`}
                      >
                        {cfg.label}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">
                        {count}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Sin cargas aún</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AssignLoadModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
  highlight,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`border-border bg-card ${highlight ? "ring-1 ring-primary/30" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p
              className={`mt-1 truncate text-xl font-bold ${
                highlight ? "text-primary" : "text-foreground"
              }`}
            >
              {value}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>

          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent"
      type="button"
    >
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
