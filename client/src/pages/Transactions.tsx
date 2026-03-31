import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingDown, TrendingUp, Link2 } from "lucide-react";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export default function Transactions() {
  const [selectedBankAccount, setSelectedBankAccount] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: bankAccounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = trpc.bankTransaction.getBankAccounts.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = trpc.bankTransaction.getImportedTransactions.useQuery(
    { bankAccountId: selectedBankAccount || 0, limit: 100 },
    {
      enabled: !!selectedBankAccount,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const safeBankAccounts = bankAccounts ?? [];
  const safeTransactions = transactions ?? [];

  const filteredTransactions = safeTransactions.filter((t: any) => {
    const matchesType =
      filterType === "all" ||
      (filterType === "income" && t.transactionType === "credit") ||
      (filterType === "expense" && t.transactionType === "debit");

    const matchesSearch =
      searchTerm === "" ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vista segura de transacciones bancarias
          </p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Cuentas Bancarias Conectadas</CardTitle>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <div className="text-muted-foreground">Cargando cuentas...</div>
          ) : accountsError ? (
            <div className="text-sm text-red-400">
              No se pudieron cargar las cuentas bancarias (auth pendiente).
            </div>
          ) : safeBankAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {safeBankAccounts.map((account: any) => (
                <div
                  key={account.id}
                  onClick={() => setSelectedBankAccount(account.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBankAccount === account.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/50 hover:border-primary/50"
                  }`}
                >
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay cuentas conectadas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Las acciones de conexión quedan pendientes hasta restaurar auth real.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

          {transactionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando transacciones...
            </div>
          ) : transactionsError ? (
            <div className="text-center py-8 text-red-400">
              No se pudieron cargar las transacciones (auth pendiente).
            </div>
          ) : !selectedBankAccount ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Selecciona una cuenta para ver transacciones
              </p>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.transactionType === "credit"
                          ? "bg-green-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      {transaction.transactionType === "credit" ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
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
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        transaction.transactionType === "credit"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {transaction.transactionType === "credit" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    {transaction.isMatched && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Emparejada
                      </Badge>
                    )}
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
