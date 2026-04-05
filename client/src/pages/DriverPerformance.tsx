import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppCard, AppCardHeader, AppCardContent } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Truck,
  DollarSign,
  Fuel,
  TrendingUp,
  Package,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

export default function DriverPerformance() {
  const { user } = useAuth();
  const driverId = user?.id;

  // 🔒 queries seguras
  const { data: stats, isLoading: statsLoading, error: statsError } =
    trpc.driverStats.getStats.useQuery(
      { driverId: driverId || 0 },
      { enabled: !!driverId, retry: false }
    );

  const { data: trends, isLoading: trendsLoading, error: trendsError } =
    trpc.driverStats.getMonthlyTrends.useQuery(
      { driverId: driverId || 0, months: 6 },
      { enabled: !!driverId, retry: false }
    );

  const {
    data: recentDeliveries,
    isLoading: deliveriesLoading,
    error: deliveriesError,
  } = trpc.driverStats.getRecentDeliveries.useQuery(
    { driverId: driverId || 0, limit: 10 },
    { enabled: !!driverId, retry: false }
  );

  const safeStats = (stats || {}) as any;
  const safeTrends = Array.isArray(trends) ? trends : [];
  const safeDeliveries = Array.isArray(recentDeliveries)
    ? recentDeliveries
    : [];

  if (statsError) console.error("stats error:", statsError);
  if (trendsError) console.error("trends error:", trendsError);
  if (deliveriesError) console.error("deliveries error:", deliveriesError);

  const isLoading =
    statsLoading || trendsLoading || deliveriesLoading;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Desempeño del Chofer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estadísticas de entregas, ingresos y eficiencia
        </p>
      </div>

      {isLoading && (
        <div className="p-4 text-sm text-muted-foreground">
          Cargando datos...
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Entregas" value={safeStats.totalDeliveries ?? 0} icon={<Package />} />
        <StatCard title="Ingresos" value={formatCurrency(safeStats.totalIncome)} icon={<DollarSign />} />
        <StatCard title="Gasolina" value={formatCurrency(safeStats.totalFuelExpense)} icon={<Fuel />} />
        <StatCard title="Margen" value={formatCurrency(safeStats.totalNetMargin)} icon={<TrendingUp />} />
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Cargas Activas" value={safeStats.activeLoads ?? 0} icon={<Truck />} />
        <StatCard title="Promedio" value={formatCurrency(safeStats.avgMarginPerDelivery)} icon={<Clock />} />
        <StatCard title="Eficiencia" value={`${safeStats.efficiency ?? 0}%`} icon={<TrendingUp />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Ingresos vs Gastos">
          {safeTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" />
                <Bar dataKey="expenses" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Margen Neto">
          {safeTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={safeTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="netMargin" stroke="#6366f1" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      {/* Deliveries */}
      <AppCard>
  <AppCardHeader title="Entregas Recientes" />
  <AppCardContent>
          {safeDeliveries.length > 0 ? (
            safeDeliveries.map((d: any) => (
              <div key={d.id} className="flex justify-between p-3 border rounded mb-2">
                <div>
                  <p>{d.clientName || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.pickupAddress || ""} → {d.deliveryAddress || ""}
                  </p>
                </div>
                <div className="text-right">
                  <p>{formatCurrency(d.price)}</p>
                  <Badge variant="outline">
                    {d.status || "N/A"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Sin entregas
            </p>
          )}
        </AppCardContent>
</AppCard>
    </div>
  );
}

/* COMPONENTES AUX */

function StatCard({ title, value, icon }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex justify-between">
        <div>
          <p className="text-xs">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
      Sin datos
    </div>
  );
}
