import { useState, useMemo } from "react";
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

  const {
    data: reserveSummary,
    isLoading: loadingReserve,
    error: reserveError,
  } = trpc.wallet.getReserveSummary.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: withdrawableData,
    isLoading: loadingWithdrawable,
    error: withdrawableError,
  } = trpc.wallet.getWithdrawableBalance.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: financialHistory,
    isLoading: loadingHistory,
    error: historyError,
  } = trpc.wallet.getFinancialHistory.useQuery(
    { limit: 50, offset: 0 },
    {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const isLoading =
    loadingWallet ||
    loadingStats ||
    loadingTransactions ||
    loadingWithdrawals ||
    loadingReserve ||
    loadingWithdrawable ||
    loadingHistory;

  const hasError =
    !!walletError ||
    !!statsError ||
    !!transError ||
    !!withdrawError ||
    !!partnerSummaryError ||
    !!reserveError ||
    !!withdrawableError ||
    !!historyError;

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

  // Get values from walletSummary (which has all the fields)
  const reservedPending = walletSummary?.reservedPending ?? 0;
  const withdrawable = walletSummary?.withdrawableBalance ?? 0;
  const completedReserves = walletSummary?.completedReserves ?? 0;
  const totalCompletedAmount = useMemo(() => {
    return (financialHistory?.events ?? [])
      .filter((e: any) => e.type === "Reserve Completed")
      .reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);
  }, [financialHistory]);

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

  // Get values from walletSummary directly (already has all fields)
  const availableBalance = Number(
    walletSummary?.availableBalance ?? wallet?.availableBalance ?? displayStats.availableBalance ?? 0
  );
  const pendingBalance = Number(
    walletSummary?.pendingBalance ?? wallet?.pendingBalance ?? displayStats.pendingBalance ?? 0
  );
  const blockedBalance = Number(
    walletSummary?.blockedBalance ?? wallet?.blockedBalance ?? displayStats.blockedBalance ?? 0
  );
  const totalEarnings = Number(
    walletSummary?.totalEarnings ?? wallet?.totalEarnings ?? displayStats.totalEarnings ?? 0
  );
  const reservedBalance = Number(
    walletSummary?.reservedBalance ?? wallet?.reservedBalance ?? 0
  );

  const canWithdraw = withdrawable > 0;

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
          {canWithdraw ? "Solicitar Retiro" : "Sin saldo disponible para retirar"}
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
                  {reservedPending > 0
                    ? `Tienes ${formatCurrency(reservedPending)} en reservas pendientes. Completa o descarta estas sugerencias para liberar fondos.`
                    : "Completa más cargas o espera a que se procese tu próximo settlement."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ganancias Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Todas las ganancias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Para Retirar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                canWithdraw ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(withdrawable)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Disponible ahora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              Reservado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(reservedPending)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pendiente de reserva
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-yellow-500" />
              En Retiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              En proceso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Bloqueado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(blockedBalance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              En disputa
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
              <CardTitle>Resumen de Cash Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-green-700">DISPONIBLE PARA RETIRAR</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">
                    {formatCurrency(withdrawable)}
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    Listo para solicitar retiro
                  </p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-700">RESERVADO PENDIENTE</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">
                    {formatCurrency(reservedPending)}
                  </p>
                  <p className="mt-1 text-xs text-blue-600">
                    Sugerencias activas
                  </p>
                </div>

                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <p className="text-xs font-semibold text-purple-700">RESERVAS COMPLETADAS</p>
                  <p className="mt-2 text-3xl font-bold text-purple-600">
                    {formatCurrency(totalCompletedAmount)}
                  </p>
                  <p className="mt-1 text-xs text-purple-600">
                    {completedReserves} completadas
                  </p>
                </div>
              </div>

              {reservedPending > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="font-semibold text-blue-900">⚠️ Fondos Reservados</p>
                  <p className="mt-1 text-sm text-blue-800">
                    Tienes {formatCurrency(reservedPending)} en reservas pendientes. Estos fondos no pueden ser retirados hasta que las sugerencias de reserva sean completadas o descartadas.
                  </p>
                </div>
              )}

              {!canWithdraw && !reservedPending && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="font-medium">Retiro no disponible</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tu saldo disponible actual es {formatCurrency(withdrawable)}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-2">
            {financialHistory?.events && financialHistory.events.length > 0 ? (
              <>
                {financialHistory.events.map((event: any) => {
                const isPositive = event.type === "Deposit" || event.type === "Reserve Completed";
                const bgColor = 
                  event.type === "Deposit" ? "bg-green-50" :
                  event.type === "Withdrawal" ? "bg-red-50" :
                  event.type === "Reserve Suggested" ? "bg-blue-50" :
                  event.type === "Reserve Completed" ? "bg-purple-50" :
                  event.type === "Reserve Dismissed" ? "bg-gray-50" :
                  event.type === "Bank Connected" ? "bg-emerald-50" :
                  event.type === "Bank Disconnected" ? "bg-orange-50" :
                  "bg-gray-50";

                const borderColor =
                  event.type === "Deposit" ? "border-green-200" :
                  event.type === "Withdrawal" ? "border-red-200" :
                  event.type === "Reserve Suggested" ? "border-blue-200" :
                  event.type === "Reserve Completed" ? "border-purple-200" :
                  event.type === "Reserve Dismissed" ? "border-gray-200" :
                  event.type === "Bank Connected" ? "border-emerald-200" :
                  event.type === "Bank Disconnected" ? "border-orange-200" :
                  "border-gray-200";

                return (
                  <Card key={event.id} className={`border ${borderColor} ${bgColor}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {event.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.description}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {event.date
                              ? new Date(event.date).toLocaleDateString("es-ES", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Sin fecha"}
                          </p>
                          {event.status && (
                            <p className="mt-1 text-xs capitalize text-muted-foreground">
                              Estado: {event.status}
                            </p>
                          )}
                        </div>

                        {event.amount > 0 && (
                          <p
                            className={`font-bold ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {formatCurrency(Math.abs(event.amount))}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No hay eventos en el historial
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <div className="space-y-2">
            {withdrawals && withdrawals.length > 0 ? (
              <>
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
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No hay retiros registrados
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bank" className="space-y-4">
          <BankConnectionPanel />
        </TabsContent>
      </Tabs>

      <WithdrawalRequestModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        availableBalance={withdrawable}
      />
    </div>
  );
}
