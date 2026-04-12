import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Zap, RefreshCcw } from "lucide-react";
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
  const [amountInput, setAmountInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<ToolMessage | null>(null);

  const addAdjustmentMutation = trpc.wallet.addAdjustment.useMutation();
  const requestWithdrawalMutation = trpc.wallet.requestWithdrawal.useMutation();
  const normalizeLegacyPendingMutation =
    trpc.wallet.normalizeLegacyPendingWithdrawals.useMutation();

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

  const extractErrorMessage = (error: any, fallback: string) => {
    return (
      error?.message ||
      error?.data?.message ||
      error?.shape?.message ||
      fallback
    );
  };

  const handleAdjustBalance = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const amount = parseAmount(amountInput, 500);

      await addAdjustmentMutation.mutateAsync({
        driverId: user.id,
        amount,
        reason: `Manual wallet balance adjustment - ${new Date().toISOString()}`,
      });

      await refreshWalletData();

      setMessage({
        type: "success",
        text: `✅ Balance adjusted successfully: ${formatCurrency(amount)}`,
      });

      setAmountInput("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${extractErrorMessage(error, "Failed to adjust balance")}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIncomeEntry = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const amount = parseAmount(amountInput, 150);

      await addAdjustmentMutation.mutateAsync({
        driverId: user.id,
        amount,
        reason: "Manual income entry",
      });

      await refreshWalletData();

      setMessage({
        type: "success",
        text: `✅ Income entry added: ${formatCurrency(amount)}`,
      });

      setAmountInput("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${extractErrorMessage(error, "Failed to add income entry")}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordWithdrawal = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const withdrawalAmount = parseAmount(amountInput, 100);

      await requestWithdrawalMutation.mutateAsync({
        amount: withdrawalAmount,
        method: "other",
        notes: `Manual wallet withdrawal - ${new Date().toISOString()}`,
      });

      await refreshWalletData();

      setMessage({
        type: "success",
        text: `✅ Withdrawal recorded: ${formatCurrency(withdrawalAmount)}`,
      });

      setAmountInput("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${extractErrorMessage(
          error,
          "Failed to record withdrawal"
        )}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanLegacyPending = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await normalizeLegacyPendingMutation.mutateAsync({
        driverId: user.id,
      });

      await refreshWalletData();

      setMessage({
        type: "success",
        text: "✅ Legacy pending withdrawals cleaned successfully",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${extractErrorMessage(
          error,
          "Failed to clean legacy pending withdrawals"
        )}`,
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
              Wallet Admin Tools
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
                  placeholder="Enter amount"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleAdjustBalance}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? "Loading..." : "Adjust Balance"}
                </Button>
              </div>

              <Button
                onClick={handleAddIncomeEntry}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Loading..." : "Add Income Entry"}
              </Button>

              <Button
                onClick={handleRecordWithdrawal}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Loading..." : "Record Withdrawal"}
              </Button>

              <Button
                onClick={handleCleanLegacyPending}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isLoading ? "Loading..." : "Clean Legacy Pending"}
              </Button>
            </div>

            <div className="rounded bg-blue-100 p-2 text-xs text-blue-700">
              <p className="mb-1 font-semibold">ℹ️ Admin actions:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Adjust Balance: manually update available balance</li>
                <li>Add Income Entry: register a real income movement</li>
                <li>Record Withdrawal: register a completed withdrawal instantly</li>
                <li>Clean Legacy Pending: fix old pending withdrawals from the previous workflow</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
