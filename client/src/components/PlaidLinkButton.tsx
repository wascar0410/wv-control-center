/**
 * PlaidLinkButton.tsx — Plaid Link Web SDK integration
 * Uses react-plaid-link with full OAuth redirect support.
 */
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess, PlaidLinkOnExit } from "react-plaid-link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const OAUTH_REDIRECT_URI = `${window.location.origin}/plaid-oauth-return`;

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  label?: string;
}

export function PlaidLinkButton({
  onSuccess,
  variant = "outline",
  size = "sm",
  label = "Vincular Cuenta Bancaria",
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);

  const { data: tokenData, isLoading: tokenLoading, refetch: refetchToken } =
    trpc.plaid.createLinkToken.useQuery(
      { redirectUri: OAUTH_REDIRECT_URI },
      { enabled: false, retry: false }
    );

  const exchangeToken = trpc.plaid.exchangeToken.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.accountCount} cuenta(s) bancaria(s) vinculada(s)`);
      onSuccess?.();
    },
    onError: (err) => toast.error(`Error al vincular: ${err.message}`),
  });

  const handleOpen = async () => {
    const result = await refetchToken();
    if (result.data?.linkToken) setLinkToken(result.data.linkToken);
  };

  useEffect(() => {
    if (tokenData?.linkToken) setLinkToken(tokenData.linkToken);
  }, [tokenData]);

  const onPlaidSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken) => {
      setIsExchanging(true);
      try {
        await exchangeToken.mutateAsync({ publicToken });
      } finally {
        setIsExchanging(false);
        setLinkToken(null);
      }
    },
    [exchangeToken]
  );

  const onPlaidExit: PlaidLinkOnExit = useCallback((err) => {
    if (err && err.error_code !== "USER_EXITED") {
      toast.error(`Plaid: ${err.display_message || err.error_message || "Error desconocido"}`);
    }
    setLinkToken(null);
  }, []);

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const isLoading = tokenLoading || isExchanging;

  return (
    <Button onClick={handleOpen} disabled={isLoading} variant={variant} size={size} className="gap-2">
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
      {isLoading ? "Conectando..." : label}
    </Button>
  );
}

export function PlaidBankAccountsList({ onRefresh }: { onRefresh?: () => void }) {
  const { data: accounts = [], isLoading, refetch } = trpc.plaid.getBankAccounts.useQuery(
    undefined,
    { retry: false }
  );

  const syncMutation = trpc.plaid.syncTransactions.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronizadas: ${data.imported} transacciones nuevas`);
      refetch();
      onRefresh?.();
    },
    onError: (err) => toast.error(`Error al sincronizar: ${err.message}`),
  });

  const removeMutation = trpc.plaid.removeBankAccount.useMutation({
    onSuccess: () => { toast.success("Cuenta desvinculada"); refetch(); },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  if (isLoading) return <p className="text-slate-400 text-sm">Cargando cuentas...</p>;

  if (accounts.length === 0) {
    return (
      <div className="text-center py-6">
        <Link2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p className="text-slate-400 text-sm">No hay cuentas bancarias vinculadas.</p>
        <p className="text-slate-500 text-xs mt-1">Vincula tu cuenta para importar transacciones automáticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <Card key={account.id} className="bg-slate-700/30 border-slate-600">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">{account.bankName}</span>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">••••{account.accountLast4}</Badge>
                  {account.hasPlaid && <Badge className="text-xs bg-emerald-900/50 text-emerald-300 border-emerald-700">Plaid</Badge>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {account.accountType} · {account.lastSyncedAt ? `Última sync: ${new Date(account.lastSyncedAt).toLocaleDateString("es-US")}` : "Sin sincronizar"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {account.hasPlaid && (
                  <Button size="sm" variant="ghost" onClick={() => syncMutation.mutate({ bankAccountId: account.id })}
                    disabled={syncMutation.isPending} className="text-blue-400 hover:text-blue-300 h-7 px-2" title="Sincronizar">
                    <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate({ bankAccountId: account.id })}
                  disabled={removeMutation.isPending} className="text-slate-500 hover:text-red-400 h-7 px-2" title="Desvincular">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default PlaidLinkButton;
