/**
 * DriverOps.tsx
 * Unified driver experience combining dashboard stats + load operations
 * - Dashboard tab: KPIs, earnings, recent deliveries
 * - Operations tab: Active loads, accept/reject, POD, fuel logging
 * - Wallet link for earnings management
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoadStatusCard from "@/components/LoadStatusCard";
import { PODUpload } from "@/components/PODUpload";
import DeliveryProofUpload from "@/components/DeliveryProofUpload";
import { DriverLoadCard } from "@/components/DriverLoadCard";
import { DriverLoadDetailDrawer } from "@/components/DriverLoadDetailDrawer";
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
  Wallet,
  Navigation,
  Upload,
  FileCheck,
} from "lucide-react";

function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "Disponible", color: "bg-blue-500/15 text-blue-400" },
  in_transit: { label: "En Tránsito", color: "bg-amber-500/15 text-amber-400" },
  delivered: { label: "Entregada", color: "bg-green-500/15 text-green-400" },
  invoiced: { label: "Facturada", color: "bg-purple-500/15 text-purple-400" },
  paid: { label: "Pagada", color: "bg-emerald-500/15 text-emerald-400" },
};

export default function DriverOps() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Read tab from URL query parameter on mount/location change
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const tabParam = params.get("tab");
    if (tabParam === "loads" || tabParam === "operations") {
      setActiveTab("operations");
    } else if (tabParam === "dashboard") {
      setActiveTab("dashboard");
    } else {
      // Default to dashboard if no tab param
      setActiveTab("dashboard");
    }
  }, [location]);

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "operations") {
      navigate("/driver?tab=operations");
    } else if (newTab === "dashboard") {
      navigate("/driver?tab=dashboard");
    }
  };
  const { toast } = useToast();
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showPODUpload, setShowPODUpload] = useState(false);
  const [podLoadId, setPodLoadId] = useState<number | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Fetch driver data
  const { data: myLoads, isLoading: loadsLoading } = trpc.driver.myLoads.useQuery(undefined, {
    refetchInterval: 10000,
  });

  // Track previous loads and notified IDs for new load detection
  const previousLoadsRef = useRef<any[]>([]);
  const notifiedLoadIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Detect new available loads
  useEffect(() => {
    if (!myLoads) return;

    const currentAvailable = myLoads.filter((l: any) => l.status === "available");
    const currentAvailableIds = new Set(currentAvailable.map((l: any) => l.id));
    const previousAvailableIds = new Set(previousLoadsRef.current.filter((l: any) => l.status === "available").map((l: any) => l.id));

    // Skip toast on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      previousLoadsRef.current = myLoads;
      return;
    }

    // Find new loads that weren't available before
    const newLoadIds: number[] = [];
    currentAvailableIds.forEach((id: number) => {
      if (!previousAvailableIds.has(id) && !notifiedLoadIdsRef.current.has(id)) {
        newLoadIds.push(id);
        notifiedLoadIdsRef.current.add(id);
      }
    });

    // Show toast if new loads appeared
    if (newLoadIds.length > 0) {
      toast({
        title: "🚚 Nueva carga disponible",
        description: `Tienes ${newLoadIds.length} nueva(s) carga(s) para revisar`,
      });
    }

    previousLoadsRef.current = myLoads;
  }, [myLoads, toast]);

  const { data: driverStats, isLoading: statsLoading } = trpc.driverStats.getDriverStats.useQuery(
    { driverId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  const { data: walletSummary } = trpc.wallet.getWalletSummary.useQuery();

  // Accept/Reject mutations
  const acceptLoadMutation = trpc.loads.acceptLoad.useMutation({
    onSuccess: () => {
      toast({
        title: "✅ Carga aceptada",
        description: "La carga ha sido aceptada correctamente.",
      });
      setSelectedLoad(null);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo aceptar la carga.",
        variant: "destructive",
      });
    },
  });

  const rejectLoadMutation = trpc.loads.rejectLoad.useMutation({
    onSuccess: () => {
      toast({
        title: "✅ Carga rechazada",
        description: "La carga ha sido rechazada correctamente.",
      });
      setSelectedLoad(null);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo rechazar la carga.",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadsLoading || statsLoading;

  // Categorize loads
  const activeLoads = myLoads?.filter((l: any) => l.status === "in_transit") ?? [];
  const availableLoads = myLoads?.filter((l: any) => l.status === "available") ?? [];
  const completedLoads = myLoads?.filter((l: any) => l.status === "delivered" || l.status === "paid") ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando operaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Driver Operations</h1>
          <p className="text-muted-foreground">Gestiona tus cargas y ganancias</p>
        </div>
        <Button
          onClick={() => navigate("/finance-wallet")}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Wallet className="w-4 h-4" />
          Mi Billetera
        </Button>
      </div>

      {/* Active Loads Alert */}
      {activeLoads.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="font-semibold text-amber-400">Cargas Activas</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Tienes {activeLoads.length} carga(s) en tránsito
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="operations">
            Mis Cargas
            {availableLoads.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-400">
                {availableLoads.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Entregas Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{driverStats?.totalDeliveries || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Ganancias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(driverStats?.totalIncome || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-500" />
                  Gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(driverStats?.totalExpenses || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Margen Neto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency((driverStats?.totalIncome || 0) - (driverStats?.totalExpenses || 0))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </CardContent>
            </Card>
          </div>

          {/* Wallet Summary */}
          {walletSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Billetera</CardTitle>
                <CardDescription>Estado actual de tus pagos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded">
                    <p className="text-xs text-muted-foreground">Disponible</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(walletSummary.wallet?.availableBalance || 0)}
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded">
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {formatCurrency(walletSummary.wallet?.pendingBalance || 0)}
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded">
                    <p className="text-xs text-muted-foreground">Total Ganado</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(walletSummary.wallet?.totalEarnings || 0)}
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/finance-wallet")} className="w-full mt-4">
                  Ver Billetera Completa
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle>Entregas Recientes</CardTitle>
              <CardDescription>Últimas 5 entregas completadas</CardDescription>
            </CardHeader>
            <CardContent>
              {completedLoads.length > 0 ? (
                <div className="space-y-2">
                  {completedLoads.slice(0, 5).map((load: any) => (
                    <div key={load.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{load.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {load.pickupAddress} → {load.deliveryAddress}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(load.price)}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {STATUS_CONFIG[load.status]?.label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay entregas completadas aún</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          {/* Active Loads */}
          {activeLoads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-amber-500" />
                  En Tránsito ({activeLoads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeLoads.map((load: any) => (
                  <LoadStatusCard
                    key={load.id}
                    load={load}
                    onUploadPOD={() => {
                      setPodLoadId(load.id);
                      setShowPODUpload(true);
                    }}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Available Loads */}
          {availableLoads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  Disponibles ({availableLoads.length})
                </CardTitle>
                <CardDescription>Cargas que puedes aceptar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableLoads.map((load: any) => (
                  <DriverLoadCard
                    key={load.id}
                    loadId={load.id}
                    clientName={load.clientName}
                    pickupAddress={load.pickupAddress}
                    deliveryAddress={load.deliveryAddress}
                    price={load.price}
                    driverPay={load.driverPay}
                    totalMiles={load.totalMiles}
                    miles={load.miles}
                    itemCount={load.itemCount}
                    status={load.status}
                    weight={load.weight}
                    merchandiseType={load.merchandiseType}
                    onViewDetail={() => setSelectedLoad(load)}
                    onAccept={() => setSelectedLoad(load)}
                    onReject={() => setSelectedLoad(load)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Completed Loads */}
          {completedLoads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Completadas ({completedLoads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {completedLoads.slice(0, 10).map((load: any) => (
                  <div key={load.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{load.clientName}</p>
                      <p className="text-xs text-muted-foreground">{load.pickupAddress}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(load.price)}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {STATUS_CONFIG[load.status]?.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {myLoads?.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No hay cargas asignadas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* POD Upload Modal */}
      {showPODUpload && podLoadId && (
        <Dialog open={showPODUpload} onOpenChange={setShowPODUpload}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir Comprobante de Entrega (POD)</DialogTitle>
            </DialogHeader>
            <PODUpload
              loadId={podLoadId}
              onSuccess={() => {
                setShowPODUpload(false);
                setPodLoadId(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Load Detail Drawer */}
      {selectedLoad && (
        <DriverLoadDetailDrawer
          isOpen={!!selectedLoad}
          onClose={() => setSelectedLoad(null)}
          loadId={selectedLoad.id}
          clientName={selectedLoad.clientName}
          pickupAddress={selectedLoad.pickupAddress}
          deliveryAddress={selectedLoad.deliveryAddress}
          price={selectedLoad.price}
          driverPay={selectedLoad.driverPay}
          totalMiles={selectedLoad.totalMiles}
          miles={selectedLoad.miles}
          itemCount={selectedLoad.itemCount}
          weight={selectedLoad.weight}
          weightUnit={selectedLoad.weightUnit}
          merchandiseType={selectedLoad.merchandiseType}
          status={selectedLoad.status}
          onAccept={(loadId) => acceptLoadMutation.mutateAsync({ loadId })}
          onReject={(loadId, reason) => rejectLoadMutation.mutateAsync({ loadId, reason })}
        />
      )}
    </div>
  );
}
