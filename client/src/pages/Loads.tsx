"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Search } from "lucide-react";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export default function Loads() {
  const [search, setSearch] = useState("");

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
            {filteredLoads.map((load: any) => (
              <div
                key={load.id}
                className="p-3 border rounded-lg flex justify-between"
              >
                <div>
                  <p className="font-medium">{load.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {load.pickupAddress} → {load.deliveryAddress}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(load.price)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {load.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
