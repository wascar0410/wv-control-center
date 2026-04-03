"use client";

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Search, ChevronRight, Truck, CheckCircle2, Receipt, CreditCard } from "lucide-react";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  available: { label: "Disponible", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  in_transit: { label: "En Tránsito", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  delivered: { label: "Entregada", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  invoiced: { label: "Facturada", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  paid: { label: "Pagada", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

export default function Loads() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  // 🔥 query protegida pero con fallback seguro
  const { data: loads, isLoading, error } = trpc.loads.list.useQuery(undefined, {
    retry: false,
  });

  const safeLoads = loads ?? [];

  const filteredLoads = safeLoads.filter((load: any) => {
    return (
      search === "" ||
      load?.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      load?.pickupAddress?.toLowerCase().includes(search.toLowerCase()) ||
      load?.deliveryAddress?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Cargas</h1>
        <p className="text-muted-foreground mt-1">
          Vista simplificada (modo seguro)
        </p>
      </div>

      <div>
        <Label className="text-xs mb-2 block">Buscar carga</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cliente, origen, destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="p-4">
        {isLoading ? (
          <p className="text-center text-muted-foreground">
            Cargando cargas...
          </p>
        ) : error ? (
          <p className="text-center text-red-400">
            No se pudieron cargar las cargas (auth pendiente)
          </p>
        ) : filteredLoads.length === 0 ? (
          <div className="text-center">
            <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              No hay cargas disponibles
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLoads.map((load: any) => {
              const cfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;
              return (
                <div
                  key={load.id}
                  onClick={() => setLocation(`/loads/${load.id}`)}
                  className="p-3 border rounded-lg flex items-center gap-3 cursor-pointer hover:bg-accent/40 transition-colors group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{load.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {load.pickupAddress} → {load.deliveryAddress}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatCurrency(load.price)}</p>
                    <span className={`inline-block rounded border px-2 py-0 text-xs font-medium ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
