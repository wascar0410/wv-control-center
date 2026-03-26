"use client";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Navigation, Clock, CheckCircle2, AlertCircle, Loader2, Camera } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Load {
  id: number;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: "available" | "in_transit" | "delivered" | "invoiced" | "paid";
  price: string;
  weight: string;
  merchandiseType: string;
  estimatedFuel: string;
  estimatedTolls: string;
}

interface LoadStatusCardProps {
  load: Load;
  onStatusChange?: () => void;
}

const statusConfig = {
  available: { label: "Asignada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: AlertCircle },
  in_transit: { label: "En Tránsito", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Navigation },
  delivered: { label: "Entregada", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle2 },
  invoiced: { label: "Facturada", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: Clock },
  paid: { label: "Pagada", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: CheckCircle2 },
};

export default function LoadStatusCard({ load, onStatusChange }: LoadStatusCardProps) {
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<"in_transit" | "delivered">("in_transit");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const updateStatusMutation = trpc.loads.updateStatus.useMutation();

  const handleStartRoute = () => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(load.deliveryAddress)}&travelmode=driving`;
    window.open(mapsUrl, "_blank");
    toast.success("Abriendo Google Maps...");
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDeliveryPhoto(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusChange = async () => {
    if (newStatus === "in_transit" && load.status === "available") {
      setIsUpdating(true);
      try {
        await updateStatusMutation.mutateAsync({
          id: load.id,
          status: "in_transit",
        });
        toast.success("✓ Carga marcada como En Tránsito");
        setShowStatusDialog(false);
        onStatusChange?.();
      } catch (error: any) {
        toast.error(error?.message || "Error al actualizar estado");
      } finally {
        setIsUpdating(false);
      }
    } else if (newStatus === "delivered") {
      setIsUpdating(true);
      try {
        await updateStatusMutation.mutateAsync({
          id: load.id,
          status: "delivered",
        });
        toast.success("✓ Carga marcada como Entregada");
        setShowStatusDialog(false);
        setDeliveryNotes("");
        setDeliveryPhoto(null);
        setPhotoPreview(null);
        onStatusChange?.();
      } catch (error: any) {
        toast.error(error?.message || "Error al actualizar estado");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const config = statusConfig[load.status];
  const StatusIcon = config.icon;

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{load.clientName}</CardTitle>
              <CardDescription className="mt-1">Carga #{load.id}</CardDescription>
            </div>
            <Badge className={config.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Locations */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Recogida</p>
                <p className="text-sm font-medium truncate">{load.pickupAddress}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Navigation className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Entrega</p>
                <p className="text-sm font-medium truncate">{load.deliveryAddress}</p>
              </div>
            </div>
          </div>

          {/* Load Details */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted rounded-lg text-xs">
            <div>
              <p className="text-muted-foreground">Peso</p>
              <p className="font-semibold">{load.weight} lbs</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mercancía</p>
              <p className="font-semibold truncate">{load.merchandiseType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Precio</p>
              <p className="font-semibold text-green-600">${parseFloat(load.price).toFixed(2)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {load.status === "available" && (
              <>
                <Button onClick={handleStartRoute} variant="outline" size="sm" className="flex-1">
                  <MapPin className="w-4 h-4 mr-2" />
                  Ir a Destino
                </Button>
                <Button onClick={() => { setNewStatus("in_transit"); setShowStatusDialog(true); }} size="sm" className="flex-1">
                  <Navigation className="w-4 h-4 mr-2" />
                  Iniciar Ruta
                </Button>
              </>
            )}

            {load.status === "in_transit" && (
              <Button onClick={() => { setNewStatus("delivered"); setShowStatusDialog(true); }} size="sm" className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar Entregada
              </Button>
            )}

            {load.status === "delivered" && (
              <div className="w-full p-2 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                <p className="text-xs font-medium text-green-700 dark:text-green-300">
                  ✓ Entrega confirmada. Esperando pago del gestor.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === "in_transit" ? "Iniciar Ruta" : "Confirmar Entrega"}
            </DialogTitle>
            <DialogDescription>
              {newStatus === "in_transit" 
                ? "Marca la carga como en tránsito para iniciar el viaje"
                : "Confirma que la carga ha sido entregada exitosamente"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{load.clientName}</p>
              <p className="text-xs text-muted-foreground mt-1">{load.deliveryAddress}</p>
            </div>

            {newStatus === "delivered" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Foto de Entrega</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {deliveryPhoto ? "Cambiar Foto" : "Tomar Foto"}
                    </Button>
                  </div>
                  {photoPreview && (
                    <div className="mt-2 rounded-lg overflow-hidden border">
                      <img src={photoPreview} alt="Foto de entrega" className="w-full h-32 object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Notas de Entrega (opcional)</label>
                  <Textarea
                    placeholder="Ej: Cliente no estaba, dejé con portero"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={2}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)} disabled={isUpdating}>
                Cancelar
              </Button>
              <Button onClick={handleStatusChange} disabled={isUpdating} className="flex-1">
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
