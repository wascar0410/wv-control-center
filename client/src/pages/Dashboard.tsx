"use client";

import React, { useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AppCard, AppCardHeader, AppCardContent } from "@/components/ui/AppCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  DollarSign,
  Truck,
  ArrowRight,
  FileText,
  Plus,
  TrendingUp,
  TrendingDown,
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

  const { data: kpis, isLoading: kpisLoading, error: kpisError } =
    trpc.dashboard.kpis.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });

  const { data: loads, isLoading: loadsLoading, error: loadsError } =
    trpc.dashboard.recentLoads.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });

  const recentLoads = useMemo(() => (loads?.slice(0, 5) ?? []), [loads]);

  const safeKpis = {
    activeLoads: kpis?.activeLoads ?? 0,
    monthIncome: kpis?.monthIncome ?? 0,
    monthExpenses: kpis?.monthExpenses ?? 0,
    monthProfit: kpis?.monthProfit ?? 0,
  };

  return (
    <div className="space-y-6">
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
          <Button onClick={() => setLocation("/loads")} className="gap-2">
            <Package className="h-4 w-4" />
            Nueva Carga
          </Button>

          <Button
            onClick={() => setLocation("/loads")}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Asignar Carga
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Cargas Activas"
          value={kpisLoading ? "..." : String(safeKpis.activeLoads)}
          icon={Truck}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          subtitle="En tránsito ahora"
        />

        <KPICard
          title="Ingresos del Mes"
          value={kpisLoading ? "..." : formatCurrency(safeKpis.monthIncome)}
          icon={TrendingUp}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
          subtitle="Cargas pagadas"
        />

        <KPICard
          title="Gastos del Mes"
          value={kpisLoading ? "..." : formatCurrency(safeKpis.monthExpenses)}
          icon={TrendingDown}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
          subtitle="Total de egresos"
        />

        <KPICard
          title="Utilidad Neta"
          value={kpisLoading ? "..." : formatCurrency(safeKpis.monthProfit)}
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          subtitle="Este mes"
          highlight
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
              ) : loadsError ? (
                <div className="p-6 text-center text-sm text-red-400">
                  No se pudieron cargar las cargas recientes.
                </div>
              ) : recentLoads.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No hay cargas registradas
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentLoads.map((load: any) => {
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
                          <span
                            className={`rounded border px-2 py-0 text-xs ${statusCfg.className}`}
                          >
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

        <div className="space-y-4">
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
                onClick={() => setLocation("/loads")}
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
            <CardHeader>
              <CardTitle>Estado actual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {kpisError
                  ? "KPIs con error"
                  : loadsError
                  ? "Cargas con error"
                  : "Dashboard parcial activo"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
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
