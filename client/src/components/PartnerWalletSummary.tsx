import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface PartnerData {
  id?: number;
  name: string;
  totalAssigned: number;
  totalWithdrawn: number;
  availableToWithdraw: number;
  pendingWithdrawals: number;
  walletStatus: "active" | "suspended" | "pending";
}

interface PartnerWalletSummaryProps {
  partners?: PartnerData[];
  isLoading?: boolean;
}

export default function PartnerWalletSummary({
  partners = [],
  isLoading = false,
}: PartnerWalletSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Cargando resumen de socios...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!partners.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen de Socios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="font-medium text-foreground">
              No hay datos reales de socios disponibles
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta sección mostrará datos reales cuando se conecte al backend de wallets y retiros.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAssigned = partners.reduce((sum, p) => sum + p.totalAssigned, 0);
  const totalWithdrawn = partners.reduce((sum, p) => sum + p.totalWithdrawn, 0);
  const totalAvailable = partners.reduce(
    (sum, p) => sum + p.availableToWithdraw,
    0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen de Socios
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Total Asignado</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAssigned)}</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Total Retirado</p>
              <p className="text-2xl font-bold">{formatCurrency(totalWithdrawn)}</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Disponible Total</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAvailable)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Detalle por Socio:</p>

            {partners.map((partner) => (
              <div
                key={partner.id ?? partner.name}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{partner.name}</h3>

                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      partner.walletStatus === "active"
                        ? "bg-green-100 text-green-800"
                        : partner.walletStatus === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {partner.walletStatus === "active"
                      ? "✓ Activo"
                      : partner.walletStatus === "pending"
                        ? "Pendiente"
                        : "Suspendido"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Asignado
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(partner.totalAssigned)}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      Retirado
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(partner.totalWithdrawn)}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Disponible
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(partner.availableToWithdraw)}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Pendiente
                    </p>
                    <p className="font-semibold">
                      {partner.pendingWithdrawals > 0
                        ? formatCurrency(partner.pendingWithdrawals)
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded bg-gray-50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold">ℹ️ Cómo funciona:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Total Asignado: Ganancias totales del socio</li>
              <li>Total Retirado: Dinero ya retirado del wallet</li>
              <li>Disponible: Dinero listo para retirar</li>
              <li>Pendiente: Retiros en proceso</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
