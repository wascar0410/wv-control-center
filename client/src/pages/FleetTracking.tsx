/**
 * FleetTracking.tsx
 * Unified fleet operations combining real-time map + management
 * - Map tab: GPS tracking with fleet type color coding
 * - Management tab: Driver table with fleet type, commission, documents
 * - Fleet type: internal (blue), leased (purple), external (orange)
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Truck,
  Users,
  MapPin,
  Navigation,
  RefreshCw,
  Edit2,
  Check,
  X,
  DollarSign,
  Shield,
  Package,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";

const FLEET_COLORS: Record<string, { bg: string; text: string; marker: string }> = {
  internal: { bg: "bg-blue-500/20", text: "text-blue-300", marker: "#3b82f6" },
  leased: { bg: "bg-purple-500/20", text: "text-purple-300", marker: "#a855f7" },
  external: { bg: "bg-orange-500/20", text: "text-orange-300", marker: "#f97316" },
};

const FLEET_LABELS: Record<string, string> = {
  internal: "Interno",
  leased: "Arrendado",
  external: "Externo",
};

const FLEET_TYPES = [
  { value: "internal", label: "Interno", desc: "Empleado directo de WV", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { value: "leased", label: "Arrendado", desc: "Contrato de arrendamiento", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { value: "external", label: "Externo", desc: "Contratista independiente", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
];

type EditState = {
  driverId: number;
  fleetType: string;
  commissionPercent: string;
  dotNumber: string;
};

function getTimeSince(ts: string | Date): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Hace ${hrs}h`;
}

// Management Component
function FleetManagementView() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const { data: drivers, refetch } = trpc.admin.getDrivers.useQuery();
  const updateMutation = trpc.admin.updateDriverFleet.useMutation({
    onSuccess: () => {
      toast.success("Chofer actualizado correctamente");
      setEditingId(null);
      setEditState(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const startEdit = (driver: any) => {
    setEditingId(driver.id);
    setEditState({
      driverId: driver.id,
      fleetType: driver.fleetType ?? "internal",
      commissionPercent: String(driver.commissionPercent ?? "0"),
      dotNumber: driver.dotNumber ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState(null);
  };

  const saveEdit = () => {
    if (!editState) return;
    updateMutation.mutate({
      driverId: editState.driverId,
      fleetType: editState.fleetType as "internal" | "leased" | "external",
      commissionPercent: Number(editState.commissionPercent),
      dotNumber: editState.dotNumber || undefined,
    });
  };

  const getFleetBadge = (type: string) => {
    const ft = FLEET_TYPES.find((f) => f.value === type) ?? FLEET_TYPES[0];
    return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ft.color}`}>{ft.label}</span>;
  };

  if (!drivers) {
    return <div className="text-center py-8 text-muted-foreground">Cargando choferes...</div>;
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver: any) => (
        <Card key={driver.id}>
          <CardContent className="p-4">
            {editingId === driver.id && editState ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo de Flota</label>
                    <Select
                      value={editState.fleetType}
                      onValueChange={(v) => setEditState({ ...editState, fleetType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FLEET_TYPES.map((ft) => (
                          <SelectItem key={ft.value} value={ft.value}>
                            {ft.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Comisión %</label>
                    <Input
                      type="number"
                      value={editState.commissionPercent}
                      onChange={(e) => setEditState({ ...editState, commissionPercent: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Número DOT</label>
                  <Input
                    value={editState.dotNumber}
                    onChange={(e) => setEditState({ ...editState, dotNumber: e.target.value })}
                    placeholder="DOT123456"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} className="flex-1 gap-2">
                    <Check className="w-4 h-4" />
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1 gap-2">
                    <X className="w-4 h-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4" />
                    <p className="font-semibold">{driver.name}</p>
                    {getFleetBadge(driver.fleetType)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p className="text-xs">Comisión</p>
                      <p className="font-medium text-foreground">{driver.commissionPercent || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs">DOT</p>
                      <p className="font-medium text-foreground">{driver.dotNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs">Email</p>
                      <p className="font-medium text-foreground text-xs">{driver.email}</p>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(driver)}
                  className="gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main Component
export default function FleetTracking() {
  const [activeTab, setActiveTab] = useState("management");
  const { data: drivers } = trpc.admin.getDrivers.useQuery();

  const fleetStats = drivers
    ? {
        total: drivers.length,
        internal: drivers.filter((d: any) => d.fleetType === "internal").length,
        leased: drivers.filter((d: any) => d.fleetType === "leased").length,
        external: drivers.filter((d: any) => d.fleetType === "external").length,
      }
    : { total: 0, internal: 0, leased: 0, external: 0 };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fleet Tracking</h1>
          <p className="text-muted-foreground">Gestión y seguimiento de flota en tiempo real</p>
        </div>
      </div>

      {/* Fleet Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Choferes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fleetStats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500" />
              Internos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{fleetStats.internal}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-500" />
              Arrendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{fleetStats.leased}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-500" />
              Externos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{fleetStats.external}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="management" className="gap-2">
            <Users className="w-4 h-4" />
            Gestión de Flota
          </TabsTrigger>
        </TabsList>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Choferes</CardTitle>
              <CardDescription>Editar tipo de flota, comisión y documentos</CardDescription>
            </CardHeader>
            <CardContent>
              <FleetManagementView />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
