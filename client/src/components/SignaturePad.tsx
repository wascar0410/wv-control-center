import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RotateCcw, Check, AlertCircle } from "lucide-react";

interface SignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignatureCapture: (signatureDataUrl: string) => void;
  isSubmitting?: boolean;
}

export function SignaturePad({
  open,
  onOpenChange,
  onSignatureCapture,
  isSubmitting = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size to match display size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale context for high DPI
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000";

    // Fill background with white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    setContext(ctx);
    setHasSignature(false);
  }, [open]);

  // Get mouse/touch position
  const getPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Start drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!context) return;
    setIsDrawing(true);

    const { x, y } = getPosition(e);
    context.beginPath();
    context.moveTo(x, y);
  };

  // Draw
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return;

    const { x, y } = getPosition(e);
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  // Stop drawing
  const handleMouseUp = () => {
    if (!context) return;
    setIsDrawing(false);
    context.closePath();
  };

  // Clear signature
  const handleClear = () => {
    if (!context || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  };

  // Submit signature
  const handleSubmit = () => {
    if (!hasSignature || !canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSignatureCapture(dataUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Firma Digital</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30 flex gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Firma en el recuadro de abajo. Usa tu dedo en móvil o ratón en desktop.
            </p>
          </div>

          {/* Signature Canvas */}
          <div className="rounded-lg border-2 border-border bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="w-full cursor-crosshair touch-none"
              style={{ height: "200px", display: "block" }}
            />
          </div>

          {/* Status */}
          {!hasSignature && (
            <p className="text-center text-sm text-muted-foreground">
              Dibuja tu firma arriba
            </p>
          )}

          {hasSignature && (
            <p className="text-center text-sm text-green-600 font-medium">
              ✓ Firma capturada
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!hasSignature || isSubmitting}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpiar
            </Button>

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!hasSignature || isSubmitting}
            >
              <Check className="mr-2 h-4 w-4" />
              Confirmar Firma
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
