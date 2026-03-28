import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PODUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: number;
  loadClientName: string;
  onUploadSuccess?: () => void;
  isLoading?: boolean;
  onUpload?: (file: File, notes: string) => Promise<void>;
}

export function PODUploadDialog({
  open,
  onOpenChange,
  loadId,
  loadClientName,
  onUploadSuccess,
  isLoading = false,
  onUpload,
}: PODUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Solo se permiten imágenes: JPG, PNG, WebP");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("La imagen no debe superar 10MB");
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
      setUploadMode("gallery");
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
      setUploadMode("camera");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Por favor selecciona una foto");
      return;
    }

    if (!onUpload) {
      toast.error("Función de carga no disponible");
      return;
    }

    try {
      await onUpload(file, notes);
      toast.success("Foto de entrega subida exitosamente");
      handleClose();
      onUploadSuccess?.();
    } catch (error) {
      console.error("Error uploading POD:", error);
      toast.error("Error al subir la foto");
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setNotes("");
    setUploadMode(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Prueba de Entrega (POD)
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Cliente: <span className="font-semibold">{loadClientName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Mode Selection */}
          {!uploadMode && !preview && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Cámara</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs">Galería</span>
              </Button>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />

          {/* Preview */}
          {preview && (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={preview}
                  alt="POD Preview"
                  className="w-full h-64 object-cover rounded-lg border border-border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setUploadMode(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-400">
                  Foto capturada correctamente
                </AlertDescription>
              </Alert>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="pod-notes" className="text-sm">
                  Notas de entrega (opcional)
                </Label>
                <Textarea
                  id="pod-notes"
                  placeholder="Ej: Entregado a Juan, recibió en buen estado..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-background border-border text-sm"
                  rows={3}
                />
              </div>

              {/* File Info */}
              <Card className="bg-muted/30 border-border">
                <CardContent className="p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Archivo:</span>
                    <span className="font-mono">{file?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tamaño:</span>
                    <span className="font-mono">
                      {((file?.size || 0) / 1024).toFixed(2)} KB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-mono">{file?.type}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!preview && uploadMode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadMode === "camera"
                  ? "Abre tu cámara y captura la foto de entrega"
                  : "Selecciona una foto de tu galería"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Subiendo..." : "Confirmar Entrega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
