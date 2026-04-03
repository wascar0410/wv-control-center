"use client";

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Package,
  Search,
  ChevronRight,
  Truck,
  CheckCircle2,
  Receipt,
  CreditCard,
  Plus,
} from "lucide-react";

function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(n) ? n : 0
  );
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}> = {
  available: { label: "Disponible", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Package },
  in_transit: { label: "En Tránsito", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Truck },
  delivered: { label: "Entregada", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: CheckCircle2 },
  invoiced: { label: "Facturada", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", icon: Receipt },
  paid: { label: "Pagada", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CreditCard },
};

const STATUS_TABS = [
  { value: "all", label: "Todas" },
  { value: "available", label: "Disponibles" },
  { value: "in_transit", label: "En Tránsito" },
  { value: "delivered", label: "Entregadas" },
  { value: "invoiced", label: "Facturadas" },
  { value: "paid", label: "Pagadas" },
];

export default function Loads() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [, setLocation] = useLocation();

  const { data: loads, isLoading, error } = trpc.loads.list.useQuery(undefined, {
    retry: false,
  });

  const safeLoads: any[] = Array.isArray(loads) ? loads : [];

  // Count per status for badges
  const countByStatus = safeLoads.reduce((acc: Record<string, number>, load: any) => {
    acc[load.status] = (acc[load.status] ?? 0) + 1;
    return acc;
  }, {});

  const filteredLoads = safeLoads.filter((load: any) => {
    const matchesTab = activeTab === "all" || load.status === activeTab;
    const matchesSearch =
      search === "" ||
      String(load.clientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(load.pickupAddress ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(load.deliveryAddress ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Cargas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {safeLoads.length} cargas en total · Selecciona una para ver el detalle
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setLocation("/quotation")}>
          <Plus className="h-4 w-4" /> Nueva Carga
        </Button>
      </div>

      {/* Summary Cards */}
      {safeLoads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const count = countByStatus[status] ?? 0;
            const Icon = cfg.icon;
            return (
              <button
                key={status}
                onClick={() => setActiveTab(activeTab === status ? "all" : status)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
                  activeTab === status
                    ? `${cfg.bg} ${cfg.border}`
                    : "bg-card border-border hover:bg-accent/30"
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeTab === status ? cfg.bg : "bg-muted/50"}`}>
                  <Icon className={`h-3.5 w-3.5 ${activeTab === status ? cfg.color : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${activeTab === status ? cfg.color : "text-foreground"}`}>
                    {count}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">{cfg.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === "all" ? safeLoads.length : (countByStatus[tab.value] ?? 0);
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                activeTab === tab.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, origen o destino..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Load List */}
      <Card className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando cargas...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No se pudieron cargar las cargas. Verifica tu sesión.
            </p>
          </div>
        ) : filteredLoads.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground mb-1">
              {search ? "Sin resultados" : `No hay cargas ${activeTab !== "all" ? `en estado "${STATUS_CONFIG[activeTab]?.label}"` : ""}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Intenta con otro término de búsqueda."
                : activeTab !== "all"
                ? "Prueba seleccionando otro filtro."
                : "Crea tu primera carga con el botón de arriba."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Mostrando {filteredLoads.length} de {safeLoads.length} cargas
            </p>
            {filteredLoads.map((load: any) => {
              const cfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;
              const Icon = cfg.icon;
              return (
                <div
                  key={load.id}
                  onClick={() => setLocation(`/loads/${load.id}`)}
                  className="p-3 border border-border rounded-xl flex items-center gap-3 cursor-pointer hover:bg-accent/40 hover:border-primary/30 transition-all group"
                >
                  {/* Status icon */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">{load.clientName}</p>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0 text-[10px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {load.pickupAddress} → {load.deliveryAddress}
                    </p>
                  </div>

                  {/* Price & arrow */}
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <p className="font-bold text-sm text-foreground">{formatCurrency(load.price)}</p>
                      <p className="text-[10px] text-muted-foreground">#{load.id}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
