import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { Download, TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function AccountingFinance() {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Queries
  const { data: transactions } = trpc.finance.transactions.useQuery();
  const { data: cashFlow } = trpc.finance.cashFlow.useQuery({ year: new Date().getFullYear() });
  const { data: kpis } = trpc.dashboard.kpis.useQuery();

  // Calculate accounting metrics
  const calculateMetrics = () => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        incomeByCategory: {},
        expenseByCategory: {},
      };
    }

    const income = transactions.filter((t) => t.type === "income");
    const expenses = transactions.filter((t) => t.type === "expense");

    const totalIncome = income.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
    const netProfit = totalIncome - totalExpenses;

    // Group by category
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    income.forEach((t) => {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + parseFloat(String(t.amount));
    });

    expenses.forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + parseFloat(String(t.amount));
    });

    return { totalIncome, totalExpenses, netProfit, incomeByCategory, expenseByCategory };
  };

  const metrics = calculateMetrics();

  // Prepare chart data
  const incomeChartData = Object.entries(metrics.incomeByCategory).map(([category, amount]) => ({
    name: category,
    value: amount,
  }));

  const expenseChartData = Object.entries(metrics.expenseByCategory).map(([category, amount]) => ({
    name: category,
    value: amount,
  }));

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  const handleExportReport = () => {
    toast.success("Reporte exportado (funcionalidad próxima)");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Finanzas Contables</h1>
          <p className="text-muted-foreground mt-1">Control financiero y auditoría de la empresa</p>
        </div>
        <Button onClick={handleExportReport} size="lg" variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                <p className="text-3xl font-bold text-green-600 mt-2">${metrics.totalIncome.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gastos Totales</p>
                <p className="text-3xl font-bold text-red-600 mt-2">${metrics.totalExpenses.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilidad Neta</p>
                <p className={`text-3xl font-bold mt-2 ${metrics.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  ${metrics.netProfit.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income vs Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Ingresos vs Gastos</CardTitle>
                <CardDescription>Comparativa mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[{ name: "Mes", ingresos: metrics.totalIncome, gastos: metrics.totalExpenses }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" />
                    <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profit Margin */}
            <Card>
              <CardHeader>
                <CardTitle>Margen de Ganancia</CardTitle>
                <CardDescription>Rentabilidad del período</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-5xl font-bold text-blue-600">
                    {metrics.totalIncome > 0 ? ((metrics.netProfit / metrics.totalIncome) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Margen Neto</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Flujo de Caja</CardTitle>
              <CardDescription>Tendencia de ingresos y gastos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cashFlow || []}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Categoría</CardTitle>
                <CardDescription>Distribución de ingresos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={incomeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `$${parseFloat(String(value)).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.incomeByCategory).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="capitalize text-sm font-medium">{category}</span>
                      <span className="text-green-600 font-semibold">${amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {Object.keys(metrics.incomeByCategory).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin ingresos registrados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Gastos por Categoría</CardTitle>
                <CardDescription>Distribución de gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `$${parseFloat(String(value)).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalle de Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.expenseByCategory).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="capitalize text-sm font-medium">{category}</span>
                      <span className="text-red-600 font-semibold">${amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {Object.keys(metrics.expenseByCategory).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin gastos registrados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transacciones</CardTitle>
              <CardDescription>Auditoría completa de movimientos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold">Categoría</th>
                      <th className="text-left py-3 px-4 font-semibold">Descripción</th>
                      <th className="text-right py-3 px-4 font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions && transactions.length > 0 ? (
                      transactions.map((t) => (
                        <tr key={t.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 text-xs">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={t.type === "income" ? "default" : "destructive"}>
                              {t.type === "income" ? "Ingreso" : "Gasto"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 capitalize text-xs">{t.category}</td>
                          <td className="py-3 px-4 text-xs">{t.description}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                            {t.type === "income" ? "+" : "-"}${parseFloat(String(t.amount)).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          Sin transacciones registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
