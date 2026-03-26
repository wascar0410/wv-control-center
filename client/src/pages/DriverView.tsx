import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import {
  Truck, MapPin, Package, Fuel, Camera, CheckCircle2, Navigation,
  Upload, Loader2, ArrowRight, Clock, Weight
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

export default function DriverView() {
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showBOLUpload, setShowBOLUpload] = useState(false);
  const [fuelForm, setFuelForm] = useState({ amount: "", gallons: "", pricePerGallon: "", location: "" });
  const [bolFile, setBolFile] = useState<File | null>(null);
  const [bolPreview, setBolPreview] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
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
    onSuccess: (data) => {
      utils.driver.myLoads.invalidate();
      setShowBOLUpload(false);
      setBolFile(null);
      setBolPreview(null);
      toast.success("BOL subido exitosamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMutation = trpc.driver.updateLoadStatus.useMutation({
    onSuccess: () => {
      utils.driver.myLoads.invalidate();
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const showRoute = useCallback((load: any) => {
    if (!mapRef.current) return;
    const directionsService = new google.maps.DirectionsService();
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    const renderer = new google.maps.DirectionsRenderer({
      polylineOptions: { strokeColor: "#6366f1", strokeWeight: 4, strokeOpacity: 0.8 },
      suppressMarkers: false,
    });
    renderer.setMap(mapRef.current);
    directionsRendererRef.current = renderer;

    directionsService.route(
      {
        origin: load.pickupAddress,
        destination: load.deliveryAddress,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          renderer.setDirections(result);
        } else {
          toast.error("No se pudo calcular la ruta");
        }
      }
    );
  }, []);

  const handleSelectLoad = (load: any) => {
    setSelectedLoad(load);
    if (mapReady) showRoute(load);
  };

  const handleBOLFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("El archivo no debe superar 5MB"); return; }
    setBolFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setBolPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadBOL = async () => {
    if (!bolFile || !selectedLoad) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      bolMutation.mutate({
        loadId: selectedLoad.id,
        fileBase64: base64,
        fileName: bolFile.name,
        mimeType: bolFile.type,
      });
    };
    reader.readAsDataURL(bolFile);
  };

  const handleLogFuel = () => {
    if (!fuelForm.amount) { toast.error("Ingresa el monto de gasolina"); return; }
    fuelMutation.mutate({
      loadId: selectedLoad?.id,
      amount: parseFloat(fuelForm.amount),
      gallons: fuelForm.gallons ? parseFloat(fuelForm.gallons) : undefined,
      pricePerGallon: fuelForm.pricePerGallon ? parseFloat(fuelForm.pricePerGallon) : undefined,
      location: fuelForm.location || undefined,
    });
  };

  const activeLoads = (loads ?? []).filter((l) => l.status === "in_transit" || l.status === "available");
  const completedLoads = (loads ?? []).filter((l) => l.status === "delivered" || l.status === "paid" || l.status === "invoiced");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vista del Chofer</h1>
        <p className="text-sm text-muted-foreground mt-1">Rutas asignadas, entregas y gastos en campo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Loads List */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="active">
            <TabsList className="bg-card border border-border w-full">
              <TabsTrigger value="active" className="flex-1 gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Activas ({activeLoads.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completadas ({completedLoads.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-3 space-y-3">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>
              ) : activeLoads.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-8 text-center">
                    <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No tienes cargas activas</p>
                  </CardContent>
                </Card>
              ) : (
                activeLoads.map((load) => (
                  <LoadCard
                    key={load.id}
                    load={load}
                    isSelected={selectedLoad?.id === load.id}
                    onSelect={() => handleSelectLoad(load)}
                    onStartTransit={() => statusMutation.mutate({ id: load.id, status: "in_transit" })}
                    onMarkDelivered={() => statusMutation.mutate({ id: load.id, status: "delivered" })}
                    onUploadBOL={() => { setSelectedLoad(load); setShowBOLUpload(true); }}
                    onLogFuel={() => { setSelectedLoad(load); setShowFuelForm(true); }}
                  />
                ))
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
                    onSelect={() => handleSelectLoad(load)}
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

        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                {selectedLoad ? `Ruta: ${selectedLoad.clientName}` : "Mapa de Rutas"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[420px] rounded-b-xl overflow-hidden">
                <MapView
                  onMapReady={(map) => {
                    handleMapReady(map);
                    if (selectedLoad) showRoute(selectedLoad);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Load Details */}
          {selectedLoad && (
            <Card className="bg-card border-border mt-4">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs border ${STATUS_CONFIG[selectedLoad.status]?.className}`}>
                        {STATUS_CONFIG[selectedLoad.status]?.label}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">{selectedLoad.clientName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold mt-0.5 shrink-0">A</span>
                        <span>{selectedLoad.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold mt-0.5 shrink-0">B</span>
                        <span>{selectedLoad.deliveryAddress}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{selectedLoad.weight} {selectedLoad.weightUnit}</span>
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{selectedLoad.merchandiseType}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-primary">{formatCurrency(selectedLoad.price)}</p>
                    {selectedLoad.bolImageUrl && (
                      <a href={selectedLoad.bolImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Ver BOL</a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
            <div className="space-y-2">
              <Label>Monto Total ($) *</Label>
              <Input
                type="number" placeholder="0.00"
                value={fuelForm.amount}
                onChange={(e) => setFuelForm((f) => ({ ...f, amount: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Galones</Label>
                <Input
                  type="number" placeholder="0.000"
                  value={fuelForm.gallons}
                  onChange={(e) => setFuelForm((f) => ({ ...f, gallons: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio/Galón ($)</Label>
                <Input
                  type="number" placeholder="0.000"
                  value={fuelForm.pricePerGallon}
                  onChange={(e) => setFuelForm((f) => ({ ...f, pricePerGallon: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ubicación de la Gasolinera</Label>
              <Input
                placeholder="Nombre o dirección..."
                value={fuelForm.location}
                onChange={(e) => setFuelForm((f) => ({ ...f, location: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowFuelForm(false)}>Cancelar</Button>
            <Button onClick={handleLogFuel} disabled={fuelMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
              {fuelMutation.isPending ? "Registrando..." : "Registrar Gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BOL Upload Dialog */}
      <Dialog open={showBOLUpload} onOpenChange={(open) => { if (!open) { setShowBOLUpload(false); setBolFile(null); setBolPreview(null); } }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Subir Comprobante de Entrega (BOL)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedLoad && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary">
                Carga: {selectedLoad.clientName} — {selectedLoad.deliveryAddress}
              </div>
            )}

            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              {bolPreview ? (
                <img src={bolPreview} alt="BOL Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Toca para seleccionar foto</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF — máx. 5MB</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleBOLFileChange}
              capture="environment"
            />

            {bolFile && (
              <p className="text-xs text-muted-foreground text-center">
                Archivo seleccionado: <span className="text-foreground font-medium">{bolFile.name}</span>
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowBOLUpload(false); setBolFile(null); setBolPreview(null); }}>Cancelar</Button>
            <Button onClick={handleUploadBOL} disabled={!bolFile || bolMutation.isPending}>
              {bolMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Subir BOL</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadCard({
  load, isSelected, onSelect, onStartTransit, onMarkDelivered, onUploadBOL, onLogFuel, readonly
}: {
  load: any;
  isSelected: boolean;
  onSelect: () => void;
  onStartTransit?: () => void;
  onMarkDelivered?: () => void;
  onUploadBOL?: () => void;
  onLogFuel?: () => void;
  readonly?: boolean;
}) {
  const statusCfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;

  return (
    <Card
      className={`bg-card border cursor-pointer transition-all ${isSelected ? "border-primary/50 ring-1 ring-primary/30" : "border-border hover:border-border/80"}`}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{load.clientName}</p>
            <p className="text-xs text-muted-foreground">{load.merchandiseType} · {load.weight} {load.weightUnit}</p>
          </div>
          <Badge variant="outline" className={`text-xs border shrink-0 ${statusCfg.className}`}>
            {statusCfg.label}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold shrink-0 mt-0.5">A</span>
            <span className="text-muted-foreground truncate">{load.pickupAddress}</span>
          </div>
          <div className="flex items-center gap-2 pl-1">
            <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0 mt-0.5">B</span>
            <span className="text-muted-foreground truncate">{load.deliveryAddress}</span>
          </div>
        </div>

        {!readonly && (
          <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            {load.status === "available" && onStartTransit && (
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={onStartTransit}>
                <Truck className="w-3 h-3 mr-1" /> Iniciar
              </Button>
            )}
            {load.status === "in_transit" && onMarkDelivered && (
              <Button size="sm" className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700" onClick={onMarkDelivered}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Entregada
              </Button>
            )}
            {onUploadBOL && (
              <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={onUploadBOL}>
                <Camera className="w-3 h-3" />
              </Button>
            )}
            {onLogFuel && (
              <Button size="sm" variant="outline" className="h-8 text-xs px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={onLogFuel}>
                <Fuel className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
