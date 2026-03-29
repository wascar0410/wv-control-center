import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface AddDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDriverModal({ open, onOpenChange, onSuccess }: AddDriverModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createDriverMutation = trpc.admin.createDriver.useMutation({
    onSuccess: (data) => {
      toast.success(`Chofer ${data.driver.name} creado exitosamente`);
      setFormData({ name: "", email: "", phone: "" });
      onOpenChange(false);
      utils.driver.myLoads.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear chofer");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    createDriverMutation.mutate({
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phone || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Chofer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Chofer *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej: Juan Pérez"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="chofer@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (Opcional)</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createDriverMutation.isPending}>
              {createDriverMutation.isPending ? "Creando..." : "Crear Chofer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
