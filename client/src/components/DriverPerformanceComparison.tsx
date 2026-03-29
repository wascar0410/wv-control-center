import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";

export function DriverPerformanceComparison() {
  const performanceData = [
    { metric: "Entregas a Tiempo", you: 98, average: 92, top: 99 },
    { metric: "Calificación", you: 4.8, average: 4.5, top: 5.0 },
    { metric: "Cargas Completadas", you: 127, average: 95, top: 180 },
    { metric: "Millas Promedio", you: 4250, average: 3800, top: 6200 },
  ];

  const earningsComparison = [
    { week: "Semana 1", you: 2100, average: 1850, top: 2800 },
    { week: "Semana 2", you: 2450, average: 2000, top: 3100 },
    { week: "Semana 3", you: 2200, average: 1900, top: 2900 },
    { week: "Semana 4", you: 2800, average: 2100, top: 3400 },
  ];

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Tu Desempeño vs Promedio
          </CardTitle>
          <CardDescription>Comparación con otros choferes de la red</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="you" fill="#3b82f6" name="Tú" />
              <Bar dataKey="average" fill="#9ca3af" name="Promedio" />
              <Bar dataKey="top" fill="#10b981" name="Top Performer" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Earnings Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Ingresos Semanales</CardTitle>
          <CardDescription>Tus ingresos vs promedio de la red</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={earningsComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Line type="monotone" dataKey="you" stroke="#3b82f6" strokeWidth={2} name="Tú" />
              <Line type="monotone" dataKey="average" stroke="#9ca3af" strokeWidth={2} name="Promedio" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="top" stroke="#10b981" strokeWidth={2} name="Top Performer" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking de Entregas a Tiempo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div>
                <p className="font-semibold text-blue-900">🥇 Tú</p>
                <p className="text-sm text-blue-700">98% - Posición #3 de 45</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">🥈 Promedio</p>
                <p className="text-sm text-muted-foreground">92%</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-semibold text-green-900">🥇 Top Performer</p>
                <p className="text-sm text-green-700">99% - Posición #1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ranking de Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div>
                <p className="font-semibold text-blue-900">🥇 Tú</p>
                <p className="text-sm text-blue-700">$18,500 - Posición #8 de 45</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">🥈 Promedio</p>
                <p className="text-sm text-muted-foreground">$15,200</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="font-semibold text-green-900">🥇 Top Performer</p>
                <p className="text-sm text-green-700">$28,500 - Posición #1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-900">💡 Insights para Mejorar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-green-900">
          <p>✅ <strong>Excelente:</strong> Tu tasa de entregas a tiempo (98%) está entre los mejores de la red.</p>
          <p>📈 <strong>Oportunidad:</strong> Aumenta tus millas recorridas para competir con los top performers. Podrías ganar $2,000+ más al mes.</p>
          <p>⭐ <strong>Meta:</strong> Mantén tu calificación en 4.8+ para acceder a cargas premium con mayor pago.</p>
        </CardContent>
      </Card>
    </div>
  );
}
