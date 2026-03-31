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

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Estado actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El panel está estable. Los KPIs reales volverán cuando restauremos la autenticación del backend.
          </p>
        </CardContent>
      </Card>
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
