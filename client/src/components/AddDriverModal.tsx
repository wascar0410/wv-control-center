import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useEmailValidation } from "@/hooks/useEmailValidation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface AddDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddDriverModal({ open, onOpenChange, onSuccess }: AddDriverModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const utils = trpc.useUtils();
  const emailValidation = useEmailValidation(500);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") {
      emailValidation.setEmail(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const createDriverMutation = trpc.admin.createDriver.useMutation({
    onSuccess: (data) => {
      toast.success(`Chofer ${data.driver.name} creado exitosamente`);
      setFormData({ name: "", phone: "" });
      emailValidation.setEmail("");
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
    
    if (!formData.name || !emailValidation.email) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (!emailValidation.isAvailable) {
      toast.error("Por favor verifica que el email sea válido y esté disponible");
      return;
    }

    createDriverMutation.mutate({
      name: formData.name,
      email: emailValidation.email,
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
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="chofer@example.com"
                value={emailValidation.email}
                onChange={handleInputChange}
                required
                className={emailValidation.email ? (emailValidation.isAvailable ? "pr-10" : "pr-10") : ""}
              />
              {emailValidation.email && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {emailValidation.isChecking ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : emailValidation.isAvailable ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {emailValidation.error && (
              <p className="text-sm text-red-500 mt-1">{emailValidation.error}</p>
            )}
            {emailValidation.isAvailable && emailValidation.email && !emailValidation.error && (
              <p className="text-sm text-green-500 mt-1">Email disponible</p>
            )}
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
              disabled={createDriverMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createDriverMutation.isPending || !emailValidation.isAvailable || emailValidation.isChecking}
            >
              {createDriverMutation.isPending ? "Creando..." : "Crear Chofer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
