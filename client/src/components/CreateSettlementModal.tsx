import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CreateSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateSettlementModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateSettlementModalProps) {
  const { toast } = useToast();
  const [settlementPeriod, setSettlementPeriod] = useState("");
  const [partner1Share, setPartner1Share] = useState("50");
  const [partner2Share, setPartner2Share] = useState("50");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users for partner selection
  const { data: users } = trpc.contact.list.useQuery({ limit: 100, offset: 0 });

  const createSettlementMutation = trpc.settlement.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validations
      if (!settlementPeriod) {
        toast({
          title: "Error",
          description: "Ingresa el período de settlement (YYYY-MM)",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const p1Share = parseFloat(partner1Share);
      const p2Share = parseFloat(partner2Share);

      if (p1Share + p2Share !== 100) {
        toast({
          title: "Error",
          description: "La suma de las participaciones debe ser 100%",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Parse period to dates
      const [year, month] = settlementPeriod.split("-");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      await createSettlementMutation.mutateAsync({
        settlementPeriod,
        startDate,
        endDate,
        partner1Id: 1, // TODO: Get from user selection
        partner2Id: 2, // TODO: Get from user selection
        partner1Share: p1Share,
        partner2Share: p2Share,
      });

      toast({
        title: "Éxito",
        description: "Settlement creado exitosamente",
      });

      // Reset form
      setSettlementPeriod("");
      setPartner1Share("50");
      setPartner2Share("50");

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el settlement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Settlement</DialogTitle>
          <DialogDescription>
            Crea un nuevo período de settlement para distribuir ganancias
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Settlement Period */}
          <div className="space-y-2">
            <Label htmlFor="period">Período (YYYY-MM)</Label>
            <Input
              id="period"
              type="month"
              value={settlementPeriod}
              onChange={(e) => setSettlementPeriod(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">Ej: 2026-04</p>
          </div>

          {/* Partner Shares */}
          <div className="space-y-4">
            <Label>Distribución de Participación</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner1" className="text-sm">
                  Socio 1 (%)
                </Label>
                <Input
                  id="partner1"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={partner1Share}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPartner1Share(String(val));
                    setPartner2Share(String(100 - val));
                  }}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner2" className="text-sm">
                  Socio 2 (%)
                </Label>
                <Input
                  id="partner2"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={partner2Share}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPartner2Share(String(val));
                    setPartner1Share(String(100 - val));
                  }}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {(parseFloat(partner1Share) + parseFloat(partner2Share)).toFixed(2)}%
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !settlementPeriod}>
              {isSubmitting ? "Creando..." : "Crear Settlement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
