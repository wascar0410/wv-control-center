/**
 * Finance.tsx — WV Control Center Financial Module
 * Tabs: Overview (5 preguntas clave), Transacciones, P&L, Distribución, Alertas
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Plus, Download, Trash2, Shield, Zap, Target, ArrowUpRight, ArrowDownRight, FileText, PieChart as PieIcon, BarChart3, Activity, Building2 } from "lucide-react";
import { PlaidLinkButton, PlaidBankAccountsList } from "@/components/PlaidLinkButton";
import { toast } from "sonner";

const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtMile = (v: number) => `$${v.toFixed(2)}/mi`;

const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Combustible", tolls: "Peajes", insurance: "Seguro",
  maintenance: "Mantenimiento", phone: "Teléfono", payroll: "Nómina",
  subscriptions: "Suscripciones", other: "Otros", load_payment: "Pago de Carga",
  uncategorized: "Sin categoría",
};
const CATEGORY_COLORS: Record<string, string> = {
  fuel: "#f59e0b", tolls: "#8b5cf6", insurance: "#06b6d4",
  maintenance: "#ef4444", phone: "#10b981", payroll: "#3b82f6",
  subscriptions: "#ec4899", other: "#6b7280", load_payment: "#22c55e",
  uncategorized: "#94a3b8",
};
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const EXPENSE_CATEGORIES = ["fuel","tolls","insurance","maintenance","phone","payroll","subscriptions","other"];

function KpiCard({ label, value, sub, trend, color = "text-white", icon: Icon, alert }: {
  label: string; value: string; sub?: string; trend?: number; color?: string; icon?: any; alert?: boolean;
}) {
  return (
    <Card className={`bg-slate-800/60 border-slate-700 ${alert ? "border-amber-500/50" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            {Icon && <Icon className={`w-5 h-5 ${alert ? "text-amber-400" : "text-slate-500"}`} />}
            {trend !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddTransactionDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), name: "", amount: "",
    category: "fuel", type: "expense" as "income" | "expense", notes: "", isTaxDeductible: false,
  });
  const addMutation = trpc.finance.addManualTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transacción registrada"); setOpen(false);
      setForm({ date: new Date().toISOString().slice(0, 10), name: "", amount: "", category: "fuel", type: "expense", notes: "", isTaxDeductible: false });
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });
  const handleSubmit = () => {
    if (!form.name || !form.amount) return toast.error("Nombre y monto son requeridos");
    addMutation.mutate({ date: form.date, name: form.name, amount: parseFloat(form.amount), category: form.category, type: form.type, notes: form.notes || undefined, isTaxDeductible: form.isTaxDeductible });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader><DialogTitle>Nueva Transacción</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as any, category: v === "income" ? "load_payment" : "fuel" }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Fecha</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-slate-800 border-slate-600 text-white mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Descripción / Comercio</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Pilot Flying J" className="bg-slate-800 border-slate-600 text-white mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Monto ($)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="bg-slate-800 border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {form.type === "income" ? (
                    <SelectItem value="load_payment">Pago de Carga</SelectItem>
                  ) : EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Notas (opcional)</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Referencia, número de carga, etc." className="bg-slate-800 border-slate-600 text-white mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="taxDed" checked={form.isTaxDeductible} onChange={e => setForm(f => ({ ...f, isTaxDeductible: e.target.checked }))} className="rounded border-slate-600" />
            <Label htmlFor="taxDed" className="text-slate-300 text-xs cursor-pointer">Deducible de impuestos (IRS)</Label>
          </div>
          <Button onClick={handleSubmit} disabled={addMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
            {addMutation.isPending ? "Guardando..." : "Guardar Transacción"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Finance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<"overview"|"transactions"|"pnl"|"allocation"|"alerts">("overview");
  const [txFilter, setTxFilter] = useState<"all"|"income"|"expense">("all");
  const [txCategory, setTxCategory] = useState("all");

  const { data: pnl, isLoading: pnlLoading, refetch: refetchPnl } = trpc.finance.pnl.useQuery({ year, month }, { retry: false });
  const { data: trend, isLoading: trendLoading } = trpc.finance.trend.useQuery({ year }, { retry: false });
  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = trpc.finance.manualTransactions.useQuery(undefined, { retry: false });
  const { data: allocation } = trpc.finance.allocationSettings.useQuery(undefined, { retry: false });
  const { data: partners = [] } = trpc.partnership.list.useQuery(undefined, { retry: false });

  const deleteMutation = trpc.finance.deleteManualTransaction.useMutation({
    onSuccess: () => { toast.success("Eliminada"); refetchTx(); refetchPnl(); },
    onError: (e) => toast.error(e.message),
  });

  const safePnl = pnl ?? {
    year, month, loadCount: 0, totalMiles: 0, loadsRevenue: 0, manualIncome: 0,
    totalRevenue: 0, expenseByCategory: {} as Record<string,number>, totalExpenses: 0, netProfit: 0,
    grossMarginPct: 0, revenuePerMile: 0, profitPerMile: 0, totalDraws: 0,
    drawsByPartner: [] as any[], retainedEarnings: 0,
    allocation: { operating: 0, ownerPay: 0, reserve: 0, growth: 0 }, taxReserve: 0,
  };
  const alloc = allocation ?? { operatingPct: 50, ownerPayPct: 20, reservePct: 20, growthPct: 10 };

  const filteredTx = useMemo(() => transactions.filter(t => {
    if (txFilter !== "all" && t.type !== txFilter) return false;
    if (txCategory !== "all" && t.category !== txCategory) return false;
    return true;
  }), [transactions, txFilter, txCategory]);

  const expensePieData = useMemo(() =>
    Object.entries(safePnl.expenseByCategory).filter(([,v]) => v > 0)
      .map(([k,v]) => ({ name: CATEGORY_LABELS[k]||k, value: v, key: k }))
      .sort((a,b) => b.value - a.value),
  [safePnl.expenseByCategory]);

  const allocPieData = [
    { name: "Operación", value: alloc.operatingPct, color: "#3b82f6" },
    { name: "Owner Pay", value: alloc.ownerPayPct, color: "#10b981" },
    { name: "Reserva", value: alloc.reservePct, color: "#f59e0b" },
    { name: "Crecimiento", value: alloc.growthPct, color: "#8b5cf6" },
  ];

  const alerts = useMemo(() => {
    const list: { type: "error"|"warning"|"info"; message: string }[] = [];
    if (safePnl.profitPerMile > 0 && safePnl.profitPerMile < 0.70)
      list.push({ type: "error", message: `Profit/milla crítico: ${fmtMile(safePnl.profitPerMile)} (mínimo $0.70)` });
    if (safePnl.grossMarginPct > 0 && safePnl.grossMarginPct < 20)
      list.push({ type: "warning", message: `Margen bruto bajo: ${fmtPct(safePnl.grossMarginPct)} (meta: 20%+)` });
    if (safePnl.totalDraws > safePnl.netProfit * 0.3 && safePnl.netProfit > 0)
      list.push({ type: "warning", message: `Retiros de socios elevados: ${fmt(safePnl.totalDraws)} (>30% del profit)` });
    const unc = transactions.filter(t => t.category === "uncategorized" || !t.isReviewed).length;
    if (unc > 0) list.push({ type: "info", message: `${unc} transacción(es) sin revisar o categorizar` });
    if (safePnl.netProfit > 0 && safePnl.taxReserve > 0)
      list.push({ type: "info", message: `Reserva de impuestos recomendada: ${fmt(safePnl.taxReserve)} (20% del revenue)` });
    return list;
  }, [safePnl, transactions]);

  const exportCSV = () => {
    const rows = [["Fecha","Descripción","Tipo","Categoría","Monto","Deducible","Notas"],
      ...transactions.map(t => [t.date, t.name, t.type==="income"?"Ingreso":"Gasto",
        CATEGORY_LABELS[t.category]||t.category, t.amount.toFixed(2), t.isTaxDeductible?"Sí":"No", t.notes||""])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `wv-finanzas-${year}-${String(month).padStart(2,"0")}.csv`;
    a.click(); URL.revokeObjectURL(url); toast.success("CSV exportado");
  };

  const tabs = [
    { id: "overview", label: "Resumen", icon: Activity },
    { id: "transactions", label: "Transacciones", icon: DollarSign },
    { id: "pnl", label: "P&L", icon: BarChart3 },
    { id: "allocation", label: "Distribución", icon: PieIcon },
    { id: "alerts", label: "Alertas", icon: AlertTriangle },
  ] as const;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel Financiero</h1>
          <p className="text-slate-400 text-sm">WV Transport & Logistics — Control Financiero Pro</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {MONTHS.map((m,i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {[2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="border-slate-600 text-slate-300 hover:text-white">
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <AddTransactionDialog onSuccess={() => { refetchTx(); refetchPnl(); }} />
        </div>
      </div>

      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab===tab.id ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id==="alerts" && alerts.length>0 && (
              <span className="bg-amber-500 text-black text-xs rounded-full px-1.5 py-0.5 leading-none font-bold">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab==="overview" && (
        <div className="space-y-6">
          <Card className="bg-slate-800/40 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                5 Preguntas Clave — {MONTHS[month-1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pnlLoading ? <p className="text-slate-400 text-sm">Cargando datos...</p> : (
                <>
                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-blue-400 font-bold text-lg w-6 shrink-0">1</span>
                    <div>
                      <p className="text-slate-300 text-sm font-medium">¿Cuánto entró?</p>
                      <p className="text-2xl font-bold text-emerald-400">{fmt(safePnl.totalRevenue)}</p>
                      <p className="text-xs text-slate-400">{safePnl.loadCount} cargas · {safePnl.totalMiles>0?`${safePnl.totalMiles.toFixed(0)} millas`:"sin datos de millas"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-blue-400 font-bold text-lg w-6 shrink-0">2</span>
                    <div className="flex-1">
                      <p className="text-slate-300 text-sm font-medium">¿Cuánto se fue y en qué?</p>
                      <p className="text-2xl font-bold text-red-400">{fmt(safePnl.totalExpenses)}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(safePnl.expenseByCategory).filter(([,v])=>v>0).map(([k,v]) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-200">{CATEGORY_LABELS[k]}: {fmt(v)}</span>
                        ))}
                        {Object.keys(safePnl.expenseByCategory).length===0 && <span className="text-xs text-slate-500">Sin gastos registrados</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-blue-400 font-bold text-lg w-6 shrink-0">3</span>
                    <div>
                      <p className="text-slate-300 text-sm font-medium">¿Cuánto profit real quedó?</p>
                      <p className={`text-2xl font-bold ${safePnl.netProfit>=0?"text-emerald-400":"text-red-400"}`}>{fmt(safePnl.netProfit)}</p>
                      <p className="text-xs text-slate-400">Margen: {fmtPct(safePnl.grossMarginPct)}{safePnl.totalMiles>0&&` · ${fmtMile(safePnl.profitPerMile)}`}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-blue-400 font-bold text-lg w-6 shrink-0">4</span>
                    <div className="flex-1">
                      <p className="text-slate-300 text-sm font-medium">¿Cuánto mover a taxes/reserve/growth?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        <div className="text-center p-2 bg-blue-900/40 rounded"><p className="text-xs text-slate-400">Operación</p><p className="text-sm font-bold text-blue-300">{fmt(safePnl.allocation.operating)}</p><p className="text-xs text-slate-500">{alloc.operatingPct}%</p></div>
                        <div className="text-center p-2 bg-emerald-900/40 rounded"><p className="text-xs text-slate-400">Owner Pay</p><p className="text-sm font-bold text-emerald-300">{fmt(safePnl.allocation.ownerPay)}</p><p className="text-xs text-slate-500">{alloc.ownerPayPct}%</p></div>
                        <div className="text-center p-2 bg-amber-900/40 rounded"><p className="text-xs text-slate-400">Reserva/Tax</p><p className="text-sm font-bold text-amber-300">{fmt(safePnl.allocation.reserve)}</p><p className="text-xs text-slate-500">{alloc.reservePct}%</p></div>
                        <div className="text-center p-2 bg-purple-900/40 rounded"><p className="text-xs text-slate-400">Crecimiento</p><p className="text-sm font-bold text-purple-300">{fmt(safePnl.allocation.growth)}</p><p className="text-xs text-slate-500">{alloc.growthPct}%</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-blue-400 font-bold text-lg w-6 shrink-0">5</span>
                    <div>
                      <p className="text-slate-300 text-sm font-medium">¿Listos para escalar?</p>
                      {safePnl.profitPerMile>=0.90 ? (
                        <div className="flex items-center gap-2 mt-1"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><p className="text-emerald-400 font-semibold">¡Sí! Profit/milla excelente ({fmtMile(safePnl.profitPerMile)})</p></div>
                      ) : safePnl.profitPerMile>=0.70 ? (
                        <div className="flex items-center gap-2 mt-1"><AlertTriangle className="w-5 h-5 text-amber-400" /><p className="text-amber-400 font-semibold">Casi. Aceptable ({fmtMile(safePnl.profitPerMile)}). Meta: $0.90+</p></div>
                      ) : safePnl.profitPerMile>0 ? (
                        <div className="flex items-center gap-2 mt-1"><AlertTriangle className="w-5 h-5 text-red-400" /><p className="text-red-400 font-semibold">No. Crítico ({fmtMile(safePnl.profitPerMile)}). Mínimo: $0.70</p></div>
                      ) : (
                        <p className="text-slate-400 text-sm mt-1">Sin datos de millas. Agrega millas estimadas en las cargas.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Revenue Total" value={fmt(safePnl.totalRevenue)} icon={TrendingUp} color="text-emerald-400" sub={`${safePnl.loadCount} cargas`} />
            <KpiCard label="Gastos Totales" value={fmt(safePnl.totalExpenses)} icon={TrendingDown} color="text-red-400" />
            <KpiCard label="Profit Neto" value={fmt(safePnl.netProfit)} icon={DollarSign} color={safePnl.netProfit>=0?"text-emerald-400":"text-red-400"} sub={fmtPct(safePnl.grossMarginPct)+" margen"} />
            <KpiCard label="Tax Reserve" value={fmt(safePnl.taxReserve)} icon={Shield} color="text-amber-400" sub="20% del revenue" alert={safePnl.taxReserve>0} />
          </div>
          {!trendLoading && trend && trend.length>0 && (
            <Card className="bg-slate-800/40 border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Tendencia Anual {year}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                      <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} labelStyle={{ color: "#e2e8f0" }} formatter={(v: any) => [fmt(v), ""]} />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#profGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab==="transactions" && (
        <div className="space-y-4">
          {/* Bank Accounts — Plaid Integration */}
          <Card className="bg-slate-800/40 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Cuentas Bancarias Vinculadas
                </CardTitle>
                <PlaidLinkButton onSuccess={() => { refetchTx(); refetchPnl(); }} />
              </div>
            </CardHeader>
            <CardContent>
              <PlaidBankAccountsList onRefresh={() => { refetchTx(); refetchPnl(); }} />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1">
              {(["all","income","expense"] as const).map(f => (
                <button key={f} onClick={() => setTxFilter(f)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${txFilter===f?"bg-blue-600 text-white":"bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                  {f==="all"?"Todos":f==="income"?"Ingresos":"Gastos"}
                </button>
              ))}
            </div>
            <Select value={txCategory} onValueChange={setTxCategory}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white text-xs h-8"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-400 ml-auto">{filteredTx.length} transacciones</span>
          </div>
          {txLoading ? <p className="text-slate-400 text-sm">Cargando...</p> :
          filteredTx.length===0 ? (
            <Card className="bg-slate-800/40 border-slate-700"><CardContent className="p-8 text-center"><DollarSign className="w-10 h-10 mx-auto mb-3 text-slate-600" /><p className="text-slate-400">No hay transacciones. Agrega una con el botón "Agregar".</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredTx.map(tx => (
                <Card key={tx.id} className="bg-slate-800/40 border-slate-700 hover:border-slate-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[tx.category]||"#6b7280" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium truncate">{tx.name}</span>
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">{CATEGORY_LABELS[tx.category]||tx.category}</Badge>
                          {tx.isTaxDeductible && <Badge className="text-xs bg-emerald-900/50 text-emerald-300 border-emerald-700">IRS</Badge>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{tx.date}{tx.notes?` · ${tx.notes}`:""}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-base font-bold ${tx.type==="income"?"text-emerald-400":"text-red-400"}`}>
                          {tx.type==="income"?"+":"-"}{fmt(tx.amount)}
                        </span>
                        <button onClick={() => deleteMutation.mutate({ id: tx.id })} className="text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab==="pnl" && (
        <div className="space-y-6">
          {pnlLoading ? <p className="text-slate-400">Calculando P&L...</p> : (
            <>
              <Card className="bg-slate-800/40 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" />Estado de Resultados — {MONTHS[month-1]} {year}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between py-2 border-b border-slate-700"><span className="text-slate-300 font-semibold">INGRESOS</span><span className="text-emerald-400 font-bold">{fmt(safePnl.totalRevenue)}</span></div>
                    <div className="flex justify-between py-1.5 pl-4"><span className="text-slate-400 text-sm">Cargas completadas ({safePnl.loadCount})</span><span className="text-slate-300 text-sm">{fmt(safePnl.loadsRevenue)}</span></div>
                    {safePnl.manualIncome>0 && <div className="flex justify-between py-1.5 pl-4"><span className="text-slate-400 text-sm">Otros ingresos</span><span className="text-slate-300 text-sm">{fmt(safePnl.manualIncome)}</span></div>}
                    <div className="flex justify-between py-2 border-b border-slate-700 mt-2"><span className="text-slate-300 font-semibold">GASTOS</span><span className="text-red-400 font-bold">({fmt(safePnl.totalExpenses)})</span></div>
                    {Object.entries(safePnl.expenseByCategory).filter(([,v])=>v>0).map(([k,v]) => (
                      <div key={k} className="flex justify-between py-1.5 pl-4">
                        <span className="text-slate-400 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CATEGORY_COLORS[k]||"#6b7280" }} />{CATEGORY_LABELS[k]||k}</span>
                        <span className="text-slate-300 text-sm">({fmt(v)})</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 border-t-2 border-slate-600 mt-2"><span className="text-white font-bold text-base">UTILIDAD NETA</span><span className={`font-bold text-xl ${safePnl.netProfit>=0?"text-emerald-400":"text-red-400"}`}>{fmt(safePnl.netProfit)}</span></div>
                    <div className="flex justify-between py-1.5 pl-4"><span className="text-slate-400 text-sm">Margen bruto</span><span className="text-slate-300 text-sm">{fmtPct(safePnl.grossMarginPct)}</span></div>
                    {safePnl.totalMiles>0 && <>
                      <div className="flex justify-between py-1.5 pl-4"><span className="text-slate-400 text-sm">Revenue/milla</span><span className="text-slate-300 text-sm">{fmtMile(safePnl.revenuePerMile)}</span></div>
                      <div className="flex justify-between py-1.5 pl-4"><span className="text-slate-400 text-sm">Profit/milla</span><span className={`text-sm font-medium ${safePnl.profitPerMile>=0.90?"text-emerald-400":safePnl.profitPerMile>=0.70?"text-amber-400":"text-red-400"}`}>{fmtMile(safePnl.profitPerMile)}</span></div>
                    </>}
                    {safePnl.totalDraws>0 && <>
                      <div className="flex justify-between py-2 border-t border-slate-700 mt-2"><span className="text-slate-300 font-semibold">RETIROS SOCIOS</span><span className="text-amber-400 font-bold">({fmt(safePnl.totalDraws)})</span></div>
                      {safePnl.drawsByPartner.map((d:any) => <div key={d.partnerId} className="flex justify-between py-1.5 pl-4"><span className="text-slate-400 text-sm">{d.partnerName}</span><span className="text-slate-300 text-sm">({fmt(d.amount)})</span></div>)}
                      <div className="flex justify-between py-2 border-t border-slate-600"><span className="text-white font-semibold">Ganancias Retenidas</span><span className={`font-bold ${safePnl.retainedEarnings>=0?"text-emerald-400":"text-red-400"}`}>{fmt(safePnl.retainedEarnings)}</span></div>
                    </>}
                    <div className="flex justify-between py-2 bg-amber-900/20 rounded px-3 mt-2">
                      <span className="text-amber-300 text-sm font-medium flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Reserva Impuestos (20% revenue)</span>
                      <span className="text-amber-300 font-bold">{fmt(safePnl.taxReserve)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {expensePieData.length>0 && (
                <Card className="bg-slate-800/40 border-slate-700">
                  <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Distribución de Gastos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                            {expensePieData.map((entry,i) => <Cell key={i} fill={CATEGORY_COLORS[entry.key]||"#6b7280"} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} formatter={(v:any) => [fmt(v), ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 min-w-0">
                        {expensePieData.map((d,i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[d.key]||"#6b7280" }} />
                            <span className="text-slate-300 truncate">{d.name}</span>
                            <span className="text-slate-400 ml-auto">{fmt(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {activeTab==="allocation" && (
        <div className="space-y-6">
          <Card className="bg-slate-800/40 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" />Distribución Financiera — {MONTHS[month-1]} {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={allocPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {allocPieData.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} formatter={(v:any) => [`${v}%`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Operación", key: "operating", pct: alloc.operatingPct, color: "#3b82f6", desc: "Gastos operacionales y capital de trabajo" },
                    { label: "Owner Pay", key: "ownerPay", pct: alloc.ownerPayPct, color: "#10b981", desc: "Salario y retiros de socios" },
                    { label: "Reserva / Tax", key: "reserve", pct: alloc.reservePct, color: "#f59e0b", desc: "Impuestos y fondo de emergencia" },
                    { label: "Crecimiento", key: "growth", pct: alloc.growthPct, color: "#8b5cf6", desc: "Expansión de flota y equipos" },
                  ].map(item => (
                    <div key={item.key} className="p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                        <span className="font-bold text-sm" style={{ color: item.color }}>{item.pct}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{item.desc}</span>
                        <span className="text-sm font-semibold text-white ml-2">{fmt(safePnl.netProfit*item.pct/100)}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          {partners.length>0 && (
            <Card className="bg-slate-800/40 border-slate-700">
              <CardHeader className="pb-3"><CardTitle className="text-white text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" />Owner Payout Tracker</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {partners.map((p:any) => {
                    const draw = safePnl.drawsByPartner.find((d:any) => d.partnerId===p.id);
                    const allocated = safePnl.allocation.ownerPay*(parseFloat(String(p.participationPercent))/100);
                    const paid = draw?.amount||0;
                    const pending = Math.max(0, allocated-paid);
                    return (
                      <div key={p.id} className="p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{p.partnerName}</span>
                          <Badge className="bg-blue-900/50 text-blue-300 border-blue-700 text-xs">{parseFloat(String(p.participationPercent))}%</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div><p className="text-xs text-slate-400">Asignado</p><p className="text-sm font-bold text-blue-300">{fmt(allocated)}</p></div>
                          <div><p className="text-xs text-slate-400">Pagado</p><p className="text-sm font-bold text-emerald-300">{fmt(paid)}</p></div>
                          <div><p className="text-xs text-slate-400">Pendiente</p><p className={`text-sm font-bold ${pending>0?"text-amber-300":"text-slate-400"}`}>{fmt(pending)}</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab==="alerts" && (
        <div className="space-y-4">
          {alerts.length===0 ? (
            <Card className="bg-slate-800/40 border-slate-700"><CardContent className="p-8 text-center"><CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" /><p className="text-white font-semibold">Todo en orden</p><p className="text-slate-400 text-sm mt-1">No hay alertas financieras para este período.</p></CardContent></Card>
          ) : (
            <>
              {alerts.map((alert,i) => (
                <Card key={i} className={`border ${alert.type==="error"?"border-red-500/50 bg-red-900/10":alert.type==="warning"?"border-amber-500/50 bg-amber-900/10":"border-blue-500/50 bg-blue-900/10"}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${alert.type==="error"?"text-red-400":alert.type==="warning"?"text-amber-400":"text-blue-400"}`} />
                    <div>
                      <p className={`text-sm font-medium ${alert.type==="error"?"text-red-300":alert.type==="warning"?"text-amber-300":"text-blue-300"}`}>
                        {alert.type==="error"?"Crítico":alert.type==="warning"?"Advertencia":"Información"}
                      </p>
                      <p className="text-slate-300 text-sm mt-0.5">{alert.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="bg-slate-800/40 border-slate-700">
                <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Referencia: Profit/Milla</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: "Excelente — Escalar ahora", range: "≥ $0.90/mi", color: "text-emerald-400", bg: "bg-emerald-900/20" },
                      { label: "Aceptable — Optimizar gastos", range: "$0.70 – $0.89/mi", color: "text-amber-400", bg: "bg-amber-900/20" },
                      { label: "Crítico — Revisar urgente", range: "< $0.70/mi", color: "text-red-400", bg: "bg-red-900/20" },
                    ].map((r,i) => (
                      <div key={i} className={`flex items-center justify-between p-2.5 rounded ${r.bg}`}>
                        <span className="text-slate-300 text-sm">{r.label}</span>
                        <span className={`font-bold text-sm ${r.color}`}>{r.range}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
