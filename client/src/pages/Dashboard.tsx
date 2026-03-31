"use client";

import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

  const kpis = {
    activeLoads: 3,
    monthIncome: 12500,
    monthExpenses: 4200,
    monthProfit: 8300,
  };

  const recentLoads = [
    {
      id: "1",
      clientName: "Amazon Relay",
      pickupAddress: "Scranton, PA",
      deliveryAddress: "Newark, NJ",
      price: 850,
      status: "En Tránsito",
    },
    {
      id: "2",
      clientName: "JB Hunt",
      pickupAddress: "Allentown, PA",
      deliveryAddress: "Bronx, NY",
      price: 620,
      status: "Disponible",
    },
    {
      id: "3",
      clientName: "TQL",
      pickupAddress: "Harrisburg, PA",
      deliveryAddress: "Philadelphia, PA",
      price: 540,
      status: "Entregada",
    },
  ];

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          title="Cargas Activas"
          value={String(kpis.activeLoads)}
          icon={Truck}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          subtitle="En tránsito ahora"
        />

        <KPICard
          title="Ingresos del Mes"
          value={formatCurrency(kpis.monthIncome)}
          icon={TrendingUp}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
          subtitle="Cargas pagadas"
        />

        <KPICard
          title="Gastos del Mes"
          value={formatCurrency(kpis.monthExpenses)}
          icon={DollarSign}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
          subtitle="Total de egresos"
        />

        <KPICard
          title="Utilidad Neta"
          value={formatCurrency(kpis.monthProfit)}
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          subtitle="Este mes"
          highlight
        />
      </div>

      {/* Main content */}
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
              <div className="divide-y divide-border">
                {recentLoads.map((load) => (
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
                      <span className="rounded border border-border px-2 py-0 text-xs text-muted-foreground">
                        {load.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Modo</span>
                <span className="text-sm font-semibold text-foreground">
                  Temporal / Debug
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Usuario</span>
                <span className="text-sm font-semibold text-foreground">
                  {user?.role ?? "owner"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado</span>
                <span className="text-sm font-semibold text-green-400">
                  Activo
                </span>
              </div>
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
