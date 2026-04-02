import { useState } from "react";
import { trpc } from "@/lib/trpc";
import QuotationForm, { type QuotationFormData } from "@/components/QuotationForm";
import QuotationResultsTable from "@/components/QuotationResultsTable";
import CreateLoadModal from "@/components/CreateLoadModal";
import { AlertBanner } from "@/components/AlertBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface QuotationResult {
  quotationId: number;
  emptyMiles: number;
  loadedMiles: number;
  returnEmptyMiles: number;
  totalMiles: number;
  totalPrice: number;
  estimatedFuelCost: number;
  estimatedOperatingCost: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  verdict: string;
  minimumIncome?: number;
  ratePerLoadedMile?: number;
  differenceVsMinimum?: number;
  pickupAddress?: string;
  deliveryAddress?: string;
  weight?: number;
}

export default function Quotation() {
  const [result, setResult] = useState<QuotationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateLoadModal, setShowCreateLoadModal] = useState(false);
  const [formDataForLoad, setFormDataForLoad] = useState<QuotationFormData | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  const {
    data: unreadAlerts,
    error: alertsError,
  } = trpc.priceAlerts.getUnreadAlerts.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const safeAlerts = Array.isArray(unreadAlerts) ? unreadAlerts : [];

  const visibleAlerts = safeAlerts
    .filter((a: any) => !dismissedAlerts.includes(a.id))
    .map((a: any) => ({
      ...a,
      offeredPrice: Number(a.offeredPrice ?? 0),
      ratePerLoadedMile: Number(a.ratePerLoadedMile ?? 0),
      minimumProfitPerMile: Number(a.minimumProfitPerMile ?? 0),
      differenceFromMinimum: Number(a.differenceFromMinimum ?? 0),
    }));

  const calculateQuotation = trpc.quotation.calculateQuotation.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Cotización calculada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al calcular la cotización");
    },
  });

  const aiPricing = trpc.ai.suggestPricing.useMutation();
const [aiResult, setAiResult] = useState<any>(null);
  
  const handleSubmit = async (formData: QuotationFormData) => {
    setIsLoading(true);
    try {
      await calculateQuotation.mutateAsync(formData);
      setFormDataForLoad(formData);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAiPricing = async () => {
  if (!result) return;

  try {
    const res = await aiPricing.mutateAsync({
      miles: result.totalMiles,
      fuelCostPerMile: 0.6, // puedes ajustar luego
      targetProfitPerMile: 1.5,
      weight: result.weight ?? 0,
    });

    setAiResult(res);
    toast.success("AI pricing generado");
  } catch (err) {
    toast.error("Error con AI pricing");
  }
};

  const handleReset = () => {
    setResult(null);
    setFormDataForLoad(null);
    setShowCreateLoadModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Cotización de Cargas
          </h1>
          <p className="text-muted-foreground">
            Calcula el precio, millas y rentabilidad de una carga antes de aceptarla
          </p>
        </div>

        {alertsError && (
          <div className="mb-6 text-sm text-yellow-600 dark:text-yellow-400">
            Alertas no disponibles temporalmente.
          </div>
        )}

        {visibleAlerts.length > 0 && (
          <div className="mb-8">
            <AlertBanner
              alerts={visibleAlerts}
              onDismiss={(alertId) =>
                setDismissedAlerts((prev) => [...prev, alertId])
              }
            />
          </div>
        )}

        {!result ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la Carga</CardTitle>
                  <CardDescription>
                    Ingresa la ubicación de la van, punto de recogida, punto de entrega y detalles de la carga
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QuotationForm onSubmit={handleSubmit} isLoading={isLoading} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-base">💡 Consejos</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3 text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Coordenadas GPS</p>
                    <p>Puedes obtener las coordenadas usando Google Maps o cualquier app de mapas.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Tarifa Estándar</p>
                    <p>La tarifa promedio es $2.00-$3.00 por milla. Ajusta según el mercado.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Margen Mínimo</p>
                    <p>Se recomienda un margen de al menos 15% para cubrir imprevistos.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Millas Vacías</p>
                    <p>Las millas de retorno vacío reducen tu ganancia. Considera incluirlas.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-base">📊 Cálculos Incluidos</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2 text-muted-foreground">
                  <p>✓ Distancia van → recogida (millas vacías)</p>
                  <p>✓ Distancia recogida → entrega (millas cargadas)</p>
                  <p>✓ Distancia entrega → van (millas retorno)</p>
                  <p>✓ Costo combustible ($0.35/milla)</p>
                  <p>✓ Costo operativo ($0.65/milla)</p>
                  <p>✓ Ganancia neta y margen %</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Resultados de la Cotización
                </h2>
                <p className="text-muted-foreground mt-1">
                  Cotización ID: #{result.quotationId}
                </p>
              </div>
              <Button onClick={handleReset} variant="outline" size="lg">
                <RotateCcw className="w-4 h-4 mr-2" />
                Nueva Cotización
              </Button>
            </div>

            <QuotationResultsTable {...result} />

            {aiResult && (
  <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950">
    <CardHeader>
      <CardTitle>🤖 AI Pricing Recommendation</CardTitle>
      <CardDescription>
        Suggested pricing based on logistics intelligence
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">
      <p><strong>Minimum:</strong> ${aiResult.minimumRate}</p>
      <p><strong>Recommended:</strong> ${aiResult.recommendedRate}</p>
      <p><strong>Stretch:</strong> ${aiResult.stretchRate}</p>
      <p className="text-muted-foreground mt-2">
        {aiResult.explanation}
      </p>
    </CardContent>
  </Card>
)}

            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                className="min-w-[200px]"
                onClick={() => setShowCreateLoadModal(true)}
              >
                ✓ Crear Carga
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px]"
                onClick={handleReset}
              >
                Calcular Otra
              </Button>
            </div>
            <Button
  size="lg"
  variant="secondary"
  className="min-w-[200px]"
  onClick={handleAiPricing}
>
  🤖 AI Pricing
</Button>

            {result && formDataForLoad && (
              <CreateLoadModal
                isOpen={showCreateLoadModal}
                onClose={() => setShowCreateLoadModal(false)}
                quotationData={{
                  pickupAddress: formDataForLoad.pickupAddress,
                  deliveryAddress: formDataForLoad.deliveryAddress,
                  weight: formDataForLoad.weight,
                  totalPrice: result.totalPrice,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
