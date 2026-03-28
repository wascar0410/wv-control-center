import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, TrendingUp, AlertCircle } from "lucide-react";

export default function LoadEvaluator() {
  const [form, setForm] = useState({
    brokerName: "",
    clientName: "",
    origin: "",
    destination: "",
    offeredPrice: "",
    loadedMiles: "",
    deadheadMiles: "0",
    weightLbs: "0",
    pickupDate: "",
    deliveryDate: "",
    notes: "",
  });

  const evaluateMutation = trpc.loadEvaluator.evaluate.useQuery(
    {
      brokerName: form.brokerName,
      clientName: form.clientName,
      origin: form.origin,
      destination: form.destination,
      offeredPrice: parseFloat(form.offeredPrice) || 0,
      loadedMiles: parseFloat(form.loadedMiles) || 0,
      deadheadMiles: parseFloat(form.deadheadMiles) || 0,
      weightLbs: parseFloat(form.weightLbs) || 0,
      pickupDate: form.pickupDate,
      deliveryDate: form.deliveryDate,
      notes: form.notes,
    },
    {
      enabled: parseFloat(form.offeredPrice) > 0 && parseFloat(form.loadedMiles) > 0,
    }
  );

  const saveMutation = trpc.loadEvaluator.save.useMutation({
    onSuccess: () => {
      toast.success("Carga guardada correctamente");
      setForm({
        brokerName: "",
        clientName: "",
        origin: "",
        destination: "",
        offeredPrice: "",
        loadedMiles: "",
        deadheadMiles: "0",
        weightLbs: "0",
        pickupDate: "",
        deliveryDate: "",
        notes: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const result = evaluateMutation.data;
  const canEvaluate = parseFloat(form.offeredPrice) > 0 && parseFloat(form.loadedMiles) > 0;

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.clientName || !form.origin || !form.destination) {
      toast.error("Completa cliente, origen y destino");
      return;
    }
    await saveMutation.mutateAsync({
      brokerName: form.brokerName,
      clientName: form.clientName,
      origin: form.origin,
      destination: form.destination,
      offeredPrice: parseFloat(form.offeredPrice) || 0,
      loadedMiles: parseFloat(form.loadedMiles) || 0,
      deadheadMiles: parseFloat(form.deadheadMiles) || 0,
      weightLbs: parseFloat(form.weightLbs) || 0,
      pickupDate: form.pickupDate,
      deliveryDate: form.deliveryDate,
      notes: form.notes,
    });
  };

  const handleReset = () => {
    setForm({
      brokerName: "",
      clientName: "",
      origin: "",
      destination: "",
      offeredPrice: "",
      loadedMiles: "",
      deadheadMiles: "0",
      weightLbs: "0",
      pickupDate: "",
      deliveryDate: "",
      notes: "",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Evaluador de Cargas
        </h1>
        <p className="text-muted-foreground mt-2">
          Analiza la rentabilidad de cada carga basándote en tu configuración de costos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Input form */}
        <div className="lg:col-span-2 space-y-6">
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
                    onChange={(e) => handleChange("brokerName", e.target.value)}
                    placeholder="Ej: CH Robinson"
                  />
                </div>
                <div>
                  <Label htmlFor="client">Cliente *</Label>
                  <Input
                    id="client"
                    value={form.clientName}
                    onChange={(e) => handleChange("clientName", e.target.value)}
                    placeholder="Ej: Amazon"
                  />
                </div>
                <div>
                  <Label htmlFor="origin">Origen *</Label>
                  <Input
                    id="origin"
                    value={form.origin}
                    onChange={(e) => handleChange("origin", e.target.value)}
                    placeholder="Ej: Newark, NJ"
                  />
                </div>
                <div>
                  <Label htmlFor="destination">Destino *</Label>
                  <Input
                    id="destination"
                    value={form.destination}
                    onChange={(e) => handleChange("destination", e.target.value)}
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
                    onChange={(e) => handleChange("offeredPrice", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="loaded">Millas cargadas *</Label>
                  <Input
                    id="loaded"
                    type="number"
                    value={form.loadedMiles}
                    onChange={(e) => handleChange("loadedMiles", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="deadhead">Millas vacías</Label>
                  <Input
                    id="deadhead"
                    type="number"
                    value={form.deadheadMiles}
                    onChange={(e) => handleChange("deadheadMiles", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Peso (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={form.weightLbs}
                    onChange={(e) => handleChange("weightLbs", e.target.value)}
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
                    onChange={(e) => handleChange("pickupDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery">Fecha entrega</Label>
                  <Input
                    id="delivery"
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => handleChange("deliveryDate", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Condiciones especiales, comentarios..."
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-20"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!canEvaluate || !form.clientName || !form.origin || !form.destination || saveMutation.isPending}
                  className="flex-1"
                >
                  {saveMutation.isPending ? (
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
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Results */}
        <div className="space-y-6">
          {canEvaluate && result ? (
            <>
              {/* Decision Card */}
              <Card
                className={`border-2 ${
                  result.decision === "ACCEPT"
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : result.decision === "NEGOTIATE"
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                      : "border-red-500 bg-red-50 dark:bg-red-950"
                }`}
              >
                <CardHeader>
                  <CardTitle
                    className={
                      result.decision === "ACCEPT"
                        ? "text-green-700 dark:text-green-300"
                        : result.decision === "NEGOTIATE"
                          ? "text-yellow-700 dark:text-yellow-300"
                          : "text-red-700 dark:text-red-300"
                    }
                  >
                    {result.decision === "ACCEPT"
                      ? "✓ ACEPTAR"
                      : result.decision === "NEGOTIATE"
                        ? "⚠ NEGOCIAR"
                        : "✕ RECHAZAR"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Razón</p>
                    <p className="font-medium">{result.decisionReason}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background/50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Ganancia Est.</p>
                      <p className="text-lg font-bold text-green-600">
                        ${result.estimatedProfit.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-background/50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Margen</p>
                      <p className="text-lg font-bold">
                        {result.estimatedMarginPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Métricas Clave</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricRow label="Millas totales" value={`${result.totalMiles.toFixed(0)} mi`} />
                  <MetricRow label="Tarifa ofrecida" value={`$${result.offeredRatePerMile.toFixed(2)}/mi`} />
                  <MetricRow label="Tarifa mínima recom." value={`$${result.recommendedMinRatePerMile.toFixed(2)}/mi`} />
                  <MetricRow label="Costo total/mi" value={`$${result.totalCostPerMile.toFixed(2)}/mi`} />
                  <MetricRow label="Ganancia/mi" value={`$${result.estimatedProfitPerMile.toFixed(2)}/mi`} />
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Desglose de Costos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricRow label="Costo combustible/mi" value={`$${result.fuelCostPerMile.toFixed(2)}`} />
                  <MetricRow label="Costo variable/mi" value={`$${result.variableCostPerMile.toFixed(2)}`} />
                  <MetricRow label="Costo fijo/mi" value={`$${result.fixedCostPerMile.toFixed(2)}`} />
                  <MetricRow label="Recargo distancia/mi" value={`$${result.distanceSurchargePerMile.toFixed(2)}`} />
                  <MetricRow label="Recargo peso/mi" value={`$${result.weightSurchargePerMile.toFixed(2)}`} />
                  <div className="border-t pt-3">
                    <MetricRow
                      label="Costo total estimado"
                      value={`$${result.totalEstimatedCost.toFixed(2)}`}
                      strong
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Completa pago y millas cargadas para evaluar</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={strong ? "font-semibold" : "text-sm text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
