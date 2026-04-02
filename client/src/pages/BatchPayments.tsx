import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Clock, DollarSign, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppCard, AppCardHeader, AppCardContent } from "@/components/ui/AppCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type BatchStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export default function BatchPayments() {
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "">("");
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState<number | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState<number | null>(null);

  const [createForm, setCreateForm] = useState({
    period: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer" as const,
    notes: "",
  });

  const {
    data: batches,
    isLoading,
    error,
    refetch,
  } = trpc.batchPayment.listBatches.useQuery(
    {
      status: statusFilter || undefined,
      limit: 100,
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const { data: batchDetail } = trpc.batchPayment.getBatch.useQuery(
    { batchId: selectedBatch! },
    {
      enabled: !!selectedBatch,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const { data: auditTrail } = trpc.batchPayment.getBatchAuditTrail.useQuery(
    { batchId: selectedBatch! },
    {
      enabled: !!selectedBatch,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const safeBatches = Array.isArray(batches) ? batches : [];
  const safeAuditTrail = Array.isArray(auditTrail) ? auditTrail : [];

  const createBatchMutation = trpc.batchPayment.createBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote creado");
      setShowCreateDialog(false);
      setCreateForm({
        period: new Date().toISOString().split("T")[0],
        paymentMethod: "bank_transfer",
        notes: "",
      });
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo crear el lote");
    },
  });

  const submitForReviewMutation = trpc.batchPayment.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("Lote enviado para revisión");
      refetch();
      setSelectedBatch(null);
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo enviar el lote");
    },
  });

  const approveBatchMutation = trpc.batchPayment.approveBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote aprobado");
      refetch();
      setShowApprovalDialog(null);
      setApprovalNotes("");
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo aprobar el lote");
    },
  });

  const rejectBatchMutation = trpc.batchPayment.rejectBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote rechazado");
      refetch();
      setShowRejectionDialog(null);
      setRejectionReason("");
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo rechazar el lote");
    },
  });

  const processBatchMutation = trpc.batchPayment.processBatch.useMutation({
    onSuccess: (result) => {
      toast.success(
        `${result.successfulPayments} pagos completados, ${result.failedPayments} fallaron`
      );
      refetch();
      setSelectedBatch(null);
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo procesar el lote");
    },
  });

  const cancelBatchMutation = trpc.batchPayment.cancelBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote cancelado");
      refetch();
      setSelectedBatch(null);
    },
    onError: (err) => {
      toast.error(err.message || "No se pudo cancelar el lote");
    },
  });

  const handleCreateBatch = () => {
    createBatchMutation.mutate({
      period: createForm.period,
      paymentMethod: createForm.paymentMethod,
      notes: createForm.notes,
    });
  };

  const getStatusBadge = (status: BatchStatus) => {
    const statusConfig = {
      draft: { label: "Borrador", variant: "secondary" as const },
      pending_review: { label: "Pendiente Revisión", variant: "outline" as const },
      approved: { label: "Aprobado", variant: "default" as const },
      processing: { label: "Procesando", variant: "default" as const },
      completed: { label: "Completado", variant: "default" as const },
      failed: { label: "Fallido", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "secondary" as const },
    };

    return statusConfig[status] || { label: status, variant: "outline" as const };
  };

  const getStatusIcon = (status: BatchStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "pending_review":
        return <Clock className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  if (error) {
    console.error("BatchPayments error:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0B1F3A]">Procesamiento de Pagos</h1>
          <p className="mt-1 text-[#64748B]">Gestiona lotes de pagos a conductores</p>
        </div>

        <PrimaryButton
          onClick={() => setShowCreateDialog(true)}
          disabled={createBatchMutation.isPending}
          loading={createBatchMutation.isPending}
          className="px-6 py-3"
        >
          {!createBatchMutation.isPending && <Plus className="w-4 h-4" />}
          {createBatchMutation.isPending ? "Creando..." : "Crear Lote"}
        </PrimaryButton>
      </div>

      {error && (
        <div className="text-sm text-yellow-600">
          Modo seguro activo. Algunos datos pueden no estar disponibles.
        </div>
      )}

      <AppCard>
        <AppCardContent className="pt-0">
          <div className="flex gap-4">
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? "" : (value as BatchStatus))
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="pending_review">Pendiente Revisión</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="processing">Procesando</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AppCardContent>
      </AppCard>

      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-[#64748B]">Cargando lotes...</p>
            </CardContent>
          </Card>
        ) : safeBatches.length > 0 ? (
          safeBatches.map((batch: any) => (
            <AppCard
              key={batch.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
            >
              <div onClick={() => setSelectedBatch(batch.id)}>
                <AppCardHeader
                  title={
                    <div className="flex items-center gap-2 text-[#0B1F3A]">
                      {getStatusIcon(batch.status as BatchStatus)}
                      <span>{batch.batchNumber}</span>
                      <Badge variant={getStatusBadge(batch.status as BatchStatus).variant}>
                        {getStatusBadge(batch.status as BatchStatus).label}
                      </Badge>
                    </div>
                  }
                  subtitle={`Período: ${batch.period} • ${batch.totalPayments} pagos`}
                  action={
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#0B1F3A]">
                        ${Number(batch.totalAmount || 0).toFixed(2)}
                      </div>
                      <p className="text-sm text-[#64748B]">Total</p>
                    </div>
                  }
                />

                <AppCardContent className="text-[#0F172A]">
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-[#64748B]">Creado por</p>
                      <p className="font-medium text-[#0F172A]">{batch.createdBy}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Método de Pago</p>
                      <p className="font-medium capitalize text-[#0F172A]">
                        {batch.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Fecha Creación</p>
                      <p className="font-medium text-[#0F172A]">
                        {batch.createdAt
                          ? new Date(batch.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </AppCardContent>
              </div>
            </AppCard>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-[#64748B]">No hay lotes de pago</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedBatch && batchDetail && (
        <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{batchDetail.batchNumber}</DialogTitle>
              <DialogDescription>
                <Badge
                  variant={getStatusBadge(batchDetail.status as BatchStatus).variant}
                  className="mt-2"
                >
                  {getStatusBadge(batchDetail.status as BatchStatus).label}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-[#64748B]">Total</p>
                    <p className="text-2xl font-bold text-[#0B1F3A]">
                      ${Number(batchDetail.totalAmount || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-[#64748B]">Pagos</p>
                    <p className="text-2xl font-bold text-[#0B1F3A]">
                      {batchDetail.totalPayments}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {safeAuditTrail.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Historial de Auditoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {safeAuditTrail.map((log: any) => (
                        <div key={log.id} className="border-l-2 border-muted pl-3 py-1 text-sm">
                          <p className="font-medium capitalize text-[#0F172A]">{log.action}</p>
                          <p className="text-xs text-[#64748B]">{log.reason}</p>
                          <p className="text-xs text-[#64748B]">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                {batchDetail.status === "draft" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        cancelBatchMutation.mutate({
                          batchId: selectedBatch,
                          reason: "Cancelado por usuario",
                        })
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={() =>
                        submitForReviewMutation.mutate({ batchId: selectedBatch })
                      }
                    >
                      Enviar para Revisión
                    </Button>
                  </>
                )}

                {batchDetail.status === "pending_review" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectionDialog(selectedBatch)}
                    >
                      Rechazar
                    </Button>
                    <Button onClick={() => setShowApprovalDialog(selectedBatch)}>
                      Aprobar
                    </Button>
                  </>
                )}

                {batchDetail.status === "approved" && (
                  <Button
                    onClick={() =>
                      processBatchMutation.mutate({ batchId: selectedBatch })
                    }
                  >
                    Procesar Lote
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Lote de Pagos</DialogTitle>
            <DialogDescription>
              Agrupa los pagos pendientes para procesamiento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Período</label>
              <Input
                type="date"
                value={createForm.period}
                onChange={(e) => setCreateForm({ ...createForm, period: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Método de Pago</label>
              <Select
                value={createForm.paymentMethod}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, paymentMethod: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="mixed">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Notas (opcional)</label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Notas adicionales sobre este lote"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <PrimaryButton
                onClick={handleCreateBatch}
                loading={createBatchMutation.isPending}
              >
                {createBatchMutation.isPending ? "Creando..." : "Crear Lote"}
              </PrimaryButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showApprovalDialog && (
        <Dialog open={!!showApprovalDialog} onOpenChange={() => setShowApprovalDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aprobar Lote de Pagos</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Notas de Aprobación (opcional)</label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Notas sobre la aprobación"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowApprovalDialog(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    approveBatchMutation.mutate({
                      batchId: showApprovalDialog,
                      notes: approvalNotes,
                    })
                  }
                >
                  Confirmar Aprobación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showRejectionDialog && (
        <Dialog open={!!showRejectionDialog} onOpenChange={() => setShowRejectionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar Lote de Pagos</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Motivo del Rechazo</label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explica por qué se rechaza este lote"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectionDialog(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={!rejectionReason.trim()}
                  onClick={() =>
                    rejectBatchMutation.mutate({
                      batchId: showRejectionDialog,
                      reason: rejectionReason,
                    })
                  }
                >
                  Confirmar Rechazo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
