/**
 * DriverDashboard.tsx
 * Design: Dark operational dashboard — personal for drivers, fleet-wide for owners
 * - Owner: Fleet KPIs (all loads, all drivers, total revenue, efficiency)
 * - Driver: Personal KPIs (my deliveries, my earnings, my fuel, my margin)
 * - Active load banner, recent deliveries, quick actions
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  DollarSign,
  Fuel,
  TrendingUp,
  Package,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Star,
  Users,
  Activity,
  BarChart3,
} from "lucide-react";

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Owner Fleet Dashboard ────────────────────────────────────────────────────
function OwnerFleetDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: fleetStats, isLoading: statsLoading } =
    trpc.driverStats.getFleetStats.useQuery(undefined, { retry: false });

  const { data: recentDeliveries, isLoading: deliveriesLoading } =
    trpc.driverStats.getFleetRecentDeliveries.useQuery({ limit: 5 }, { retry: false });

  const { data: myLoads } = trpc.driver.myLoads.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const inTransitLoads = myLoads?.filter((l: any) => l.status === "in_transit") ?? [];
  const safeStats = (fleetStats as any) || {};
  const safeDeliveries = Array.isArray(recentDeliveries) ? recentDeliveries : [];
  const isLoading = statsLoading || deliveriesLoading;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Fleet Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user ? `Welcome back, ${(user as any).name?.split(" ")[0] ?? "Owner"}` : "Operations overview"}
            {" · "}
            <span className="text-amber-400 font-medium">Owner View</span>
          </p>
        </div>
        <Button
          onClick={() => setLocation("/loads")}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Package className="w-4 h-4" />
          All Loads
        </Button>
      </div>

      {/* Active Loads Alert */}
      {inTransitLoads.length > 0 && (
        <div
          className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 cursor-pointer hover:bg-amber-500/15 transition-colors"
          onClick={() => setLocation("/loads")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-0.5">
                Fleet Active
              </p>
              <p className="font-semibold text-foreground">
                {inTransitLoads.length} load{inTransitLoads.length > 1 ? "s" : ""} currently in transit
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {inTransitLoads.slice(0, 3).map((l: any) => (
                  <span key={l.id} className="text-xs text-muted-foreground truncate max-w-[160px]">
                    #{l.id} {l.clientName}
                  </span>
                ))}
                {inTransitLoads.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{inTransitLoads.length - 3} more</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Fleet KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Deliveries"
            value={safeStats.totalDeliveries ?? 0}
            icon={<Package className="w-5 h-5" />}
            color="blue"
            subtitle="All time"
          />
          <KPICard
            title="Total Revenue"
            value={formatCurrency(safeStats.totalIncome)}
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
            subtitle="Paid loads"
          />
          <KPICard
            title="This Month"
            value={formatCurrency(safeStats.monthIncome)}
            icon={<BarChart3 className="w-5 h-5" />}
            color="purple"
            subtitle="Monthly revenue"
          />
          <KPICard
            title="Net Margin"
            value={formatCurrency(safeStats.totalNetMargin)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="orange"
            subtitle="After expenses"
          />
        </div>
      )}

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{safeStats.activeLoads ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Active Loads</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{safeStats.inTransitLoads ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">In Transit</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(safeStats.avgMarginPerDelivery)}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg per Load</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{safeStats.efficiency ?? 0}%</p>
          <p className="text-xs text-muted-foreground mt-1">Efficiency</p>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent Deliveries (Fleet)</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={() => setLocation("/loads")}
          >
            View All <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        {safeDeliveries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No deliveries yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {safeDeliveries.map((delivery: any) => (
              <div
                key={delivery.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setLocation(`/loads/${delivery.id}`)}
              >
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{delivery.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {delivery.pickupAddress} → {delivery.deliveryAddress}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-green-400">{formatCurrency(delivery.price)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {formatDate(delivery.deliveryDate || delivery.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="h-16 flex-col gap-1.5 border-border hover:border-primary/50"
            onClick={() => setLocation("/loads")}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs">All Loads</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1.5 border-border hover:border-primary/50"
            onClick={() => setLocation("/driver")}
          >
            <Truck className="w-5 h-5" />
            <span className="text-xs">Driver View</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1.5 border-border hover:border-primary/50"
            onClick={() => setLocation("/finance")}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-xs">Finances</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1.5 border-border hover:border-primary/50"
            onClick={() => setLocation("/driver-performance")}
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs">Performance</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Driver Personal Dashboard ────────────────────────────────────────────────
function DriverPersonalDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const driverId = (user as any)?.id;

  const { data: stats, isLoading: statsLoading } = trpc.driverStats.getStats.useQuery(
    { driverId: driverId || 0 },
    { enabled: !!driverId, retry: false }
  );

  const { data: recentDeliveries, isLoading: deliveriesLoading } =
    trpc.driverStats.getRecentDeliveries.useQuery(
      { driverId: driverId || 0, limit: 5 },
      { enabled: !!driverId, retry: false }
    );

  const { data: myLoads } = trpc.driver.myLoads.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const activeLoad = myLoads?.find((l: any) => l.status === "in_transit");
  const pendingLoads = myLoads?.filter(
    (l: any) => l.status === "available" && l.assignedDriverId === driverId
  );

  const safeStats = (stats as any) || {};
  const safeDeliveries = Array.isArray(recentDeliveries) ? recentDeliveries : [];
  const isLoading = statsLoading || deliveriesLoading;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {user ? `Welcome, ${(user as any).name?.split(" ")[0] ?? "Driver"}` : "Driver Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your personal operations center</p>
        </div>
        <Button
          onClick={() => setLocation("/driver")}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Truck className="w-4 h-4" />
          My Loads
        </Button>
      </div>

      {/* Active Load Banner */}
      {activeLoad && (
        <div
          className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 cursor-pointer hover:bg-amber-500/15 transition-colors"
          onClick={() => setLocation(`/driver/loads/${activeLoad.id}`)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-0.5">
                  Active Load — In Transit
                </p>
                <p className="font-semibold text-foreground">{activeLoad.clientName}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[160px]">{activeLoad.pickupAddress}</span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[160px]">{activeLoad.deliveryAddress}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold text-amber-400">{formatCurrency(activeLoad.price)}</p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground justify-end">
                <span>View Details</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Loads Alert */}
      {pendingLoads && pendingLoads.length > 0 && !activeLoad && (
        <div
          className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 cursor-pointer hover:bg-blue-500/15 transition-colors"
          onClick={() => setLocation("/driver")}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-300">
                {pendingLoads.length} load{pendingLoads.length > 1 ? "s" : ""} assigned to you
              </p>
              <p className="text-xs text-muted-foreground">Tap to review and accept</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400 ml-auto" />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Deliveries"
            value={safeStats.totalDeliveries ?? 0}
            icon={<Package className="w-5 h-5" />}
            color="blue"
            subtitle="Total completed"
          />
          <KPICard
            title="Earnings"
            value={formatCurrency(safeStats.totalIncome)}
            icon={<DollarSign className="w-5 h-5" />}
            color="green"
            subtitle="Total revenue"
          />
          <KPICard
            title="Fuel Cost"
            value={formatCurrency(safeStats.totalFuelExpense)}
            icon={<Fuel className="w-5 h-5" />}
            color="orange"
            subtitle="Total spent"
          />
          <KPICard
            title="Net Margin"
            value={formatCurrency(safeStats.totalNetMargin)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="purple"
            subtitle="After expenses"
          />
        </div>
      )}

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{safeStats.activeLoads ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Active Loads</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(safeStats.avgMarginPerDelivery)}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg per Load</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{safeStats.efficiency ?? 0}%</p>
          <p className="text-xs text-muted-foreground mt-1">Efficiency</p>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent Deliveries</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={() => setLocation("/driver-performance")}
          >
            View All <ChevronRight className="w-3 h-3" />
          </Button>
        </div>

        {safeDeliveries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No deliveries yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your completed loads will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {safeDeliveries.map((delivery: any) => (
              <div
                key={delivery.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setLocation(`/driver/loads/${delivery.id}`)}
              >
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{delivery.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {delivery.pickupAddress} → {delivery.deliveryAddress}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-green-400">{formatCurrency(delivery.price)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {formatDate(delivery.deliveryDate || delivery.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-16 flex-col gap-1.5 border-border hover:border-primary/50"
            onClick={() => setLocation("/driver")}
          >
            <Truck className="w-5 h-5" />
            <span className="text-xs">My Loads</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col gap-1.5 border-border hover:border-primary/50"
            onClick={() => setLocation("/driver-performance")}
          >
            <Star className="w-5 h-5" />
            <span className="text-xs">Performance</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export: Role-based dashboard ───────────────────────────────────────
export default function DriverDashboard() {
  const { user } = useAuth();
  const role = (user as any)?.role;

  if (role === "owner" || role === "admin") {
    return <OwnerFleetDashboard />;
  }
  return <DriverPersonalDashboard />;
}

// ─── Shared KPI Card ─────────────────────────────────────────────────────────
function KPICard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "green" | "orange" | "purple";
  subtitle?: string;
}) {
  const colorMap = {
    blue: "text-blue-400 bg-blue-500/15",
    green: "text-green-400 bg-green-500/15",
    orange: "text-orange-400 bg-orange-500/15",
    purple: "text-purple-400 bg-purple-500/15",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`w-9 h-9 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        <span className={colorMap[color].split(" ")[0]}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
      <p className="text-xs font-medium text-foreground mt-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}
