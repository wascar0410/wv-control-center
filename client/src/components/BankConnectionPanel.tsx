import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Link as LinkIcon, CheckCircle, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function BankConnectionPanel() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const { data: linkedAccounts, isLoading: loadingAccounts, refetch: refetchAccounts } = trpc.wallet.getLinkedBankAccounts.useQuery();
  const createPlaidLinkMutation = trpc.wallet.createPlaidLinkToken.useMutation();
  const exchangeTokenMutation = trpc.wallet.exchangePlaidPublicToken.useMutation();

  const handleConnectBank = async () => {
    setIsConnecting(true);
    setMessage(null);

    try {
      // Create Plaid link token
      const { linkToken } = await createPlaidLinkMutation.mutateAsync();

      if (!linkToken) {
        throw new Error("Failed to create Plaid link token");
      }

      // In production, you would open Plaid Link modal here
      // For now, we'll show a message
      setMessage({
        type: "info",
        text: "🔗 Plaid Link Token created. In production, this would open the Plaid modal to connect your bank account.",
      });

      // Simulated token exchange (in real implementation, Plaid would return publicToken)
      // await exchangeTokenMutation.mutateAsync({ publicToken: "mock_token" });
      // await refetchAccounts();

      setMessage({
        type: "success",
        text: "✅ Bank connection flow initiated. Complete the Plaid setup in production.",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error?.message || "Failed to connect bank"}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemoveAccount = async (accountId: number) => {
    // Placeholder for account removal
    setMessage({
      type: "info",
      text: "🗑️ Account removal not yet implemented",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Conectar Banco
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {message && (
          <div
            className={`p-3 rounded-lg flex items-start gap-2 ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : message.type === "error"
                ? "bg-red-100 text-red-800 border border-red-300"
                : "bg-blue-100 text-blue-800 border border-blue-300"
            }`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {loadingAccounts ? (
          <p className="text-muted-foreground">Cargando cuentas conectadas...</p>
        ) : linkedAccounts && linkedAccounts.length > 0 ? (
          <div className="space-y-3">
            <p className="font-semibold text-sm">Cuentas Conectadas:</p>
            {linkedAccounts.map((account: any) => (
              <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">{account.bankName}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.accountType} - {account.accountLast4}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAccount(account.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">No hay cuentas bancarias conectadas</p>
          </div>
        )}

        <Button
          onClick={handleConnectBank}
          disabled={isConnecting}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isConnecting ? "Conectando..." : "Conectar Cuenta Bancaria"}
        </Button>

        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded">
          <p className="font-semibold mb-1">ℹ️ Cómo funciona:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Haz clic en "Conectar Cuenta Bancaria"</li>
            <li>Selecciona tu banco en Plaid</li>
            <li>Autoriza el acceso a tu cuenta</li>
            <li>Los retiros se procesarán automáticamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
