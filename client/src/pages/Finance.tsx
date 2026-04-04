/**
 * Finance.tsx — WV Control Center Financial Module
 * Light theme compatible. Tabs: Overview, Transacciones (Plaid), P&L, Distribución, Alertas
 */
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Plus, Download, Trash2, Shield, Zap, ArrowUpRight, ArrowDownRight,
  FileText, PieChart as PieIcon, BarChart3, Activity, Building2,
  RefreshCw, Link2, Loader2
} from "lucide-react";
import { toast } from "sonner";

// ─── Plaid SDK loader (bypasses react-plaid-link to avoid removeChild DOM crash) ─
function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Plaid) { resolve(); return; }
    const existing = document.getElementById('plaid-link-sdk');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.id = 'plaid-link-sdk';
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Plaid SDK'));
    document.head.appendChild(script);
  });
}

function openPlaidLink(token: string, onSuccess: (publicToken: string) => void, onExit: (err?: any) => void) {
  loadPlaidScript().then(() => {
    const handler = (window as any).Plaid.create({
      token,
      onSuccess: (public_token: string) => { onSuccess(public_token); },
      onExit: (err: any) => { onExit(err); },
      onLoad: () => { handler.open(); },
    });
    handler.open();
  }).catch((err) => {
    toast.error(`Error cargando Plaid: ${err.message}`);
    onExit(err);
  });
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtMile = (v: number) => `$${v.toFixed(2)}/mi`;

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  fuel: "Combustible", tolls: "Peajes", insurance: "Seguro",
  maintenance: "Mantenimiento", phone: "Teléfono", payroll: "Nómina",
  subscriptions: "Suscripciones", other: "Otros", load_payment: "Pago de Carga",
  uncategorized: "Sin categoría",
};
const CATEGORY_COLORS: Record<string, string> = {
  fuel: "#f59e0b", tolls: "#8b5cf6", insurance: "#06b6d4",
  maintenance: "#ef4444", phone: "#10b981", payroll: "#3b82f6",
  subscriptions: "#ec4899", other: "#94a3b8", load_payment: "#22c55e",
  uncategorized: "#94a3b8",
};
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const EXPENSE_CATEGORIES = ["fuel","tolls","insurance","maintenance","phone","payroll","subscriptions","other"];

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, icon: Icon, variant = "default", alert }: {
  label: string; value: string; sub?: string; trend?: number;
  icon?: any; variant?: "default" | "success" | "danger" | "warning"; alert?: boolean;
}) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600",
    danger: "text-red-600",
    warning: "text-amber-600",
  };
  return (
    <Card className={`border-border bg-card ${alert ? "border-amber-400" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            {Icon && <Icon className={`w-5 h-5 ${alert ? "text-amber-500" : "text-muted-foreground/50"}`} />}
            {trend !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
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

// ─── Add Transaction Dialog ───────────────────────────────────────────────────
function AddTransactionDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    name: "", amount: "", category: "fuel",
    type: "expense" as "income" | "expense",
    notes: "", isTaxDeductible: false,
  });
  const addMutation = trpc.finance.addManualTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transacción registrada");
      setOpen(false);
      setForm({ date: new Date().toISOString().slice(0, 10), name: "", amount: "", category: "fuel", type: "expense", notes: "", isTaxDeductible: false });
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });
  const handleSubmit = () => {
    if (!form.name || !form.amount) return toast.error("Nombre y monto son requeridos");
    addMutation.mutate({
      date: form.date, name: form.name, amount: parseFloat(form.amount),
      category: form.category, type: form.type,
      notes: form.notes || undefined, isTaxDeductible: form.isTaxDeductible,
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Agregar Manual</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva Transacción Manual</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as any, category: v === "income" ? "load_payment" : "fuel" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descripción / Comercio</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Pilot Flying J" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Monto ($)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {form.type === "income"
                    ? <SelectItem value="load_payment">Pago de Carga</SelectItem>
                    : EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Referencia, número de carga, etc." className="mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="taxDed" checked={form.isTaxDeductible}
              onChange={e => setForm(f => ({ ...f, isTaxDeductible: e.target.checked }))} className="rounded" />
            <Label htmlFor="taxDed" className="text-xs cursor-pointer">Deducible de impuestos (IRS)</Label>
          </div>
          <Button onClick={handleSubmit} disabled={addMutation.isPending} className="w-full">
            {addMutation.isPending ? "Guardando..." : "Guardar Transacción"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plaid Connect Button (uses raw Plaid JS SDK — no react-plaid-link, no removeChild) ──
function PlaidConnectButton({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [plaidError, setPlaidError] = useState<string | null>(null);

  const { refetch } = trpc.plaid.createLinkToken.useQuery(
    { redirectUri: "" },
    { enabled: false, retry: false }
  );

  const exchangeToken = trpc.plaid.exchangeToken.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.accountCount} cuenta(s) vinculada(s) exitosamente`);
      setIsLoading(false);
      onSuccess();
    },
    onError: (err) => {
      toast.error(`Error al vincular: ${err.message}`);
      setIsLoading(false);
    },
  });

  const handleOpen = async () => {
    setPlaidError(null);
    setIsLoading(true);
    try {
      const result = await refetch();
      if (result.error || !result.data?.linkToken) {
        const msg = (result.error as any)?.message || "Error al obtener token de Plaid";
        setPlaidError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }
      const token = result.data.linkToken;
      // Open Plaid via raw SDK — completely outside React tree, no DOM conflict
      openPlaidLink(
        token,
        (publicToken) => {
          exchangeToken.mutate({ publicToken });
        },
        (err) => {
          if (err && err.error_code !== 'USER_EXITED') {
            toast.error(`Plaid: ${err.display_message || err.error_message || 'Cancelado'}`);
          }
          setIsLoading(false);
        }
      );
    } catch (err: any) {
      const msg = err?.message || "Error desconocido";
      setPlaidError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleOpen} disabled={isLoading} size="sm" variant="outline"
        className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {isLoading ? "Conectando..." : "Vincular Banco"}
      </Button>
      {plaidError && (
        <p className="text-xs text-red-600 max-w-xs">{plaidError}</p>
      )}
    </div>
  );
}

