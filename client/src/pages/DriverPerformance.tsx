import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Truck, DollarSign, Fuel, TrendingUp, Package, Clock } from "lucide-react";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default function DriverPerformance() {
  const auth = useAuth();
  const driverId = auth.user?.id ?? 0;

  const { data: stats, isLoading: statsLoading } = trpc.driverStats.getStats.useQuery({ driverId });
  const { data: trends, isLoading: trendsLoading } = trpc.driverStats.getMonthlyTrends.useQuery({ driverId, months: 6 });
  const { data: recentDeliveries, isLoading: deliveriesLoading } = trpc.driverStats.getRecentDeliveries.useQuery({ driverId, limit: 10 });

  if (statsLoading || trendsLoading || deliveriesLoading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-foreground">Desempeño del Chofer</h1>
        <div className="p-8 text-center text-muted-foreground">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Desempeño del Chofer</h1>
        <p className="text-sm text-muted-foreground mt-1">Estadísticas de entregas, ingresos y eficiencia</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Entregas Totales</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalDeliveries ?? 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Ingresos Totales</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats?.totalIncome ?? 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Gastos de Gasolina</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats?.totalFuelExpense ?? 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Fuel className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Margen Neto Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats?.totalNetMargin ?? 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Cargas Activas</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.activeLoads ?? 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Margen Promedio</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats?.avgMarginPerDelivery ?? 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Eficiencia</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.efficiency ?? 0}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-pink-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income vs Expenses Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Ingresos vs Gastos (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                    formatter={(value: any) => formatCurrency(typeof value === 'number' ? value : 0)}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Ingresos" />
                  <Bar dataKey="expenses" fill="#f59e0b" name="Gastos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-muted-foreground">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Net Margin Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Margen Neto (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                    formatter={(value: any) => formatCurrency(typeof value === 'number' ? value : 0)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="netMargin" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: "#6366f1", r: 4 }}
                    name="Margen Neto"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-muted-foreground">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deliveries Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Entregas por Mes</CardTitle>
        </CardHeader>
        <CardContent>
          {trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                />
                <Legend />
                <Bar dataKey="deliveries" fill="#3b82f6" name="Entregas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-250 flex items-center justify-center text-muted-foreground">
              Sin datos disponibles
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Entregas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDeliveries && recentDeliveries.length > 0 ? (
            <div className="space-y-3">
              {recentDeliveries.map((delivery: any) => (
                <div key={delivery.id} className="flex items-start justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{delivery.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {delivery.pickupAddress} → {delivery.deliveryAddress}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-foreground">{formatCurrency(delivery.price)}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {delivery.status === "paid" ? "Pagada" : delivery.status === "invoiced" ? "Facturada" : "Entregada"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No hay entregas registradas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
