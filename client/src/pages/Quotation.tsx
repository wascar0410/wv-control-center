import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import QuotationForm, { type QuotationFormData } from "@/components/QuotationForm";
import QuotationResultsTable from "@/components/QuotationResultsTable";
import { AlertBanner } from "@/components/AlertBanner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckCircle, XCircle, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
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

function VerdictBanner({ verdict, profit, margin }: { verdict: string; profit: number; margin: number }) {
  const v = verdict?.toUpperCase();
  if (v === "ACCEPT" || v === "ACEPTAR") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-950">
        <CheckCircle className="h-8 w-8 shrink-0 text-green-600" />
        <div>
          <p className="text-lg font-bold text-green-700 dark:text-green-400">ACEPTAR — Carga Rentable</p>
          <p className="text-sm text-green-600 dark:text-green-500">
            Ganancia estimada: <strong>${profit.toFixed(2)}</strong> · Margen: <strong>{margin.toFixed(1)}%</strong>
          </p>
        </div>
      </div>
    );
  }
  if (v === "NEGOTIATE" || v === "NEGOCIAR") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
        <AlertTriangle className="h-8 w-8 shrink-0 text-amber-600" />
        <div>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">NEGOCIAR — Por debajo del mínimo</p>
          <p className="text-sm text-amber-600 dark:text-amber-500">
            La tarifa actual está por debajo del ingreso mínimo recomendado. Negocia un mejor precio antes de aceptar.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950">
      <XCircle className="h-8 w-8 shrink-0 text-red-600" />
      <div>
        <p className="text-lg font-bold text-red-700 dark:text-red-400">RECHAZAR — No Rentable</p>
        <p className="text-sm text-red-600 dark:text-red-500">
          Esta carga no cubre los costos operativos mínimos.
        </p>
      </div>
    </div>
  );
}

