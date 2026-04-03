import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface QuotationResultsProps {
  emptyMiles: number;
  loadedMiles: number;
  returnEmptyMiles: number;
  totalMiles: number;
  totalPrice: number;
  estimatedFuelCost: number;
  estimatedOperatingCost: number;
  totalOperatingCost?: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  minimumIncome?: number;
  ratePerLoadedMile?: number;
  minimumRatePerMile?: number;
  differenceVsMinimum?: number;
  verdict?: string;
  totalDurationHours?: number;
  estimatedTollCost?: number;
  tollDataSource?: "google" | "estimated" | "none";
}

export default function QuotationResults({
  emptyMiles,
  loadedMiles,
  returnEmptyMiles,
  totalMiles,
  totalPrice,
  estimatedFuelCost,
  estimatedOperatingCost,
  totalOperatingCost,
  estimatedProfit,
  profitMarginPercent,
  minimumIncome,
  ratePerLoadedMile,
  minimumRatePerMile,
  differenceVsMinimum,
  verdict = "ACEPTAR",
  totalDurationHours = 0,
  estimatedTollCost = 0,
  tollDataSource = "none" as "google" | "estimated" | "none",
}: QuotationResultsProps) {
  const isRentable = profitMarginPercent >= 15;
  
  const getVerdictColor = (v: string) => {
    if (v === "ACEPTAR") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (v === "NEGOCIAR") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const getVerdictIcon = (v: string) => {
    if (v === "ACEPTAR") return <CheckCircle className="w-4 h-4" />;
    if (v === "NEGOCIAR") return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const chartData = [
    { name: "Ingreso", value: totalPrice },
    { name: "Costo", value: totalOperatingCost || (estimatedFuelCost + estimatedOperatingCost) },
    { name: "Ganancia", value: Math.max(0, estimatedProfit) },
  ];

  const costBreakdown = [
    { name: "Combustible", value: estimatedFuelCost },
    { name: "Operativo", value: estimatedOperatingCost },
    ...(estimatedTollCost > 0 ? [{ name: "Peajes", value: estimatedTollCost }] : []),
  ];

  const COLORS = ["#ef4444", "#f97316", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Veredicto Principal */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Veredicto de Cotización</p>
              <h2 className="text-3xl font-bold">${totalPrice.toFixed(2)}</h2>
              <p className="text-sm text-muted-foreground mt-1">Ingreso Total Estimado</p>
            </div>
            <Badge className={`${getVerdictColor(verdict)} text-lg px-4 py-2 flex items-center gap-2`}>
              {getVerdictIcon(verdict)}
              {verdict}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabla Profesional de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Detallado de Rentabilidad</CardTitle>
          <CardDescription>Desglose completo de ingresos, costos y márgenes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {/* Ingresos */}
                <tr className="bg-blue-50 dark:bg-blue-950">
                  <td className="px-4 py-3 font-semibold">Ingreso Total</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">${totalPrice.toFixed(2)}</td>
                </tr>
                
                {/* Millas */}
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">Millas Totales</td>
                  <td className="px-4 py-3 text-right">{totalMiles.toFixed(1)} mi</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">Millas Cargadas</td>
                  <td className="px-4 py-3 text-right">{loadedMiles.toFixed(1)} mi</td>
                </tr>

                {/* Costos */}
                <tr className="bg-red-50 dark:bg-red-950">
                  <td className="px-4 py-3 font-semibold">Costo Operativo Estimado</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                    -${(totalOperatingCost || estimatedFuelCost + estimatedOperatingCost).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground pl-8">Combustible ($0.35/mi)</td>
                  <td className="px-4 py-3 text-right">-${estimatedFuelCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground pl-8">Mantenimiento ($0.65/mi)</td>
                  <td className="px-4 py-3 text-right">-${estimatedOperatingCost.toFixed(2)}</td>
                </tr>
                {/* Peajes - shown when Google provides toll data */}
                {tollDataSource === "google" && (
                  <tr>
                    <td className="px-4 py-3 text-muted-foreground pl-8">
                      Peajes / Tolls
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                        Google Maps ✓
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {estimatedTollCost > 0 ? `-$${estimatedTollCost.toFixed(2)}` : "$0.00 (sin peajes)"}
                    </td>
                  </tr>
                )}

                {/* Ganancia */}
                <tr className="bg-green-50 dark:bg-green-950">
                  <td className="px-4 py-3 font-semibold">Ganancia Estimada</td>
                  <td className={`px-4 py-3 text-right font-bold ${estimatedProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    ${estimatedProfit.toFixed(2)}
                  </td>
                </tr>

                {/* Margen */}
                <tr>
                  <td className="px-4 py-3 font-semibold">Margen de Ganancia</td>
                  <td className={`px-4 py-3 text-right font-bold ${profitMarginPercent >= 50 ? "text-green-600 dark:text-green-400" : profitMarginPercent >= 30 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                    {profitMarginPercent.toFixed(1)}%
                  </td>
                </tr>

                {/* Tarifa por Milla */}
                <tr className="bg-muted">
                  <td className="px-4 py-3 font-semibold">Tarifa por Milla Cargada</td>
                  <td className="px-4 py-3 text-right font-bold">${ratePerLoadedMile?.toFixed(2) || (totalPrice / loadedMiles).toFixed(2)}/mi</td>
                </tr>

                {/* Mínimo Recomendado */}
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">Tarifa Mínima Recomendada</td>
                  <td className="px-4 py-3 text-right">${minimumRatePerMile || 2.50}/mi</td>
                </tr>

                {/* Diferencia vs Mínimo */}
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">Ingreso Mínimo Recomendado</td>
                  <td className="px-4 py-3 text-right">${minimumIncome?.toFixed(2) || (loadedMiles * 2.50).toFixed(2)}</td>
                </tr>

                <tr className={differenceVsMinimum && differenceVsMinimum < 0 ? "bg-yellow-50 dark:bg-yellow-950" : ""}>
                  <td className="px-4 py-3 font-semibold">Diferencia vs Mínimo</td>
                  <td className={`px-4 py-3 text-right font-bold ${differenceVsMinimum && differenceVsMinimum >= 0 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                    {differenceVsMinimum !== undefined ? (differenceVsMinimum >= 0 ? "+" : "") + differenceVsMinimum.toFixed(2) : "N/A"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Ingresos vs Costos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos vs Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Desglose de Costos */}
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
                  label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Desglose de Distancia */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose de Distancia</CardTitle>
          <CardDescription>Análisis de millas por segmento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-muted-foreground mb-1">Millas Vacías</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{emptyMiles.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Van → Recogida</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <p className="text-xs text-muted-foreground mb-1">Millas Cargadas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{loadedMiles.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Recogida → Entrega</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-muted-foreground mb-1">Retorno Vacío</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{returnEmptyMiles.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Entrega → Van</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-muted-foreground mb-1">Total Millas</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMiles.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Distancia Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      <Card className={verdict === "ACEPTAR" ? "border-green-200 dark:border-green-800" : verdict === "NEGOCIAR" ? "border-yellow-200 dark:border-yellow-800" : "border-red-200 dark:border-red-800"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getVerdictIcon(verdict)}
            Recomendación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {verdict === "ACEPTAR" && (
            <>
              <p className="text-green-700 dark:text-green-300">✓ Esta carga tiene un margen de ganancia excelente.</p>
              <p className="text-sm text-muted-foreground">Con un margen del {profitMarginPercent.toFixed(1)}%, esta carga es altamente rentable y se recomienda aceptarla.</p>
            </>
          )}
          {verdict === "NEGOCIAR" && (
            <>
              <p className="text-yellow-700 dark:text-yellow-300">⚠ Esta carga tiene un margen moderado.</p>
              <p className="text-sm text-muted-foreground">Con un margen del {profitMarginPercent.toFixed(1)}%, considera negociar una tarifa más alta. La diferencia vs mínimo es ${differenceVsMinimum?.toFixed(2)}.</p>
            </>
          )}
          {verdict === "RECHAZAR" && (
            <>
              <p className="text-red-700 dark:text-red-300">✗ Esta carga tiene un margen bajo.</p>
              <p className="text-sm text-muted-foreground">Con un margen del {profitMarginPercent.toFixed(1)}%, no es rentable. Rechaza o negocia una tarifa significativamente más alta.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
