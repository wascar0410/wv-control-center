/**
 * DriverWallet.tsx
 * Design: Professional financial dashboard — dark slate base, emerald accents for earnings,
 * amber for warnings, red for blocked payments. Clean tabular data with status badges.
 * Role: Driver sees their own wallet. Owner/Admin sees all drivers with selector.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Truck,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(n) ? n : 0
  );

const fleetBadge: Record<string, { label: string; color: string }> = {
  internal: { label: "Interno", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  leased: { label: "Arrendado", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  external: { label: "Externo", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
};

function toNumber(value: any, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? fallback));
  return Number.isFinite(n) ? n : fallback;
}

export default function DriverWallet() {
  const { user } = useAuth();
  const isPrivileged = user?.role === "owner" || user?.role === "admin";
  const [selectedDriverId, setSelectedDriverId] = useState<number | undefined>(undefined);
  const [expandedLoad, setExpandedLoad] = useState<number | null>(null);

  const { data: drivers } = trpc.admin.getDrivers.useQuery(undefined, {
    enabled: isPrivileged,
  });

  const targetId = isPrivileged ? selectedDriverId ?? drivers?.[0]?.id : user?.id;

  const { data: wallet, isLoading } = trpc.admin.getDriverWallet.useQuery(
    { driverId: targetId },
    {
      enabled: !!targetId,
      retry: 1,
    }
  );

  const safeWallet = useMemo(
    () =>
      wallet ?? {
        driver: {
          name: "—",
          fleetType: "internal",
          commissionPercent: 0,
        },
        summary: {
          totalGross: 0,
          totalCommission: 0,
          totalTolls: 0,
          totalFuel: 0,
          totalNet: 0,
          totalLoads: 0,
          readyCount: 0,
          blockedCount: 0,
        },
        settlements: [],
      },
    [wallet]
  );

  const fleetInfo = fleetBadge[safeWallet.driver?.fleetType ?? "internal"] ?? fleetBadge.internal;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="tracking-tight text-3xl font-bold text-white">
              Billetera del Conductor
            </h1>
            <p className="mt-1 text-slate-400">Liquidación y estado de pagos por entrega</p>
          </div>

          {isPrivileged && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Ver billetera de:</span>
              <Select
                value={selectedDriverId ? String(selectedDriverId) : String(drivers?.[0]?.id ?? "all")}
                onValueChange={(v) =>
                  setSelectedDriverId(v === "all" ? undefined : Number(v))
                }
              >
                <SelectTrigger className="w-52 border-slate-700 bg-slate-800 text-slate-100">
                  <SelectValue placeholder="Seleccionar chofer" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  {drivers?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)} className="text-slate-300">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Driver Info Banner */}
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <Truck className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-white">
                  {safeWallet.driver?.name || "—"}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${fleetInfo.color}`}
                >
                  {fleetInfo.label}
                </span>
              </div>

              <p className="text-sm text-slate-400">
                Comisión WV:{" "}
                <span className="font-semibold text-amber-400">
                  {toNumber(safeWallet.driver?.commissionPercent)}%
                </span>
                {" · "}
                Chofer recibe:{" "}
                <span className="font-semibold text-emerald-400">
                  {100 - toNumber(safeWallet.driver?.commissionPercent)}%
                </span>
              </p>
            </div>

            {toNumber(safeWallet.summary?.blockedCount) > 0 && (
              <div className="ml-auto flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">
                  {toNumber(safeWallet.summary?.blockedCount)} pago
                  {toNumber(safeWallet.summary?.blockedCount) > 1 ? "s" : ""} bloqueado
                  {toNumber(safeWallet.summary?.blockedCount) > 1 ? "s" : ""} por BOL faltante
                </span>
              </div>
            )}
          </div>

          {/* Summary KPI Cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="border-slate-700 bg-slate-800/60">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400">Bruto Total</span>
                  <DollarSign className="h-4 w-4 text-slate-500" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {fmt(toNumber(safeWallet.summary?.totalGross))}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {toNumber(safeWallet.summary?.totalLoads)} entregas
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700 bg-slate-800/60">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400">Comisión WV</span>
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  -{fmt(toNumber(safeWallet.summary?.totalCommission))}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Peajes: -{fmt(toNumber(safeWallet.summary?.totalTolls))} · Combustible: -
                  {fmt(toNumber(safeWallet.summary?.totalFuel))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-500/10">
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-emerald-400">Neto a Pagar</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-300">
                  {fmt(toNumber(safeWallet.summary?.totalNet))}
                </div>
                <div className="mt-1 text-xs text-emerald-600">
                  {toNumber(safeWallet.summary?.readyCount)} listos para pago
                </div>
              </CardContent>
            </Card>

            <Card
              className={
                toNumber(safeWallet.summary?.blockedCount) > 0
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-slate-700 bg-slate-800/60"
              }
            >
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={
                      toNumber(safeWallet.summary?.blockedCount) > 0
                        ? "text-xs uppercase tracking-wider text-red-400"
                        : "text-xs uppercase tracking-wider text-slate-400"
                    }
                  >
                    Bloqueados
                  </span>
                  <Lock
                    className={`h-4 w-4 ${
                      toNumber(safeWallet.summary?.blockedCount) > 0
                        ? "text-red-400"
                        : "text-slate-500"
                    }`}
                  />
                </div>
                <div
                  className={`text-2xl font-bold ${
                    toNumber(safeWallet.summary?.blockedCount) > 0
                      ? "text-red-300"
                      : "text-slate-300"
                  }`}
                >
                  {toNumber(safeWallet.summary?.blockedCount)}
                </div>
                <div className="mt-1 text-xs text-slate-500">Sin BOL subido</div>
              </CardContent>
            </Card>
          </div>

          {/* Settlement Table */}
          <Card className="border-slate-700 bg-slate-800/60">
            <CardHeader className="border-b border-slate-700 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <FileText className="h-5 w-5 text-emerald-400" />
                Detalle de Liquidaciones
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              {safeWallet.settlements.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Truck className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p>No hay entregas completadas aún</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {safeWallet.settlements.map((s: any) => (
                    <div key={s.loadId ?? `${s.clientName}-${Math.random()}`} className="p-4 transition-colors hover:bg-slate-700/20">
                      <div
                        className="flex cursor-pointer items-center justify-between"
                        onClick={() =>
                          setExpandedLoad(expandedLoad === s.loadId ? null : s.loadId)
                        }
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                              s.paymentBlocked ? "bg-red-500/20" : "bg-emerald-500/20"
                            }`}
                          >
                            {s.paymentBlocked ? (
                              <Lock className="h-4 w-4 text-red-400" />
                            ) : (
                              <Unlock className="h-4 w-4 text-emerald-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {s.clientName}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  s.status === "paid"
                                    ? "border-emerald-500/50 text-emerald-400"
                                    : s.status === "delivered"
                                    ? "border-blue-500/50 text-blue-400"
                                    : "border-slate-500/50 text-slate-400"
                                }`}
                              >
                                {s.status === "paid"
                                  ? "Pagado"
                                  : s.status === "delivered"
                                  ? "Entregado"
                                  : s.status === "invoiced"
                                  ? "Facturado"
                                  : s.status}
                              </Badge>

                              {s.paymentBlocked && (
                                <Badge
                                  variant="outline"
                                  className="border-red-500/50 text-xs text-red-400"
                                >
                                  BOL Faltante
                                </Badge>
                              )}
                            </div>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {s.pickupAddress} → {s.deliveryAddress}
                            </p>
                          </div>
                        </div>

                        <div className="ml-4 flex flex-shrink-0 items-center gap-6">
                          <div className="hidden text-right sm:block">
                            <div className="text-xs text-slate-500">Bruto</div>
                            <div className="text-sm font-medium text-white">
                              {fmt(toNumber(s.grossAmount))}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-slate-500">Neto</div>
                            <div
                              className={`text-sm font-bold ${
                                s.paymentBlocked ? "text-red-400" : "text-emerald-400"
                              }`}
                            >
                              {fmt(toNumber(s.netPayable))}
                            </div>
                          </div>

                          {expandedLoad === s.loadId ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {expandedLoad === s.loadId && (
                        <div className="ml-11 mt-4 rounded-lg border border-slate-700/50 bg-slate-900/60 p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                              <div className="mb-1 text-xs text-slate-500">Precio Bruto</div>
                              <div className="font-medium text-white">
                                {fmt(toNumber(s.grossAmount))}
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 text-xs text-slate-500">
                                Comisión WV ({toNumber(s.commissionPercent)}%)
                              </div>
                              <div className="font-medium text-amber-400">
                                -{fmt(toNumber(s.commissionAmount))}
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 text-xs text-slate-500">Peajes</div>
                              <div className="font-medium text-slate-300">
                                -{fmt(toNumber(s.tollDeduction))}
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 text-xs text-slate-500">Combustible</div>
                              <div className="font-medium text-slate-300">
                                -{fmt(toNumber(s.fuelDeduction))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-700/50 pt-3">
                            <div>
                              <span className="text-sm text-slate-400">
                                Neto a pagar al chofer:{" "}
                              </span>
                              <span
                                className={`text-lg font-bold ${
                                  s.paymentBlocked ? "text-red-400" : "text-emerald-400"
                                }`}
                              >
                                {fmt(toNumber(s.netPayable))}
                              </span>
                            </div>

                            {s.paymentBlocked && (
                              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                {s.blockReason}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
