/**
 * LoadsDispatch.tsx
 * Unified Loads & Dispatch - The operational heart of WV Control Center
 * Pipeline: Available → Quoted → Assigned → In Transit → Delivered → Invoiced → Paid
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  Plus,
  BarChart3,
  FileText,
  Zap,
} from "lucide-react";

// Status pipeline
const LOAD_STATUSES = [
  { value: "available", label: "Disponible", color: "bg-blue-500/20 text-blue-300", icon: Package },
  { value: "quoted", label: "Cotizado", color: "bg-purple-500/20 text-purple-300", icon: FileText },
  { value: "assigned", label: "Asignado", color: "bg-yellow-500/20 text-yellow-300", icon: Truck },
  { value: "in_transit", label: "En Tránsito", color: "bg-orange-500/20 text-orange-300", icon: MapPin },
  { value: "delivered", label: "Entregado", color: "bg-green-500/20 text-green-300", icon: CheckCircle },
  { value: "invoiced", label: "Facturado", color: "bg-indigo-500/20 text-indigo-300", icon: FileText },
  { value: "paid", label: "Pagado", color: "bg-emerald-500/20 text-emerald-300", icon: DollarSign },
];

function StatusBadge({ status }: { status: string }) {
  const s = LOAD_STATUSES.find((st) => st.value === status);
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${s.color}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

// Load Board Tab
function LoadBoardTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "income" | "distance">("date");

  const { data: loads } = trpc.loads.getActive.useQuery();

  const filteredLoads = useMemo(() => {
    let result = loads || [];

    if (searchTerm) {
      result = result.filter(
        (l: any) =>
          l.pickupLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.deliveryLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.id.toString().includes(searchTerm)
      );
    }

    if (filterStatus) {
      result = result.filter((l: any) => l.status === filterStatus);
    }

    if (sortBy === "income") {
      result.sort((a: any, b: any) => (b.estimatedIncome || 0) - (a.estimatedIncome || 0));
    } else if (sortBy === "distance") {
      result.sort((a: any, b: any) => (b.totalMiles || 0) - (a.totalMiles || 0));
    } else {
      result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [loads, searchTerm, filterStatus, sortBy]);

  const stats = useMemo(() => {
    if (!loads) return { total: 0, available: 0, active: 0, completed: 0, totalIncome: 0 };
    return {
      total: loads.length,
      available: loads.filter((l: any) => l.status === "available").length,
      active: loads.filter((l: any) => ["assigned", "in_transit"].includes(l.status)).length,
      completed: loads.filter((l: any) => l.status === "delivered").length,
      totalIncome: loads.reduce((sum: number, l: any) => sum + (l.estimatedIncome || 0), 0),
    };
  }, [loads]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Disponibles</p>
            <p className="text-2xl font-bold text-blue-600">{stats.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Activas</p>
            <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Completadas</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Ingreso Total</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar por ubicación o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
        </div>
        <select
          value={filterStatus || ""}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Todos los estados</option>
          {LOAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm"
        >
          <option value="date">Más recientes</option>
          <option value="income">Mayor ingreso</option>
          <option value="distance">Mayor distancia</option>
        </select>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Carga
        </Button>
      </div>

      {/* Load List */}
      <div className="space-y-3">
        {filteredLoads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay cargas para mostrar</p>
          </div>
        ) : (
          filteredLoads.map((load: any) => (
            <Card key={load.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">Carga #{load.id}</p>
                      <StatusBadge status={load.status} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mb-2">
                      <div>
                        <p className="text-xs">Origen</p>
                        <p className="font-medium text-foreground">{load.pickupLocation || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs">Destino</p>
                        <p className="font-medium text-foreground">{load.deliveryLocation || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs">Distancia</p>
                        <p className="font-medium text-foreground">{load.totalMiles || 0} mi</p>
                      </div>
                      <div>
                        <p className="text-xs">Ingreso Est.</p>
                        <p className="font-medium text-green-600">{formatCurrency(load.estimatedIncome || 0)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {load.broker && <span>Broker: {load.broker}</span>}
                      {load.assignedDriver && <span>Chofer: {load.assignedDriver}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Ver Detalles
                    </Button>
                    <Button size="sm" variant="ghost">
                      ⋯
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Pipeline Tab
function PipelineTab() {
  const { data: loads } = trpc.loads.getActive.useQuery();

  const loadsByStatus = useMemo(() => {
    const result: Record<string, any[]> = {};
    LOAD_STATUSES.forEach((s) => {
      result[s.value] = [];
    });
    loads?.forEach((load: any) => {
      if (result[load.status]) {
        result[load.status].push(load);
      }
    });
    return result;
  }, [loads]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {LOAD_STATUSES.map((status) => (
          <div key={status.value} className="flex-shrink-0 w-72">
            <div className={`rounded-lg border-2 p-4 ${status.color}`}>
              <div className="flex items-center gap-2 mb-3">
                {status.icon && <status.icon className="w-4 h-4" />}
                <p className="font-semibold text-sm">{status.label}</p>
                <Badge variant="outline" className="ml-auto">
                  {loadsByStatus[status.value].length}
                </Badge>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loadsByStatus[status.value].map((load: any) => (
                  <Card key={load.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-2 text-xs">
                      <p className="font-semibold">#{load.id}</p>
                      <p className="text-muted-foreground truncate">{load.pickupLocation}</p>
                      <p className="text-muted-foreground truncate">→ {load.deliveryLocation}</p>
                      <p className="font-medium text-green-600 mt-1">{formatCurrency(load.estimatedIncome || 0)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Analytics Tab
function AnalyticsTab() {
  const { data: loads } = trpc.loads.getActive.useQuery();

  const analytics = useMemo(() => {
    if (!loads) return null;
    const completed = loads.filter((l: any) => l.status === "delivered");
    const avgIncome = completed.length > 0 ? completed.reduce((sum: number, l: any) => sum + (l.estimatedIncome || 0), 0) / completed.length : 0;
    const avgMiles = completed.length > 0 ? completed.reduce((sum: number, l: any) => sum + (l.totalMiles || 0), 0) / completed.length : 0;
    const totalCompleted = completed.reduce((sum: number, l: any) => sum + (l.estimatedIncome || 0), 0);

    return {
      completed: completed.length,
      avgIncome,
      avgMiles,
      totalCompleted,
      completionRate: loads.length > 0 ? (completed.length / loads.length) * 100 : 0,
    };
  }, [loads]);

  if (!analytics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cargas Completadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{analytics.completed}</p>
          <p className="text-xs text-muted-foreground mt-1">Tasa: {analytics.completionRate.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ingreso Promedio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(analytics.avgIncome)}</p>
          <p className="text-xs text-muted-foreground mt-1">Por carga completada</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Distancia Promedio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{analytics.avgMiles.toFixed(0)} mi</p>
          <p className="text-xs text-muted-foreground mt-1">Por carga completada</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ingreso Total</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(analytics.totalCompleted)}</p>
          <p className="text-xs text-muted-foreground mt-1">De cargas completadas</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Component
export default function LoadsDispatch() {
  const [activeTab, setActiveTab] = useState("board");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Loads & Dispatch</h1>
        <p className="text-muted-foreground">Centro operacional: Available → Quoted → Assigned → In Transit → Delivered → Invoiced → Paid</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="board" className="gap-2">
            <Package className="w-4 h-4" />
            Load Board
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <Zap className="w-4 h-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-4">
          <LoadBoardTab />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <PipelineTab />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cargas</CardTitle>
              <CardDescription>Últimas 100 cargas completadas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Historial próximamente</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
