import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Camera,
  Upload,
  Loader2,
  X,
  Check,
  AlertCircle,
  PenTool,
} from "lucide-react";
import { SignaturePad } from "@/components/SignaturePad";

interface ProofImage {
  id: string;
  file: File;
  preview: string;
  timestamp: Date;
}

interface ProofOfDeliveryCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadId: number;
  clientName: string;
  deliveryAddress: string;
  price: number;
  onSubmit: (data: { notes: string; images: File[]; signature?: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function ProofOfDeliveryCapture({
  open,
  onOpenChange,
  loadId,
  clientName,
  deliveryAddress,
  price,
  onSubmit,
  isSubmitting,
}: ProofOfDeliveryCaptureProps) {
  const [images, setImages] = useState<ProofImage[]>([]);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("No se pudo acceder a la cámara. Usa el botón de archivo.");
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    // Set canvas size to video size
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Draw video frame to canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convert canvas to blob
    canvasRef.current.toBlob(blob => {
      if (!blob) return;

      const file = new File(
        [blob],
        `pod-${loadId}-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );

      const preview = canvasRef.current!.toDataURL("image/jpeg");
      const id = `${Date.now()}-${Math.random()}`;

      setImages(prev => [...prev, {
        id,
        file,
        preview,
        timestamp: new Date(),
      }]);

      toast.success("Foto capturada");
    }, "image/jpeg", 0.95);
  }, [loadId]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    files.forEach(file => {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} es demasiado grande (máx 10MB)`);
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} no es una imagen válida`);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const id = `${Date.now()}-${Math.random()}`;

        setImages(prev => [...prev, {
          id,
          file,
          preview,
          timestamp: new Date(),
        }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Remove image
  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  }, []);

  // Handle signature capture
  const handleSignatureCapture = (signatureDataUrl: string) => {
    setSignature(signatureDataUrl);
    setShowSignaturePad(false);
    toast.success("Firma capturada");
  };

  // Submit
  const handleSubmit = async () => {
    if (images.length === 0) {
      toast.error("Debes agregar al menos una foto");
      return;
    }

    try {
      stopCamera();
      await onSubmit({
        notes,
        images: images.map(img => img.file),
        signature: signature || undefined,
      });
      setImages([]);
      setNotes("");
      setSignature(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting proof:", error);
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("es-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          stopCamera();
        }
        onOpenChange(newOpen);
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prueba de Entrega - Carga #{loadId}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Load Summary */}
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="font-semibold">{clientName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{deliveryAddress}</p>
              <p className="mt-2 text-sm">
                Pago: <span className="font-semibold text-green-600">${price.toFixed(2)}</span>
              </p>
            </div>

            {/* Camera or File Input */}
            <div className="space-y-3">
              <Label>Capturar Fotos</Label>

              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative w-full bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full aspect-video object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={capturePhoto}
                      className="flex-1"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capturar Foto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={stopCamera}
                    >
                      Cerrar Cámara
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={startCamera}
                    variant="outline"
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Abrir Cámara
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar Archivo
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Image Gallery */}
            {images.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fotos Capturadas</Label>
                  <Badge variant="secondary">{images.length}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, idx) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.preview}
                        alt={`Proof ${idx + 1}`}
                        className="w-full aspect-square rounded-lg object-cover border border-border"
                      />

                      {/* Timestamp overlay */}
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatTime(img.timestamp)}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {/* Check mark */}
                      <div className="absolute top-1 right-1 rounded-full bg-green-500 p-1 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas de Entrega (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Ej: Entregado a recepción, cliente conforme, firma recibida, paquete en buen estado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                className="min-h-24 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/1000 caracteres
              </p>
            </div>

            {/* Signature Section */}
            {images.length > 0 && (
              <div className="space-y-3">
                <Label>Firma Digital (opcional)</Label>
                {signature ? (
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Firma capturada
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSignature(null)}
                        disabled={isSubmitting}
                      >
                        Cambiar
                      </Button>
                    </div>
                    <img
                      src={signature}
                      alt="Signature"
                      className="h-20 w-full rounded border border-green-300 bg-white"
                    />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    <PenTool className="mr-2 h-4 w-4" />
                    Capturar Firma
                  </Button>
                )}
              </div>
            )}

            {/* Info Alert */}
            {images.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30 flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Asegúrate de que las fotos muestren claramente la entrega completada. La firma es opcional.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  stopCamera();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || images.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Confirmar Entrega
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Modal */}
      <SignaturePad
        open={showSignaturePad}
        onOpenChange={setShowSignaturePad}
        onSignatureCapture={handleSignatureCapture}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