export default function Quotation() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<QuotationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
      setResult(data as QuotationResult);
      toast.success("Cotización calculada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al calcular la cotización");
    },
  });

  const createLoadMutation = trpc.loads.create.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Carga #${data.id} creada exitosamente`);
      setLocation(`/loads/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear la carga");
      setIsCreating(false);
    },
  });

  const aiPricing = trpc.ai.suggestPricing.useMutation();

  const handleSubmit = async (formData: QuotationFormData) => {
    setIsLoading(true);
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
      const response = await calculateQuotation.mutateAsync(payload as any);
      setResult(response as QuotationResult);
      setFormDataForLoad(formData);
      setAiResult(null);
    } catch (error: any) {
      toast.error(error?.message || "Error al calcular la cotización");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLoad = async () => {
    if (!result || !formDataForLoad) return;
    setIsCreating(true);
    try {
      await createLoadMutation.mutateAsync({
        clientName: formDataForLoad.clientName,
        pickupAddress: formDataForLoad.pickupAddress,
        deliveryAddress: formDataForLoad.deliveryAddress,
        pickupLat: formDataForLoad.pickupLat || undefined,
        pickupLng: formDataForLoad.pickupLng || undefined,
        deliveryLat: formDataForLoad.deliveryLat || undefined,
        deliveryLng: formDataForLoad.deliveryLng || undefined,
        weight: formDataForLoad.weight,
        weightUnit: formDataForLoad.weightUnit || "lbs",
        merchandiseType: formDataForLoad.merchandiseType,
        price: result.totalPrice,
        estimatedFuel: result.estimatedFuelCost,
        estimatedTolls: 0,
        assignedDriverId: formDataForLoad.assignedDriverId || undefined,
        notes: formDataForLoad.notes || undefined,
        pickupDate: formDataForLoad.pickupDate || undefined,
        deliveryDate: formDataForLoad.deliveryDate || undefined,
        rateConfirmationNumber: formDataForLoad.rateConfirmationNumber || undefined,
      });
    } catch {
      // error handled in mutation
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
      toast.error("Error con AI pricing");
    }
  };

  const handleReset = () => {
    setResult(null);
    setAiResult(null);
    setFormDataForLoad(null);
  };

  const verdictUpper = result?.verdict?.toUpperCase();
  const canCreateLoad = verdictUpper === "ACCEPT" || verdictUpper === "ACEPTAR" || verdictUpper === "NEGOTIATE" || verdictUpper === "NEGOCIAR";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Nueva Carga — Cotización y Análisis
          </h1>
          <p className="text-muted-foreground">
            Ingresa los datos de la carga, analiza la rentabilidad y créala directamente si conviene.
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
              <QuotationForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>

            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="text-base">Flujo de trabajo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white font-bold">1</span>
                    <p>Llena los datos del cliente, ruta y mercancía</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white font-bold">2</span>
                    <p>El sistema calcula millas, costos y rentabilidad</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white font-bold">3</span>
                    <p>Recibe el veredicto: <strong>ACEPTAR</strong>, <strong>NEGOCIAR</strong> o <strong>RECHAZAR</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white font-bold">4</span>
                    <p>Si conviene, crea la carga con un clic — lista para asignar al conductor</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="text-base">Cálculos incluidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Distancia van → recogida (millas vacías)</p>
                  <p>✓ Distancia recogida → entrega (millas cargadas)</p>
                  <p>✓ Distancia de retorno vacío</p>
                  <p>✓ Costo de combustible estimado</p>
                  <p>✓ Costo operativo total</p>
                  <p>✓ Ganancia neta y margen %</p>
                  <p>✓ Ingreso mínimo recomendado</p>
                  <p>✓ Tarifa real vs. tarifa mínima por milla</p>
                  <p>✓ Veredicto: ACEPTAR / NEGOCIAR / RECHAZAR</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Resultados del Análisis
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Cotización ID: #{result.quotationId} ·{" "}
                  <span className="font-medium text-foreground">{formDataForLoad?.clientName}</span>
                  {formDataForLoad?.merchandiseType && (
                    <> · <span className="text-muted-foreground">{formDataForLoad.merchandiseType}</span></>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAiPricing}
                  disabled={aiPricing.isPending}
                >
                  {aiPricing.isPending ? "Generando..." : "🤖 AI Pricing"}
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Nueva Cotización
                </Button>
              </div>
            </div>

            {/* Verdict Banner */}
            <VerdictBanner
              verdict={result.verdict}
              profit={result.estimatedProfit}
              margin={result.profitMarginPercent}
            />

            {/* Results Table */}
            <QuotationResultsTable {...result} />

            {/* AI Pricing */}
            {aiResult && (
              <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle>🤖 AI Pricing Recommendation</CardTitle>
                  <CardDescription>
                    Suggested pricing based on logistics intelligence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Mínimo:</strong> ${aiResult.minimumRate}</p>
                  <p><strong>Recomendado:</strong> ${aiResult.recommendedRate}</p>
                  <p><strong>Stretch:</strong> ${aiResult.stretchRate}</p>
                  <p className="mt-2 text-muted-foreground">{aiResult.explanation}</p>
                </CardContent>
              </Card>
            )}

            {/* Load Summary Card */}
            <Card className="border-2 border-dashed border-muted">
              <CardHeader>
                <CardTitle className="text-base">Resumen de la Carga a Crear</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-semibold">{formDataForLoad?.clientName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mercancía</p>
                    <p className="font-semibold">{formDataForLoad?.merchandiseType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precio</p>
                    <p className="font-semibold text-green-600">${result.totalPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recogida</p>
                    <p className="font-medium truncate">{formDataForLoad?.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Entrega</p>
                    <p className="font-medium truncate">{formDataForLoad?.deliveryAddress}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso</p>
                    <p className="font-semibold">{formDataForLoad?.weight} {formDataForLoad?.weightUnit}</p>
                  </div>
                  {formDataForLoad?.pickupDate && (
                    <div>
                      <p className="text-muted-foreground">Fecha Recogida</p>
                      <p className="font-semibold">{formDataForLoad.pickupDate}</p>
                    </div>
                  )}
                  {formDataForLoad?.deliveryDate && (
                    <div>
                      <p className="text-muted-foreground">Fecha Entrega</p>
                      <p className="font-semibold">{formDataForLoad.deliveryDate}</p>
                    </div>
                  )}
                  {formDataForLoad?.notes && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-muted-foreground">Notas</p>
                      <p className="font-medium">{formDataForLoad.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              {canCreateLoad ? (
                <Button
                  size="lg"
                  className="min-w-[240px] gap-2"
                  onClick={handleCreateLoad}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creando Carga...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Crear Carga
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button size="lg" variant="destructive" className="min-w-[240px]" disabled>
                  <XCircle className="mr-2 h-5 w-5" />
                  Carga No Rentable — No Crear
                </Button>
              )}

              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px]"
                onClick={handleReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Calcular Otra
              </Button>
            </div>

            {!canCreateLoad && (
              <p className="text-center text-sm text-muted-foreground">
                El veredicto es <strong>RECHAZAR</strong>. Negocia un mejor precio con el broker antes de crear la carga.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
