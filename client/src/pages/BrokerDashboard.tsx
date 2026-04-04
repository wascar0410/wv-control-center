/**
 * BrokerDashboard — WV Transport & Logistics
 * Design: Industrial dark slate + amber accent. Asymmetric grid, data-dense.
 * Shows broker performance: loads, revenue, profit/mile, reliability score.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2, TrendingUp, DollarSign, Package, Star, ArrowUpRight,
  BarChart3, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function ReliabilityBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Excelente</Badge>;
  if (score >= 60) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Bueno</Badge>;
  return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Bajo</Badge>;
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full bg-slate-700/50 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BrokerDashboard() {
  const { data: brokers = [], isLoading } = trpc.brokerDashboard.getStats.useQuery();

  const now = new Date();
  const { data: kpis } = trpc.brokerDashboard.getDispatcherKPIs.useQuery({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const totalRevenue = brokers.reduce((s, b) => s + b.totalRevenue, 0);
  const totalLoads = brokers.reduce((s, b) => s + b.totalLoads, 0);
  const topBroker = brokers[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard de Brokers</h1>
          <p className="text-slate-400 text-sm mt-1">Rendimiento y rentabilidad por fuente de carga</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
          <Building2 className="h-4 w-4 text-amber-400" />
          <span className="text-white text-sm font-medium">{brokers.length} brokers activos</span>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue Total", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Cargas Totales", value: totalLoads.toString(), icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Avg/Carga (mes)", value: kpis ? formatCurrency(kpis.avgRate) : "—", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Brokers con cargas", value: brokers.length.toString(), icon: Building2, color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs">{kpi.label}</span>
                <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Broker Cards Grid */}
      {brokers.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg font-medium">Sin datos de brokers aún</p>
            <p className="text-slate-500 text-sm mt-2">
              Agrega el nombre del broker al crear cargas para ver métricas aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {brokers.map((broker, idx) => {
            const revenueShare = totalRevenue > 0 ? (broker.totalRevenue / totalRevenue) * 100 : 0;
            const profitMargin = broker.totalRevenue > 0 ? (broker.totalProfit / broker.totalRevenue) * 100 : 0;
            const isTop = idx === 0;

            return (
              <Card
                key={broker.brokerName}
                className={`bg-slate-800 border transition-all hover:border-slate-500 ${
                  isTop ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-slate-700"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isTop ? "bg-amber-500/20" : "bg-slate-700"}`}>
                        <Building2 className={`h-4 w-4 ${isTop ? "text-amber-400" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <CardTitle className="text-white text-sm font-semibold">{broker.brokerName}</CardTitle>
                        {isTop && (
                          <span className="text-amber-400 text-xs flex items-center gap-1 mt-0.5">
                            <Star className="h-3 w-3 fill-amber-400" /> Broker #1
                          </span>
                        )}
                      </div>
                    </div>
                    <ReliabilityBadge score={broker.reliabilityScore} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Revenue */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-400 text-xs">Revenue</span>
                      <span className="text-emerald-400 font-bold text-sm">{formatCurrency(broker.totalRevenue)}</span>
                    </div>
                    <ScoreBar value={broker.totalRevenue} max={topBroker?.totalRevenue || 1} color="bg-emerald-500" />
                    <p className="text-slate-500 text-xs mt-1">{revenueShare.toFixed(1)}% del total</p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">Cargas</p>
                      <p className="text-white font-bold text-lg">{broker.totalLoads}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">Avg/Carga</p>
                      <p className="text-white font-bold text-lg">{formatCurrency(broker.avgRate)}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">Profit/Milla</p>
                      <p className={`font-bold text-lg ${broker.avgProfitPerMile >= 0.7 ? "text-emerald-400" : broker.avgProfitPerMile > 0 ? "text-amber-400" : "text-slate-400"}`}>
                        {broker.avgProfitPerMile > 0 ? `$${broker.avgProfitPerMile.toFixed(2)}` : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-2.5">
                      <p className="text-slate-400 text-xs mb-1">Margen</p>
                      <p className={`font-bold text-lg ${profitMargin >= 20 ? "text-emerald-400" : profitMargin > 10 ? "text-amber-400" : "text-red-400"}`}>
                        {profitMargin.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Reliability Score */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-slate-400 text-xs">Score de Confiabilidad</span>
                      <span className="text-white text-xs font-medium">{broker.reliabilityScore}/100</span>
                    </div>
                    <Progress value={broker.reliabilityScore} className="h-1.5 bg-slate-700" />
                  </div>

                  {/* Profit indicator */}
                  <div className={`flex items-center gap-2 rounded-lg p-2.5 ${
                    broker.totalProfit > 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                  }`}>
                    {broker.totalProfit > 0
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    }
                    <span className={`text-xs ${broker.totalProfit > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      Profit neto: {formatCurrency(broker.totalProfit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dispatcher KPIs This Month */}
      {kpis && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              KPIs del Mes Actual (Dispatcher)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Cargas Cerradas", value: kpis.totalLoads.toString(), color: "text-blue-400" },
                { label: "Revenue Generado", value: formatCurrency(kpis.totalRevenue), color: "text-emerald-400" },
                { label: "Profit Neto", value: formatCurrency(kpis.totalProfit), color: kpis.totalProfit > 0 ? "text-emerald-400" : "text-red-400" },
                { label: "Avg/Carga", value: formatCurrency(kpis.avgRate), color: "text-amber-400" },
                { label: "Brokers Activos", value: kpis.activeBrokers.toString(), color: "text-purple-400" },
                { label: "Load Score Avg", value: kpis.avgLoadScore > 0 ? `${kpis.avgLoadScore}/100` : "—", color: kpis.avgLoadScore >= 70 ? "text-emerald-400" : "text-amber-400" },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-slate-500 text-xs mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Tips */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-amber-400" />
            Reglas de Negociación WV Transport
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", title: "Aceptar", desc: "Profit/milla ≥ $0.90 y margen ≥ 25%" },
              { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", title: "Negociar", desc: "Profit/milla entre $0.70–$0.89 o margen 15–24%" },
              { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", title: "Rechazar", desc: "Profit/milla < $0.70 o margen < 15%" },
            ].map((rule) => (
              <div key={rule.title} className={`flex items-start gap-3 p-3 rounded-lg ${rule.bg} border border-current/10`}>
                <rule.icon className={`h-4 w-4 ${rule.color} mt-0.5 shrink-0`} />
                <div>
                  <p className={`text-sm font-semibold ${rule.color}`}>{rule.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
