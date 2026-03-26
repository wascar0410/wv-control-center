import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreateLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData: {
    pickupAddress: string;
    deliveryAddress: string;
    weight: number;
    totalPrice: number;
  };
}

export default function CreateLoadModal({ isOpen, onClose, quotationData }: CreateLoadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    merchandiseType: "",
    description: "",
    estimatedFuel: 0,
    estimatedTolls: 0,
  });

  const createLoadMutation = trpc.loads.create.useMutation();

  const handleCreateLoad = async () => {
    if (!formData.clientName || !formData.merchandiseType) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createLoadMutation.mutateAsync({
        clientName: formData.clientName,
        pickupAddress: quotationData.pickupAddress,
        deliveryAddress: quotationData.deliveryAddress,
        weight: quotationData.weight,
        merchandiseType: formData.merchandiseType,
        price: quotationData.totalPrice,
        estimatedFuel: formData.estimatedFuel,
        estimatedTolls: formData.estimatedTolls,
        notes: formData.description,
      });

      toast.success(`✅ Carga creada exitosamente: #${result.id}`);
      onClose();
      
      // Reset form
      setFormData({
        clientName: "",
        merchandiseType: "",
        description: "",
        estimatedFuel: 0,
        estimatedTolls: 0,
      });
    } catch (error: any) {
      toast.error(error?.message || "Error al crear la carga");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Carga desde Cotización</DialogTitle>
          <DialogDescription>Completa los detalles para crear la carga</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only quotation info */}
          <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Recogida:</span>
              <p className="font-medium truncate">{quotationData.pickupAddress}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Entrega:</span>
              <p className="font-medium truncate">{quotationData.deliveryAddress}</p>
            </div>
            <div className="flex justify-between">
              <div>
                <span className="text-muted-foreground">Peso:</span>
                <p className="font-medium">{quotationData.weight} lbs</p>
              </div>
              <div>
                <span className="text-muted-foreground">Precio:</span>
                <p className="font-medium text-green-600">${quotationData.totalPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div>
            <Label htmlFor="clientName">Nombre del Cliente *</Label>
            <Input
              id="clientName"
              placeholder="Ej: ABC Logistics"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="merchandiseType">Tipo de Mercancía *</Label>
            <Input
              id="merchandiseType"
              placeholder="Ej: Electrónica, Alimentos"
              value={formData.merchandiseType}
              onChange={(e) => setFormData({ ...formData, merchandiseType: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Notas adicionales"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fuel">Combustible</Label>
              <Input
                id="fuel"
                type="number"
                placeholder="0.00"
                value={formData.estimatedFuel}
                onChange={(e) => setFormData({ ...formData, estimatedFuel: parseFloat(e.target.value) || 0 })}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="tolls">Peajes</Label>
              <Input
                id="tolls"
                type="number"
                placeholder="0.00"
                value={formData.estimatedTolls}
                onChange={(e) => setFormData({ ...formData, estimatedTolls: parseFloat(e.target.value) || 0 })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleCreateLoad} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Carga"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
