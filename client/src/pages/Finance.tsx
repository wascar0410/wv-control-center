import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Fuel, Wrench,
  Shield, Phone, Users, Receipt, CreditCard, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  fuel: { label: "Combustible", icon: Fuel, color: "#f59e0b" },
  maintenance: { label: "Mantenimiento", icon: Wrench, color: "#3b82f6" },
  insurance: { label: "Seguro Comercial", icon: Shield, color: "#8b5cf6" },
  subscriptions: { label: "Suscripciones", icon: Receipt, color: "#06b6d4" },
  phone: { label: "Telefonía", icon: Phone, color: "#10b981" },
  payroll: { label: "Nómina", icon: Users, color: "#f43f5e" },
  tolls: { label: "Peajes", icon: CreditCard, color: "#f97316" },
  other: { label: "Otros", icon: DollarSign, color: "#6b7280" },
  load_payment: { label: "Pago de Carga", icon: TrendingUp, color: "#22c55e" },
};

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f43f5e", "#f97316", "#6b7280"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("es-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Finance() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "fuel",
    amount: "",
    description: "",
    transactionDate: new Date().toISOString().slice(0, 10),
  });

  const utils = trpc.useUtils();

  const { data: summary, isLoading: summaryLoading } = trpc.finance.summary.useQuery(
    { year: selectedYear, month: selectedMonth }
  );
  const { data: cashFlow, isLoading: cashFlowLoading } = trpc.finance.cashFlow.useQuery(
    { year: selectedYear }
  );
  const { data: transactions, isLoading: txLoading } = trpc.finance.transactions.useQuery();

  const addExpenseMutation = trpc.finance.addExpense.useMutation({
    onSuccess: () => {
      utils.finance.summary.invalidate();
      utils.finance.cashFlow.invalidate();
      utils.finance.transactions.invalidate();
      utils.dashboard.kpis.invalidate();
      setShowExpenseForm(false);
      setExpenseForm({ category: "fuel", amount: "", description: "", transactionDate: new Date().toISOString().slice(0, 10) });
      toast.success("Gasto registrado exitosamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAddExpense = () => {
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    addExpenseMutation.mutate({
      category: expenseForm.category as any,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description || undefined,
      transactionDate: expenseForm.transactionDate,
    });
  };

  const cashFlowChartData = (cashFlow ?? []).map((d) => ({
    month: MONTHS[d?.month ? d.month - 1 : 0] ?? "Mes",
    Ingresos: d?.income ?? 0,
    Gastos: d?.expenses ?? 0,
    Utilidad: d?.profit ?? 0,
  }));

  // Expense breakdown for pie chart
  const expenseByCategory = (summary?.byCategory ?? [])
    .filter((c) => c?.type === "expense")
    .map((c, i) => ({
      name: CATEGORY_CONFIG[c?.category]?.label ?? c?.category ?? "Otro",
      value: c?.total ?? 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));

  const recentTx = (transactions ?? []).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Finanzas</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresos, gastos y flujo de caja</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-32 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowExpenseForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ingresos</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {summaryLoading ? "..." : formatCurrency(summary?.income ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Gastos</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {summaryLoading ? "..." : formatCurrency(summary?.expenses ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-border ${(summary?.netProfit ?? 0) >= 0 ? "bg-primary/5 ring-1 ring-primary/20" : "bg-red-500/5 ring-1 ring-red-500/20"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Utilidad Neta</p>
                <p className={`text-2xl font-bold mt-1 ${(summary?.netProfit ?? 0) >= 0 ? "text-primary" : "text-red-400"}`}>
                  {summaryLoading ? "..." : formatCurrency(summary?.netProfit ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ingresos − Gastos</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${(summary?.netProfit ?? 0) >= 0 ? "bg-primary/10" : "bg-red-500/10"}`}>
                <DollarSign className={`w-6 h-6 ${(summary?.netProfit ?? 0) >= 0 ? "text-primary" : "text-red-400"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Flujo de Caja {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {cashFlowLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Cargando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cashFlowChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.015 240)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.55 0.025 240)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.025 240)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.14 0.014 240)", border: "1px solid oklch(0.22 0.015 240)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number) => [formatCurrency(value)]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="Ingresos" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="Utilidad" stroke="#6366f1" fill="url(#profitGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Receipt className="w-8 h-8 opacity-30" />
                Sin gastos este mes
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "oklch(0.14 0.014 240)", border: "1px solid oklch(0.22 0.015 240)", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number) => [formatCurrency(value)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {expenseByCategory.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
          ) : recentTx.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay transacciones registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTx.map((tx) => {
                const catCfg = CATEGORY_CONFIG[tx.category] ?? CATEGORY_CONFIG.other;
                const CatIcon = catCfg.icon;
                return (
                  <div key={tx.id} className="flex items-center gap-3 px-6 py-3 hover:bg-accent/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${catCfg.color}20` }}>
                      <CatIcon className="w-4 h-4" style={{ color: catCfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.description ?? catCfg.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.transactionDate)} · {catCfg.label}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-sm font-bold ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(parseFloat(String(tx.amount)))}
                      </span>
                      <Badge variant="outline" className={`text-xs mt-0.5 ${tx.type === "income" ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}`}>
                        {tx.type === "income" ? "Ingreso" : "Gasto"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG)
                    .filter(([k]) => k !== "load_payment")
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <v.icon className="w-4 h-4" style={{ color: v.color }} />
                          {v.label}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto ($) *</Label>
              <Input
                type="number" placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Descripción del gasto..."
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={expenseForm.transactionDate}
                onChange={(e) => setExpenseForm((f) => ({ ...f, transactionDate: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExpenseForm(false)}>Cancelar</Button>
            <Button onClick={handleAddExpense} disabled={addExpenseMutation.isPending}>
              {addExpenseMutation.isPending ? "Guardando..." : "Registrar Gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
