/**
 * DriverWallet.tsx
 * Design: Professional financial dashboard — dark slate base, emerald accents for earnings,
 * amber for warnings, red for blocked payments. Clean tabular data with status badges.
 * Role: Driver sees their own wallet. Owner/Admin sees all drivers with selector.
 */
import { useState } from "react";
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
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const fleetBadge: Record<string, { label: string; color: string }> = {
  internal: { label: "Interno", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  leased: { label: "Arrendado", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  external: { label: "Externo", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
};

export default function DriverWallet() {
  const { user } = useAuth();
  const isPrivileged = user?.role === "owner" || user?.role === "admin";
  const [selectedDriverId, setSelectedDriverId] = useState<number | undefined>(undefined);
  const [expandedLoad, setExpandedLoad] = useState<number | null>(null);

  const { data: drivers } = trpc.admin.getDrivers.useQuery(undefined, {
    enabled: isPrivileged,
  });

  const targetId = isPrivileged ? selectedDriverId : user?.id;

  const { data: wallet, isLoading } = trpc.admin.getDriverWallet.useQuery(
    { driverId: targetId },
    { enabled: !!targetId || !isPrivileged }
  );

  const fleetInfo = fleetBadge[wallet?.driver?.fleetType ?? "internal"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Billetera del Conductor
            </h1>
            <p className="text-slate-400 mt-1">
              Liquidación y estado de pagos por entrega
            </p>
          </div>
          {isPrivileged && (
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm">Ver billetera de:</span>
              <Select
                value={selectedDriverId ? String(selectedDriverId) : "all"}
                onValueChange={(v) =>
                  setSelectedDriverId(v === "all" ? undefined : Number(v))
                }
              >
                <SelectTrigger className="w-52 bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Seleccionar chofer" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300">
                    Toda la flota
                  </SelectItem>
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      )}

      {wallet && (
        <>
          {/* Driver Info Banner */}
          <div className="mb-6 p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-white">{wallet.driver.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${fleetInfo.color}`}>
                  {fleetInfo.label}
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                Comisión WV: <span className="text-amber-400 font-semibold">{wallet.driver.commissionPercent}%</span>
                {" · "}
                Chofer recibe: <span className="text-emerald-400 font-semibold">{100 - wallet.driver.commissionPercent}%</span>
              </p>
            </div>
            {wallet.summary.blockedCount > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm font-medium">
                  {wallet.summary.blockedCount} pago{wallet.summary.blockedCount > 1 ? "s" : ""} bloqueado{wallet.summary.blockedCount > 1 ? "s" : ""} por BOL faltante
                </span>
              </div>
            )}
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800/60 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Bruto Total</span>
                  <DollarSign className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-2xl font-bold text-white">{fmt(wallet.summary.totalGross)}</div>
                <div className="text-xs text-slate-500 mt-1">{wallet.summary.totalLoads} entregas</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Comisión WV</span>
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-2xl font-bold text-amber-400">-{fmt(wallet.summary.totalCommission)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Peajes: -{fmt(wallet.summary.totalTolls)} · Combustible: -{fmt(wallet.summary.totalFuel)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 text-xs uppercase tracking-wider">Neto a Pagar</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-300">{fmt(wallet.summary.totalNet)}</div>
                <div className="text-xs text-emerald-600 mt-1">{wallet.summary.readyCount} listos para pago</div>
              </CardContent>
            </Card>

            <Card className={wallet.summary.blockedCount > 0 ? "bg-red-500/10 border-red-500/30" : "bg-slate-800/60 border-slate-700"}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className={wallet.summary.blockedCount > 0 ? "text-red-400 text-xs uppercase tracking-wider" : "text-slate-400 text-xs uppercase tracking-wider"}>
                    Bloqueados
                  </span>
                  <Lock className={`w-4 h-4 ${wallet.summary.blockedCount > 0 ? "text-red-400" : "text-slate-500"}`} />
                </div>
                <div className={`text-2xl font-bold ${wallet.summary.blockedCount > 0 ? "text-red-300" : "text-slate-300"}`}>
                  {wallet.summary.blockedCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">Sin BOL subido</div>
              </CardContent>
            </Card>
          </div>

          {/* Settlement Table */}
          <Card className="bg-slate-800/60 border-slate-700">
            <CardHeader className="border-b border-slate-700 pb-4">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Detalle de Liquidaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {wallet.settlements.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay entregas completadas aún</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {wallet.settlements.map((s) => (
                    <div key={s.loadId} className="p-4 hover:bg-slate-700/20 transition-colors">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedLoad(expandedLoad === s.loadId ? null : s.loadId)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            s.paymentBlocked ? "bg-red-500/20" : "bg-emerald-500/20"
                          }`}>
                            {s.paymentBlocked
                              ? <Lock className="w-4 h-4 text-red-400" />
                              : <Unlock className="w-4 h-4 text-emerald-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white text-sm">{s.clientName}</span>
                              <Badge variant="outline" className={`text-xs ${
                                s.status === "paid" ? "border-emerald-500/50 text-emerald-400" :
                                s.status === "delivered" ? "border-blue-500/50 text-blue-400" :
                                "border-slate-500/50 text-slate-400"
                              }`}>
                                {s.status === "paid" ? "Pagado" : s.status === "delivered" ? "Entregado" : s.status === "invoiced" ? "Facturado" : s.status}
                              </Badge>
                              {s.paymentBlocked && (
                                <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
                                  BOL Faltante
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {s.pickupAddress} → {s.deliveryAddress}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                          <div className="text-right hidden sm:block">
                            <div className="text-xs text-slate-500">Bruto</div>
                            <div className="text-sm text-white font-medium">{fmt(s.grossAmount)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Neto</div>
                            <div className={`text-sm font-bold ${s.paymentBlocked ? "text-red-400" : "text-emerald-400"}`}>
                              {fmt(s.netPayable)}
                            </div>
                          </div>
                          {expandedLoad === s.loadId
                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                            : <ChevronDown className="w-4 h-4 text-slate-400" />
                          }
                        </div>
                      </div>

                      {/* Expanded breakdown */}
                      {expandedLoad === s.loadId && (
                        <div className="mt-4 ml-11 p-4 bg-slate-900/60 rounded-lg border border-slate-700/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-slate-500 text-xs mb-1">Precio Bruto</div>
                              <div className="text-white font-medium">{fmt(s.grossAmount)}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs mb-1">Comisión WV ({s.commissionPercent}%)</div>
                              <div className="text-amber-400 font-medium">-{fmt(s.commissionAmount)}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs mb-1">Peajes</div>
                              <div className="text-slate-300 font-medium">-{fmt(s.tollDeduction)}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs mb-1">Combustible</div>
                              <div className="text-slate-300 font-medium">-{fmt(s.fuelDeduction)}</div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                            <div>
                              <span className="text-slate-400 text-sm">Neto a pagar al chofer: </span>
                              <span className={`text-lg font-bold ${s.paymentBlocked ? "text-red-400" : "text-emerald-400"}`}>
                                {fmt(s.netPayable)}
                              </span>
                            </div>
                            {s.paymentBlocked && (
                              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30">
                                <AlertTriangle className="w-3 h-3" />
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
