/**
 * LoadsDispatch.tsx
 * Unified Loads & Dispatch - The operational heart of WV Control Center
 * Pipeline: Available → Quoted → Assigned → In Transit → Delivered → Invoiced → Paid
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Package,
  Truck,
  MapPin,
  DollarSign,
  CheckCircle,
  Plus,
  FileText,
  ChevronDown,
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
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${s.color}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

function formatCurrency(value: number | string | null | undefined) {
  const num =
    typeof value === "string" ? Number.parseFloat(value) : Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
}

// Create Load Modal
function CreateLoadModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    clientName: "",
    pickupAddress: "",
    deliveryAddress: "",
    weight: "",
    weightUnit: "lbs",
    merchandiseType: "",
    price: "",
    estimatedFuel: "0",
    estimatedTolls: "0",
    notes: "",
  });

  const createMutation = trpc.loads.create.useMutation({
    onSuccess: () => {
      toast.success("Carga creada exitosamente");
      setFormData({
        clientName: "",
        pickupAddress: "",
        deliveryAddress: "",
        weight: "",
        weightUnit: "lbs",
        merchandiseType: "",
        price: "",
        estimatedFuel: "0",
        estimatedTolls: "0",
        notes: "",
      });
      onClose();
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    if (
      !formData.clientName ||
      !formData.pickupAddress ||
      !formData.deliveryAddress ||
      !formData.weight ||
      !formData.price
    ) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    createMutation.mutate({
      clientName: formData.clientName,
      pickupAddress: formData.pickupAddress,
      deliveryAddress: formData.deliveryAddress,
      weight: Number.parseFloat(formData.weight),
      weightUnit: formData.weightUnit,
      merchandiseType: formData.merchandiseType,
      price: Number.parseFloat(formData.price),
      estimatedFuel: Number.parseFloat(formData.estimatedFuel),
      estimatedTolls: Number.parseFloat(formData.estimatedTolls),
      notes: formData.notes,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="max-h-96 w-full max-w-2xl overflow-y-auto">
        <CardHeader>
          <CardTitle>Nueva Carga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Cliente"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
            <Input
              placeholder="Mercancía"
              value={formData.merchandiseType}
              onChange={(e) => setFormData({ ...formData, merchandiseType: e.target.value })}
            />
            <Input
              placeholder="Origen"
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
            />
            <Input
              placeholder="Destino"
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Peso"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
              <select
                value={formData.weightUnit}
                onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
                <option value="tons">tons</option>
              </select>
            </div>
            <Input
              placeholder="Tarifa ($)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Input
              placeholder="Combustible Est. ($)"
              type="number"
              value={formData.estimatedFuel}
              onChange={(e) => setFormData({ ...formData, estimatedFuel: e.target.value })}
            />
            <Input
              placeholder="Peajes Est. ($)"
              type="number"
              value={formData.estimatedTolls}
              onChange={(e) => setFormData({ ...formData, estimatedTolls: e.target.value })}
            />
          </div>

          <Input
            placeholder="Notas (opcional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              Crear Carga
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Change Status Modal
function ChangeStatusModal({
  isOpen,
  onClose,
  loadId,
  currentStatus,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  loadId: number;
  currentStatus: string;
  onSuccess: () => void;
}) {
  const [newStatus, setNewStatus] = useState("");

  const updateStatusMutation = trpc.loads.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado");
      onClose();
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    if (!newStatus) {
      toast.error("Selecciona un estado");
      return;
    }

    updateStatusMutation.mutate({
      id: loadId,
      status: newStatus as any,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cambiar Estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Estado actual</p>
            <StatusBadge status={currentStatus} />
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Nuevo estado</p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            >
              <option value="">Selecciona estado...</option>
              {LOAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={updateStatusMutation.isPending}>
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Load Board Tab
function LoadBoardTab() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "income" | "distance">("date");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null);
  const [selectedLoadStatus, setSelectedLoadStatus] = useState("");

  const { data: loads = [], refetch } = trpc.loads.list.useQuery();

  const filteredLoads = useMemo(() => {
    let result = [...loads];

    if (searchTerm) {
      result = result.filter(
        (l: any) =>
          l.pickupAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.deliveryAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(l.id).includes(searchTerm)
      );
    }

    if (filterStatus) {
      result = result.filter((l: any) => l.status === filterStatus);
    }

    if (sortBy === "income") {
      result.sort((a: any, b: any) => (Number(b.estimatedIncome) || 0) - (Number(a.estimatedIncome) || 0));
    } else if (sortBy === "distance") {
      result.sort((a: any, b: any) => (Number(b.totalMiles) || 0) - (Number(a.totalMiles) || 0));
    } else {
      result.sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    }

    return result;
  }, [loads, searchTerm, filterStatus, sortBy]);

  const stats = useMemo(() => {
    return {
      total: loads.length,
      available: loads.filter((l: any) => l.status === "available").length,
      active: loads.filter((l: any) => ["assigned", "in_transit"].includes(l.status)).length,
      completed: loads.filter((l: any) => l.status === "delivered").length,
      totalIncome: loads.reduce(
        (sum: number, l: any) => sum + (Number(l.estimatedIncome) || 0),
        0
      ),
    };
  }, [loads]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
      <div className="flex flex-wrap gap-2">
        <div className="min-w-64 flex-1">
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
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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
          onChange={(e) => setSortBy(e.target.value as "date" | "income" | "distance")}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="date">Más recientes</option>
          <option value="income">Mayor ingreso</option>
          <option value="distance">Mayor distancia</option>
        </select>

        <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Nueva Carga
        </Button>
      </div>

      {/* Load List */}
      <div className="space-y-3">
        {filteredLoads.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>No hay cargas para mostrar</p>
          </div>
        ) : (
          filteredLoads.map((load: any) => (
            <Card key={load.id} className="transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="font-semibold">Carga #{load.id}</p>
                      <StatusBadge status={load.status} />
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground md:grid-cols-4">
                      <div>
                        <p className="text-xs">Origen</p>
                        <p className="font-medium text-foreground">{load.pickupAddress || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs">Destino</p>
                        <p className="font-medium text-foreground">{load.deliveryAddress || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs">Distancia</p>
                        <p className="font-medium text-foreground">{load.totalMiles || 0} mi</p>
                      </div>
                      <div>
                        <p className="text-xs">Ingreso Est.</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(load.estimatedIncome || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/loads/${load.id}`)}
                    >
                      Ver Detalles
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedLoadId(load.id);
                        setSelectedLoadStatus(load.status);
                        setStatusModalOpen(true);
                      }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateLoadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          void refetch();
        }}
      />

      {selectedLoadId !== null && (
        <ChangeStatusModal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          loadId={selectedLoadId}
          currentStatus={selectedLoadStatus}
          onSuccess={() => {
            void refetch();
          }}
        />
      )}
    </div>
  );
}

// Pipeline Tab
function PipelineTab() {
  const { data: loads = [] } = trpc.loads.list.useQuery();

  const loadsByStatus = useMemo(() => {
    const result: Record<string, any[]> = {};
    LOAD_STATUSES.forEach((s) => {
      result[s.value] = [];
    });

    loads.forEach((load: any) => {
      if (result[load.status]) {
        result[load.status].push(load);
      }
    });

    return result;
  }, [loads]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4">
        {LOAD_STATUSES.map((status) => (
          <div key={status.value} className="w-72 flex-shrink-0">
            <div className={`rounded-lg border-2 p-4 ${status.color}`}>
              <div className="mb-3 flex items-center gap-2">
                <status.icon className="h-4 w-4" />
                <p className="text-sm font-semibold">{status.label}</p>
                <Badge variant="outline" className="ml-auto">
                  {loadsByStatus[status.value].length}
                </Badge>
              </div>

              <div className="max-h-96 space-y-2 overflow-y-auto">
                {loadsByStatus[status.value].map((load: any) => (
                  <Card key={load.id} className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="p-2 text-xs">
                      <p className="font-semibold">#{load.id}</p>
                      <p className="truncate text-muted-foreground">{load.pickupAddress}</p>
                      <p className="truncate text-muted-foreground">→ {load.deliveryAddress}</p>
                      <p className="mt-1 font-medium text-green-600">
                        {formatCurrency(load.estimatedIncome || 0)}
                      </p>
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
  const { data: loads = [] } = trpc.loads.list.useQuery();

  const analytics = useMemo(() => {
    const completed = loads.filter((l: any) => l.status === "delivered");
    const avgIncome =
      completed.length > 0
        ? completed.reduce((sum: number, l: any) => sum + (Number(l.estimatedIncome) || 0), 0) /
          completed.length
        : 0;

    const avgMiles =
      completed.length > 0
        ? completed.reduce((sum: number, l: any) => sum + (Number(l.totalMiles) || 0), 0) /
          completed.length
        : 0;

    const totalCompleted = completed.reduce(
      (sum: number, l: any) => sum + (Number(l.estimatedIncome) || 0),
      0
    );

    return {
      completed: completed.length,
      avgIncome,
      avgMiles,
      totalCompleted,
    };
  }, [loads]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Cargas Completadas</p>
          <p className="text-2xl font-bold">{analytics.completed}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Ingreso Promedio</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(analytics.avgIncome)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Millas Promedio</p>
          <p className="text-lg font-bold">{analytics.avgMiles.toFixed(0)} mi</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Ingreso Total</p>
          <p className="text-lg font-bold text-green-600">
            {formatCurrency(analytics.totalCompleted)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Component
export default function LoadsDispatch() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Cargas & Dispatch</h1>
        <p className="text-muted-foreground">Gestión completa del pipeline operacional</p>
      </div>

      <Tabs defaultValue="board" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="board">Load Board</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
