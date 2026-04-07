/**
 * InvoicingPage.tsx
 * Formal invoicing with status tracking and aging report
 * States: pending → issued → partially_paid → paid / overdue / cancelled
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Plus,
  Eye,
  RefreshCw,
} from "lucide-react";

type InvoiceStatus =
  | "pending"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

type AgingBucket = {
  count: number;
  total: number;
};

type AgingReport = {
  current: AgingBucket;
  "30_days": AgingBucket;
  "60_days": AgingBucket;
  "90_days": AgingBucket;
  "120_plus": AgingBucket;
  totalOutstanding: number;
};

type InvoiceItem = {
  id: number;
  invoiceNumber: string;
  brokerName: string;
  status: InvoiceStatus | string;
  total: number;
  paidAmount: number;
  remainingBalance: number;
  issueDate?: string | Date | null;
  dueDate?: string | Date | null;
  terms?: string | null;
  notes?: string | null;
};

const EMPTY_BUCKET: AgingBucket = { count: 0, total: 0 };

const EMPTY_AGING_REPORT: AgingReport = {
  current: { ...EMPTY_BUCKET },
  "30_days": { ...EMPTY_BUCKET },
  "60_days": { ...EMPTY_BUCKET },
  "90_days": { ...EMPTY_BUCKET },
  "120_plus": { ...EMPTY_BUCKET },
  totalOutstanding: 0,
};

function toNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number.parseFloat(value)
      : 0;

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function normalizeAgingReport(raw: any): AgingReport {
  if (!raw || typeof raw !== "object") return EMPTY_AGING_REPORT;

  return {
    current: {
      count: toNumber(raw?.current?.count),
      total: toNumber(raw?.current?.total),
    },
    "30_days": {
      count: toNumber(raw?.["30_days"]?.count),
      total: toNumber(raw?.["30_days"]?.total),
    },
    "60_days": {
      count: toNumber(raw?.["60_days"]?.count),
      total: toNumber(raw?.["60_days"]?.total),
    },
    "90_days": {
      count: toNumber(raw?.["90_days"]?.count),
      total: toNumber(raw?.["90_days"]?.total),
    },
    "120_plus": {
      count: toNumber(raw?.["120_plus"]?.count),
      total: toNumber(raw?.["120_plus"]?.total),
    },
    totalOutstanding: toNumber(raw?.totalOutstanding),
  };
}

function normalizeInvoice(invoice: any): InvoiceItem {
  return {
    id: toNumber(invoice?.id),
    invoiceNumber: String(invoice?.invoiceNumber ?? `INV-${invoice?.id ?? "—"}`),
    brokerName: String(invoice?.brokerName ?? "Sin broker"),
    status: String(invoice?.status ?? "pending"),
    total: toNumber(invoice?.total),
    paidAmount: toNumber(invoice?.paidAmount),
    remainingBalance:
      invoice?.remainingBalance != null
        ? toNumber(invoice?.remainingBalance)
        : Math.max(0, toNumber(invoice?.total) - toNumber(invoice?.paidAmount)),
    issueDate: invoice?.issueDate ?? null,
    dueDate: invoice?.dueDate ?? null,
    terms: invoice?.terms ?? null,
    notes: invoice?.notes ?? null,
  };
}

// Invoice status badges
function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; icon: any; label: string }> = {
    pending: {
      bg: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      icon: Clock,
      label: "Pendiente",
    },
    issued: {
      bg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      icon: FileText,
      label: "Emitida",
    },
    partially_paid: {
      bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      icon: TrendingUp,
      label: "Parcialmente Pagada",
    },
    paid: {
      bg: "bg-green-500/20 text-green-300 border-green-500/30",
      icon: CheckCircle,
      label: "Pagada",
    },
    overdue: {
      bg: "bg-red-500/20 text-red-300 border-red-500/30",
      icon: AlertCircle,
      label: "Vencida",
    },
    cancelled: {
      bg: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      icon: FileText,
      label: "Cancelada",
    },
  };

  const v = variants[status] || variants.pending;
  const Icon = v.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${v.bg}`}
    >
      <Icon className="h-3 w-3" />
      {v.label}
    </span>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <RefreshCw className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="py-12 text-center text-muted-foreground">
      <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm">{subtitle}</p>
    </div>
  );
}

// Aging Report Tab
function AgingReportTab() {
  const {
    data: agingReport,
    isLoading,
    isError,
    refetch,
  } = trpc.invoicing.getAgingReport.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const safeReport = useMemo(() => normalizeAgingReport(agingReport), [agingReport]);

  const overdueInvoicesCount =
    safeReport["30_days"].count +
    safeReport["60_days"].count +
    safeReport["90_days"].count +
    safeReport["120_plus"].count;

  const agingBuckets = [
    { key: "current", label: "Actual (0-30 días)", color: "text-green-600" },
    { key: "30_days", label: "30-60 días", color: "text-yellow-600" },
    { key: "60_days", label: "60-90 días", color: "text-orange-600" },
    { key: "90_days", label: "90-120 días", color: "text-red-600" },
    { key: "120_plus", label: "120+ días", color: "text-red-700" },
  ] as const;

  if (isLoading) {
    return <LoadingState label="Cargando reporte de aging..." />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="font-medium">No se pudo cargar el aging report</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifica el backend o vuelve a intentarlo.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cuentas por Cobrar</CardTitle>
          <CardDescription>
            Vista general del dinero pendiente por cobrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Total Pendiente</p>
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(safeReport.totalOutstanding)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Facturas Vencidas</p>
              <p className="text-3xl font-bold text-orange-600">
                {overdueInvoicesCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aging Buckets */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {agingBuckets.map((bucket) => {
          const data = safeReport[bucket.key] || EMPTY_BUCKET;

          return (
            <Card key={bucket.key}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${bucket.color}`}>
                  {bucket.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Facturas</p>
                  <p className="text-2xl font-bold">{data.count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(data.total)}
                  </p>
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
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  const {
    data: invoices,
    isLoading,
    isError,
    refetch,
  } = trpc.invoicing.getAll.useQuery(
    {
      status: filterStatus || undefined,
      limit: 100,
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const safeInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.map(normalizeInvoice);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return safeInvoices;

    return safeInvoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.brokerName.toLowerCase().includes(term)
    );
  }, [safeInvoices, searchTerm]);

  const statuses: InvoiceStatus[] = [
    "pending",
    "issued",
    "partially_paid",
    "paid",
    "overdue",
    "cancelled",
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="min-w-64 flex-1">
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
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ").toUpperCase()}
            </option>
          ))}
        </select>

        <Button className="gap-2" disabled>
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {isLoading ? (
          <LoadingState label="Cargando facturas..." />
        ) : isError ? (
          <Card>
            <CardContent className="py-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
              <p className="font-medium">No se pudieron cargar las facturas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Verifica el backend o vuelve a intentarlo.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            title="No hay facturas para mostrar"
            subtitle="Cuando existan facturas aparecerán aquí con su estado y aging."
          />
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="transition-colors hover:bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="font-semibold">{invoice.invoiceNumber}</p>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>

                    <div className="mb-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground md:grid-cols-4">
                      <div>
                        <p className="text-xs">Broker</p>
                        <p className="font-medium text-foreground">{invoice.brokerName}</p>
                      </div>
                      <div>
                        <p className="text-xs">Total</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(invoice.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs">Pagado</p>
                        <p className="font-medium text-foreground">
                          {formatCurrency(invoice.paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs">Pendiente</p>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(invoice.remainingBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Emitida: {formatDate(invoice.issueDate)}</span>
                      <span>Vencimiento: {formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedInvoice(invoice)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                    <Button size="sm" variant="ghost" disabled>
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
              <DialogTitle>
                Detalles de Factura - {selectedInvoice.invoiceNumber}
              </DialogTitle>
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
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedInvoice.total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(selectedInvoice.remainingBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha emisión</p>
                  <p className="font-medium">{formatDate(selectedInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha vencimiento</p>
                  <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-semibold">Términos</p>
                <p className="text-sm text-muted-foreground">
                  {selectedInvoice.terms || "Sin especificar"}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-semibold">Notas</p>
                <p className="text-sm text-muted-foreground">
                  {selectedInvoice.notes || "Sin notas"}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Cerrar
              </Button>
              <Button disabled>Registrar Pago</Button>
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
        <p className="text-muted-foreground">
          Gestión de facturas, saldos pendientes y aging report
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="aging" className="gap-2">
            <Clock className="h-4 w-4" />
            Aging Report
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
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
