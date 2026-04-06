/**
 * InvoicingPage.tsx
 * Formal invoicing with status tracking and aging report
 * States: pending → issued → partially_paid → paid / overdue
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Download,
  Plus,
  Eye,
  Edit2,
} from "lucide-react";

// Invoice status badges
function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; icon: any; label: string }> = {
    pending: { bg: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: Clock, label: "Pendiente" },
    issued: { bg: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: FileText, label: "Emitida" },
    partially_paid: { bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: TrendingUp, label: "Parcialmente Pagada" },
    paid: { bg: "bg-green-500/20 text-green-300 border-green-500/30", icon: CheckCircle, label: "Pagada" },
    overdue: { bg: "bg-red-500/20 text-red-300 border-red-500/30", icon: AlertCircle, label: "Vencida" },
    cancelled: { bg: "bg-slate-500/20 text-slate-300 border-slate-500/30", icon: FileText, label: "Cancelada" },
  };
  const v = variants[status] || variants.pending;
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

// Aging Report Tab
function AgingReportTab() {
  const { data: agingReport } = trpc.invoicing.getAgingReport.useQuery();

  if (!agingReport) {
    return <div className="text-center py-12 text-muted-foreground">Cargando reporte...</div>;
  }

  const agingBuckets = [
    { key: "current", label: "Actual (0-30 días)", color: "text-green-600" },
    { key: "30_days", label: "30-60 días", color: "text-yellow-600" },
    { key: "60_days", label: "60-90 días", color: "text-orange-600" },
    { key: "90_days", label: "90-120 días", color: "text-red-600" },
    { key: "120_plus", label: "120+ días", color: "text-red-700" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuentas por Cobrar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pendiente</p>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(agingReport.totalOutstanding)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Facturas Vencidas</p>
              <p className="text-3xl font-bold text-orange-600">
                {(agingReport["30_days"].count +
                  agingReport["60_days"].count +
                  agingReport["90_days"].count +
                  agingReport["120_plus"].count)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aging Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agingBuckets.map((bucket) => {
          const data = agingReport[bucket.key as keyof typeof agingReport];
          return (
            <Card key={bucket.key}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${bucket.color}`}>{bucket.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Facturas</p>
                  <p className="text-2xl font-bold">{data.count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(data.total)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Invoices List Tab
function InvoicesListTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { data: invoices } = trpc.invoicing.getAll.useQuery({
    status: filterStatus || undefined,
    limit: 100,
  });

  const filteredInvoices = useMemo(() => {
    let result = invoices || [];
    if (searchTerm) {
      result = result.filter(
        (inv: any) =>
          inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.brokerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [invoices, searchTerm]);

  const statuses = ["pending", "issued", "partially_paid", "paid", "overdue", "cancelled"];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar por número o broker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm"
          />
        </div>
        <select
          value={filterStatus || ""}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm"
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ").toUpperCase()}
            </option>
          ))}
        </select>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay facturas para mostrar</p>
          </div>
        ) : (
          filteredInvoices.map((invoice: any) => (
            <Card key={invoice.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">{invoice.invoiceNumber}</p>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mb-2">
                      <div>
                        <p className="text-xs">Broker</p>
                        <p className="font-medium text-foreground">{invoice.brokerName}</p>
                      </div>
                      <div>
                        <p className="text-xs">Total</p>
                        <p className="font-medium text-green-600">{formatCurrency(invoice.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs">Pagado</p>
                        <p className="font-medium text-foreground">{formatCurrency(invoice.paidAmount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs">Pendiente</p>
                        <p className="font-medium text-orange-600">{formatCurrency(invoice.remainingBalance)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {invoice.issueDate && <span>Emitida: {new Date(invoice.issueDate).toLocaleDateString()}</span>}
                      {invoice.dueDate && <span>Vencimiento: {new Date(invoice.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInvoice(invoice)}
                      className="gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button size="sm" variant="ghost">
                      ⋯
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles de Factura - {selectedInvoice.invoiceNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Broker</p>
                  <p className="font-semibold">{selectedInvoice.brokerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <InvoiceStatusBadge status={selectedInvoice.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedInvoice.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(selectedInvoice.remainingBalance)}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-2">Términos</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.terms || "Sin especificar"}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-2">Notas</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.notes || "Sin notas"}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Cerrar
              </Button>
              <Button>Registrar Pago</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Main Component
export default function InvoicingPage() {
  const [activeTab, setActiveTab] = useState("aging");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Invoicing & Receivables</h1>
        <p className="text-muted-foreground">Gestión de facturas y cuentas por cobrar</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="aging" className="gap-2">
            <Clock className="w-4 h-4" />
            Aging Report
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" />
            Facturas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aging" className="space-y-4">
          <AgingReportTab />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoicesListTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
