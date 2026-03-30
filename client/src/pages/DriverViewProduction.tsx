import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Package,
  CheckCircle,
  Clock,
  DollarSign,
  Star,
  FileText,
  AlertCircle,
  MapPin,
  Truck,
  CalendarDays,
  Navigation,
  Camera,
  Upload,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ProofOfDeliveryCapture } from "@/components/ProofOfDeliveryCapture";

interface LoadWithDetails {
  id: number;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoordinates?: { lat: number; lng: number };
  deliveryCoordinates?: { lat: number; lng: number };
  weight: number;
  weightUnit: string;
  merchandiseType: string;
  price: number;
  status: "available" | "in_transit" | "delivered" | "invoiced" | "paid";
  pickupDate: string | Date | null;
  deliveryDate: string | Date | null;
  notes: string | null;
  specialInstructions?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: {
    label: "Disponible",
    className: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300 dark:border-blue-800",
  },
  in_transit: {
    label: "En tránsito",
    className: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800",
  },
  delivered: {
    label: "Entregada",
    className: "bg-green-500/10 text-green-700 border-green-200 dark:text-green-300 dark:border-green-800",
  },
  invoiced: {
    label: "Facturada",
    className: "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-300 dark:border-purple-800",
  },
  paid: {
    label: "Pagada",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-800",
  },
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function openMapNavigation(address: string, appType: "google" | "waze") {
  const encodedAddress = encodeURIComponent(address);
  
  if (appType === "google") {
    const url = `https://www.google.com/maps/search/${encodedAddress}`;
    window.open(url, "_blank");
  } else if (appType === "waze") {
    const url = `https://waze.com/ul?q=${encodedAddress}`;
    window.open(url, "_blank");
  }
}

function DriverStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3">
            <Icon className={`h-6 w-6 ${iconClassName}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadDetailsModal({
  open,
  onOpenChange,
  load,
  onStartDelivery,
  onConfirmDelivery,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: LoadWithDetails | null;
  onStartDelivery: () => void;
  onConfirmDelivery: () => void;
}) {
  if (!load) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detalles de Carga #{load.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border bg-muted/40 p-4">
            <h3 className="font-semibold">Cliente</h3>
            <p className="mt-1 text-sm text-muted-foreground">{load.clientName}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Recogida</p>
                  <p className="mt-1 text-sm text-muted-foreground">{load.pickupAddress}</p>
                  {load.pickupDate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(load.pickupDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">Entrega</p>
                  <p className="mt-1 text-sm text-muted-foreground">{load.deliveryAddress}</p>
                  {load.deliveryDate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(load.deliveryDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Peso</p>
                <p className="mt-1 font-semibold">
                  {load.weight} {load.weightUnit}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Tipo de Mercancía</p>
                <p className="mt-1 font-semibold">{load.merchandiseType}</p>
              </div>
            </div>
          </div>

          {load.specialInstructions && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="font-medium text-sm text-amber-900 dark:text-amber-300">
                    Instrucciones Especiales
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                    {load.specialInstructions}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Pago</p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {formatCurrency(load.price)}
            </p>
          </div>

          {load.status === "available" && (
            <div className="grid gap-2 md:grid-cols-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openMapNavigation(load.pickupAddress, "google")}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Google Maps
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openMapNavigation(load.pickupAddress, "waze")}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Waze
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {load.status === "available" && (
              <Button onClick={onStartDelivery}>
                <Truck className="mr-2 h-4 w-4" />
                Iniciar Entrega
              </Button>
            )}
            {load.status === "in_transit" && (
              <Button onClick={onConfirmDelivery}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Entrega
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DriverViewProduction() {
  const { data: authUser } = trpc.auth.me.useQuery();
  const { data: driverStats, isLoading: statsLoading } = trpc.driver.getStats.useQuery(
    { driverId: authUser?.id || 0 },
    { enabled: !!authUser?.id, staleTime: 5 * 60 * 1000, retry: 1 }
  );
  const { data: loads, isLoading: loadsLoading } = trpc.driver.getLoads.useQuery(
    { driverId: authUser?.id || 0 },
    { enabled: !!authUser?.id, staleTime: 5 * 60 * 1000, retry: 1 }
  );
  const { data: nextLoadData } = trpc.driver.getNextPriority.useQuery(
    { driverId: authUser?.id || 0 },
    { enabled: !!authUser?.id, staleTime: 2 * 60 * 1000 }
  );

  const confirmDeliveryMutation = trpc.driver.confirmDelivery.useMutation();
  const uploadProofMutation = trpc.driver.uploadProofOfDelivery.useMutation();

  const [selectedLoad, setSelectedLoad] = useState<LoadWithDetails | null>(null);
  const [showLoadDetails, setShowLoadDetails] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "in_transit" | "delivered" | "invoiced" | "paid">("all");

  const filteredLoads = useMemo(() => {
    if (!loads) return [];
    if (filterStatus === "all") return loads;
    return loads.filter((load: any) => load.status === filterStatus);
  }, [loads, filterStatus]);

  const stats = useMemo(() => ({
    activeLoads: loads?.filter((l: any) => l.status === "in_transit").length || 0,
    completedToday: loads?.filter((l: any) => l.status === "delivered").length || 0,
    totalEarnings: driverStats?.totalEarnings || 0,
    rating: driverStats?.rating || 0,
  }), [loads, driverStats]);

  const handleStartDelivery = async () => {
    if (!selectedLoad) return;
    try {
      await confirmDeliveryMutation.mutateAsync({
        loadId: selectedLoad.id,
        notes: "Entrega iniciada",
      });
      toast.success(`Iniciando entrega de carga #${selectedLoad.id}`);
      setShowLoadDetails(false);
    } catch (error) {
      toast.error("Error al iniciar entrega");
      console.error(error);
    }
  };

  const handleConfirmDelivery = () => {
    setShowLoadDetails(false);
    setShowProofModal(true);
  };

  const handleProofSubmit = async (data: { notes: string; images: File[] }) => {
    if (!selectedLoad || !authUser) return;
    try {
      for (const image of data.images) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          await uploadProofMutation.mutateAsync({
            loadId: selectedLoad.id,
            fileBase64: base64,
            fileName: image.name,
            mimeType: image.type,
            fileSize: image.size,
            deliveryNotes: data.notes || undefined,
          });
        };
        reader.readAsDataURL(image);
      }

      await confirmDeliveryMutation.mutateAsync({
        loadId: selectedLoad.id,
        notes: data.notes || "Entrega confirmada con prueba",
      });

      toast.success(`Entrega de carga #${selectedLoad.id} confirmada`);
      setShowProofModal(false);
    } catch (error) {
      toast.error("Error al confirmar entrega");
      console.error(error);
    }
  };

  if (statsLoading || loadsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="border-primary/20 text-primary">
                Driver Portal
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Bienvenido, {authUser?.name || "Chofer"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Panel de cargas, ganancias y seguimiento de entregas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DriverStatCard
            title="Cargas Activas"
            value={String(stats.activeLoads)}
            subtitle="Actualmente en tránsito"
            icon={Truck}
            iconClassName="text-amber-500"
          />
          <DriverStatCard
            title="Completadas Hoy"
            value={String(stats.completedToday)}
            subtitle="Entregas registradas hoy"
            icon={CheckCircle}
            iconClassName="text-green-500"
          />
          <DriverStatCard
            title="Ganancias"
            value={formatCurrency(stats.totalEarnings)}
            subtitle="Total entregado"
            icon={DollarSign}
            iconClassName="text-emerald-600"
          />
          <DriverStatCard
            title="Calificación"
            value={String(stats.rating)}
            subtitle="Promedio de clientes"
            icon={Star}
            iconClassName="text-yellow-500"
          />
        </div>

        {nextLoadData && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Próxima Carga Prioritaria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{nextLoadData.clientName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextLoadData.pickupAddress} → {nextLoadData.deliveryAddress}
                  </p>
                  <p className="mt-2 text-lg font-bold text-green-600">
                    {formatCurrency(nextLoadData.price)}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedLoad(nextLoadData as any);
                    setShowLoadDetails(true);
                  }}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" onClick={() => setFilterStatus("all")}>
              Todas
            </TabsTrigger>
            <TabsTrigger value="available" onClick={() => setFilterStatus("available")}>
              Disponibles
            </TabsTrigger>
            <TabsTrigger value="in_transit" onClick={() => setFilterStatus("in_transit")}>
              En Tránsito
            </TabsTrigger>
            <TabsTrigger value="delivered" onClick={() => setFilterStatus("delivered")}>
              Entregadas
            </TabsTrigger>
            <TabsTrigger value="paid" onClick={() => setFilterStatus("paid")}>
              Pagadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filterStatus} className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Mis Cargas</CardTitle>
                <CardDescription>
                  {filteredLoads.length} carga{filteredLoads.length !== 1 ? "s" : ""} en esta categoría
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredLoads.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No hay cargas en esta categoría
                    </p>
                  </div>
                ) : (
                  filteredLoads.map((load: any) => {
                    const statusCfg = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.available;

                    return (
                      <div
                        key={load.id}
                        className="rounded-2xl border border-border bg-background p-4 transition-all hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  Carga #{load.id}
                                </h3>
                                <p className="text-sm text-muted-foreground">{load.clientName}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={`ml-auto border ${statusCfg.className}`}
                              >
                                {statusCfg.label}
                              </Badge>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                                <div>
                                  <p className="font-medium text-foreground">Ruta</p>
                                  <p>{load.pickupAddress} → {load.deliveryAddress}</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Package className="mt-0.5 h-4 w-4 text-primary" />
                                <div>
                                  <p className="font-medium text-foreground">Mercancía</p>
                                  <p>
                                    {load.weight} {load.weightUnit} • {load.merchandiseType}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 xl:w-[200px]">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Pago</p>
                              <p className="text-3xl font-bold text-green-600">
                                {formatCurrency(load.price)}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLoad(load);
                                setShowLoadDetails(true);
                              }}
                            >
                              Ver Detalles
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <LoadDetailsModal
        open={showLoadDetails}
        onOpenChange={setShowLoadDetails}
        load={selectedLoad}
        onStartDelivery={handleStartDelivery}
        onConfirmDelivery={handleConfirmDelivery}
      />

      {selectedLoad && (
        <ProofOfDeliveryCapture
          open={showProofModal}
          onOpenChange={setShowProofModal}
          loadId={selectedLoad.id}
          clientName={selectedLoad.clientName}
          deliveryAddress={selectedLoad.deliveryAddress}
          price={selectedLoad.price}
          onSubmit={handleProofSubmit}
          isSubmitting={uploadProofMutation.isPending || confirmDeliveryMutation.isPending}
        />
      )}
    </DashboardLayout>
  );
}
