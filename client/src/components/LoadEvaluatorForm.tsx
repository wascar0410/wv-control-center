import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RotateCcw, AlertCircle } from "lucide-react";
import { LoadEvaluatorFormData } from "@/hooks/useLoadEvaluatorForm";

interface LoadEvaluatorFormProps {
  form: LoadEvaluatorFormData;
  onFormChange: (key: keyof LoadEvaluatorFormData, value: string) => void;
  onReset: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  canSave: boolean;
}

export function LoadEvaluatorFormComponent({
  form,
  onFormChange,
  onReset,
  onSave,
  isSaving,
  canSave,
}: LoadEvaluatorFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la Carga</CardTitle>
        <CardDescription>Información básica de la oportunidad</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="broker">Broker</Label>
            <Input
              id="broker"
              value={form.brokerName}
              onChange={(e) => onFormChange("brokerName", e.target.value)}
              placeholder="Ej: CH Robinson"
            />
          </div>
          <div>
            <Label htmlFor="client">Cliente *</Label>
            <Input
              id="client"
              value={form.clientName}
              onChange={(e) => onFormChange("clientName", e.target.value)}
              placeholder="Ej: Amazon"
            />
          </div>
          <div>
            <Label htmlFor="origin">Origen *</Label>
            <Input
              id="origin"
              value={form.origin}
              onChange={(e) => onFormChange("origin", e.target.value)}
              placeholder="Ej: Newark, NJ"
            />
          </div>
          <div>
            <Label htmlFor="destination">Destino *</Label>
            <Input
              id="destination"
              value={form.destination}
              onChange={(e) => onFormChange("destination", e.target.value)}
              placeholder="Ej: Harrisburg, PA"
            />
          </div>
          <div>
            <Label htmlFor="price">Pago ofrecido ($) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={form.offeredPrice}
              onChange={(e) => onFormChange("offeredPrice", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="loaded">Millas cargadas *</Label>
            <Input
              id="loaded"
              type="number"
              value={form.loadedMiles}
              onChange={(e) => onFormChange("loadedMiles", e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="deadhead">Millas vacías</Label>
            <Input
              id="deadhead"
              type="number"
              value={form.deadheadMiles}
              onChange={(e) => onFormChange("deadheadMiles", e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="weight">Peso (lbs)</Label>
            <Input
              id="weight"
              type="number"
              value={form.weightLbs}
              onChange={(e) => onFormChange("weightLbs", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pickup">Fecha pickup</Label>
            <Input
              id="pickup"
              type="date"
              value={form.pickupDate}
              onChange={(e) => onFormChange("pickupDate", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="delivery">Fecha entrega</Label>
            <Input
              id="delivery"
              type="date"
              value={form.deliveryDate}
              onChange={(e) => onFormChange("deliveryDate", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notas</Label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => onFormChange("notes", e.target.value)}
            placeholder="Condiciones especiales, comentarios..."
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-20"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={!canSave || isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Carga
              </>
            )}
          </Button>
          <Button onClick={onReset} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadEvaluatorEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 text-center text-muted-foreground">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Completa pago y millas cargadas para evaluar</p>
      </CardContent>
    </Card>
  );
}
