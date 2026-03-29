import { useState } from "react";
import { Upload, X, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface DeliveryProofUploadProps {
  loadId: number;
  onUploadSuccess?: () => void;
}

export default function DeliveryProofUpload({ loadId, onUploadSuccess }: DeliveryProofUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = trpc.driver.uploadPOD.useMutation({
    onSuccess: () => {
      toast.success("Fotos de entrega guardadas exitosamente");
      setFiles([]);
      setPreviews([]);
      onUploadSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar las fotos");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file types
    const validFiles = selectedFiles.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} no es una imagen válida`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} es demasiado grande (máx 5MB)`);
        return false;
      }
      return true;
    });

    // Check total file count
    if (files.length + validFiles.length > 10) {
      toast.error("Máximo 10 fotos por entrega");
      return;
    }

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Selecciona al menos una foto");
      return;
    }

    setIsUploading(true);
    try {
      // Upload each file
      for (const file of files) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            // Extract base64 data without data:image/... prefix
            const base64Data = base64.split(',')[1] || base64;
            await uploadMutation.mutateAsync({
              loadId,
              fileKey: `delivery-proof-${loadId}-${Date.now()}.jpg`,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              documentUrl: base64,
            });
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Fotos de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="delivery-proof-input"
            disabled={isUploading}
          />
          <label htmlFor="delivery-proof-input" className="cursor-pointer block">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Arrastra fotos aquí o haz clic para seleccionar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Máximo 10 fotos, 5MB cada una (JPG, PNG)
            </p>
          </label>
        </div>

        {/* Preview Grid */}
        {previews.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Fotos seleccionadas ({previews.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-muted-foreground/20"
                  />
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isUploading}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando fotos...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Guardar {files.length} foto{files.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm text-muted-foreground">
          <p>
            📸 Sube fotos del recibo firmado, firma del cliente, o cualquier prueba de entrega.
            Estas fotos se guardan como prueba para seguimiento y auditoría.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
