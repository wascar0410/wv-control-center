import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { DriverChatWidget } from "@/components/DriverChatWidget";
import { DriverSMSNotifications } from "@/components/DriverSMSNotifications";
import { DriverPerformanceComparison } from "@/components/DriverPerformanceComparison";
import { DriverBonusSystem } from "@/components/DriverBonusSystem";
import DashboardLayout from "@/components/DashboardLayout";
// useAuth hook will be provided by DashboardLayout context
import { toast } from "sonner";
import {
  Package,
  CheckCircle,
  Clock,
  DollarSign,
  Star,
  FileText,
  TrendingUp,
  AlertCircle,
  MapPin,
  Calendar,
  BarChart3,
  Zap,
} from "lucide-react";

interface LoadWithDetails {
  id: number;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  weightUnit: string;
  merchandiseType: string;
  price: number;
  status: string;
  pickupDate: string | null;
  deliveryDate: string | null;
  notes: string | null;
}

export default function DriverViewImproved() {
  const userName = "Carlos Mendoza";
  const [selectedLoad, setSelectedLoad] = useState<LoadWithDetails | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmData, setConfirmData] = useState({ notes: "", proofUrl: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data - en producción vendría de la API
  const loads: LoadWithDetails[] = [
    {
      id: 1,
      clientName: "ABC Logistics",
      pickupAddress: "123 Main St, New York, NY",
      deliveryAddress: "456 Oak Ave, Boston, MA",
      weight: 2500,
      weightUnit: "lbs",
      merchandiseType: "Electronics",
      price: 850,
      status: "available",
      pickupDate: new Date().toISOString(),
      deliveryDate: null,
      notes: "Frágil - manejar con cuidado",
    },
    {
      id: 2,
      clientName: "XYZ Shipping",
      pickupAddress: "789 Pine Rd, Philadelphia, PA",
      deliveryAddress: "321 Elm St, Washington, DC",
      weight: 3200,
      weightUnit: "lbs",
      merchandiseType: "Furniture",
      price: 1200,
      status: "in_transit",
      pickupDate: new Date(Date.now() - 86400000).toISOString(),
      deliveryDate: null,
      notes: "Entrega antes de las 5 PM",
    },
    {
      id: 3,
      clientName: "Global Transport",
      pickupAddress: "555 Cedar Ln, Atlanta, GA",
      deliveryAddress: "999 Birch Way, Miami, FL",
      weight: 1800,
      weightUnit: "lbs",
      merchandiseType: "Textiles",
      price: 650,
      status: "delivered",
      pickupDate: new Date(Date.now() - 172800000).toISOString(),
      deliveryDate: new Date(Date.now() - 86400000).toISOString(),
      notes: "Entregado sin problemas",
    },
  ];

  const stats = {
    activeLoads: loads.filter(l => l.status === "in_transit").length,
    completedToday: loads.filter(l => l.status === "delivered").length,
    totalEarnings: loads.filter(l => l.status === "delivered").reduce((sum, l) => sum + l.price, 0),
    rating: 4.8,
  };

  const handleConfirmDelivery = async () => {
    if (!selectedLoad) return;

    setIsSubmitting(true);
    try {
      toast.success(`Carga ${selectedLoad.id} marcada como entregada`);
      setShowConfirmDialog(false);
      setSelectedLoad(null);
      setConfirmData({ notes: "", proofUrl: "" });
    } catch (error) {
      toast.error("Error al confirmar entrega");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-amber-100 text-amber-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Disponible";
      case "in_transit":
        return "En Tránsito";
      case "delivered":
        return "Entregada";
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bienvenido, {userName}</h1>
            <p className="text-muted-foreground mt-1">Panel de seguimiento interno de cargas</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cargas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.activeLoads}</div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completadas Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.completedToday}</div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ganancias Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">${stats.totalEarnings}</div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Calificación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.rating}</div>
                <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="cargas" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="cargas">Cargas</TabsTrigger>
            <TabsTrigger value="ganancias">Ganancias</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="desempeño">Desempeño</TabsTrigger>
            <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
            <TabsTrigger value="bonus">Bonus</TabsTrigger>
          </TabsList>

          {/* Cargas Tab */}
          <TabsContent value="cargas" className="space-y-4">
            <div className="space-y-3">
              {loads.map((load) => (
                <Card key={load.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold">{load.clientName}</h3>
                          <Badge className={getStatusColor(load.status)}>
                            {getStatusLabel(load.status)}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{load.pickupAddress} → {load.deliveryAddress}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>{load.weight} {load.weightUnit} - {load.merchandiseType}</span>
                          </div>
                          {load.notes && (
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="w-4 h-4" />
                              <span>{load.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">${load.price}</div>
                        {load.status === "in_transit" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedLoad(load);
                              setShowConfirmDialog(true);
                            }}
                            className="mt-2"
                          >
                            Confirmar Entrega
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Ganancias Tab */}
          <TabsContent value="ganancias" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Ganancias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Hoy</p>
                    <p className="text-2xl font-bold">${stats.totalEarnings}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Esta Semana</p>
                    <p className="text-2xl font-bold">$4,850</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Este Mes</p>
                    <p className="text-2xl font-bold">$18,500</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Próximo Pago</p>
                    <p className="text-2xl font-bold">$9,250</p>
                    <p className="text-xs text-muted-foreground mt-1">En 3 días</p>
                  </div>
                </div>

                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-green-900">Próximo Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monto:</span>
                      <span className="font-semibold">$9,250.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha:</span>
                      <span className="font-semibold">31 de Marzo, 2026</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Método:</span>
                      <span className="font-semibold">Transferencia Bancaria</span>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentos Tab */}
          <TabsContent value="documentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos y Comprobantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Comprobante de Pago - Marzo", date: "28/03/2026", type: "PDF" },
                  { name: "Factura #001", date: "25/03/2026", type: "PDF" },
                  { name: "Recibo de Entrega - Carga #3", date: "24/03/2026", type: "PDF" },
                  { name: "Contrato de Servicios", date: "01/03/2026", type: "PDF" },
                ].map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">{doc.date}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Descargar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notificaciones Tab */}
          <TabsContent value="notificaciones" className="space-y-4">
            <DriverSMSNotifications />
          </TabsContent>

          {/* Bonus Tab */}
          <TabsContent value="bonus" className="space-y-4">
            <DriverBonusSystem />
          </TabsContent>

          {/* Desempeño Tab */}
          <TabsContent value="desempeño" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tu Desempeño</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Entregas a Tiempo</p>
                    <p className="text-3xl font-bold text-green-600">98%</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Calificación Promedio</p>
                    <p className="text-3xl font-bold text-yellow-600">4.8/5.0</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Cargas Completadas</p>
                    <p className="text-3xl font-bold text-blue-600">127</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Millas Recorridas</p>
                    <p className="text-3xl font-bold text-purple-600">4,250</p>
                  </div>
                </div>

                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-amber-900">Comentarios Recientes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-white rounded border">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">ABC Logistics</span>
                      </div>
                      <p className="text-sm">"Excelente servicio, muy profesional"</p>
                    </div>
                    <div className="p-3 bg-white rounded border">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">XYZ Shipping</span>
                      </div>
                      <p className="text-sm">"Entrega rápida y segura"</p>
                    </div>
                  </CardContent>
                </Card>

                <DriverPerformanceComparison />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Chat Widget */}
        <div className="mt-8">
          <DriverChatWidget />
        </div>
      </div>

      {/* Confirm Delivery Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Entrega</DialogTitle>
          </DialogHeader>
          {selectedLoad && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">{selectedLoad.clientName}</p>
                <p className="text-sm text-muted-foreground">{selectedLoad.deliveryAddress}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas de Entrega (Opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ej: Entregado a recepción, cliente satisfecho..."
                  value={confirmData.notes}
                  onChange={(e) => setConfirmData({ ...confirmData, notes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof">URL de Comprobante (Foto/Firma)</Label>
                <Input
                  id="proof"
                  placeholder="URL de la foto de entrega"
                  value={confirmData.proofUrl}
                  onChange={(e) => setConfirmData({ ...confirmData, proofUrl: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmDelivery} disabled={isSubmitting}>
                  {isSubmitting ? "Confirmando..." : "Confirmar Entrega"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
