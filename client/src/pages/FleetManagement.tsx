/**
 * FleetManagement.tsx
 * Design: Clean admin table with inline editing. Dark slate base.
 * Allows owner/admin to set fleet type, commission %, and view driver documents.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Truck,
  Users,
  Edit2,
  Check,
  X,
  DollarSign,
  MapPin,
  Shield,
} from "lucide-react";

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

export default function FleetManagement() {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Flota</h1>
        <p className="text-slate-400 mt-1">
          Clasificación de conductores, comisiones y documentación
        </p>
      </div>

      {/* Fleet Type Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {FLEET_TYPES.map((ft) => (
          <Card key={ft.value} className="bg-slate-800/60 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ft.color.split(" ")[0]}`}>
                <Truck className={`w-5 h-5 ${ft.color.split(" ")[1]}`} />
              </div>
              <div>
                <div className="font-semibold text-white">{ft.label}</div>
                <div className="text-xs text-slate-400">{ft.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Drivers Table */}
      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader className="border-b border-slate-700 pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Conductores ({drivers?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!drivers || drivers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay conductores registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {drivers.map((driver) => {
                const isEditing = editingId === driver.id;
                return (
                  <div key={driver.id} className="p-5 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Driver Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-lg font-bold text-white">
                          {(driver.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{driver.name}</span>
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              {driver.role}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-400 mt-0.5">{driver.email}</div>
                          {driver.phone && (
                            <div className="text-xs text-slate-500 mt-0.5">{driver.phone}</div>
                          )}
                        </div>
                      </div>

                      {/* Fleet Config */}
                      {isEditing && editState ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <Select
                            value={editState.fleetType}
                            onValueChange={(v) => setEditState({ ...editState, fleetType: v })}
                          >
                            <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-slate-100 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {FLEET_TYPES.map((ft) => (
                                <SelectItem key={ft.value} value={ft.value} className="text-slate-300">
                                  {ft.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={editState.commissionPercent}
                              onChange={(e) => setEditState({ ...editState, commissionPercent: e.target.value })}
                              className="w-20 bg-slate-700 border-slate-600 text-slate-100 h-9 text-center"
                              placeholder="0"
                            />
                            <span className="text-slate-400 text-sm">%</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-slate-400" />
                            <Input
                              value={editState.dotNumber}
                              onChange={(e) => setEditState({ ...editState, dotNumber: e.target.value })}
                              className="w-28 bg-slate-700 border-slate-600 text-slate-100 h-9"
                              placeholder="DOT #"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 h-9"
                              onClick={saveEdit}
                              disabled={updateMutation.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700 h-9"
                              onClick={cancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">Tipo de Flota</div>
                            {getFleetBadge((driver as any).fleetType ?? "internal")}
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">Comisión WV</div>
                            <div className="text-amber-400 font-bold text-sm">
                              {(driver as any).commissionPercent ?? "0"}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">Chofer Recibe</div>
                            <div className="text-emerald-400 font-bold text-sm">
                              {100 - Number((driver as any).commissionPercent ?? 0)}%
                            </div>
                          </div>
                          {(driver as any).dotNumber && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 mb-1">DOT #</div>
                              <div className="text-slate-300 text-sm">{(driver as any).dotNumber}</div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="text-center">
                              <div className="text-xs text-slate-500 mb-1">GPS</div>
                              <div className={`text-xs font-medium ${(driver as any).locationSharingEnabled ? "text-emerald-400" : "text-slate-500"}`}>
                                {(driver as any).locationSharingEnabled ? "Activo" : "Inactivo"}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 ml-2"
                              onClick={() => startEdit(driver)}
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
