import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Lock, FileText, CheckCircle } from "lucide-react";

interface PaymentBlock {
  id: number;
  loadId: number;
  driverId: number;
  reason: string;
  blockedAmount: number;
  status: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export function PaymentBlocksPanel() {
  const { data: alerts } = trpc.financial.getFinancialAlerts.useQuery();

  // Extract payment blocks from alerts
  const paymentBlockAlert = useMemo(() => {
    if (!alerts?.alerts) return null;
    return alerts.alerts.find((a) => a.id === "payments_blocked");
  }, [alerts]);

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
          <p className="text-sm text-muted-foreground">
            ✅ No hay bloqueos de pago activos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          Bloqueos de Pago Activos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-white p-4 dark:border-red-800 dark:bg-red-950/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-600" />
                <p className="font-semibold text-red-700 dark:text-red-400">
                  {paymentBlockAlert.message}
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Los bloqueos de pago se activan cuando faltan documentos requeridos (BOL, POD) o hay
                problemas de cumplimiento. Resuelve los bloqueos para permitir retiros.
              </p>
            </div>
          </div>

          {/* Block Reasons */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Razones comunes de bloqueo:</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-2 dark:bg-red-950/20">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <div className="text-xs">
                  <p className="font-medium">Bill of Lading (BOL)</p>
                  <p className="text-muted-foreground">Documento de envío faltante</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-2 dark:bg-red-950/20">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <div className="text-xs">
                  <p className="font-medium">Proof of Delivery (POD)</p>
                  <p className="text-muted-foreground">Comprobante de entrega faltante</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-2 dark:bg-red-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <div className="text-xs">
                  <p className="font-medium">Compliance Hold</p>
                  <p className="text-muted-foreground">Retención por cumplimiento regulatorio</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-2 dark:bg-red-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                <div className="text-xs">
                  <p className="font-medium">Dispute</p>
                  <p className="text-muted-foreground">Disputa o reclamación pendiente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline">
              📋 Ver Cargas Bloqueadas
            </Button>
            <Button size="sm" variant="outline">
              ✅ Resolver Bloqueo
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
          <p className="text-xs text-yellow-800 dark:text-yellow-400">
            <strong>Nota:</strong> Los bloqueos de pago protegen la integridad de las transacciones y
            aseguran cumplimiento normativo. Carga los documentos faltantes o contacta al equipo de
            soporte para resolver.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
