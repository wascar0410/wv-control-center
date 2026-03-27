import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, DollarSign, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { ExportDataModal } from "@/components/ExportDataModal";

export function BatchPaymentsDashboard() {
  const [showExportModal, setShowExportModal] = useState<"transactions" | "loads" | "payments" | null>(null);

  // Queries
  const { data: batches } = trpc.batchPayment.listBatches.useQuery({
    limit: 100,
  });

  const { data: exportHistory } = trpc.export.getExportHistory.useQuery({
    limit: 10,
  });

  // Calculate statistics
  const stats = {
    totalBatches: batches?.length || 0,
    completedBatches: batches?.filter((b) => b.status === "completed").length || 0,
    pendingBatches: batches?.filter((b) => b.status === "pending_review").length || 0,
    totalAmount: batches?.reduce((sum, b) => sum + (typeof b.totalAmount === "number" ? b.totalAmount : parseFloat(String(b.totalAmount))), 0) || 0,
    totalPayments: batches?.reduce((sum, b) => sum + b.totalPayments, 0) || 0,
  };

  // Prepare chart data
  const batchesByStatus = [
    { name: "Borrador", value: batches?.filter((b) => b.status === "draft").length || 0, color: "#94a3b8" },
    { name: "Pendiente", value: batches?.filter((b) => b.status === "pending_review").length || 0, color: "#f59e0b" },
    { name: "Aprobado", value: batches?.filter((b) => b.status === "approved").length || 0, color: "#3b82f6" },
    { name: "Completado", value: batches?.filter((b) => b.status === "completed").length || 0, color: "#10b981" },
    { name: "Cancelado", value: batches?.filter((b) => b.status === "cancelled").length || 0, color: "#ef4444" },
  ];

  const COLORS = ["#94a3b8", "#f59e0b", "#3b82f6", "#10b981", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Pagos Masivos</h1>
        <p className="text-muted-foreground mt-1">Resumen y análisis de procesamiento de pagos</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Lotes</p>
                <p className="text-3xl font-bold mt-1">{stats.totalBatches}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completados</p>
                <p className="text-3xl font-bold mt-1">{stats.completedBatches}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-3xl font-bold mt-1">{stats.pendingBatches}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-3xl font-bold mt-1">${stats.totalAmount.toFixed(0)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pagos</p>
                <p className="text-3xl font-bold mt-1">{stats.totalPayments}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>Lotes agrupados por estado actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={batchesByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {batchesByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Batches */}
        <Card>
          <CardHeader>
            <CardTitle>Lotes Recientes</CardTitle>
            <CardDescription>Últimos lotes procesados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {batches && batches.length > 0 ? (
                batches.slice(0, 5).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{batch.batchNumber}</p>
                      <p className="text-xs text-muted-foreground">{batch.totalPayments} pagos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${batch.totalAmount.toFixed(2)}</p>
                      <Badge
                        variant={
                          batch.status === "completed"
                            ? "default"
                            : batch.status === "pending_review"
                              ? "outline"
                              : "secondary"
                        }
                        className="text-xs mt-1"
                      >
                        {batch.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay lotes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Datos para Contabilidad</CardTitle>
          <CardDescription>Descarga reportes en múltiples formatos para análisis y contabilidad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center py-6 gap-2"
              onClick={() => setShowExportModal("transactions")}
            >
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">Exportar Transacciones</span>
              <span className="text-xs text-muted-foreground">CSV, JSON, PDF</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center py-6 gap-2"
              onClick={() => setShowExportModal("loads")}
            >
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">Exportar Cargas</span>
              <span className="text-xs text-muted-foreground">CSV, JSON, PDF</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex flex-col items-center justify-center py-6 gap-2"
              onClick={() => setShowExportModal("payments")}
            >
              <Download className="w-5 h-5" />
              <span className="text-sm font-medium">Exportar Pagos</span>
              <span className="text-xs text-muted-foreground">CSV, JSON, PDF</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export History */}
      {exportHistory && exportHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Exportaciones</CardTitle>
            <CardDescription>Últimas exportaciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {exportHistory.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium capitalize">{exp.exportType}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.recordCount} registros • {new Date(exp.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {exp.format.toUpperCase()}
                    </Badge>
                    {exp.fileUrl && (
                      <a href={exp.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Modals */}
      <ExportDataModal
        open={showExportModal === "transactions"}
        onOpenChange={(open) => !open && setShowExportModal(null)}
        exportType="transactions"
      />
      <ExportDataModal
        open={showExportModal === "loads"}
        onOpenChange={(open) => !open && setShowExportModal(null)}
        exportType="loads"
      />
      <ExportDataModal
        open={showExportModal === "payments"}
        onOpenChange={(open) => !open && setShowExportModal(null)}
        exportType="payments"
      />
    </div>
  );
}
