/**
 * DriverFeedbackModal — Post-delivery feedback form
 * Captures: traffic rating, difficulty, estimated vs actual time, notes
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, Clock, AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";

interface Props {
  loadId: number;
  loadTitle?: string;
  open: boolean;
  onClose: () => void;
}

function StarRating({ value, onChange, label, description }: {
  value: number; onChange: (v: number) => void;
  label: string; description: string;
}) {
  const [hovered, setHovered] = useState(0);
  const labels = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

  return (
    <div className="space-y-2">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-slate-400 text-xs">{description}</p>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= (hovered || value)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-600"
              }`}
            />
          </button>
        ))}
        {(hovered || value) > 0 && (
          <span className="text-amber-400 text-xs ml-2">{labels[hovered || value]}</span>
        )}
      </div>
    </div>
  );
}

export default function DriverFeedbackModal({ loadId, loadTitle, open, onClose }: Props) {
  const [trafficRating, setTrafficRating] = useState(0);
  const [difficultyRating, setDifficultyRating] = useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [actualMinutes, setActualMinutes] = useState("");
  const [notes, setNotes] = useState("");

  const submit = trpc.driverFeedback.submit.useMutation({
    onSuccess: () => {
      toast.success("¡Gracias por tu feedback! Ayuda a mejorar las rutas futuras.");
      onClose();
    },
    onError: (err) => {
      toast.error(`Error al enviar: ${err.message}`);
    },
  });

  const handleSubmit = () => {
    if (trafficRating === 0 || difficultyRating === 0) {
      toast.error("Por favor califica el tráfico y la dificultad de la ruta.");
      return;
    }
    submit.mutate({
      loadId,
      trafficRating,
      difficultyRating,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
      actualMinutes: actualMinutes ? parseInt(actualMinutes) : undefined,
      notes: notes || undefined,
    });
  };

  const timeDiff = estimatedMinutes && actualMinutes
    ? parseInt(actualMinutes) - parseInt(estimatedMinutes)
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5 text-teal-400" />
            Feedback de Entrega
          </DialogTitle>
          {loadTitle && (
            <p className="text-slate-400 text-sm mt-1">{loadTitle}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Traffic Rating */}
          <StarRating
            value={trafficRating}
            onChange={setTrafficRating}
            label="¿Cómo estuvo el tráfico?"
            description="1 = muy pesado, 5 = fluido sin problemas"
          />

          {/* Difficulty Rating */}
          <StarRating
            value={difficultyRating}
            onChange={setDifficultyRating}
            label="¿Qué tan difícil fue la ruta?"
            description="1 = muy difícil, 5 = muy fácil"
          />

          {/* Time Comparison */}
          <div className="space-y-3">
            <p className="text-white text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Comparación de Tiempo (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Tiempo estimado (min)</label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="ej. 120"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Tiempo real (min)</label>
                <input
                  type="number"
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(e.target.value)}
                  placeholder="ej. 145"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {timeDiff !== null && (
              <div className={`flex items-center gap-2 rounded-lg p-2.5 text-sm ${
                timeDiff <= 0
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : timeDiff <= 30
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>
                {timeDiff <= 0
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 shrink-0" />
                }
                {timeDiff <= 0
                  ? `Llegaste ${Math.abs(timeDiff)} min antes de lo estimado`
                  : `${timeDiff} min más de lo estimado`
                }
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-white text-sm font-medium block mb-2">Notas adicionales (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Algún problema en la ruta? ¿Zona difícil de acceso? ¿Cliente difícil?"
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-500 resize-none h-20 focus:border-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-600 text-slate-400 hover:text-white"
              onClick={onClose}
            >
              Omitir
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSubmit}
              disabled={submit.isPending}
            >
              {submit.isPending ? "Enviando..." : "Enviar Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