// ─── Bank Accounts Panel ──────────────────────────────────────────────────────
function BankAccountsPanel({ onRefresh }: { onRefresh: () => void }) {
  const { data: accounts = [], isLoading, refetch } =
    trpc.plaid.getBankAccounts.useQuery(undefined, { retry: false });

  const syncMutation = trpc.plaid.syncTransactions.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} transacciones nuevas importadas`);
      refetch(); onRefresh();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const removeMutation = trpc.plaid.removeBankAccount.useMutation({
    onSuccess: () => { toast.success("Cuenta desvinculada"); refetch(); },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  if (isLoading) return (
    <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando cuentas...
    </div>
  );

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3 border border-blue-200">
          <Building2 className="w-6 h-6 text-blue-500" />
        </div>
        <p className="text-sm font-medium text-foreground">Sin cuentas vinculadas</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Conecta tu banco para importar transacciones automáticamente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(accounts as any[]).map((account) => (
        <div key={account.id}
          className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{account.bankName}</span>
                <span className="text-xs text-muted-foreground">••••{account.accountLast4}</span>
                {account.hasPlaid && (
                  <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200 border">Plaid</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {account.accountType} ·{" "}
                {account.lastSyncedAt
                  ? `Última sync: ${new Date(account.lastSyncedAt).toLocaleDateString("es-US")}`
                  : "Sin sincronizar aún"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {account.hasPlaid && (
              <Button size="sm" variant="ghost"
                onClick={() => syncMutation.mutate({ bankAccountId: account.id })}
                disabled={syncMutation.isPending}
                className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title="Sincronizar transacciones">
                <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              </Button>
            )}
            <Button size="sm" variant="ghost"
              onClick={() => removeMutation.mutate({ bankAccountId: account.id })}
              disabled={removeMutation.isPending}
              className="h-8 px-2 text-muted-foreground hover:text-red-600 hover:bg-red-50"
              title="Desvincular">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Finance Page ────────────────────────────────────────────────────────
export default function Finance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<"overview"|"transactions"|"pnl"|"allocation"|"alerts">("overview");
  const [txFilter, setTxFilter] = useState<"all"|"income"|"expense">("all");
  const [txCategory, setTxCategory] = useState("all");
  const [txSearch, setTxSearch] = useState("");

  const { data: pnl, isLoading: pnlLoading, refetch: refetchPnl } =
    trpc.finance.pnl.useQuery({ year, month }, { retry: false });
  const { data: trend, isLoading: trendLoading } =
    trpc.finance.trend.useQuery({ year }, { retry: false });
  const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } =
    trpc.finance.manualTransactions.useQuery(undefined, { retry: false });
  const { data: allocation } =
    trpc.finance.allocationSettings.useQuery(undefined, { retry: false });
  const { data: partners = [] } =
    trpc.partnership.list.useQuery(undefined, { retry: false });

  const deleteMutation = trpc.finance.deleteManualTransaction.useMutation({
    onSuccess: () => { toast.success("Eliminada"); refetchTx(); refetchPnl(); },
    onError: (e) => toast.error(e.message),
  });

  const safePnl = pnl ?? {
    year, month, loadCount: 0, totalMiles: 0, loadsRevenue: 0, manualIncome: 0,
    totalRevenue: 0, expenseByCategory: {} as Record<string,number>, totalExpenses: 0,
    netProfit: 0, grossMarginPct: 0, revenuePerMile: 0, profitPerMile: 0,
    totalDraws: 0, drawsByPartner: [] as any[], retainedEarnings: 0,
    allocation: { operating: 0, ownerPay: 0, reserve: 0, growth: 0 }, taxReserve: 0,
  };
  const alloc = allocation ?? { operatingPct: 50, ownerPayPct: 20, reservePct: 20, growthPct: 10 };

  const filteredTx = useMemo(() => (transactions as any[]).filter(t => {
    if (txFilter !== "all" && t.type !== txFilter) return false;
    if (txCategory !== "all" && t.category !== txCategory) return false;
    if (txSearch && !t.name.toLowerCase().includes(txSearch.toLowerCase())) return false;
    return true;
  }), [transactions, txFilter, txCategory, txSearch]);

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
    const unc = (transactions as any[]).filter(t => t.category === "uncategorized" || !t.isReviewed).length;
    if (unc > 0) list.push({ type: "info", message: `${unc} transacción(es) sin revisar o categorizar` });
    if (safePnl.netProfit > 0 && safePnl.taxReserve > 0)
      list.push({ type: "info", message: `Reserva de impuestos recomendada: ${fmt(safePnl.taxReserve)} (20% del revenue)` });
    return list;
  }, [safePnl, transactions]);

  const exportCSV = () => {
    const rows = [
      ["Fecha","Descripción","Tipo","Categoría","Monto","Deducible","Notas"],
      ...(transactions as any[]).map(t => [
        t.date, t.name, t.type==="income"?"Ingreso":"Gasto",
        CATEGORY_LABELS[t.category]||t.category, t.amount.toFixed(2),
        t.isTaxDeductible?"Sí":"No", t.notes||"",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `wv-finanzas-${year}-${String(month).padStart(2,"0")}.csv`;
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
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel Financiero</h1>
          <p className="text-muted-foreground text-sm">WV Transport & Logistics — Control Financiero Pro</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-28 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m,i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <AddTransactionDialog onSuccess={() => { refetchTx(); refetchPnl(); }} />
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab===tab.id
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id==="alerts" && alerts.length>0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-bold">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="overview" && (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                5 Preguntas Clave — {MONTHS[month-1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pnlLoading ? <p className="text-muted-foreground text-sm">Cargando datos...</p> : (
                <>
                  {/* Q1 */}
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-blue-600 font-bold text-lg w-6 shrink-0">1</span>
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">¿Cuánto entró?</p>
                      <p className="text-2xl font-bold text-green-600">{fmt(safePnl.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {safePnl.loadCount} cargas{safePnl.totalMiles>0?` · ${safePnl.totalMiles.toFixed(0)} millas`:""}
                      </p>
                    </div>
                  </div>
                  {/* Q2 */}
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-blue-600 font-bold text-lg w-6 shrink-0">2</span>
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">¿Cuánto se fue y en qué?</p>
                      <p className="text-2xl font-bold text-red-600">{fmt(safePnl.totalExpenses)}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(safePnl.expenseByCategory).filter(([,v])=>v>0).map(([k,v]) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                            {CATEGORY_LABELS[k]}: {fmt(v)}
                          </span>
                        ))}
                        {Object.keys(safePnl.expenseByCategory).length===0 &&
                          <span className="text-xs text-muted-foreground">Sin gastos registrados</span>}
                      </div>
                    </div>
                  </div>
                  {/* Q3 */}
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-blue-600 font-bold text-lg w-6 shrink-0">3</span>
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">¿Cuánto profit real quedó?</p>
                      <p className={`text-2xl font-bold ${safePnl.netProfit>=0?"text-green-600":"text-red-600"}`}>
                        {fmt(safePnl.netProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Margen: {fmtPct(safePnl.grossMarginPct)}{safePnl.totalMiles>0?` · ${fmtMile(safePnl.profitPerMile)}`:""}
                      </p>
                    </div>
                  </div>
                  {/* Q4 */}
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-blue-600 font-bold text-lg w-6 shrink-0">4</span>
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">¿Cuánto mover a taxes/reserve/growth?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        {[
                          { label: "Operación", val: safePnl.allocation.operating, pct: alloc.operatingPct, bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
                          { label: "Owner Pay", val: safePnl.allocation.ownerPay, pct: alloc.ownerPayPct, bg: "bg-green-50 border-green-200", text: "text-green-700" },
                          { label: "Reserva/Tax", val: safePnl.allocation.reserve, pct: alloc.reservePct, bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
                          { label: "Crecimiento", val: safePnl.allocation.growth, pct: alloc.growthPct, bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
                        ].map(item => (
                          <div key={item.label} className={`text-center p-2 rounded-lg border ${item.bg}`}>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className={`text-sm font-bold ${item.text}`}>{fmt(item.val)}</p>
                            <p className="text-xs text-muted-foreground">{item.pct}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Q5 */}
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-blue-600 font-bold text-lg w-6 shrink-0">5</span>
                    <div className="flex-1">
                      <p className="text-foreground text-sm font-medium">¿Listos para escalar?</p>
                      {safePnl.profitPerMile>=0.90 ? (
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <p className="text-green-700 font-semibold">¡Sí! Profit/milla excelente ({fmtMile(safePnl.profitPerMile)})</p>
                        </div>
                      ) : safePnl.profitPerMile>=0.70 ? (
                        <div className="flex items-center gap-2 mt-1">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <p className="text-amber-700 font-semibold">Casi. Aceptable ({fmtMile(safePnl.profitPerMile)}). Meta: $0.90+</p>
                        </div>
                      ) : safePnl.profitPerMile>0 ? (
                        <div className="flex items-center gap-2 mt-1">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <p className="text-red-700 font-semibold">No. Crítico ({fmtMile(safePnl.profitPerMile)}). Mínimo: $0.70</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm mt-1">Sin datos de millas. Agrega millas en las cargas.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Revenue Total" value={fmt(safePnl.totalRevenue)} icon={TrendingUp} variant="success" sub={`${safePnl.loadCount} cargas`} />
            <KpiCard label="Gastos Totales" value={fmt(safePnl.totalExpenses)} icon={TrendingDown} variant="danger" />
            <KpiCard label="Profit Neto" value={fmt(safePnl.netProfit)} icon={DollarSign} variant={safePnl.netProfit>=0?"success":"danger"} sub={fmtPct(safePnl.grossMarginPct)+" margen"} />
            <KpiCard label="Tax Reserve" value={fmt(safePnl.taxReserve)} icon={Shield} variant="warning" sub="20% del revenue" alert={safePnl.taxReserve>0} />
          </div>

          {!trendLoading && trend && (trend as any[]).length>0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Tendencia Anual {year}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend as any[]}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                      labelStyle={{ color: "#111827" }}
                      formatter={(v: any) => [fmt(v), ""]}
                    />
                    <Legend wrapperStyle={{ color: "#374151", fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#16a34a" fill="url(#profGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: TRANSACCIONES
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="transactions" && (
        <div className="space-y-5">
          {/* Plaid Bank Accounts Panel */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Cuentas Bancarias Vinculadas
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Conecta tu banco para importar transacciones automáticamente via Plaid
                  </p>
                </div>
                <PlaidConnectButton onSuccess={() => { refetchTx(); refetchPnl(); }} />
              </div>
            </CardHeader>
            <CardContent>
              <BankAccountsPanel onRefresh={() => { refetchTx(); refetchPnl(); }} />
            </CardContent>
          </Card>

          {/* Transaction Summary Bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Ingresos",
                val: (transactions as any[]).filter(t=>t.type==="income").reduce((s:number,t:any)=>s+t.amount,0),
                color: "text-green-600", bg: "bg-green-50 border-green-200",
              },
              {
                label: "Total Gastos",
                val: (transactions as any[]).filter(t=>t.type==="expense").reduce((s:number,t:any)=>s+t.amount,0),
                color: "text-red-600", bg: "bg-red-50 border-red-200",
              },
              {
                label: "Balance Neto",
                val: (transactions as any[]).filter(t=>t.type==="income").reduce((s:number,t:any)=>s+t.amount,0)
                   - (transactions as any[]).filter(t=>t.type==="expense").reduce((s:number,t:any)=>s+t.amount,0),
                color: "text-foreground", bg: "bg-muted/50 border-border",
              },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-lg border ${item.bg}`}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{fmt(item.val)}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(["all","income","expense"] as const).map(f => (
                <button key={f} onClick={() => setTxFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    txFilter===f
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {f==="all"?"Todos":f==="income"?"Ingresos":"Gastos"}
                </button>
              ))}
            </div>
            <Select value={txCategory} onValueChange={setTxCategory}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={txSearch}
              onChange={e => setTxSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-8 text-xs w-44"
            />
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredTx.length} de {(transactions as any[]).length}
            </span>
          </div>

          {/* Transaction List */}
          {txLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Cargando transacciones...
            </div>
          ) : filteredTx.length===0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-10 text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-foreground font-medium">Sin transacciones</p>
                <p className="text-muted-foreground text-sm mt-1">
                  {(transactions as any[]).length===0
                    ? "Agrega transacciones manualmente o vincula tu banco con Plaid"
                    : "No hay transacciones que coincidan con los filtros"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {filteredTx.map((tx: any) => (
                <div key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors group">
                  {/* Category indicator */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (CATEGORY_COLORS[tx.category]||"#94a3b8") + "20" }}>
                    <div className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[tx.category]||"#94a3b8" }} />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{tx.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {CATEGORY_LABELS[tx.category]||tx.category}
                      </Badge>
                      {tx.source === "plaid" && (
                        <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200 border shrink-0">Plaid</Badge>
                      )}
                      {tx.isTaxDeductible && (
                        <Badge className="text-xs bg-green-50 text-green-700 border-green-200 border shrink-0">IRS</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tx.date}{tx.notes ? ` · ${tx.notes}` : ""}
                    </p>
                  </div>
                  {/* Amount + delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-base font-bold tabular-nums ${tx.type==="income" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type==="income" ? "+" : "−"}{fmt(tx.amount)}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate({ id: tx.id })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-all"
                      title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: P&L
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="pnl" && (
        <div className="space-y-6">
          {pnlLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Calculando P&L...
            </div>
          ) : (
            <>
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Estado de Resultados — {MONTHS[month-1]} {year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    <div className="flex justify-between py-2.5 border-b border-border">
                      <span className="text-foreground font-semibold text-sm">INGRESOS</span>
                      <span className="text-green-600 font-bold">{fmt(safePnl.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between py-2 pl-4 border-b border-border/40">
                      <span className="text-muted-foreground text-sm">Cargas ({safePnl.loadCount})</span>
                      <span className="text-foreground text-sm">{fmt(safePnl.loadsRevenue)}</span>
                    </div>
                    {safePnl.manualIncome>0 && (
                      <div className="flex justify-between py-2 pl-4 border-b border-border/40">
                        <span className="text-muted-foreground text-sm">Ingresos manuales</span>
                        <span className="text-foreground text-sm">{fmt(safePnl.manualIncome)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2.5 border-b border-border mt-1">
                      <span className="text-foreground font-semibold text-sm">GASTOS</span>
                      <span className="text-red-600 font-bold">({fmt(safePnl.totalExpenses)})</span>
                    </div>
                    {Object.entries(safePnl.expenseByCategory).filter(([,v])=>v>0).map(([k,v]) => (
                      <div key={k} className="flex justify-between py-2 pl-4 border-b border-border/40">
                        <span className="text-muted-foreground text-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: CATEGORY_COLORS[k]||"#94a3b8" }} />
                          {CATEGORY_LABELS[k]||k}
                        </span>
                        <span className="text-foreground text-sm">({fmt(v)})</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 border-t-2 border-foreground/20 mt-2">
                      <span className="text-foreground font-bold text-base">UTILIDAD NETA</span>
                      <span className={`font-bold text-xl ${safePnl.netProfit>=0?"text-green-600":"text-red-600"}`}>
                        {fmt(safePnl.netProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 pl-4">
                      <span className="text-muted-foreground text-sm">Margen bruto</span>
                      <span className="text-foreground text-sm">{fmtPct(safePnl.grossMarginPct)}</span>
                    </div>
                    {safePnl.totalMiles>0 && <>
                      <div className="flex justify-between py-2 pl-4">
                        <span className="text-muted-foreground text-sm">Revenue/milla</span>
                        <span className="text-foreground text-sm">{fmtMile(safePnl.revenuePerMile)}</span>
                      </div>
                      <div className="flex justify-between py-2 pl-4">
                        <span className="text-muted-foreground text-sm">Profit/milla</span>
                        <span className={`text-sm font-medium ${
                          safePnl.profitPerMile>=0.90?"text-green-600"
                          :safePnl.profitPerMile>=0.70?"text-amber-600":"text-red-600"
                        }`}>{fmtMile(safePnl.profitPerMile)}</span>
                      </div>
                    </>}
                    {safePnl.totalDraws>0 && <>
                      <div className="flex justify-between py-2.5 border-t border-border mt-2">
                        <span className="text-foreground font-semibold text-sm">RETIROS SOCIOS</span>
                        <span className="text-amber-600 font-bold">({fmt(safePnl.totalDraws)})</span>
                      </div>
                      {safePnl.drawsByPartner.map((d:any) => (
                        <div key={d.partnerId} className="flex justify-between py-2 pl-4">
                          <span className="text-muted-foreground text-sm">{d.partnerName}</span>
                          <span className="text-foreground text-sm">({fmt(d.amount)})</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2.5 border-t border-border">
                        <span className="text-foreground font-semibold text-sm">Ganancias Retenidas</span>
                        <span className={`font-bold ${safePnl.retainedEarnings>=0?"text-green-600":"text-red-600"}`}>
                          {fmt(safePnl.retainedEarnings)}
                        </span>
                      </div>
                    </>}
                    <div className="flex justify-between py-2.5 bg-amber-50 rounded-lg px-3 mt-3 border border-amber-200">
                      <span className="text-amber-700 text-sm font-medium flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" /> Reserva Impuestos (20% revenue)
                      </span>
                      <span className="text-amber-700 font-bold">{fmt(safePnl.taxReserve)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {expensePieData.length>0 && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Distribución de Gastos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            dataKey="value" paddingAngle={2}>
                            {expensePieData.map((entry,i) => (
                              <Cell key={i} fill={CATEGORY_COLORS[entry.key]||"#94a3b8"} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                            formatter={(v:any) => [fmt(v), ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        {expensePieData.map((d,i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[d.key]||"#94a3b8" }} />
                            <span className="text-foreground truncate">{d.name}</span>
                            <span className="text-muted-foreground ml-auto tabular-nums">{fmt(d.value)}</span>
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

      {/* ══════════════════════════════════════════════════════════════
          TAB: DISTRIBUCIÓN
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="allocation" && (
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                Modelo 50/20/20/10 — {MONTHS[month-1]} {year}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Distribución del profit neto: <span className="font-semibold text-foreground">{fmt(safePnl.netProfit)}</span>
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "Operación", pct: alloc.operatingPct, val: safePnl.allocation.operating, color: "#3b82f6", bg: "bg-blue-50 border-blue-200", text: "text-blue-700", desc: "Gastos operativos, combustible, seguros" },
                  { label: "Owner Pay", pct: alloc.ownerPayPct, val: safePnl.allocation.ownerPay, color: "#10b981", bg: "bg-green-50 border-green-200", text: "text-green-700", desc: "Retiro de socios" },
                  { label: "Reserva/Tax", pct: alloc.reservePct, val: safePnl.allocation.reserve, color: "#f59e0b", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", desc: "Impuestos IRS + emergencias" },
                  { label: "Crecimiento", pct: alloc.growthPct, val: safePnl.allocation.growth, color: "#8b5cf6", bg: "bg-purple-50 border-purple-200", text: "text-purple-700", desc: "Expansión de flota, marketing" },
                ].map(item => (
                  <div key={item.label} className={`p-4 rounded-xl border ${item.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${item.text}`}>{item.label}</span>
                      <Badge className={`text-xs border ${item.bg} ${item.text}`}>{item.pct}%</Badge>
                    </div>
                    <p className={`text-2xl font-bold ${item.text}`}>{fmt(item.val)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={allocPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                    {allocPieData.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                    formatter={(v:any) => [`${v}%`, ""]}
                  />
                  <Legend wrapperStyle={{ color: "#374151", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {(partners as any[]).length>0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Owner Payout Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(partners as any[]).map((p) => {
                    const draw = safePnl.drawsByPartner.find((d:any) => d.partnerId===p.id);
                    const allocated = safePnl.allocation.ownerPay*(parseFloat(String(p.participationPercent))/100);
                    const paid = draw?.amount||0;
                    const pending = Math.max(0, allocated-paid);
                    return (
                      <div key={p.id} className="p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-foreground font-medium">{p.partnerName}</span>
                          <Badge variant="outline">{parseFloat(String(p.participationPercent))}%</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs text-muted-foreground">Asignado</p>
                            <p className="text-sm font-bold text-blue-700">{fmt(allocated)}</p>
                          </div>
                          <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                            <p className="text-xs text-muted-foreground">Pagado</p>
                            <p className="text-sm font-bold text-green-700">{fmt(paid)}</p>
                          </div>
                          <div className={`p-2 rounded-lg border ${pending>0?"bg-amber-50 border-amber-100":"bg-muted border-border"}`}>
                            <p className="text-xs text-muted-foreground">Pendiente</p>
                            <p className={`text-sm font-bold ${pending>0?"text-amber-700":"text-muted-foreground"}`}>{fmt(pending)}</p>
                          </div>
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

      {/* ══════════════════════════════════════════════════════════════
          TAB: ALERTAS
      ══════════════════════════════════════════════════════════════ */}
      {activeTab==="alerts" && (
        <div className="space-y-4">
          {alerts.length===0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-10 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <p className="text-foreground font-semibold">Todo en orden</p>
                <p className="text-muted-foreground text-sm mt-1">No hay alertas financieras para este período.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {alerts.map((alert,i) => (
                <Card key={i} className={`border ${
                  alert.type==="error" ? "border-red-300 bg-red-50"
                  : alert.type==="warning" ? "border-amber-300 bg-amber-50"
                  : "border-blue-300 bg-blue-50"
                }`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                      alert.type==="error" ? "text-red-600"
                      : alert.type==="warning" ? "text-amber-600"
                      : "text-blue-600"
                    }`} />
                    <div>
                      <p className={`text-sm font-semibold ${
                        alert.type==="error" ? "text-red-700"
                        : alert.type==="warning" ? "text-amber-700"
                        : "text-blue-700"
                      }`}>
                        {alert.type==="error" ? "Crítico" : alert.type==="warning" ? "Advertencia" : "Información"}
                      </p>
                      <p className="text-foreground text-sm mt-0.5">{alert.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Referencia: Profit/Milla</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: "Excelente — Escalar ahora", range: "≥ $0.90/mi", bg: "bg-green-50 border-green-200", text: "text-green-700" },
                      { label: "Aceptable — Optimizar gastos", range: "$0.70 – $0.89/mi", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
                      { label: "Crítico — Revisar urgente", range: "< $0.70/mi", bg: "bg-red-50 border-red-200", text: "text-red-700" },
                    ].map((r,i) => (
                      <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border ${r.bg}`}>
                        <span className="text-foreground text-sm">{r.label}</span>
                        <span className={`font-bold text-sm ${r.text}`}>{r.range}</span>
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
