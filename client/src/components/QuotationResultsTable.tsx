import { useState } from "react";


// 🔥 SAFE HELPERS
const safeNum = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};
const money = (v: any) => `$${safeNum(v).toFixed(2)}`;
const percent = (v: any) => `${safeNum(v).toFixed(1)}%`;
const fixed = (v: any, d = 2) => safeNum(v).toFixed(d);

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, CheckCircle, AlertCircle, XCircle, Edit2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface QuotationResultsTableProps {
  quotationId: number;
  totalPrice: number;
  estimatedOperatingCost: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  verdict: string;
  minimumIncome?: number;
  ratePerLoadedMile?: number;
  differenceVsMinimum?: number;
  loadedMiles?: number;
  totalMiles?: number;
  estimatedTollCost?: number;
  tollDataSource?: "google" | "estimated" | "none";
}

export default function QuotationResultsTable({
  quotationId,
  totalPrice,
  estimatedOperatingCost,
  estimatedProfit,
  profitMarginPercent,
  verdict,
  minimumIncome = 0,
  ratePerLoadedMile = 0,
  differenceVsMinimum = 0,
  loadedMiles = 0,
  totalMiles = 0,
  estimatedTollCost = 0,
  tollDataSource = "none" as "google" | "estimated" | "none",
}: QuotationResultsTableProps) {
  const [manualVerdict, setManualVerdict] = useState<string | null>(null);
  const [verdictNotes, setVerdictNotes] = useState("");
  const [showVerdictDialog, setShowVerdictDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveVerdictMutation = trpc.quotation.saveVerdictOverride.useMutation({
    onSuccess: () => {
      toast.success("Veredicto guardado exitosamente");
      setShowVerdictDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al guardar veredicto");
    },
  });
  
  const currentVerdict = manualVerdict || verdict;
  const isVerdictOverridden = manualVerdict !== null && manualVerdict !== verdict;
  // Determine verdict color and icon
  const verdictConfig = {
    ACEPTAR: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Aceptar" },
    NEGOCIAR: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle, label: "Negociar" },
    RECHAZAR: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Rechazar" },
  };

  const config = verdictConfig[verdict as keyof typeof verdictConfig] || verdictConfig.NEGOCIAR;
  const VerdictIcon = config.icon;

  // Data for charts
  const costBreakdown = [
    { name: "Costo Operativo", value: Math.round(estimatedOperatingCost * 100) / 100 },
    { name: "Ganancia", value: Math.round(estimatedProfit * 100) / 100 },
  ];

  const comparisonData = [
    {
      name: "Análisis",
      "Precio Ofrecido": totalPrice,
      "Ingreso Mínimo": minimumIncome,
    },
  ];

  const COLORS = ["#ef4444", "#22c55e"];

  return (
    <div className="space-y-6">
      {/* Main Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Análisis de Rentabilidad</span>
            <Badge className={`${config.color} text-lg px-4 py-2`}>
              <VerdictIcon className="w-4 h-4 mr-2 inline" />
              {config.label}
            </Badge>
          </CardTitle>
          <CardDescription>Cotización #{quotationId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Concepto</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">Valor</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Precio Ofrecido</td>
                  <td className="text-right py-3 px-4 font-bold text-lg text-green-600">${fixed(totalPrice, 2)}</td>
                  <td className="py-3 px-4 text-muted-foreground">Precio total ofrecido por el broker</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Costo Operativo Estimado</td>
                  <td className="text-right py-3 px-4 font-bold text-lg text-red-600">${fixed(estimatedOperatingCost, 2)}</td>
                  <td className="py-3 px-4 text-muted-foreground">Combustible + mantenimiento</td>
                </tr>
                {tollDataSource === "google" && (
                  <tr className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">
                      Peajes / Tolls
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">Google Maps ✓</span>
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-lg text-orange-600">
                      {estimatedTollCost > 0 ? `$${fixed(estimatedTollCost, 2)}` : "$0.00"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {estimatedTollCost > 0 ? "E-ZPass estimado (NJ/PA/NY)" : "Ruta sin peajes"}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-border hover:bg-muted/50 bg-blue-50 dark:bg-blue-950">
                  <td className="py-3 px-4 font-bold">Ganancia Estimada</td>
                  <td className="text-right py-3 px-4 font-bold text-lg text-blue-600">
                    ${fixed(estimatedProfit, 2)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">Precio - Costo operativo</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Margen de Ganancia</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">{fixed(profitMarginPercent, 1)}%</td>
                  <td className="py-3 px-4 text-muted-foreground">Ganancia / Precio * 100</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Tarifa por Milla Cargada</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">${fixed(ratePerLoadedMile, 2)}/mi</td>
                  <td className="py-3 px-4 text-muted-foreground">Precio / Millas cargadas</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Ingreso Mínimo Recomendado</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">${fixed(minimumIncome, 2)}</td>
                  <td className="py-3 px-4 text-muted-foreground">$2.50/mi × Millas cargadas</td>
                </tr>
                <tr className={`${differenceVsMinimum < 0 ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950"}`}>
                  <td className="py-3 px-4 font-bold">Diferencia vs Mínimo</td>
                  <td className={`text-right py-3 px-4 font-bold text-lg ${differenceVsMinimum < 0 ? "text-red-600" : "text-green-600"}`}>
                    ${fixed(differenceVsMinimum, 2)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {differenceVsMinimum < 0 ? "⚠️ Por debajo del mínimo" : "✓ Por encima del mínimo"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose de Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? fixed(value, 2) : value}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparación: Ofrecido vs Mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? fixed(value, 2) : value}`} />
                <Legend />
                <Bar dataKey="Precio Ofrecido" fill="#22c55e" />
                <Bar dataKey="Ingreso Mínimo" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Verdict Explanation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <VerdictIcon className="w-5 h-5" />
              Recomendación
            </CardTitle>
            <Dialog open={showVerdictDialog} onOpenChange={setShowVerdictDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Ajustar Veredicto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajustar Veredicto de Cotización</DialogTitle>
                  <DialogDescription>
                    Cambia el veredicto si consideras que hay factores externos que afectan la decisión.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Veredicto Automático: {verdict}</Label>
                    <div className="space-y-2">
                      {["ACEPTAR", "NEGOCIAR", "RECHAZAR"].map((v) => (
                        <Button
                          key={v}
                          variant={manualVerdict === v ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setManualVerdict(v)}
                        >
                          {v === "ACEPTAR" && <CheckCircle className="w-4 h-4 mr-2" />}
                          {v === "NEGOCIAR" && <AlertCircle className="w-4 h-4 mr-2" />}
                          {v === "RECHAZAR" && <XCircle className="w-4 h-4 mr-2" />}
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Explica por qué cambias el veredicto (ej: Cliente importante, disponibilidad, etc.)"
                      value={verdictNotes}
                      onChange={(e) => setVerdictNotes(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <Button 
                    onClick={async () => {
                      if (!manualVerdict) {
                        toast.error("Selecciona un veredicto");
                        return;
                      }
                      setIsSaving(true);
                      try {
                        if (!quotationId || quotationId <= 0) {
                          toast.error("ID de cotización inválido");
                          return;
                        }
                        await saveVerdictMutation.mutateAsync({
                          quotationId,
                          manualVerdict: manualVerdict as "ACEPTAR" | "NEGOCIAR" | "RECHAZAR",
                          verdictNotes: verdictNotes || undefined,
                        });
                      } finally {
                        setIsSaving(false);
                      }
                    }} 
                    disabled={isSaving || !manualVerdict}
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isVerdictOverridden && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="font-semibold text-blue-900 dark:text-blue-100">ℹ️ Veredicto Ajustado Manualmente</p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Veredicto original: <span className="font-semibold">{verdict}</span> → Nuevo: <span className="font-semibold">{manualVerdict}</span>
              </p>
              {verdictNotes && (
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">Notas: {verdictNotes}</p>
              )}
            </div>
          )}
          {currentVerdict === "ACEPTAR" && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="font-semibold text-green-900 dark:text-green-100">✓ Carga Rentable</p>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                Con un margen de {fixed(profitMarginPercent, 1)}%, esta carga es muy rentable. Se recomienda aceptarla.
              </p>
            </div>
          )}
          {currentVerdict === "NEGOCIAR" && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">⚠️ Negociar Precio</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                El margen de {fixed(profitMarginPercent, 1)}% es aceptable pero bajo. Intenta negociar un precio más alto.
                Mínimo recomendado: ${fixed(minimumIncome, 2)}
              </p>
            </div>
          )}
          {currentVerdict === "RECHAZAR" && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="font-semibold text-red-900 dark:text-red-100">✗ No Rentable</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                Con un margen de {fixed(profitMarginPercent, 1)}%, esta carga no es rentable. Se recomienda rechazarla o
                negociar significativamente el precio. Mínimo recomendado: ${fixed(minimumIncome, 2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
