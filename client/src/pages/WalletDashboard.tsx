import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import WithdrawalRequestModal from "@/components/WithdrawalRequestModal";
import WalletTools from "@/components/WalletTools";
import BankConnectionPanel from "@/components/BankConnectionPanel";
import PartnerWalletSummary from "@/components/PartnerWalletSummary";
import { formatCurrency } from "@/lib/utils";

export default function WalletDashboard() {
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");

  const {
    data: walletSummary,
    isLoading: loadingWallet,
    error: walletError,
  } = trpc.wallet.getWalletSummary.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: stats,
    isLoading: loadingStats,
    error: statsError,
  } = trpc.wallet.getStats.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: transactions,
    isLoading: loadingTransactions,
    error: transError,
  } = trpc.wallet.getTransactions.useQuery(
    { limit: 20, offset: 0 },
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const {
    data: withdrawals,
    isLoading: loadingWithdrawals,
    error: withdrawError,
  } = trpc.wallet.getWithdrawals.useQuery(
    { limit: 10, offset: 0 },
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const {
    data: partnerSummary = [],
    isLoading: loadingPartnerSummary,
    error: partnerSummaryError,
  } = trpc.wallet.getPartnerSummary.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const isLoading =
    loadingWallet ||
    loadingStats ||
    loadingTransactions ||
    loadingWithdrawals;

  const hasError =
    !!walletError ||
    !!statsError ||
    !!transError ||
    !!withdrawError ||
    !!partnerSummaryError;

  const fallbackStats = {
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    blockedBalance: 0,
  };

  const displayStats = stats || fallbackStats;
  const wallet = walletSummary?.wallet ?? null;
  const recentTransactions = walletSummary?.recentTransactions ?? transactions ?? [];
  const pendingWithdrawals = walletSummary?.pendingWithdrawals ?? [];
  const canWithdraw = (displayStats.availableBalance || 0) > 0;

  const pendingWithdrawalsTotal = useMemo(() => {
    return pendingWithdrawals.reduce(
      (sum: number, w: any) => sum + Number(w.amount || 0),
      0
    );
  }, [pendingWithdrawals]);

  const recentTransactionsNormalized = useMemo(() => {
    return (recentTransactions || []).map((tx: any) => {
      const amount = Number(tx.amount || 0);
      const type = String(tx.type || "").toLowerCase();

      const isPositive =
        type === "load_payment" ||
        type === "adjustment" ||
        type === "bonus" ||
        type === "refund"
          ? amount >= 0
          : false;

      return {
        ...tx,
        amount,
        isPositive,
      };
    });
  }, [recentTransactions]);

  const availableBalance = Number(
    wallet?.availableBalance ?? displayStats.availableBalance ?? 0
  );
  const pendingBalance = Number(
    wallet?.pendingBalance ?? displayStats.pendingBalance ?? 0
  );
  const blockedBalance = Number(
    wallet?.blockedBalance ?? displayStats.blockedBalance ?? 0
  );
  const totalEarnings = Number(
    wallet?.totalEarnings ?? displayStats.totalEarnings ?? 0
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Cargando billetera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {hasError && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-900">Aviso</p>
            <p className="text-sm text-yellow-800">
              Algunos datos pueden no estar actualizados. Intenta recargar la página.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
<p className="text-muted-foreground">
  Resumen financiero personal y movimientos registrados.
</p>
        </div>

        <Button
          onClick={() => setShowWithdrawalModal(true)}
          size="lg"
          className="gap-2"
          disabled={!canWithdraw}
        >
          <DollarSign className="h-4 w-4" />
          {canWithdraw ? "Solicitar Retiro" : "Sin saldo disponible"}
        </Button>
      </div>

      <WalletTools />

      <PartnerWalletSummary
        partners={partnerSummary}
        isLoading={loadingPartnerSummary}
      />

      {!canWithdraw && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  No tienes saldo disponible para retirar
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Completa más cargas o espera a que se procese tu próximo settlement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganancias Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Todas las ganancias registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Saldo Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                canWithdraw ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(availableBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Listo para retirar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              En proceso de retiro
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-red-500" />
              Bloqueado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(blockedBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              En disputa o verificación
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="withdrawals">Retiros</TabsTrigger>
          <TabsTrigger value="bank">Banco</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo disponible</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(availableBalance)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Retiros pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {pendingWithdrawals.length}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Total pendiente</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(pendingWithdrawalsTotal)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Wallet status</p>
                  <p className="flex items-center gap-2 text-2xl font-bold">
                    <Wallet className="h-5 w-5" />
                    {wallet?.status || "active"}
                  </p>
                </div>
              </div>

              {!canWithdraw && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="font-medium">Retiro no disponible</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tu saldo disponible actual es {formatCurrency(availableBalance)}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {recentTransactionsNormalized.length > 0 ? (
            <div className="space-y-2">
              {recentTransactionsNormalized.map((tx: any) => (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {tx.description || tx.type || "Transacción"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleDateString("es-ES")
                            : "Sin fecha"}
                        </p>
                        <p className="mt-1 text-xs uppercase text-muted-foreground">
                          {tx.type || "N/A"}
                        </p>
                      </div>

                      <p
                        className={`font-bold ${
                          tx.isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.isPositive ? "+" : "-"}
                        {formatCurrency(Math.abs(tx.amount))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No hay transacciones
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          {withdrawals && withdrawals.length > 0 ? (
            <div className="space-y-2">
              {withdrawals.map((withdrawal: any) => (
                <Card key={withdrawal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Retiro #{withdrawal.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {withdrawal.requestedAt
                            ? new Date(withdrawal.requestedAt).toLocaleDateString("es-ES")
                            : "Sin fecha"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Método: {withdrawal.method || "N/A"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(Number(withdrawal.amount || 0))}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {withdrawal.status || "unknown"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No hay retiros registrados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bank" className="space-y-4">
          <BankConnectionPanel />
        </TabsContent>
      </Tabs>

      <WithdrawalRequestModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        availableBalance={availableBalance}
      />
    </div>
  );
}
