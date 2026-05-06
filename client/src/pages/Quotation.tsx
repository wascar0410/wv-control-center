import { useMemo, useState } from "react";
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
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Truck,
  Gauge,
  Calculator,
  ShieldCheck,
} from "lucide-react";
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
  estimatedTollCost?: number;
  tollDataSource?: "google" | "estimated" | "none";
  totalOperatingCost?: number;
}

function money(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function verdictInfo(verdict?: string) {
  const v = String(verdict ?? "").toUpperCase();

  if (v === "ACCEPT" || v === "ACEPTAR") {
    return {
      key: "accept",
      label: "ACEPTAR",
      tone:
        "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400",
      subtext: "Carga rentable y lista para entrar al pipeline.",
      icon: CheckCircle,
    };
  }

  if (v === "NEGOTIATE" || v === "NEGOCIAR") {
    return {
      key: "negotiate",
      label: "NEGOCIAR",
      tone:
        "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400",
      subtext: "La carga puede servir, pero conviene negociar mejor tarifa antes de aprobar.",
      icon: AlertTriangle,
    };
  }

  return {
    key: "reject",
    label: "RECHAZAR",
    tone:
      "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-400",
    subtext: "No cumple el mínimo rentable. No debe entrar al pipeline.",
    icon: XCircle,
  };
}

function DecisionBanner({
  verdict,
  profit,
  margin,
  ratePerLoadedMile,
  differenceVsMinimum,
}: {
  verdict: string;
  profit: number;
  margin: number;
  ratePerLoadedMile?: number;
  differenceVsMinimum?: number;
}) {
  const info = verdictInfo(verdict);
  const Icon = info.icon;

  return (
    <div className={`rounded-2xl border p-5 ${info.tone}`}>
      <div className="flex items-start gap-4">
        <Icon className="mt-0.5 h-8 w-8 shrink-0" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold">{info.label}</p>
            <Badge variant="outline" className="bg-white/60 dark:bg-black/20">
              Decisión operativa
            </Badge>
          </div>

          <p className="mt-1 text-sm opacity-90">{info.subtext}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-current/20 bg-white/50 p-3 dark:bg-black/10">
              <p className="text-xs opacity-70">Ganancia estimada</p>
              <p className="text-lg font-bold">{money(profit)}</p>
            </div>
            <div className="rounded-xl border border-current/20 bg-white/50 p-3 dark:bg-black/10">
              <p className="text-xs opacity-70">Margen</p>
              <p className="text-lg font-bold">{margin.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-current/20 bg-white/50 p-3 dark:bg-black/10">
              <p className="text-xs opacity-70">Rate / loaded mile</p>
              <p className="text-lg font-bold">
                {ratePerLoadedMile ? `$${ratePerLoadedMile.toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-current/20 bg-white/50 p-3 dark:bg-black/10">
              <p className="text-xs opacity-70">Vs. mínimo</p>
              <p className="text-lg font-bold">
                {typeof differenceVsMinimum === "number"
                  ? money(differenceVsMinimum)
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-4">
        <div className="rounded-xl bg-muted p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold">{value}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </CardContent>
    </Card>
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
      toast.success(`✅ Carga #${data.id} creada y enviada al Command Center`, {
        description: "La carga está highlighted para revisión rápida",
      });
      // Redirect to command-center with loadId for highlighting
      setLocation(`/command-center?highlight=${data.id}`);
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
        estimatedTolls: result.estimatedTollCost ?? 0,
        assignedDriverId: formDataForLoad.assignedDriverId || undefined,
        notes: formDataForLoad.notes || undefined,
        pickupDate: formDataForLoad.pickupDate || undefined,
        deliveryDate: formDataForLoad.deliveryDate || undefined,
        rateConfirmationNumber: formDataForLoad.rateConfirmationNumber || undefined,
      });
    } catch {
      // handled by mutation
    } finally {
      setIsCreating(false);
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
    } catch {
      toast.error("Error con AI pricing");
    }
  };

  const handleReset = () => {
    setResult(null);
    setAiResult(null);
    setFormDataForLoad(null);
  };

  const verdictUpper = result?.verdict?.toUpperCase();
  const canCreateLoad =
    verdictUpper === "ACCEPT" ||
    verdictUpper === "ACEPTAR" ||
    verdictUpper === "NEGOTIATE" ||
    verdictUpper === "NEGOCIAR";

  const decision = useMemo(() => verdictInfo(result?.verdict), [result?.verdict]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              Load Analyzer — Yisvel Dispatch
            </h1>
            <p className="text-muted-foreground">
              Analiza primero, decide con criterio y crea solo cargas que convienen.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Decision Engine</Badge>
            <Badge variant="outline">No crear a ciegas</Badge>
            <Badge variant="outline">Pipeline limpio</Badge>
          </div>
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
                  <CardTitle className="text-base">Flujo ideal para Yisvel</CardTitle>
                  <CardDescription>
                    Este módulo no es para registrar cargas a lo loco. Es para filtrar y aprobar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      1
                    </span>
                    <p>Ingresar datos del broker, ruta, peso y tarifa</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      2
                    </span>
                    <p>Calcular millas, costos, utilidad, margen y tarifa mínima</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      3
                    </span>
                    <p>Tomar decisión operativa: <strong>ACEPTAR</strong>, <strong>NEGOCIAR</strong> o <strong>RECHAZAR</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      4
                    </span>
                    <p>Solo si conviene, guardar como carga y pasarla al pipeline</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="text-base">Qué analiza el sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>✓ Millas vacías hacia recogida</p>
                  <p>✓ Millas cargadas hasta entrega</p>
                  <p>✓ Retorno vacío</p>
                  <p>✓ Combustible estimado</p>
                  <p>✓ Costo operativo total</p>
                  <p>✓ Ganancia neta y margen %</p>
                  <p>✓ Tarifa mínima sugerida</p>
                  <p>✓ Rate por milla cargada</p>
                  <p>✓ Veredicto operativo</p>
                </CardContent>
              </Card>

              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base">Criterio operativo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Aceptar:</strong> entra al pipeline</p>
                  <p><strong>Negociar:</strong> se puede trabajar, pero pide mejor tarifa</p>
                  <p><strong>Rechazar:</strong> no debe crearse como carga</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Resultado del análisis
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Cotización ID: #{result.quotationId} ·{" "}
                  <span className="font-medium text-foreground">{formDataForLoad?.clientName}</span>
                  {formDataForLoad?.merchandiseType ? (
                    <>
                      {" "}·{" "}
                      <span className="text-muted-foreground">
                        {formDataForLoad.merchandiseType}
                      </span>
                    </>
                  ) : null}
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

            <DecisionBanner
              verdict={result.verdict}
              profit={result.estimatedProfit}
              margin={result.profitMarginPercent}
              ratePerLoadedMile={result.ratePerLoadedMile}
              differenceVsMinimum={result.differenceVsMinimum}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricCard
                title="Tarifa total"
                value={money(result.totalPrice)}
                subtitle="Oferta actual del broker"
                icon={DollarSign}
              />
              <MetricCard
                title="Costo operativo"
                value={money(result.totalOperatingCost ?? result.estimatedOperatingCost)}
                subtitle="Combustible + operación + peajes"
                icon={Calculator}
              />
              <MetricCard
                title="Ganancia estimada"
                value={money(result.estimatedProfit)}
                subtitle="Utilidad proyectada"
                icon={TrendingUp}
              />
              <MetricCard
                title="Millas totales"
                value={`${result.totalMiles.toFixed(0)} mi`}
                subtitle="Vacías + cargadas + retorno"
                icon={Truck}
              />
            </div>

            <QuotationResultsTable
              {...result}
              estimatedTollCost={result.estimatedTollCost ?? 0}
              tollDataSource={result.tollDataSource ?? "none"}
            />

            {aiResult && (
              <Card className="border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle>🤖 Recomendación de pricing IA</CardTitle>
                  <CardDescription>
                    Soporte para negociar mejor con el broker
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Mínimo</p>
                    <p className="text-lg font-bold">{money(aiResult.minimumRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Recomendado</p>
                    <p className="text-lg font-bold">{money(aiResult.recommendedRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stretch</p>
                    <p className="text-lg font-bold">{money(aiResult.stretchRate)}</p>
                  </div>
                  <div className="md:col-span-4">
                    <p className="text-xs text-muted-foreground">Explicación</p>
                    <p className="text-sm">{aiResult.explanation}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-2 border-dashed border-muted">
              <CardHeader>
                <CardTitle className="text-base">Resumen de la carga a aprobar</CardTitle>
                <CardDescription>
                  Esta es la información que entrará al pipeline si decides crearla.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-semibold">{formDataForLoad?.clientName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mercancía</p>
                    <p className="font-semibold">{formDataForLoad?.merchandiseType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Precio</p>
                    <p className="font-semibold text-green-600">{money(result.totalPrice)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recogida</p>
                    <p className="truncate font-medium">{formDataForLoad?.pickupAddress || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Entrega</p>
                    <p className="truncate font-medium">{formDataForLoad?.deliveryAddress || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso</p>
                    <p className="font-semibold">
                      {formDataForLoad?.weight ?? "—"} {formDataForLoad?.weightUnit ?? ""}
                    </p>
                  </div>
                  {formDataForLoad?.pickupDate ? (
                    <div>
                      <p className="text-muted-foreground">Fecha recogida</p>
                      <p className="font-semibold">{formDataForLoad.pickupDate}</p>
                    </div>
                  ) : null}
                  {formDataForLoad?.deliveryDate ? (
                    <div>
                      <p className="text-muted-foreground">Fecha entrega</p>
                      <p className="font-semibold">{formDataForLoad.deliveryDate}</p>
                    </div>
                  ) : null}
                  {formDataForLoad?.notes ? (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-muted-foreground">Notas</p>
                      <p className="font-medium">{formDataForLoad.notes}</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className={`border ${decision.tone}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-5 w-5" />
                  Acción recomendada
                </CardTitle>
                <CardDescription>
                  El sistema debe mantener limpio el pipeline: solo cargas aprobadas entran.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canCreateLoad ? (
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button
                      size="lg"
                      className="min-w-[260px] gap-2"
                      onClick={handleCreateLoad}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Aprobando y creando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Aprobar y Crear Carga
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="min-w-[220px]"
                      onClick={handleReset}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Analizar Otra
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button size="lg" variant="destructive" className="min-w-[260px]" disabled>
                      <XCircle className="mr-2 h-5 w-5" />
                      No Crear Carga
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="min-w-[220px]"
                      onClick={handleReset}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Analizar Otra
                    </Button>
                  </div>
                )}

                {!canCreateLoad ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Esta carga no debe entrar al pipeline. Negocia mejor tarifa o descártala.
                  </p>
                ) : verdictUpper === "NEGOTIATE" || verdictUpper === "NEGOCIAR" ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Puedes crearla si decides trabajarla, pero lo ideal es negociar primero.
                  </p>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    Carga validada. Lista para entrar al flujo operativo.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Gauge className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="font-medium">Pensado para velocidad</p>
                      <p className="text-sm text-muted-foreground">
                        Yisvel ve decisión, profit y margen sin perder tiempo.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="font-medium">Pensado para disciplina</p>
                      <p className="text-sm text-muted-foreground">
                        Solo cargas viables entran al sistema operativo.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="mt-0.5 h-5 w-5" />
                    <div>
                      <p className="font-medium">Pensado para crecer</p>
                      <p className="text-sm text-muted-foreground">
                        Queda listo para luego guardar rechazadas, negociadas y analytics de brokers.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
