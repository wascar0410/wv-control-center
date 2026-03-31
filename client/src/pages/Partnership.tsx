"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calculator } from "lucide-react";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function Partnership() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  // 🔥 queries seguras
  const { data: partners, isLoading: partnersLoading, error: partnersError } =
    trpc.partnership.list.useQuery(undefined, { retry: false });

  const { data: distribution, isLoading: distLoading, error: distError } =
    trpc.partnership.distribution.useQuery(
      { year, month },
      { retry: false }
    );

  const safePartners = partners ?? [];
  const safeDistribution = distribution ?? {
    grossIncome: 0,
    totalExpenses: 0,
    payroll: 0,
    netAfterPayroll: 0,
    partners: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Socios y Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Vista segura (acciones desactivadas)
        </p>
      </div>

      {(partnersError || distError) && (
        <div className="text-sm text-red-400">
          Datos no disponibles (auth pendiente)
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ingreso</p>
            <p className="text-green-400 font-bold">
              {distLoading ? "..." : formatCurrency(safeDistribution.grossIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Utilidad</p>
            <p className="text-primary font-bold">
              {distLoading ? "..." : formatCurrency(safeDistribution.netAfterPayroll)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4" />
            <p className="font-medium">
              Distribución — {MONTHS[month - 1]} {year}
            </p>
          </div>

          {distLoading ? (
            <p className="text-muted-foreground">Calculando...</p>
          ) : safeDistribution.partners.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-muted-foreground">No hay socios</p>
            </div>
          ) : (
            <div className="space-y-3">
              {safeDistribution.partners.map((p: any) => (
                <div key={p.id} className="flex justify-between border p-3 rounded-lg">
                  <div>
                    <p className="font-medium">{p.partnerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.participationPercent}%
                    </p>
                  </div>
                  <p className="font-bold text-primary">
                    {formatCurrency(p.distribution)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista socios */}
      <Card>
        <CardContent className="p-4">
          <p className="font-medium mb-3">Socios</p>

          {partnersLoading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : safePartners.length === 0 ? (
            <p className="text-muted-foreground">No hay socios registrados</p>
          ) : (
            <div className="space-y-2">
              {safePartners.map((p: any) => (
                <div key={p.id} className="border p-3 rounded-lg">
                  <p className="font-medium">{p.partnerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.partnerRole} · {p.participationPercent}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
