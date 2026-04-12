import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";

export default function WalletTools() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [demoAmount, setDemoAmount] = useState("500");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Only show for admin/owner
  if (user?.role !== "admin" && user?.role !== "owner") {
    return null;
  }

  const addAdjustmentMutation = trpc.wallet.addAdjustment.useMutation();
  const requestWithdrawalMutation = trpc.wallet.requestWithdrawal.useMutation();
  const utils = trpc.useUtils();

  const handleAddDemoBalance = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      const amount = parseFloat(demoAmount) || 500;
      
      await addAdjustmentMutation.mutateAsync({
        driverId: user.id,
        amount,
        reason: `Demo balance seed - ${new Date().toISOString()}`,
      });

      setMessage({
        type: "success",
        text: `✅ Demo balance added: ${formatCurrency(amount)}`,
      });

      // Refresh wallet data
      await utils.wallet.getWalletSummary.invalidate();
      await utils.wallet.getStats.invalidate();
      await utils.wallet.getTransactions.invalidate();

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
      await addAdjustmentMutation.mutateAsync({
        driverId: user.id,
        amount: 150,
        reason: "Demo transaction - Amazon Flex load",
      });

      setMessage({
        type: "success",
        text: `✅ Demo transaction added: ${formatCurrency(150)}`,
      });

      // Refresh wallet data
      await utils.wallet.getWalletSummary.invalidate();
      await utils.wallet.getStats.invalidate();
      await utils.wallet.getTransactions.invalidate();
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
      // First add balance to ensure we have enough
      await addAdjustmentMutation.mutateAsync({
        driverId: user.id,
        amount: 1000,
        reason: "Demo balance for withdrawal test",
      });

      // Then request withdrawal
      await requestWithdrawalMutation.mutateAsync({
        amount: 500,
        bankAccountId: 1, // Fallback to first account if exists
      });

      setMessage({
        type: "success",
        text: `✅ Demo withdrawal request created: ${formatCurrency(500)}`,
      });

      // Refresh wallet data
      await utils.wallet.getWalletSummary.invalidate();
      await utils.wallet.getStats.invalidate();
      await utils.wallet.getWithdrawals.invalidate();
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `❌ Error: ${error?.message || "Failed to create demo withdrawal"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Zap className="w-5 h-5" />
              Wallet Tools (Admin Only)
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
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
                className={`p-3 rounded-lg flex items-start gap-2 ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-red-100 text-red-800 border border-red-300"
                }`}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
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

            <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
              <p className="font-semibold mb-1">ℹ️ How to use:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Add Balance: Seed your wallet with demo money</li>
                <li>Add Transaction: Create a transaction in your history</li>
                <li>Add Withdrawal: Create a pending withdrawal request</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
