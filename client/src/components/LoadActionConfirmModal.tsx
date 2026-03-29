import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface LoadActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  action: "accept" | "reject";
  loadId: number;
  clientName: string;
  isLoading?: boolean;
}

export default function LoadActionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  loadId,
  clientName,
  isLoading = false,
}: LoadActionConfirmModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAccept = action === "accept";
  const Icon = isAccept ? CheckCircle2 : XCircle;
  const title = isAccept ? "Aceptar Carga" : "Rechazar Carga";
  const description = isAccept
    ? `¿Estás seguro de que deseas aceptar la carga #${loadId} de ${clientName}?`
    : `¿Estás seguro de que deseas rechazar la carga #${loadId} de ${clientName}?`;

  const buttonColor = isAccept
    ? "bg-green-600 hover:bg-green-700"
    : "bg-red-600 hover:bg-red-700";

  const handleConfirm = async () => {
    if (!isAccept && !rejectionReason.trim()) {
      alert("Por favor proporciona una razón para rechazar la carga");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(rejectionReason);
      setRejectionReason("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAccept ? "bg-green-100" : "bg-red-100"}`}>
              <Icon className={`h-6 w-6 ${isAccept ? "text-green-600" : "text-red-600"}`} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="mt-2">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              {isAccept ? (
                <p>
                  Al aceptar esta carga, tu estado cambiará a <strong>En Tránsito</strong> y
                  se notificará al administrador.
                </p>
              ) : (
                <p>
                  Al rechazar esta carga, volverá a estar disponible para otros choferes y se
                  notificará al administrador.
                </p>
              )}
            </div>
          </div>

          {/* Rejection Reason (only for reject) */}
          {!isAccept && (
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium text-foreground">
                Razón del Rechazo <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="reason"
                placeholder="Explica brevemente por qué rechazas esta carga..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={isSubmitting}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                {rejectionReason.length}/500 caracteres
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={buttonColor}
            onClick={handleConfirm}
            disabled={isSubmitting || (!isAccept && !rejectionReason.trim())}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                {isAccept ? "Aceptando..." : "Rechazando..."}
              </>
            ) : (
              <>
                <Icon className="mr-2 h-4 w-4" />
                {title}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
