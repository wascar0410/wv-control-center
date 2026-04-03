import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { PODUpload } from "@/components/PODUpload";
import LoadStatusCard from "@/components/LoadStatusCard";
import DeliveryProofUpload from "@/components/DeliveryProofUpload";
import { DriverChatWidget } from "@/components/DriverChatWidget";
import LoadActionConfirmModal from "@/components/LoadActionConfirmModal";

import {
  Truck, MapPin, Package, Fuel, Camera, CheckCircle2, Navigation,
  Upload, Loader2, ArrowRight, Clock, Weight, FileCheck, TrendingUp, ExternalLink
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: "Disponible", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  in_transit: { label: "En Tránsito", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  delivered: { label: "Entregada", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  invoiced: { label: "Facturada", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  paid: { label: "Pagada", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "No especificada";
  const d = new Date(date);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function LoadCard({ load, isSelected, onSelect, onAccept, onReject, onStartTransit, onUploadBOL, onLogFuel, readonly = false, onAcceptLoad, onRejectLoad, onViewDetails }: any) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? "bg-primary/10 border-primary/50"
          : "bg-card border-border hover:border-primary/30"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-xs border ${STATUS_CONFIG[load.status]?.className}`}>
                {STATUS_CONFIG[load.status]?.label}
              </Badge>
              <span className="text-sm font-semibold text-foreground truncate">{load.clientName}</span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{load.pickupAddress}</span>
              </p>
              <p className="flex items-center gap-1">
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{load.deliveryAddress}</span>
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary">{formatCurrency(load.price)}</p>
            <p className="text-xs text-muted-foreground mt-1">{load.weight} {load.weightUnit}</p>
          </div>
        </div>

        {!readonly && isSelected && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {onViewDetails && <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); onViewDetails(); }}><ExternalLink className="w-3 h-3" />Ver Detalles</Button>}
            {onAcceptLoad && <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); onAcceptLoad(); }}>Aceptar</Button>}
            {onRejectLoad && <Button size="sm" variant="destructive" className="flex-1" onClick={(e) => { e.stopPropagation(); onRejectLoad(); }}>Rechazar</Button>}
            {onStartTransit && load.status === "available" && <Button size="sm" variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); onStartTransit(); }}>Iniciar</Button>}
            {onUploadBOL && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onUploadBOL(); }}><Upload className="w-3 h-3" /></Button>}
            {onLogFuel && <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onLogFuel(); }}><Fuel className="w-3 h-3" /></Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DriverView() {
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showBOLUpload, setShowBOLUpload] = useState(false);
  const [showPODUpload, setShowPODUpload] = useState(false);
  const [podLoadId, setPodLoadId] = useState<number | null>(null);
  const [fuelForm, setFuelForm] = useState({ amount: "", gallons: "", pricePerGallon: "", location: "" });
  const [bolFile, setBolFile] = useState<File | null>(null);
  const [bolPreview, setBolPreview] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: loads, isLoading } = trpc.driver.myLoads.useQuery();

  const fuelMutation = trpc.driver.logFuel.useMutation({
    onSuccess: () => {
      utils.driver.fuelLogs.invalidate();
      utils.finance.transactions.invalidate();
      setShowFuelForm(false);
      setFuelForm({ amount: "", gallons: "", pricePerGallon: "", location: "" });
      toast.success("Gasto de gasolina registrado");
    },
    onError: (e) => toast.error(e.message),
  });

  const bolMutation = trpc.driver.uploadBOL.useMutation({
    onSuccess: async (data) => {
      await utils.driver.myLoads.refetch();
      setShowBOLUpload(false);
      setBolFile(null);
      setBolPreview(null);
      toast.success("BOL subido exitosamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMutation = trpc.driver.updateLoadStatus.useMutation({
    onSuccess: async () => {
      await utils.driver.myLoads.refetch();
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const acceptMutation = trpc.assignment.accept.useMutation({
    onSuccess: async () => {
      await utils.driver.myLoads.refetch();
      toast.success("Carga aceptada exitosamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.assignment.reject.useMutation({
    onSuccess: async () => {
      await utils.driver.myLoads.refetch();
      toast.success("Carga rechazada");
    },
    onError: (e) => toast.error(e.message),
  });

  const podMutation = trpc.driver.uploadPOD.useMutation({
    onSuccess: async () => {
      await utils.driver.myLoads.refetch();
      setShowPODUpload(false);
      toast.success("Foto de entrega guardada");
    },
    onError: (e) => toast.error(e.message),
  });

  const acceptLoadMutation = trpc.loads.acceptLoad.useMutation({
    onSuccess: async () => {
      await utils.driver.myLoads.refetch();
      setSelectedLoad(null);
      setShowActionModal(false);
      setActionType(null);
      toast.success("Carga aceptada exitosamente");
    },
    onError: (e) => toast.error(e.message || "Error al aceptar carga"),
  });

  const rejectLoadMutation = trpc.loads.rejectLoad.useMutation({
    onSuccess: async () => {
      await utils.driver.myLoads.refetch();
      setSelectedLoad(null);
      setShowActionModal(false);
      setActionType(null);
      toast.success("Carga rechazada exitosamente");
    },
    onError: (e) => toast.error(e.message || "Error al rechazar carga"),
  });

  const handleAcceptLoad = () => {
    if (!selectedLoad) return;
    setActionType("accept");
    setShowActionModal(true);
  };

  const handleRejectLoad = () => {
    if (!selectedLoad) return;
    setActionType("reject");
    setShowActionModal(true);
  };

  const handleConfirmAction = async (reason?: string) => {
    if (!selectedLoad) return;
    
    if (actionType === "accept") {
      await acceptLoadMutation.mutateAsync({ loadId: selectedLoad.id });
    } else if (actionType === "reject" && reason) {
      await rejectLoadMutation.mutateAsync({ loadId: selectedLoad.id, reason });
    }
  };

  const [, setLocation] = useLocation();

  if (!loads) return null;

  const activeAssignedLoads = loads.filter((l: any) => l.assignmentId && ["available", "in_transit"].includes(l.status));
  const unassignedAvailableLoads = loads.filter((l: any) => !l.assignmentId && l.status === "available");
  const completedLoads = loads.filter((l: any) => ["delivered", "invoiced", "paid"].includes(l.status));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Mis Cargas</h1>
            <p className="text-muted-foreground">Gestiona tus cargas y registra gastos</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/driver-dashboard")} className="gap-2 flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
            Mi Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Loads List */}
          <div className="lg:col-span-1 space-y-4">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3 text-xs">
                <TabsTrigger value="active">Activas</TabsTrigger>
                <TabsTrigger value="available">Disponibles</TabsTrigger>
                <TabsTrigger value="completed">Completadas</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-3 space-y-3">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
                ) : activeAssignedLoads.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="p-8 text-center">
                      <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No tienes cargas activas asignadas</p>
                      <p className="text-xs text-muted-foreground mt-2">Revisa la pestaña "Disponibles" para aceptar cargas</p>
                    </CardContent>
                  </Card>
                ) : (
                  activeAssignedLoads.map((load: any) => (
                    <LoadStatusCard
                      key={load.id}
                      load={load}
                      onStatusChange={async () => await utils.driver.myLoads.refetch()}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="available" className="mt-3 space-y-3">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
                ) : unassignedAvailableLoads.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="p-8 text-center">
                      <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No hay cargas disponibles</p>
                    </CardContent>
                  </Card>
                ) : (
                  unassignedAvailableLoads.map((load: any) => {
                    const assignment = load.assignmentId ? { id: load.assignmentId } : null;
                    return (
                    <LoadCard
                      key={load?.id ?? Math.random()}
                      load={load}
                      isSelected={selectedLoad?.id === load?.id}
                      onSelect={() => setSelectedLoad(load)}
                      onViewDetails={() => setLocation(`/driver/loads/${load?.id}`)}
                      onAccept={assignment ? () => acceptMutation.mutate({ assignmentId: assignment.id }) : undefined}
                      onReject={assignment ? () => rejectMutation.mutate({ assignmentId: assignment.id }) : undefined}
                      onStartTransit={() => statusMutation.mutate({ id: load?.id, status: "in_transit" })}
                      onUploadBOL={() => { setSelectedLoad(load); setShowBOLUpload(true); }}
                      onLogFuel={() => { setSelectedLoad(load); setShowFuelForm(true); }}
                    />
                  );
                  })
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-3 space-y-3">
                {completedLoads.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Sin entregas completadas</p>
                    </CardContent>
                  </Card>
                ) : (
                  completedLoads.map((load) => (
                    <LoadCard
                      key={load.id}
                      load={load}
                      isSelected={selectedLoad?.id === load.id}
                      onSelect={() => setSelectedLoad(load)}
                      readonly
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>

            {/* Quick Fuel Log */}
            <Button
              variant="outline"
              className="w-full gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
              onClick={() => { setSelectedLoad(null); setShowFuelForm(true); }}
            >
              <Fuel className="w-4 h-4" />
              Registrar Gasto de Gasolina
            </Button>
          </div>

          {/* Load Details Section */}
          <div className="lg:col-span-3">

            {/* Delivery Proof Upload */}
            {selectedLoad && selectedLoad.status === "in_transit" && (
              <DeliveryProofUpload
                loadId={selectedLoad.id}
                onUploadSuccess={() => utils.driver.myLoads.refetch()}
              />
            )}

            {/* Selected Load Details - Enhanced */}
            {selectedLoad && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-xs border ${STATUS_CONFIG[selectedLoad.status]?.className}`}>
                          {STATUS_CONFIG[selectedLoad.status]?.label}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground">{selectedLoad.clientName}</span>
                      </div>
                      <CardTitle className="text-lg">Detalles de la Carga</CardTitle>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{formatCurrency(selectedLoad.price)}</p>
                      {selectedLoad.bolImageUrl && (
                        <a href={selectedLoad.bolImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Ver BOL</a>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pickup Information */}
                  <div className="border-l-2 border-green-500/30 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <span className="font-semibold text-sm text-foreground">Recogida</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{selectedLoad.pickupAddress}</p>
                    {selectedLoad.pickupTime && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Hora: {formatTime(selectedLoad.pickupTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Information */}
                  <div className="border-l-2 border-red-500/30 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-red-400" />
                      <span className="font-semibold text-sm text-foreground">Entrega</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{selectedLoad.deliveryAddress}</p>
                    {selectedLoad.deliveryTime && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Hora: {formatTime(selectedLoad.deliveryTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Cargo Details */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Peso</p>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                        <Weight className="w-3 h-3" />
                        {selectedLoad.weight} {selectedLoad.weightUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Mercancía</p>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {selectedLoad.merchandiseType}
                      </p>
                    </div>
                    {selectedLoad.totalMiles && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Millas</p>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {selectedLoad.totalMiles} mi
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Special Notes */}
                  {selectedLoad.notes && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                      <p className="text-xs font-semibold text-amber-400 mb-1">Notas Especiales</p>
                      <p className="text-xs text-amber-200">{selectedLoad.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fuel Log Dialog */}
      <Dialog open={showFuelForm} onOpenChange={setShowFuelForm}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-amber-400" />
              Registrar Gasto de Gasolina
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedLoad && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                Carga: {selectedLoad.clientName}
              </div>
            )}
            <div>
              <Label htmlFor="amount">Monto ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={fuelForm.amount}
                onChange={(e) => setFuelForm({ ...fuelForm, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="gallons">Galones</Label>
              <Input
                id="gallons"
                type="number"
                placeholder="0.00"
                value={fuelForm.gallons}
                onChange={(e) => setFuelForm({ ...fuelForm, gallons: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pricePerGallon">Precio por Galón ($)</Label>
              <Input
                id="pricePerGallon"
                type="number"
                placeholder="0.00"
                value={fuelForm.pricePerGallon}
                onChange={(e) => setFuelForm({ ...fuelForm, pricePerGallon: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                placeholder="Ej: Gasolinera Shell"
                value={fuelForm.location}
                onChange={(e) => setFuelForm({ ...fuelForm, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFuelForm(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!fuelForm.amount || !fuelForm.gallons) {
                  toast.error("Completa los campos requeridos");
                  return;
                }
                fuelMutation.mutate({
                  loadId: selectedLoad?.id,
                  amount: parseFloat(fuelForm.amount),
                  gallons: parseFloat(fuelForm.gallons),
                  pricePerGallon: parseFloat(fuelForm.pricePerGallon),
                  location: fuelForm.location,
                });
              }}
              disabled={fuelMutation.isPending}
            >
              {fuelMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BOL Upload Dialog */}
      <Dialog open={showBOLUpload} onOpenChange={setShowBOLUpload}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subir BOL
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedLoad && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-400">
                Carga: {selectedLoad.clientName}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setBolFile(file);
                  const reader = new FileReader();
                  reader.onload = (e) => setBolPreview(e.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
            {bolPreview ? (
              <div className="relative">
                <img src={bolPreview} alt="BOL Preview" className="w-full rounded-lg" />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Cambiar Foto
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-5 h-5 mr-2" />
                Tomar Foto
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBOLUpload(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!bolFile || !selectedLoad) {
                  toast.error("Selecciona una foto");
                  return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                  const fileBase64 = (e.target?.result as string).split(',')[1];
                  bolMutation.mutate({
                    loadId: selectedLoad.id,
                    fileBase64,
                    fileName: bolFile.name,
                    mimeType: bolFile.type,
                  });
                };
                reader.readAsDataURL(bolFile);
              }}
              disabled={bolMutation.isPending || !bolFile}
            >
              {bolMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POD Upload Dialog */}
      <Dialog open={showPODUpload} onOpenChange={setShowPODUpload}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Foto de Entrega
            </DialogTitle>
          </DialogHeader>
          <PODUpload
            open={showPODUpload}
            onOpenChange={setShowPODUpload}
            onUpload={async (file: File) => {
              // Create a unique file key
              const fileKey = `delivery-proof-${podLoadId}-${Date.now()}.jpg`;
              
              // Read file as data URL
              const reader = new FileReader();
              reader.onload = (e) => {
                const documentUrl = e.target?.result as string;
                podMutation.mutate({
                  loadId: podLoadId!,
                  fileKey,
                  fileName: file.name,
                  fileSize: file.size,
                  mimeType: file.type,
                  documentUrl,
                });
              };
              reader.readAsDataURL(file);
            }}
            isLoading={podMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Load Action Confirmation Modal */}
      <LoadActionConfirmModal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setActionType(null);
        }}
        onConfirm={handleConfirmAction}
        action={actionType || "accept"}
        loadId={selectedLoad?.id || 0}
        clientName={selectedLoad?.clientName || ""}
        isLoading={acceptLoadMutation.isPending || rejectLoadMutation.isPending}
      />
    </div>
  );
}
