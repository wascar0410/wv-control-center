import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Link2, CheckCircle, AlertCircle } from "lucide-react";

declare global {
  interface Window {
    Plaid?: any;
  }
}

export function PlaidLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);

  const createLinkToken = trpc.plaid.createLinkToken.useMutation();
  const exchangePublicToken = trpc.plaid.exchangeToken.useMutation({
    onSuccess: (data) => {
      toast.success("Bank account connected successfully!");
      // Reload linked accounts
      loadLinkedAccounts();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to connect bank account");
    },
  });

  const getLinkedAccounts = trpc.plaid.getBankAccounts.useQuery();

  const loadLinkedAccounts = () => {
    getLinkedAccounts.refetch();
  };

  useEffect(() => {
    loadLinkedAccounts();
  }, []);

  useEffect(() => {
    if (getLinkedAccounts.data) {
      setLinkedAccounts(getLinkedAccounts.data);
    }
  }, [getLinkedAccounts.data]);

  const handleConnectBank = async () => {
    setIsLoading(true);
    try {
      // Create link token
      const { linkToken } = await createLinkToken.mutateAsync();

      // Load Plaid SDK
      if (!window.Plaid) {
        const script = document.createElement("script");
        script.src = "https://cdn.plaid.com/link/v3/stable/link-initialize.js";
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
          initPlaidLink(linkToken);
        };
      } else {
        initPlaidLink(linkToken);
      }
    } catch (error) {
      toast.error("Failed to initialize Plaid");
      setIsLoading(false);
    }
  };

  const initPlaidLink = (linkToken: string) => {
    if (!window.Plaid) {
      toast.error("Plaid SDK not loaded");
      setIsLoading(false);
      return;
    }

    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: any) => {
        try {
          await exchangePublicToken.mutateAsync({
            publicToken,
            accountId: metadata.accounts[0].id,
          });
        } catch (error) {
          toast.error("Failed to exchange token");
        }
      },
      onExit: (err: any, metadata: any) => {
        setIsLoading(false);
        if (err) {
          toast.error("Plaid connection cancelled");
        }
      },
      onEvent: (eventName: string, metadata: any) => {
        console.log("Plaid event:", eventName, metadata);
      },
    });

    handler.open();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Conectar Banco
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedAccounts.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">{linkedAccounts.length} cuenta(s) conectada(s)</p>
            </div>

            <div className="space-y-2">
              {linkedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/20"
                >
                  <div>
                    <p className="font-medium text-sm">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.mask ? `•••• ${account.mask}` : account.institutionName}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              ))}
            </div>

            <Button
              onClick={handleConnectBank}
              disabled={isLoading || createLinkToken.isPending}
              variant="outline"
              className="w-full"
            >
              {isLoading || createLinkToken.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Agregar Otra Cuenta
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">No hay cuentas conectadas</p>
            </div>

            <p className="text-sm text-muted-foreground">
              Conecta tu cuenta bancaria para habilitar transferencias automáticas y retiros más rápidos.
            </p>

            <Button
              onClick={handleConnectBank}
              disabled={isLoading || createLinkToken.isPending}
              className="w-full"
            >
              {isLoading || createLinkToken.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Conectar Banco
                </>
              )}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Utilizamos Plaid para conectar tu banco de forma segura. Tus credenciales nunca se comparten con nosotros.
        </p>
      </CardContent>
    </Card>
  );
}
