import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddTransactionModal from "@/components/AddTransactionModal";
import LinkBankAccountModal from "@/components/LinkBankAccountModal";
import { DollarSign, TrendingDown, TrendingUp, Trash2, Link2, Unlink2 } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default function Transactions() {
  const [selectedBankAccount, setSelectedBankAccount] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bankAccounts, isLoading: accountsLoading } = trpc.bankTransaction.getBankAccounts.useQuery();
  const { data: transactions, isLoading: transactionsLoading } = trpc.bankTransaction.getImportedTransactions.useQuery(
    { bankAccountId: selectedBankAccount || 0, limit: 100 },
    { enabled: !!selectedBankAccount }
  );

  const deleteImport = trpc.bankTransaction.deleteImportedTransaction.useMutation();
  const unlinkAccount = trpc.bankTransaction.unlinkBankAccount.useMutation();
  const utils = trpc.useUtils();

  const handleDeleteImport = async (importId: number) => {
    try {
      await deleteImport.mutateAsync({ importId });
      toast.success("Transacción eliminada");
      utils.bankTransaction.getImportedTransactions.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    }
  };

  const handleUnlinkAccount = async (accountId: number) => {
    if (!confirm("¿Estás seguro de que quieres desconectar esta cuenta?")) return;
    
    try {
      await unlinkAccount.mutateAsync({ accountId });
      toast.success("Cuenta desconectada");
      utils.bankTransaction.getBankAccounts.invalidate();
      setSelectedBankAccount(null);
    } catch (error: any) {
      toast.error(error.message || "Error al desconectar");
    }
  };

  const filteredTransactions = transactions?.filter((t) => {
    const matchesType = filterType === "all" || (filterType === "income" && t.transactionType === "credit") || (filterType === "expense" && t.transactionType === "debit");
    const matchesSearch = searchTerm === "" || t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona gastos e ingresos manuales y automáticos</p>
        </div>
        <div className="flex gap-2">
          <AddTransactionModal />
          <LinkBankAccountModal />
        </div>
      </div>

      {/* Bank Accounts Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Cuentas Bancarias Conectadas</CardTitle>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <div className="text-muted-foreground">Cargando cuentas...</div>
          ) : bankAccounts && bankAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {bankAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setSelectedBankAccount(account.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedBankAccount === account.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/50 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{account.bankName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {account.accountType === "checking" && "Cuenta Corriente"}
                        {account.accountType === "savings" && "Cuenta de Ahorros"}
                        {account.accountType === "credit_card" && "Tarjeta de Crédito"}
                        {account.accountType === "other" && "Otra"}
                        {" •••• " + account.accountLast4}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlinkAccount(account.id);
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Unlink2 className="w-4 h-4" />
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay cuentas conectadas</p>
              <p className="text-xs text-muted-foreground mt-1">Conecta una cuenta para sincronizar transacciones automáticamente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transacciones</CardTitle>
            {selectedBankAccount && (
              <Badge variant="outline">Mostrando importadas</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Buscar transacción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Ingresos</SelectItem>
                <SelectItem value="expense">Gastos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          {transactionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando transacciones...</div>
          ) : !selectedBankAccount ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Selecciona una cuenta para ver transacciones</p>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transaction.transactionType === "credit"
                        ? "bg-green-500/10"
                        : "bg-red-500/10"
                    }`}>
                      {transaction.transactionType === "credit" ? (
                        <TrendingUp className={`w-5 h-5 text-green-400`} />
                      ) : (
                        <TrendingDown className={`w-5 h-5 text-red-400`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(transaction.transactionDate).toLocaleDateString("es-ES")}
                        {transaction.category && ` • ${transaction.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.transactionType === "credit"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}>
                        {transaction.transactionType === "credit" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      {transaction.isMatched && (
                        <Badge variant="outline" className="text-xs mt-1">Emparejada</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteImport(transaction.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay transacciones que coincidan con los filtros
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
