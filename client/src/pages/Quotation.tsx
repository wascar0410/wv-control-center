import { useState } from "react";
import { trpc } from "@/lib/trpc";
import QuotationForm, { type QuotationFormData } from "@/components/QuotationForm";
import QuotationResultsTable from "@/components/QuotationResultsTable";
import CreateLoadModal from "@/components/CreateLoadModal";
import { AlertBanner } from "@/components/AlertBanner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [aiResult, setAiResult] = useState<any>(null);

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
      console.log("[Quotation] success response:", data);
      setResult(data as QuotationResult);
      toast.success("Cotización calculada exitosamente");
    },
    onError: (error) => {
      console.error("[Quotation] onError:", error);
      toast.error(error.message || "Error al calcular la cotización");
    },
  });

  const aiPricing = trpc.ai.suggestPricing.useMutation();

  const handleSubmit = async (formData: QuotationFormData) => {
    setIsLoading(true);
    console.log("[Quotation] submit formData:", formData);

    try {
      const payload = {
        vanLat: formData.vanLat,
        vanLng: formData.vanLng,
        vanAddress: formData.vanAddress,

        pickupLat: formData.pickupLat,
        pickupLng: formData.pickupLng,
        pickupAddress: formData.pickupAddress,

        deliveryLat: formData.deliveryLat,
        deliveryLng: formData.deliveryLng,
        deliveryAddress: formData.deliveryAddress,

        weight: formData.weight,
        weightUnit: formData.weightUnit || "lbs",
        cargoDescription: formData.cargoDescription || "",

        ratePerMile: formData.ratePerMile ?? undefined,
        ratePerPound: formData.ratePerPound ?? undefined,
        fuelSurcharge: formData.fuelSurcharge ?? 0,
        offeredPrice: formData.offeredPrice ?? undefined,
        includeReturnEmpty: formData.includeReturnEmpty ?? false,
      };

      console.log("[Quotation] clean payload:", payload);

      const response = await calculateQuotation.mutateAsync(payload as any);

      console.log("[Quotation] mutateAsync response:", response);
      setResult(response as QuotationResult);
      setFormDataForLoad(formData);
      setAiResult(null);
    } catch (error: any) {
      console.error("[Quotation] mutation error full:", error);
      toast.error(
        error?.message ||
          error?.shape?.message ||
          "Error al calcular la cotización"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiPricing = async () => {
    if (!result) return;

    try {
      const res = await aiPricing.mutateAsync({
        miles: result.totalMiles,
        fuelCostPerMile: 0.6,
        targetProfitPerMile: 1.5,
        weight: result.weight ?? 0,
      });

      setAiResult(res);
      toast.success("AI pricing generado");
    } catch (error: any) {
      console.error("[Quotation] AI pricing error:", error);
      toast.error("Error con AI pricing");
    }
  };

  const handleReset = () => {
    setResult(null);
    setAiResult(null);
    setFormDataForLoad(null);
    setShowCreateLoadModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Cotización de Cargas
          </h1>
          <p className="text-muted-foreground">
            Calcula el precio, millas y rentabilidad de una carga antes de aceptarla.
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Información de la Carga</CardTitle>
                  <CardDescription>
                    Ingresa la ubicación de la van, punto de recogida, punto de entrega y detalles de la carga.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QuotationForm onSubmit={handleSubmit} isLoading={isLoading} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="text-base">💡 Consejos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="mb-1 font-semibold text-foreground">Coordenadas GPS</p>
                    <p>Selecciona direcciones válidas para que el sistema obtenga coordenadas exactas.</p>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-foreground">Pricing automático</p>
                    <p>Puedes dejar el precio vacío y el sistema calculará una referencia automáticamente.</p>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-foreground">Margen mínimo</p>
                    <p>El sistema compara la carga contra el ingreso mínimo recomendado y te da un veredicto.</p>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-foreground">Millas vacías</p>
                    <p>Si incluyes retorno vacío, el análisis será más realista y profesional.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="text-base">📊 Cálculos incluidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Distancia van → recogida</p>
                  <p>✓ Distancia recogida → entrega</p>
                  <p>✓ Distancia de retorno vacío</p>
                  <p>✓ Costo de combustible</p>
                  <p>✓ Costo operativo estimado</p>
                  <p>✓ Ganancia neta y margen</p>
                  <p>✓ Veredicto: aceptar / negociar / rechazar</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Resultados de la Cotización
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Cotización ID: #{result.quotationId}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="min-w-[200px]"
                  onClick={handleAiPricing}
                  disabled={aiPricing.isPending}
                >
                  {aiPricing.isPending ? "Generando..." : "🤖 AI Pricing"}
                </Button>

                <Button onClick={handleReset} variant="outline" size="lg">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Nueva Cotización
                </Button>
              </div>
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
                  <p>
                    <strong>Minimum:</strong> ${aiResult.minimumRate}
                  </p>
                  <p>
                    <strong>Recommended:</strong> ${aiResult.recommendedRate}
                  </p>
                  <p>
                    <strong>Stretch:</strong> ${aiResult.stretchRate}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {aiResult.explanation}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap justify-center gap-4">
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
