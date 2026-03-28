import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, DollarSign, TrendingUp, TrendingDown, Truck, ArrowRight,
  Clock, CheckCircle2, AlertCircle, FileText, Plus
} from "lucide-react";
import { useState } from "react";

"use client";
import { useLocation } from "wouter";
import { AssignLoadModal } from "@/components/AssignLoadModal";
import { DriverLocationMap } from "@/components/DriverLocationMap";
import { AlertsWidget } from "@/components/AlertsWidget";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: "Disponible", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  in_transit: { label: "En Tránsito", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  delivered: { label: "Entregada", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  invoiced: { label: "Facturada", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  paid: { label: "Pagada", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: loads, isLoading: loadsLoading } = trpc.dashboard.recentLoads.useQuery();
  const utils = trpc.useUtils();

  const recentLoads = loads?.slice(0, 5) ?? [];

  const handleAssignSuccess = () => {
    utils.dashboard.recentLoads.invalidate();
    utils.assignment.availableLoads.invalidate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenido, {user?.name?.split(" ")[0] ?? "Usuario"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Panel de control — WV Transport, LLC
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button onClick={() => setLocation("/loads")} className="gap-2">
            <Package className="w-4 h-4" />
            Nueva Carga
          </Button>
          <Button onClick={() => setAssignModalOpen(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Asignar Carga
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          value={kpisLoading ? "..." : formatCurrency(kpis?.monthIncome ?? 0)}
          icon={TrendingUp}
          iconColor="text-green-400"
          iconBg="bg-green-500/10"
          subtitle="Cargas pagadas"
        />
        <KPICard
          title="Gastos del Mes"
          value={kpisLoading ? "..." : formatCurrency(kpis?.monthExpenses ?? 0)}
          icon={TrendingDown}
          iconColor="text-red-400"
          iconBg="bg-red-500/10"
          subtitle="Total de egresos"
        />
        <KPICard
          title="Utilidad Neta"
          value={kpisLoading ? "..." : formatCurrency(kpis?.monthProfit ?? 0)}
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          subtitle="Este mes"
          highlight
        />
      </div>

      {/* Driver Location Tracking */}
      {user?.role === "admin" && (
        <DriverLocationMap />
      )}

      {/* Recent Loads + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Loads */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Cargas Recientes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/loads")} className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                Ver todas <ArrowRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadsLoading ? (
                <div className="p-6 text-center text-muted-foreground text-sm">Cargando...</div>
              ) : recentLoads.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay cargas registradas</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/loads")}>
                    Registrar primera carga
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentLoads.map((load) => {
                    const statusCfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;
                    return (
                      <div key={load.id} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/30 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{load.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {load.pickupAddress} → {load.deliveryAddress}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(parseFloat(String(load.price)))}
                          </span>
                          <Badge variant="outline" className={`text-xs px-2 py-0 border ${statusCfg.className}`}>
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

        {/* Quick Actions */}
        <div className="space-y-4">
          {/* Alerts Widget */}
          <AlertsWidget />

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickAction icon={Package} label="Nueva Carga" desc="Registrar envío" onClick={() => setLocation("/loads")} />
              <QuickAction icon={Plus} label="Asignar Carga" desc="Asignar al chofer" onClick={() => setAssignModalOpen(true)} />
              <QuickAction icon={DollarSign} label="Registrar Gasto" desc="Combustible, mantenimiento..." onClick={() => setLocation("/finance")} />
              <QuickAction icon={FileText} label="Ver Finanzas" desc="Flujo de caja mensual" onClick={() => setLocation("/finance")} />
            </CardContent>
          </Card>

          {/* Status Summary */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Estado de Cargas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadsLoading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : (
                <>
                  {Object.entries(
                    (loads ?? []).reduce((acc, l) => {
                      acc[l.status] = (acc[l.status] ?? 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => {
                    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.available;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs border ${cfg.className}`}>{cfg.label}</Badge>
                        <span className="text-sm font-semibold text-foreground">{count}</span>
                      </div>
                    );
                  })}
                  {(loads ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin cargas aún</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Load Modal */}
      <AssignLoadModal open={assignModalOpen} onOpenChange={setAssignModalOpen} onSuccess={handleAssignSuccess} />
    </div>
  );
}

function KPICard({
  title, value, icon: Icon, iconColor, iconBg, subtitle, highlight
}: {
  title: string; value: string; icon: any; iconColor: string; iconBg: string;
  subtitle: string; highlight?: boolean;
}) {
  return (
    <Card className={`bg-card border-border ${highlight ? "ring-1 ring-primary/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">{title}</p>
            <p className={`text-xl font-bold mt-1 truncate ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
          </div>
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors w-full text-left group"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
