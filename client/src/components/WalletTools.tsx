import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";

type ToolMessage = {
  type: "success" | "error";
  text: string;
};

export default function WalletTools() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [isOpen, setIsOpen] = useState(false);
  const [demoAmount, setDemoAmount] = useState("500");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<ToolMessage | null>(null);

  const addAdjustmentMutation = trpc.wallet.addAdjustment.useMutation();
  const requestWithdrawalMutation = trpc.wallet.requestWithdrawal.useMutation();

  const isAdminOrOwner = user?.role === "admin" || user?.role === "owner";

  const refreshWalletData = async () => {
    await Promise.all([
      utils.wallet.getWalletSummary.invalidate(),
      utils.wallet.getStats.invalidate(),
      utils.wallet.getTransactions.invalidate({ limit: 20, offset: 0 }),
      utils.wallet.getWithdrawals.invalidate({ limit: 10, offset: 0 }),
      utils.wallet.getPartnerSummary?.invalidate?.(),
    ]);
  };

  const parseAmount = (value: string, fallback: number) => {
    const amount = parseFloat(value);
    return Number.isFinite(amount) && amount > 0 ? amount : fallback;
  };

  const handleAddDemoBalance = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const amount = parseAmount(demoAmount, 500);

      await addAdjustmentMutation.mutateAsync({
        driverId: user.id,
        amount,
        reason: `Demo balance seed - ${new Date().toISOString()}`,
      });

      await refreshWalletData();

      setMessage({
        type: "success",
        text: `✅ Demo balance added: ${formatCurrency(amount)}`,
      });

      setDemoAmount("500");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error?.message || "Failed to add demo balance"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDemoTransaction = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const amount = 150;

      await addAdjustmentMutation.mutateAsync({
        driverId: user.id,
        amount,
        reason: "Demo transaction - Amazon Flex / Instacart income",
      });

      await refreshWalletData();

      setMessage({
        type: "success",
        text: `✅ Demo transaction added: ${formatCurrency(amount)}`,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error?.message || "Failed to add demo transaction"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDemoWithdrawal = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const withdrawalAmount = 100;

      await requestWithdrawalMutation.mutateAsync({
        amount: withdrawalAmount,
        method: "other",
        notes: "Demo instant withdrawal",
      });

      await refreshWalletData();

      setMessage({
        type: "success",
        text: `✅ Demo withdrawal recorded: ${formatCurrency(withdrawalAmount)}`,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error?.message || "Failed to record demo withdrawal"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdminOrOwner) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Zap className="h-5 w-5" />
              Wallet Tools (Admin Only)
            </CardTitle>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen((prev) => !prev)}
              className="text-blue-600"
            >
              {isOpen ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 ${
                  message.type === "success"
                    ? "border-green-300 bg-green-100 text-green-800"
                    : "border-red-300 bg-red-100 text-red-800"
                }`}
              >
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{message.text}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount (default: 500)"
                  value={demoAmount}
                  onChange={(e) => setDemoAmount(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddDemoBalance}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? "Loading..." : "Add Balance"}
                </Button>
              </div>

              <Button
                onClick={handleAddDemoTransaction}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Loading..." : "Add Demo Transaction"}
              </Button>

              <Button
                onClick={handleAddDemoWithdrawal}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Loading..." : "Add Demo Withdrawal"}
              </Button>
            </div>

            <div className="rounded bg-blue-100 p-2 text-xs text-blue-700">
              <p className="mb-1 font-semibold">ℹ️ How to use:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Add Balance: seed your wallet with demo money</li>
                <li>Add Transaction: create income history in the wallet</li>
                <li>Add Withdrawal: record an instant completed withdrawal</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
