import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Clock, DollarSign, Plus, Trash2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

type BatchStatus = "draft" | "pending_review" | "approved" | "processing" | "completed" | "failed" | "cancelled";

export function BatchPayments() {
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

  // Queries
  const { data: batches, isLoading, refetch } = trpc.batchPayment.listBatches.useQuery({
    status: statusFilter || undefined,
    limit: 100,
  });

  const { data: batchDetail } = trpc.batchPayment.getBatch.useQuery(
    { batchId: selectedBatch! },
    { enabled: !!selectedBatch }
  );

  const { data: auditTrail } = trpc.batchPayment.getBatchAuditTrail.useQuery(
    { batchId: selectedBatch! },
    { enabled: !!selectedBatch }
  );

  // Mutations
  const createBatchMutation = trpc.batchPayment.createBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote creado", {
        description: "El lote de pagos ha sido creado exitosamente",
      });
      setShowCreateDialog(false);
      setCreateForm({ period: new Date().toISOString().split("T")[0], paymentMethod: "bank_transfer", notes: "" });
      refetch();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo crear el lote",
      });
    },
  });

  const submitForReviewMutation = trpc.batchPayment.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("Lote enviado", {
        description: "El lote ha sido enviado para revisión",
      });
      refetch();
      setSelectedBatch(null);
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "No se pudo crear el lote",
      });
    },
  });

  const approveBatchMutation = trpc.batchPayment.approveBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote aprobado", {
        description: "El lote ha sido aprobado para procesamiento",
      });
      refetch();
      setShowApprovalDialog(null);
      setApprovalNotes("");
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const rejectBatchMutation = trpc.batchPayment.rejectBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote rechazado", {
        description: "El lote ha sido rechazado",
      });
      refetch();
      setShowRejectionDialog(null);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const processBatchMutation = trpc.batchPayment.processBatch.useMutation({
    onSuccess: (result) => {
      toast.success("Lote procesado", {
        description: `${result.successfulPayments} pagos completados, ${result.failedPayments} fallaron`,
      });
      refetch();
      setSelectedBatch(null);
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const cancelBatchMutation = trpc.batchPayment.cancelBatch.useMutation({
    onSuccess: () => {
      toast.success("Lote cancelado", {
        description: "El lote ha sido cancelado",
      });
      refetch();
      setSelectedBatch(null);
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
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
    return statusConfig[status];
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Procesamiento de Pagos</h1>
          <p className="text-muted-foreground mt-1">Gestiona lotes de pagos a conductores</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="lg" disabled={createBatchMutation.isPending}>
          {createBatchMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {createBatchMutation.isPending ? "Creando..." : "Crear Lote"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : (value as BatchStatus))}>
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
        </CardContent>
      </Card>

      {/* Batches List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Cargando lotes...</p>
            </CardContent>
          </Card>
        ) : batches && batches.length > 0 ? (
          batches.map((batch) => (
            <Card key={batch.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedBatch(batch.id)}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(batch.status as BatchStatus)}
                      <CardTitle className="text-lg">{batch.batchNumber}</CardTitle>
                      <Badge variant={getStatusBadge(batch.status as BatchStatus).variant}>
                        {getStatusBadge(batch.status as BatchStatus).label}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      Período: {batch.period} • {batch.totalPayments} pagos
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${batch.totalAmount.toFixed(2)}</div>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Creado por</p>
                    <p className="font-medium">{batch.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Método de Pago</p>
                    <p className="font-medium capitalize">{batch.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha Creación</p>
                    <p className="font-medium">{new Date(batch.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No hay lotes de pago</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Batch Detail Modal */}
      {selectedBatch && batchDetail && (
        <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{batchDetail.batchNumber}</DialogTitle>
              <DialogDescription>
                <Badge variant={getStatusBadge(batchDetail.status as BatchStatus).variant} className="mt-2">
                  {getStatusBadge(batchDetail.status as BatchStatus).label}
                </Badge>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">${batchDetail.totalAmount.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Pagos</p>
                    <p className="text-2xl font-bold">{batchDetail.totalPayments}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Audit Trail */}
              {auditTrail && auditTrail.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Historial de Auditoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {auditTrail.map((log) => (
                        <div key={log.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                          <p className="font-medium capitalize">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.reason}</p>
                          <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                {batchDetail.status === "draft" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        cancelBatchMutation.mutate({ batchId: selectedBatch, reason: "Cancelado por usuario" });
                      }}
                      disabled={cancelBatchMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        submitForReviewMutation.mutate({ batchId: selectedBatch });
                      }}
                      disabled={submitForReviewMutation.isPending}
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
                      disabled={rejectBatchMutation.isPending}
                    >
                      {rejectBatchMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {rejectBatchMutation.isPending ? "Rechazando..." : "Rechazar"}
                    </Button>
                    <Button
                      onClick={() => setShowApprovalDialog(selectedBatch)}
                      disabled={approveBatchMutation.isPending}
                    >
                      {approveBatchMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {approveBatchMutation.isPending ? "Aprobando..." : "Aprobar"}
                    </Button>
                  </>
                )}

                {batchDetail.status === "approved" && (
                  <Button
                    onClick={() => {
                      processBatchMutation.mutate({ batchId: selectedBatch });
                    }}
                    disabled={processBatchMutation.isPending}
                  >
                    {processBatchMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {processBatchMutation.isPending ? "Procesando..." : "Procesar Lote"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Batch Dialog */}
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
                onValueChange={(value) => setCreateForm({ ...createForm, paymentMethod: value as any })}
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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateBatch}
                disabled={createBatchMutation.isPending}
              >
                {createBatchMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {createBatchMutation.isPending ? "Creando..." : "Crear Lote"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
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

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowApprovalDialog(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    approveBatchMutation.mutate({
                      batchId: showApprovalDialog,
                      notes: approvalNotes,
                    });
                  }}
                  disabled={approveBatchMutation.isPending}
                >
                  Confirmar Aprobación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Dialog */}
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
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowRejectionDialog(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (rejectionReason.trim()) {
                      rejectBatchMutation.mutate({
                        batchId: showRejectionDialog,
                        reason: rejectionReason,
                      });
                    }
                  }}
                  disabled={rejectBatchMutation.isPending || !rejectionReason.trim()}
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
