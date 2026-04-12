import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PartnerData {
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

export default function PartnerWalletSummary({ partners = [], isLoading = false }: PartnerWalletSummaryProps) {
  // Mock data for Wascar and Yisvel
  const defaultPartners: PartnerData[] = [
    {
      name: "Wascar",
      totalAssigned: 5250.00,
      totalWithdrawn: 3200.00,
      availableToWithdraw: 2050.00,
      pendingWithdrawals: 0,
      walletStatus: "active",
    },
    {
      name: "Yisvel",
      totalAssigned: 4800.00,
      totalWithdrawn: 2900.00,
      availableToWithdraw: 1900.00,
      pendingWithdrawals: 500.00,
      walletStatus: "active",
    },
  ];

  const displayPartners = partners.length > 0 ? partners : defaultPartners;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Cargando resumen de socios...</p>
        </CardContent>
      </Card>
    );
  }

  const totalAssigned = displayPartners.reduce((sum, p) => sum + p.totalAssigned, 0);
  const totalWithdrawn = displayPartners.reduce((sum, p) => sum + p.totalWithdrawn, 0);
  const totalAvailable = displayPartners.reduce((sum, p) => sum + p.availableToWithdraw, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Resumen de Socios
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground">Total Asignado</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAssigned)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground">Total Retirado</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalWithdrawn)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground">Disponible Total</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalAvailable)}</p>
            </div>
          </div>

          {/* Partner Details */}
          <div className="space-y-3">
            <p className="font-semibold text-sm">Detalle por Socio:</p>
            {displayPartners.map((partner) => (
              <div key={partner.name} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{partner.name}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      partner.walletStatus === "active"
                        ? "bg-green-100 text-green-800"
                        : partner.walletStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {partner.walletStatus === "active" ? "✓ Activo" : partner.walletStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Asignado
                    </p>
                    <p className="font-semibold">{formatCurrency(partner.totalAssigned)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Retirado
                    </p>
                    <p className="font-semibold text-green-600">{formatCurrency(partner.totalWithdrawn)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Disponible
                    </p>
                    <p className="font-semibold text-amber-600">{formatCurrency(partner.availableToWithdraw)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pendiente
                    </p>
                    <p className="font-semibold text-yellow-600">
                      {partner.pendingWithdrawals > 0 ? formatCurrency(partner.pendingWithdrawals) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-1">ℹ️ Cómo funciona:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Total Asignado: Ganancias totales del socio</li>
              <li>Total Retirado: Dinero ya sacado del wallet</li>
              <li>Disponible: Dinero listo para retirar</li>
              <li>Pendiente: Retiros en proceso</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
