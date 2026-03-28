import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, CheckCircle, AlertCircle, XCircle } from "lucide-react";

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
}: QuotationResultsTableProps) {
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
                  <td className="text-right py-3 px-4 font-bold text-lg text-green-600">${totalPrice.toFixed(2)}</td>
                  <td className="py-3 px-4 text-muted-foreground">Precio total ofrecido por el broker</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Costo Operativo Estimado</td>
                  <td className="text-right py-3 px-4 font-bold text-lg text-red-600">${estimatedOperatingCost.toFixed(2)}</td>
                  <td className="py-3 px-4 text-muted-foreground">Combustible + mantenimiento</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50 bg-blue-50 dark:bg-blue-950">
                  <td className="py-3 px-4 font-bold">Ganancia Estimada</td>
                  <td className="text-right py-3 px-4 font-bold text-lg text-blue-600">
                    ${estimatedProfit.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">Precio - Costo operativo</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Margen de Ganancia</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">{profitMarginPercent.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-muted-foreground">Ganancia / Precio * 100</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Tarifa por Milla Cargada</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">${ratePerLoadedMile.toFixed(2)}/mi</td>
                  <td className="py-3 px-4 text-muted-foreground">Precio / Millas cargadas</td>
                </tr>
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">Ingreso Mínimo Recomendado</td>
                  <td className="text-right py-3 px-4 font-bold text-lg">${minimumIncome.toFixed(2)}</td>
                  <td className="py-3 px-4 text-muted-foreground">$2.50/mi × Millas cargadas</td>
                </tr>
                <tr className={`${differenceVsMinimum < 0 ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950"}`}>
                  <td className="py-3 px-4 font-bold">Diferencia vs Mínimo</td>
                  <td className={`text-right py-3 px-4 font-bold text-lg ${differenceVsMinimum < 0 ? "text-red-600" : "text-green-600"}`}>
                    ${differenceVsMinimum.toFixed(2)}
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
                <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
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
                <Tooltip formatter={(value: any) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
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
          <CardTitle className="flex items-center gap-2">
            <VerdictIcon className="w-5 h-5" />
            Recomendación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {verdict === "ACEPTAR" && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="font-semibold text-green-900 dark:text-green-100">✓ Carga Rentable</p>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                Con un margen de {profitMarginPercent.toFixed(1)}%, esta carga es muy rentable. Se recomienda aceptarla.
              </p>
            </div>
          )}
          {verdict === "NEGOCIAR" && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">⚠️ Negociar Precio</p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                El margen de {profitMarginPercent.toFixed(1)}% es aceptable pero bajo. Intenta negociar un precio más alto.
                Mínimo recomendado: ${minimumIncome.toFixed(2)}
              </p>
            </div>
          )}
          {verdict === "RECHAZAR" && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="font-semibold text-red-900 dark:text-red-100">✗ No Rentable</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                Con un margen de {profitMarginPercent.toFixed(1)}%, esta carga no es rentable. Se recomienda rechazarla o
                negociar significativamente el precio. Mínimo recomendado: ${minimumIncome.toFixed(2)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
