import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Clock, AlertCircle } from "lucide-react";
import WithdrawalRequestModal from "@/components/WithdrawalRequestModal";
import { formatCurrency } from "@/lib/utils";

export default function WalletDashboard() {
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch wallet data with error handling
  const { data: walletSummary, isLoading: loadingWallet, error: walletError } = trpc.wallet.getWalletSummary.useQuery(undefined, {
    retry: 1,
  });
  const { data: stats, isLoading: loadingStats, error: statsError } = trpc.wallet.getStats.useQuery(undefined, {
    retry: 1,
  });
  const { data: transactions, isLoading: loadingTransactions, error: transError } = trpc.wallet.getTransactions.useQuery({ limit: 20, offset: 0 }, {
    retry: 1,
  });
  const { data: withdrawals, isLoading: loadingWithdrawals, error: withdrawError } = trpc.wallet.getWithdrawals.useQuery({ limit: 10, offset: 0 }, {
    retry: 1,
  });

  const isLoading = loadingWallet || loadingStats || loadingTransactions || loadingWithdrawals;
  const hasError = walletError || statsError || transError || withdrawError;

  // Fallback values
  const fallbackStats = {
    totalEarnings: 0,
    availableBalance: 0,
    pendingBalance: 0,
    blockedBalance: 0,
  };

  const displayStats = stats || fallbackStats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando billetera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Error Banner */}
      {hasError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">Aviso</p>
            <p className="text-sm text-yellow-800">Algunos datos pueden no estar actualizados. Intenta recargar la página.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mi Billetera</h1>
          <p className="text-muted-foreground">Gestiona tus ganancias y retiros</p>
        </div>
        <Button onClick={() => setShowWithdrawalModal(true)} size="lg" className="gap-2">
          <DollarSign className="w-4 h-4" />
          Solicitar Retiro
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancias Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayStats.totalEarnings || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Todas las ganancias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Saldo Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(displayStats.availableBalance || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Listo para retirar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(displayStats.pendingBalance || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">En proceso de retiro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Bloqueado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(displayStats.blockedBalance || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">En disputa/verificación</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {walletSummary ? (
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Billetera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Actual</p>
                    <p className="text-2xl font-bold">{formatCurrency(walletSummary.balance || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Últimas 24h</p>
                    <p className="text-2xl font-bold text-green-600">+{formatCurrency(walletSummary.last24h || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">No hay datos de billetera disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                      <p className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                        {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">No hay transacciones</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Withdrawal Modal */}
      <WithdrawalRequestModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
      />
    </div>
  );
}
