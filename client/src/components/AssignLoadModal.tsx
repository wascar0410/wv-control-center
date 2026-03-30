"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, Truck, MapPin, Package, DollarSign } from "lucide-react";

interface AssignLoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AssignLoadModal({ open, onOpenChange, onSuccess }: AssignLoadModalProps) {
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");

  const { data: availableLoads, isLoading: loadsLoading } = trpc.assignment.availableLoads.useQuery(undefined, { enabled: open });
  const { data: drivers, isLoading: driversLoading } = trpc.assignment.drivers.useQuery(undefined, { enabled: open });
  
  const assignMutation = trpc.assignment.assign.useMutation({
    onSuccess: () => {
      toast.success("Carga asignada exitosamente");
      setSelectedLoad(null);
      setSelectedDriver(null);
      setNotes("");
      setSearchQuery("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredLoads = useMemo(() => {
    if (!availableLoads) return [];
    return availableLoads.filter((load) =>
      load.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      load.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableLoads, searchQuery]);

  const handleAssign = () => {
    if (!selectedLoad || !selectedDriver) {
      toast.error("Selecciona carga y chofer");
      return;
    }
    assignMutation.mutate({
      loadId: selectedLoad.id,
      driverId: selectedDriver.id,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Asignar Carga al Chofer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cargas Disponibles */}
          <div className="space-y-2">
            <Label>Seleccionar Carga *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, origen o destino..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background border-border pl-10"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
              {loadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLoads.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No hay cargas disponibles
                </div>
              ) : (
                filteredLoads.map((load) => (
                  <Card
                    key={load.id}
                    className={`cursor-pointer transition-all ${
                      selectedLoad?.id === load.id
                        ? "border-primary/50 ring-1 ring-primary/30 bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                    onClick={() => setSelectedLoad(load)}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{load.clientName}</p>
                          <p className="text-xs text-muted-foreground">{load.merchandiseType}</p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 shrink-0">
                          #{load.id}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="truncate">{load.pickupAddress}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 shrink-0" />
                          <span>${Number(load.price).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Choferes Disponibles */}
          <div className="space-y-2">
            <Label>Seleccionar Chofer *</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
              {driversLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : !drivers || drivers.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-sm text-muted-foreground">No hay choferes registrados en el sistema</p>
                  <p className="text-xs text-muted-foreground/70">Para asignar cargas, primero debes registrar choferes con rol 'driver'</p>
                </div>
              ) : (
                drivers.map((driver) => (
                  <Card
                    key={driver.id}
                    className={`cursor-pointer transition-all ${
                      selectedDriver?.id === driver.id
                        ? "border-primary/50 ring-1 ring-primary/30 bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{driver.name}</p>
                          <p className="text-xs text-muted-foreground">{driver.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30 shrink-0">
                          Disponible
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              placeholder="Instrucciones especiales para el chofer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Resumen */}
          {selectedLoad && selectedDriver && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Carga:</span> <span className="font-semibold">{selectedLoad.clientName}</span></p>
                <p><span className="text-muted-foreground">Chofer:</span> <span className="font-semibold">{selectedDriver.name}</span></p>
                <p><span className="text-muted-foreground">Precio:</span> <span className="font-semibold">${Number(selectedLoad.price).toFixed(2)}</span></p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assignMutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedLoad || !selectedDriver || assignMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {assignMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Asignando...</>
            ) : (
              "Asignar Carga"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
