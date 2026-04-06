/**
 * QuoteAnalyzer.tsx
 * Formal quotation analysis with estimated vs actual cost comparison
 * Tracks profitability by broker/route and provides decision insights
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit2,
  Plus,
} from "lucide-react";

interface QuoteAnalysisRecord {
  id: number;
  brokerName?: string;
  routeName?: string;
  totalIncome: number;
  estimatedProfit: number;
  estimatedMargin: number;
  actualProfit?: number;
  actualMargin?: number;
  verdict: "accept" | "negotiate" | "reject";
  ratePerLoadedMile: number;
  recommendedMinimumRate: number;
  rateVsMinimum: number;
  completedAt?: Date;
}

function VerdictBadge({ verdict }: { verdict: "accept" | "negotiate" | "reject" }) {
  const variants: Record<string, { bg: string; icon: any; label: string }> = {
    accept: { bg: "bg-green-500/20 text-green-300 border-green-500/30", icon: CheckCircle, label: "Aceptar" },
    negotiate: { bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: AlertCircle, label: "Negociar" },
    reject: { bg: "bg-red-500/20 text-red-300 border-red-500/30", icon: XCircle, label: "Rechazar" },
  };
  const v = variants[verdict];
  const Icon = v.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${v.bg}`}>
      <Icon className="w-3 h-3" />
      {v.label}
    </span>
  );
}

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatPercent(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(2)}%`;
}

// Summary Tab
function SummaryTab() {
  const { data: summary } = trpc.quoteAnalysis.getSummary.useQuery();

  if (!summary || Object.keys(summary).length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay datos de análisis disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(summary).map(([broker, stats]: [string, any]) => (
        <Card key={broker}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{broker}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Cotizaciones</p>
                <p className="text-xl font-bold">{stats.count}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Margen Promedio</p>
                <p className="text-xl font-bold text-green-600">{formatPercent(stats.avgMargin)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rentables</p>
                <p className="text-lg font-semibold text-green-600">{stats.profitable}</p>
              </div>
              <div>
                <p className="text-muted-foreground">No Rentables</p>
                <p className="text-lg font-semibold text-red-600">{stats.unprofitable}</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Varianza Promedio</p>
              <p className={`text-sm font-semibold ${stats.avgVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stats.avgVariance >= 0 ? "+" : ""}{formatPercent(stats.avgVariance)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Analysis List Tab
function AnalysisListTab() {
  const [filter, setFilter] = useState<"accept" | "negotiate" | "reject" | "all">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actualCosts, setActualCosts] = useState<{
    actualFuel: string;
    actualTolls: string;
    actualMaintenance: string;
    actualInsurance: string;
    actualOther: string;
  }>({
    actualFuel: "0",
    actualTolls: "0",
    actualMaintenance: "0",
    actualInsurance: "0",
    actualOther: "0",
  });

  const { data: analyses } = trpc.quoteAnalysis.getAll.useQuery({
    verdict: filter !== "all" ? filter : undefined,
    limit: 100,
  });

  const updateMutation = trpc.quoteAnalysis.updateWithActuals.useMutation({
    onSuccess: () => {
      toast.success("Costos reales actualizados");
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveActuals = (id: number) => {
    const totalActual =
      parseFloat(actualCosts.actualFuel) +
      parseFloat(actualCosts.actualTolls) +
      parseFloat(actualCosts.actualMaintenance) +
      parseFloat(actualCosts.actualInsurance) +
      parseFloat(actualCosts.actualOther);

    const record = analyses?.find((a: any) => a.id === id);
    if (!record) return;

    const actualProfit = record.totalIncome - totalActual;
    const actualMargin = (actualProfit / record.totalIncome) * 100;
    const costVariance = totalActual - record.totalEstimatedCost;
    const profitVariance = actualProfit - record.estimatedProfit;
    const marginVariance = actualMargin - record.estimatedMargin;

    updateMutation.mutate({
      id,
      actualFuel: parseFloat(actualCosts.actualFuel),
      actualTolls: parseFloat(actualCosts.actualTolls),
      actualMaintenance: parseFloat(actualCosts.actualMaintenance),
      actualInsurance: parseFloat(actualCosts.actualInsurance),
      actualOther: parseFloat(actualCosts.actualOther),
      totalActualCost: totalActual,
      actualProfit,
      actualMargin,
      costVariance,
      profitVariance,
      marginVariance,
    });
  };

  if (!analyses || analyses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay cotizaciones para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "accept", "negotiate", "reject"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="text-xs"
          >
            {f === "all" ? "Todas" : f === "accept" ? "Aceptadas" : f === "negotiate" ? "Negociar" : "Rechazadas"}
          </Button>
        ))}
      </div>

      {analyses.map((qa: QuoteAnalysisRecord) => (
        <Card key={qa.id}>
          <CardContent className="p-4">
            {editingId === qa.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">Combustible Real</label>
                    <Input
                      type="number"
                      value={actualCosts.actualFuel}
                      onChange={(e) => setActualCosts({ ...actualCosts, actualFuel: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Peajes Real</label>
                    <Input
                      type="number"
                      value={actualCosts.actualTolls}
                      onChange={(e) => setActualCosts({ ...actualCosts, actualTolls: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Mantenimiento Real</label>
                    <Input
                      type="number"
                      value={actualCosts.actualMaintenance}
                      onChange={(e) => setActualCosts({ ...actualCosts, actualMaintenance: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Seguro Real</label>
                    <Input
                      type="number"
                      value={actualCosts.actualInsurance}
                      onChange={(e) => setActualCosts({ ...actualCosts, actualInsurance: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveActuals(qa.id)}
                    className="flex-1"
                    disabled={updateMutation.isPending}
                  >
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{qa.brokerName || "Broker"}</p>
                    <p className="text-xs text-muted-foreground">{qa.routeName || "Ruta"}</p>
                  </div>
                  <VerdictBadge verdict={qa.verdict} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ingreso Total</p>
                    <p className="font-semibold">{formatCurrency(qa.totalIncome)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rate/Milla</p>
                    <p className="font-semibold">{formatCurrency(qa.ratePerLoadedMile)}</p>
                  </div>
                </div>

                {/* Estimated vs Actual */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/50 p-2 rounded">
                  <div>
                    <p className="text-muted-foreground mb-1">Estimado</p>
                    <p className="font-semibold text-green-600">{formatCurrency(qa.estimatedProfit)}</p>
                    <p className="text-muted-foreground">{formatPercent(qa.estimatedMargin)}</p>
                  </div>
                  {qa.actualProfit !== undefined ? (
                    <div>
                      <p className="text-muted-foreground mb-1">Real</p>
                      <p className={`font-semibold ${qa.actualProfit >= qa.estimatedProfit ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(qa.actualProfit)}
                      </p>
                      <p className="text-muted-foreground">{formatPercent(qa.actualMargin || 0)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground mb-1">Real</p>
                      <p className="text-muted-foreground italic">Pendiente</p>
                    </div>
                  )}
                </div>

                {/* Rate Analysis */}
                <div className="text-xs bg-muted/50 p-2 rounded">
                  <p className="text-muted-foreground mb-1">Análisis de Rate</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Rate: {formatCurrency(qa.ratePerLoadedMile)}</p>
                    <p className="text-muted-foreground">vs Min: {formatCurrency(qa.recommendedMinimumRate)}</p>
                    <span className={`font-semibold ${qa.rateVsMinimum >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {qa.rateVsMinimum >= 0 ? "+" : ""}{formatCurrency(qa.rateVsMinimum)}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(qa.id)}
                  className="w-full gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {qa.actualProfit !== undefined ? "Actualizar Costos" : "Ingresar Costos Reales"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Main Component
export default function QuoteAnalyzer() {
  const [activeTab, setActiveTab] = useState("analysis");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Quote Analyzer</h1>
        <p className="text-muted-foreground">Análisis de cotizaciones: estimado vs real</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Decisiones Tomadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Rentables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              No Rentables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">Análisis</TabsTrigger>
          <TabsTrigger value="summary">Resumen por Broker</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <AnalysisListTab />
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <SummaryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
