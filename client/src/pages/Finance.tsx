"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function Finance() {
  const [year] = useState(new Date().getFullYear());
  const [month] = useState(new Date().getMonth() + 1);

  // 🔥 queries con fallback seguro
  const { data: summary, isLoading, error } =
    trpc.finance.summary.useQuery(
      { year, month },
      { retry: false }
    );

  const safeSummary = {
    income: summary?.income ?? 0,
    expenses: summary?.expenses ?? 0,
    netProfit: summary?.netProfit ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de Finanzas</h1>
        <p className="text-muted-foreground text-sm">
          Vista simplificada (modo seguro)
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-400">
          Error cargando datos financieros (auth pendiente)
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-xl font-bold text-green-400">
              {isLoading ? "..." : formatCurrency(safeSummary.income)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-xl font-bold text-red-400">
              {isLoading ? "..." : formatCurrency(safeSummary.expenses)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Utilidad</p>
            <p className="text-xl font-bold text-primary">
              {isLoading ? "..." : formatCurrency(safeSummary.netProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
          Finanzas en modo seguro (gráficas desactivadas temporalmente)
        </CardContent>
      </Card>
    </div>
  );
}
