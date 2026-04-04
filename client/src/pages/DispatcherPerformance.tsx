/**
 * DispatcherPerformance — WV Transport & Logistics
 * Design: Dark slate with teal/cyan accent. Shows Yisvel's dispatcher KPIs.
 * Metrics: loads found, revenue generated, avg load score, broker relationships.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Headphones, TrendingUp, DollarSign, Package, Star, Target,
  Building2, BarChart3, ChevronLeft, ChevronRight, Award, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function KPICard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string; sub?: string;
  icon: any; color: string; bg: string;
}) {
  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <p className={`text-2xl font-bold ${color} mb-1`}>{value}</p>
        <p className="text-slate-400 text-xs">{label}</p>
        {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PerformanceMeter({ score }: { score: number }) {
  const zones = [
    { min: 0, max: 40, label: "Bajo", color: "bg-red-500" },
    { min: 40, max: 70, label: "Regular", color: "bg-amber-500" },
    { min: 70, max: 85, label: "Bueno", color: "bg-blue-500" },
    { min: 85, max: 100, label: "Excelente", color: "bg-emerald-500" },
  ];
  const zone = zones.find(z => score >= z.min && score < z.max) || zones[zones.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-sm">Score de Desempeño</span>
        <div className="flex items-center gap-2">
          <span className="text-white text-2xl font-bold">{score}</span>
          <span className="text-slate-500 text-sm">/100</span>
          <Badge className={`${zone.color}/20 text-white border-0 text-xs`}>{zone.label}</Badge>
        </div>
      </div>
      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${zone.color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>0</span>
        <span>40</span>
        <span>70</span>
        <span>85</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default function DispatcherPerformance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: kpis, isLoading } = trpc.brokerDashboard.getDispatcherKPIs.useQuery({ year, month });
  const { data: brokers = [] } = trpc.brokerDashboard.getStats.useQuery();

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // Calculate performance score based on KPIs
  const calcScore = () => {
    if (!kpis) return 0;
    let score = 0;
    // Loads: 10 loads = 30 pts
    score += Math.min(30, kpis.totalLoads * 3);
    // Revenue: $10k = 30 pts
    score += Math.min(30, (kpis.totalRevenue / 10000) * 30);
    // Avg load score: direct contribution
    score += Math.min(20, (kpis.avgLoadScore / 100) * 20);
    // Broker diversity: 3+ brokers = 20 pts
    score += Math.min(20, kpis.activeBrokers * 7);
    return Math.round(Math.min(100, score));
  };

  const perfScore = calcScore();

  // Goals for the month
  const goals = [
    { label: "Cargas cerradas", current: kpis?.totalLoads || 0, target: 20, unit: "" },
    { label: "Revenue generado", current: kpis?.totalRevenue || 0, target: 15000, unit: "$", format: formatCurrency },
    { label: "Brokers activos", current: kpis?.activeBrokers || 0, target: 5, unit: "" },
    { label: "Load Score promedio", current: kpis?.avgLoadScore || 0, target: 75, unit: "pts" },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-teal-500/20 rounded-lg">
              <Headphones className="h-5 w-5 text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Desempeño del Dispatcher</h1>
          </div>
          <p className="text-slate-400 text-sm ml-11">Panel de KPIs — Yisvel</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm font-medium px-2 min-w-[120px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={nextMonth} disabled={isCurrentMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400" />
        </div>
      ) : (
        <>
          {/* Performance Score */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <PerformanceMeter score={perfScore} />
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard label="Cargas Cerradas" value={(kpis?.totalLoads || 0).toString()} icon={Package} color="text-blue-400" bg="bg-blue-500/10" />
            <KPICard label="Revenue Generado" value={formatCurrency(kpis?.totalRevenue || 0)} icon={DollarSign} color="text-emerald-400" bg="bg-emerald-500/10" />
            <KPICard label="Profit Neto" value={formatCurrency(kpis?.totalProfit || 0)} sub="Después de gastos" icon={TrendingUp} color={kpis && kpis.totalProfit > 0 ? "text-emerald-400" : "text-red-400"} bg="bg-teal-500/10" />
            <KPICard label="Avg por Carga" value={formatCurrency(kpis?.avgRate || 0)} icon={BarChart3} color="text-amber-400" bg="bg-amber-500/10" />
            <KPICard label="Brokers Activos" value={(kpis?.activeBrokers || 0).toString()} sub="Fuentes de carga" icon={Building2} color="text-purple-400" bg="bg-purple-500/10" />
            <KPICard label="Load Score Avg" value={kpis && kpis.avgLoadScore > 0 ? `${kpis.avgLoadScore}/100` : "—"} sub="Calidad de cargas" icon={Star} color={kpis && kpis.avgLoadScore >= 70 ? "text-emerald-400" : "text-amber-400"} bg="bg-yellow-500/10" />
          </div>

          {/* Goals Progress */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-teal-400" />
                Metas del Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {goals.map((goal) => {
                const pct = Math.min(100, (goal.current / goal.target) * 100);
                const achieved = pct >= 100;
                const displayCurrent = goal.format ? goal.format(goal.current) : `${goal.current}${goal.unit}`;
                const displayTarget = goal.format ? goal.format(goal.target) : `${goal.target}${goal.unit}`;
                return (
                  <div key={goal.label}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        {achieved && <Award className="h-3.5 w-3.5 text-amber-400" />}
                        <span className="text-slate-300 text-sm">{goal.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${achieved ? "text-emerald-400" : "text-white"}`}>
                          {displayCurrent}
                        </span>
                        <span className="text-slate-500 text-xs">/ {displayTarget}</span>
                        <Badge className={`text-xs ${achieved ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-700 text-slate-400 border-slate-600"}`}>
                          {pct.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${achieved ? "bg-emerald-500" : pct >= 70 ? "bg-teal-500" : pct >= 40 ? "bg-amber-500" : "bg-slate-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top Brokers This Month */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Mejores Brokers (Histórico)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {brokers.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Sin datos de brokers aún. Agrega el nombre del broker al crear cargas.</p>
              ) : (
                <div className="space-y-3">
                  {brokers.slice(0, 5).map((broker, idx) => (
                    <div key={broker.brokerName} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? "bg-amber-500/30 text-amber-400" :
                        idx === 1 ? "bg-slate-500/30 text-slate-300" :
                        "bg-slate-700 text-slate-400"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-white text-sm font-medium truncate">{broker.brokerName}</span>
                          <span className="text-emerald-400 text-sm font-semibold ml-2 shrink-0">{formatCurrency(broker.totalRevenue)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-slate-500 text-xs">{broker.totalLoads} cargas</span>
                          <span className="text-slate-500 text-xs">•</span>
                          <span className="text-slate-500 text-xs">Avg {formatCurrency(broker.avgRate)}/carga</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips for Yisvel */}
          <Card className="bg-gradient-to-r from-teal-900/30 to-slate-800 border-teal-500/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-500/20 rounded-lg shrink-0">
                  <Headphones className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-teal-300 text-sm font-semibold mb-2">Estrategia del Dispatcher</p>
                  <ul className="space-y-1.5 text-slate-400 text-xs">
                    <li>• Prioriza brokers con Load Score ≥ 75 y profit/milla ≥ $0.90</li>
                    <li>• Diversifica: mantén al menos 3–4 brokers activos por mes</li>
                    <li>• Negocia cargas con profit/milla entre $0.70–$0.89 antes de rechazar</li>
                    <li>• Meta mensual: 20 cargas cerradas con revenue ≥ $15,000</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
