import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileCheck, AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface PODUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: number;
  assignmentId?: number;
  clientName?: string;
}

export function PODUploadModal({
  open,
  onOpenChange,
  loadId,
  assignmentId,
  clientName,
}: PODUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();
  const uploadMutation = trpc.pod.upload.useMutation({
    onSuccess: () => {
      utils.pod.getByLoad.invalidate({ loadId });
      utils.driver.myLoads.invalidate();
      toast.success("Comprobante de entrega subido correctamente");
      setFile(null);
      setPreview(null);
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e.message || "Error al subir el comprobante");
    },
  });

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar tamaño
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("Archivo demasiado grande. Máximo 10MB.");
      return;
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error("Tipo de archivo no permitido. Usa JPEG, PNG, WebP o PDF.");
      return;
    }

    setFile(selectedFile);

    // Crear preview
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecciona un archivo primero");
      return;
    }

    setUploading(true);
    try {
      // Leer archivo como base64 y enviarlo al backend para S3 upload
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(",")[1]; // Remover data:image/... prefix

        try {
          // El backend manejará la subida a S3
          await uploadMutation.mutateAsync({
            loadId,
            assignmentId,
            documentUrl: "", // Backend lo generará
            documentKey: `pod/${loadId}/${Date.now()}-${file.name}`,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileBase64: base64Data,
          });
        } catch (error) {
          console.error(error);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subir Comprobante de Entrega (POD)</DialogTitle>
          <DialogDescription>
            Carga #{loadId} - {clientName || "Sin cliente"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="pod-file">Seleccionar archivo</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pod-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Máximo 10MB. Formatos: JPEG, PNG, WebP, PDF
            </p>
          </div>

          {/* File Info */}
          {file && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          {/* Image Preview */}
          {preview && (
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <img
                src={preview}
                alt="Preview"
                className="max-w-full h-auto rounded-lg border border-border"
              />
            </div>
          )}

          {/* Warning */}
          <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm text-amber-900 dark:text-amber-100">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Asegúrate de que el comprobante sea legible y contenga la firma del cliente.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploading ? "Subiendo..." : "Subir POD"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
