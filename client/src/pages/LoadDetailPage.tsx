/**
 * LoadDetailPage.tsx
 * Detailed view and management of a single load
 * Allows editing, changing status, and viewing history
 */
import { useState } from "react";
import { useParams, useNavigate } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Save, X, Truck, MapPin, DollarSign, Calendar } from "lucide-react";

const LOAD_STATUSES = [
  { value: "available", label: "Disponible", color: "bg-blue-500/20 text-blue-300" },
  { value: "quoted", label: "Cotizado", color: "bg-purple-500/20 text-purple-300" },
  { value: "assigned", label: "Asignado", color: "bg-yellow-500/20 text-yellow-300" },
  { value: "in_transit", label: "En Tránsito", color: "bg-orange-500/20 text-orange-300" },
  { value: "delivered", label: "Entregado", color: "bg-green-500/20 text-green-300" },
  { value: "invoiced", label: "Facturado", color: "bg-indigo-500/20 text-indigo-300" },
  { value: "paid", label: "Pagado", color: "bg-emerald-500/20 text-emerald-300" },
];

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-ES", { year: "numeric", month: "short", day: "numeric" });
}

export default function LoadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  const loadId = parseInt(id || "0", 10);
  const { data: load, isLoading, refetch } = trpc.loads.byId.useQuery({ id: loadId });
  const updateMutation = trpc.loads.update.useMutation({
    onSuccess: () => {
      toast.success("Carga actualizada");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateStatusMutation = trpc.loads.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado");
      setIsChangingStatus(false);
      setNewStatus("");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const [editData, setEditData] = useState<any>({});

  if (isLoading) return <div className="text-center py-12">Cargando...</div>;
  if (!load) return <div className="text-center py-12 text-red-500">Carga no encontrada</div>;

  const statusObj = LOAD_STATUSES.find((s) => s.value === load.status);

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: loadId,
      ...editData,
    });
  };

  const handleChangeStatus = () => {
    if (!newStatus) {
      toast.error("Selecciona un estado");
      return;
    }
    updateStatusMutation.mutate({
      id: loadId,
      status: newStatus as any,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/loads-dispatch")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Carga #{load.id}</h1>
        {statusObj && (
          <Badge className={statusObj.color}>{statusObj.label}</Badge>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{load.clientName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mercancía</p>
                  <p className="font-semibold">{load.merchandiseType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Peso</p>
                  <p className="font-semibold">{load.weight} {load.weightUnit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Distancia</p>
                  <p className="font-semibold">{load.totalMiles || 0} mi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ubicaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Origen
                </p>
                <p className="font-semibold">{load.pickupAddress}</p>
                {load.pickupDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(load.pickupDate)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Destino
                </p>
                <p className="font-semibold">{load.deliveryAddress}</p>
                {load.deliveryDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(load.deliveryDate)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financiero</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Tarifa</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(load.price || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ingreso Est.</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(load.estimatedIncome || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Combustible Est.</p>
                <p className="font-semibold">{formatCurrency(load.estimatedFuel || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Peajes Est.</p>
                <p className="font-semibold">{formatCurrency(load.estimatedTolls || 0)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {load.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{load.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cambiar Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isChangingStatus ? (
                <>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                  >
                    <option value="">Selecciona estado...</option>
                    {LOAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleChangeStatus}
                      disabled={updateStatusMutation.isPending}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsChangingStatus(false);
                        setNewStatus("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={() => setIsChangingStatus(true)}
                  className="w-full"
                  variant="outline"
                >
                  Cambiar Estado
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Driver Assignment */}
          {load.assignedDriverId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Chofer Asignado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">ID: {load.assignedDriverId}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancelar Edición
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
