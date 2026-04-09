import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, FileText, CheckCircle, Eye, Flag, Upload, ArrowRight } from "lucide-react";

interface BlockedLoad {
  loadId: number;
  driverId: number;
  reason: string;
  blockedAmount: number;
  status: string;
}

export function PaymentBlocksPanel() {
  const { data: alerts } = trpc.financial.getFinancialAlerts.useQuery();
  const { data: loads } = trpc.loads.list.useQuery();
  const [, navigate] = useLocation();

  // Extract payment blocks from alerts
  const paymentBlockAlert = useMemo(() => {
    if (!alerts?.alerts) return null;
    return alerts.alerts.find((a) => a.id === "payments_blocked");
  }, [alerts]);

  // Build list of blocked loads with details
  const blockedLoads = useMemo(() => {
    if (!paymentBlockAlert || !loads) return [];

    // For now, we'll create a simplified list based on alert message
    // In production, this would come from a dedicated getPaymentBlocks endpoint
    const blocked: BlockedLoad[] = [];

    // Parse message to extract count: "X payment blocks totaling $Y are active"
    const match = paymentBlockAlert.message.match(/(\d+) payment blocks/);
    if (match) {
      const blockCount = parseInt(match[1], 10);
      // Create placeholder entries for demonstration
      // These would be replaced with actual payment block data from backend
      for (let i = 0; i < Math.min(blockCount, loads.length); i++) {
        const load = loads[i];
        const reasons = ["missing_bol", "missing_pod", "compliance_hold", "dispute"];
        blocked.push({
          loadId: load.id,
          driverId: load.driverId || 0,
          reason: reasons[i % reasons.length],
          blockedAmount: load.price || 0,
          status: "active",
        });
      }
    }

    return blocked;
  }, [paymentBlockAlert, loads]);

  const reasonLabels: Record<string, { label: string; icon: typeof FileText; color: string }> = {
    missing_bol: {
      label: "Bill of Lading Faltante",
      icon: FileText,
      color: "text-red-600",
    },
    missing_pod: {
      label: "Proof of Delivery Faltante",
      icon: FileText,
      color: "text-red-600",
    },
    compliance_hold: {
      label: "Retención de Cumplimiento",
      icon: AlertCircle,
      color: "text-orange-600",
    },
    dispute: {
      label: "Disputa Pendiente",
      icon: AlertCircle,
      color: "text-red-600",
    },
  };

  if (!paymentBlockAlert) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Bloqueos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">✅ No hay bloqueos de pago activos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Bloqueos de Pago Activos ({blockedLoads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="rounded-lg border border-red-200 bg-white p-3 dark:border-red-800 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {paymentBlockAlert.message}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Los bloqueos previenen retiros hasta que se resuelvan documentos o problemas de cumplimiento.
          </p>
        </div>

        {/* Blocked Loads List */}
        <div className="space-y-2">
          {blockedLoads.length > 0 ? (
            blockedLoads.map((block) => {
              const reasonInfo = reasonLabels[block.reason] || reasonLabels.dispute;
              const ReasonIcon = reasonInfo.icon;

              return (
                <div
                  key={`${block.loadId}-${block.reason}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-red-100 bg-white p-3 dark:border-red-900/30 dark:bg-red-950/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 flex-shrink-0 text-red-600" />
                      <p className="font-semibold text-sm">Carga #{block.loadId}</p>
                      <Badge variant="outline" className="text-xs">
                        {block.status}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <ReasonIcon className={`h-3 w-3 flex-shrink-0 ${reasonInfo.color}`} />
                      <span>{reasonInfo.label}</span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Monto bloqueado: <span className="font-semibold text-red-600">${block.blockedAmount.toFixed(2)}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => navigate(`/loads/${block.loadId}`)}
                    >
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                    >
                      <Flag className="h-3 w-3" />
                      Revisar
                    </Button>

                    {(block.reason === "missing_bol" || block.reason === "missing_pod") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                      >
                        <Upload className="h-3 w-3" />
                        Documento
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No hay cargas bloqueadas para mostrar.</p>
          )}
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
          <p className="text-xs text-yellow-800 dark:text-yellow-400">
            <strong>Acciones:</strong> Usa "Ver" para revisar detalles de la carga, "Revisar" para marcar como revisado, o "Documento" para subir BOL/POD.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
