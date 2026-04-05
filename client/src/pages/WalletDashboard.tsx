import { useEffect, useState } from "react";
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

  // Fetch wallet data
  const { data: walletSummary, isLoading: loadingWallet, refetch: refetchWallet } = trpc.wallet.getWalletSummary.useQuery();
  const { data: stats, isLoading: loadingStats } = trpc.wallet.getStats.useQuery();
  const { data: transactions, isLoading: loadingTransactions } = trpc.wallet.getTransactions.useQuery({ limit: 20, offset: 0 });
  const { data: withdrawals, isLoading: loadingWithdrawals } = trpc.wallet.getWithdrawals.useQuery({ limit: 10, offset: 0 });

  const isLoading = loadingWallet || loadingStats || loadingTransactions || loadingWithdrawals;

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
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalEarnings || 0)}</div>
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
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.availableBalance || 0)}</div>
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
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.pendingBalance || 0)}</div>
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
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats?.blockedBalance || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">En disputa/verificación</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="withdrawals">Retiros</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Cuenta</CardTitle>
              <CardDescription>Estado actual de tu billetera</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Ganancias Totales</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalEarnings || 0)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Saldo Disponible</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.availableBalance || 0)}</p>
                </div>
              </div>

              {walletSummary?.pendingWithdrawals && walletSummary.pendingWithdrawals.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-900">
                    Tienes {walletSummary.pendingWithdrawals.length} retiro(s) pendiente(s)
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Total pendiente: {formatCurrency(
                      walletSummary.pendingWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0)
                    )}
                  </p>
                </div>
              )}

              <Button onClick={() => setShowWithdrawalModal(true)} className="w-full" size="lg">
                Solicitar Retiro
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transacciones</CardTitle>
              <CardDescription>Últimas 20 transacciones</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions && transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{tx.description || tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${Number(tx.amount) > 0 ? "text-green-600" : "text-red-600"}`}>
                          {Number(tx.amount) > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay transacciones aún</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mis Retiros</CardTitle>
              <CardDescription>Historial de solicitudes de retiro</CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawals && withdrawals.length > 0 ? (
                <div className="space-y-2">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatCurrency(w.amount)}</p>
                          <p className="text-xs text-muted-foreground capitalize">{w.method}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium capitalize px-3 py-1 rounded-full ${
                            w.status === "completed" ? "bg-green-100 text-green-700" :
                            w.status === "processing" ? "bg-blue-100 text-blue-700" :
                            w.status === "approved" ? "bg-yellow-100 text-yellow-700" :
                            w.status === "failed" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {w.status}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Solicitado: {new Date(w.requestedAt).toLocaleDateString("es-ES")}
                      </p>
                      {w.failureReason && (
                        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{w.failureReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay retiros aún</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <WithdrawalRequestModal
          isOpen={showWithdrawalModal}
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={() => {
            setShowWithdrawalModal(false);
            refetchWallet();
          }}
          availableBalance={stats?.availableBalance || 0}
        />
      )}
    </div>
  );
}
