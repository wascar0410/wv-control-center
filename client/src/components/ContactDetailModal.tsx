import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Contact {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  message: string;
  status: "new" | "read" | "responded" | "archived";
  createdAt: Date;
}

interface ContactDetailModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

const statusLabels: Record<string, string> = {
  new: "Nueva",
  read: "Leída",
  responded: "Respondida",
  archived: "Archivada",
};

const statusColors: Record<string, string> = {
  new: "bg-red-100 text-red-800",
  read: "bg-yellow-100 text-yellow-800",
  responded: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-800",
};

export function ContactDetailModal({
  contact,
  isOpen,
  onClose,
  onStatusUpdated,
}: ContactDetailModalProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatusMutation = trpc.contact.updateStatus.useMutation();

  const handleStatusChange = async () => {
    if (!contact || !newStatus) {
      toast.error("Por favor selecciona un estado");
      return;
    }

    setIsUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        id: contact.id,
        status: newStatus as "new" | "read" | "responded" | "archived",
        notes: notes || undefined,
      });

      toast.success("Estado actualizado exitosamente");
      setNewStatus("");
      setNotes("");
      onStatusUpdated?.();
      onClose();
    } catch (error) {
      toast.error("Error al actualizar el estado");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles de la Solicitud</DialogTitle>
          <DialogDescription>
            Solicitud de contacto de {contact.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Nombre</label>
              <p className="text-lg font-semibold">{contact.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-lg">{contact.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Empresa</label>
              <p className="text-lg">{contact.company || "No especificada"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Fecha</label>
              <p className="text-lg">
                {new Date(contact.createdAt).toLocaleDateString("es-ES")}
              </p>
            </div>
          </div>

          {/* Current Status */}
          <div>
            <label className="text-sm font-medium text-gray-600">
              Estado Actual
            </label>
            <div className="mt-2">
              <Badge className={statusColors[contact.status]}>
                {statusLabels[contact.status]}
              </Badge>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium text-gray-600">Mensaje</label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm whitespace-pre-wrap">{contact.message}</p>
            </div>
          </div>

          {/* Status Update */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Actualizar Estado</h3>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Nuevo Estado
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un nuevo estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nueva</SelectItem>
                  <SelectItem value="read">Leída</SelectItem>
                  <SelectItem value="responded">Respondida</SelectItem>
                  <SelectItem value="archived">Archivada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Notas (opcional)
              </label>
              <Textarea
                placeholder="Agrega notas sobre esta solicitud..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleStatusChange}
            disabled={isUpdating || !newStatus}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUpdating ? "Actualizando..." : "Actualizar Estado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
