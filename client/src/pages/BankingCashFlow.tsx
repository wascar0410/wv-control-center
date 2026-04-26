/**
 * BankingCashFlow.tsx
 * Banking + Cash Flow Management UI
 * Cards:
 * 1. Cash Flow Rule
 * 2. Connected Accounts + Classifications
 * 3. Reserve Suggestion Preview
 */

import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  DollarSign,
  Percent,
  TrendingUp,
  RefreshCw,
  Link2,
  Landmark,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";

// Fallback component if PlaidLinkButton fails to load
const PlaidLinkButtonFallback = () => (
  <Button variant="outline" size="sm" disabled className="w-full">
    <Link2 className="mr-2 h-4 w-4" />
    Connect Bank (coming soon)
  </Button>
);

function formatCurrency(value: number | string | null | undefined) {
  const num =
    typeof value === "string"
      ? parseFloat(value)
      : typeof value === "number"
      ? value
      : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
}

type ClassificationType = "operating" | "reserve" | "personal";

type PlaidAccountLike = {
  id: number;
  name?: string | null;
  mask?: string | null;
  subtype?: string | null;
  type?: string | null;
  institutionName?: string | null;
  institution_name?: string | null;
  currentBalance?: string | number | null;
  availableBalance?: string | number | null;
  plaidAccountId?: string | null;
};

type ClassificationLike = {
  id: number;
  bankAccountId: number;
  classification: ClassificationType;
  label?: string | null;
  description?: string | null;
  isActive?: boolean;
};

function classificationColor(type: string) {
  switch (type) {
    case "operating":
      return "bg-blue-100 text-blue-800";
    case "reserve":
      return "bg-green-100 text-green-800";
    case "personal":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function classificationLabel(type: string) {
  switch (type) {
    case "operating":
      return "Operating";
    case "reserve":
      return "Reserve";
    case "personal":
      return "Personal";
    default:
      return "Unclassified";
  }
}

// Card 1: Cash Flow Rule Editor
function CashFlowRuleCard() {
  const { toast } = useToast();
  const {
    data: rule,
    isLoading: ruleLoading,
    refetch: refetchRule,
  } = trpc.banking.getCashFlowRule.useQuery();

  const saveMutation = trpc.banking.saveCashFlowRule.useMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    reservePercent: 20,
    minReserveAmount: 0,
    maxReserveAmount: 999999.99,
  });

  const handleEdit = () => {
    if (rule) {
      setFormData({
        reservePercent: parseFloat(rule.reservePercent),
        minReserveAmount: parseFloat(rule.minReserveAmount),
        maxReserveAmount: parseFloat(rule.maxReserveAmount),
      });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(formData);
      toast({
        title: "Success",
        description: "Cash flow rule updated successfully",
      });
      setIsEditing(false);
      await refetchRule();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save cash flow rule",
        variant: "destructive",
      });
    }
  };

  if (ruleLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Cash Flow Rule
        </CardTitle>
        <CardDescription>
          Configure reserve percentage and limits
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isEditing ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b py-2">
                <span className="text-sm text-muted-foreground">
                  Reserve Percent
                </span>
                <span className="text-lg font-semibold">
                  {rule?.reservePercent ?? "0.00"}%
                </span>
              </div>

              <div className="flex items-center justify-between border-b py-2">
                <span className="text-sm text-muted-foreground">
                  Min Reserve Amount
                </span>
                <span className="font-semibold">
                  {formatCurrency(rule?.minReserveAmount || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">
                  Max Reserve Amount
                </span>
                <span className="font-semibold">
                  {formatCurrency(rule?.maxReserveAmount || 0)}
                </span>
              </div>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-muted-foreground">
              This rule is used to calculate suggested reserve transfers from
              incoming deposits. Real bank movement is not automated yet.
            </div>

            <Button onClick={handleEdit} className="w-full" variant="outline">
              Edit Rule
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <Label htmlFor="reservePercent" className="text-xs">
                  Reserve Percent (%)
                </Label>
                <Input
                  id="reservePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.reservePercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reservePercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="minReserve" className="text-xs">
                  Min Reserve Amount ($)
                </Label>
                <Input
                  id="minReserve"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minReserveAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minReserveAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="maxReserve" className="text-xs">
                  Max Reserve Amount ($)
                </Label>
                <Input
                  id="maxReserve"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxReserveAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxReserveAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Card 2: Connected Accounts + Classifications
function AccountClassificationsCard() {
  const { toast } = useToast();

  const {
    data: accounts,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = trpc.plaid.getBankAccounts.useQuery();

  const {
    data: classifications,
    isLoading: classificationsLoading,
    refetch: refetchClassifications,
  } = trpc.banking.getBankAccountClassifications.useQuery();

  const classifyMutation =
    trpc.banking.setBankAccountClassification.useMutation();

  const [syncResult, setSyncResult] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncMutation = trpc.plaid.syncTransactions.useMutation({
    onSuccess: async (data) => {
      setSyncResult(data);
      setLastSyncTime(new Date());
      toast({
        title: "Sync complete",
        description: `Imported ${data.imported} transactions, created ${data.suggestionsCreated} suggestions`,
      });
      await refetchAccounts();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to sync transactions",
        variant: "destructive",
      });
    },
  });

  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const [editingBankAccountId, setEditingBankAccountId] = useState<
    number | null
  >(null);
  const [selectedClassification, setSelectedClassification] =
    useState<ClassificationType>("operating");

  const mergedAccounts = useMemo(() => {
    const safeAccounts = (accounts || []) as PlaidAccountLike[];
    const safeClassifications = (classifications || []) as ClassificationLike[];

    return safeAccounts.map((account) => {
      const found = safeClassifications.find(
        (item) => item.bankAccountId === account.id
      );

      return {
        ...account,
        currentClassification: found?.classification || "operating",
        classificationLabel:
          found?.label ||
          account.name ||
          `${account.institutionName || account.institution_name || "Account"} ${
            account.mask ? `****${account.mask}` : `#${account.id}`
          }`,
      };
    });
  }, [accounts, classifications]);

  const handleClassify = async (
    bankAccountId: number,
    classification: ClassificationType
  ) => {
    try {
      const account = mergedAccounts.find((a) => a.id === bankAccountId);

      await classifyMutation.mutateAsync({
        bankAccountId,
        classification,
        label:
          account?.name ||
          `${account?.institutionName || account?.institution_name || "Account"} ${
            account?.mask ? `****${account.mask}` : `#${bankAccountId}`
          }`,
      });

      toast({
        title: "Success",
        description: "Account classification updated",
      });

      setEditingBankAccountId(null);
      await refetchClassifications();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update classification",
        variant: "destructive",
      });
    }
  };

  if (accountsLoading || classificationsLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Account Classifications
        </CardTitle>
        <CardDescription>
          Connect bank accounts and classify them for cash flow management
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <PlaidLinkButton />
          {mergedAccounts && mergedAccounts.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const firstAccount = mergedAccounts[0];
                syncMutation.mutate({ bankAccountId: firstAccount.id });
              }}
              disabled={syncMutation.isPending}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  syncMutation.isPending ? "animate-spin" : ""
                }`}
              />
              {syncMutation.isPending ? "Syncing..." : "Sync Transactions"}
            </Button>
          )}
          {isAdmin && mergedAccounts && mergedAccounts.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const firstAccount = mergedAccounts[0];
                syncMutation.mutate({ bankAccountId: firstAccount.id });
              }}
              disabled={syncMutation.isPending}
              title="Force sync for debugging - admin only"
            >
              <RefreshCw
                className={`mr-2 h-3 w-3 ${
                  syncMutation.isPending ? "animate-spin" : ""
                }`}
              />
              Force Sync (Debug)
            </Button>
          )}
        </div>

        {lastSyncTime && syncResult && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-muted-foreground">Last Sync:</span>
                <p className="font-semibold">{lastSyncTime.toLocaleTimeString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Transactions Imported:</span>
                <p className="font-semibold">{syncResult.imported}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Suggestions Created:</span>
                <p className="font-semibold">{syncResult.suggestionsCreated}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {!mergedAccounts || mergedAccounts.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <Link2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No bank accounts connected yet</p>
              <p className="mt-1 text-xs">
                Connect a bank account to classify operating, reserve, or personal
                accounts.
              </p>
            </div>
          ) : (
            <>
              {mergedAccounts.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-3"
              >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {item.name || `Account ${item.id}`}
                  </p>

                  <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                    <p>
                      {(item.institutionName || item.institution_name || "Bank")}
                      {item.mask ? ` • ****${item.mask}` : ""}
                    </p>
                    {item.subtype ? <p>Subtype: {item.subtype}</p> : null}
                    {item.type ? <p>Type: {item.type}</p> : null}
                    {item.currentBalance != null ? (
                      <p>Current Balance: {formatCurrency(item.currentBalance)}</p>
                    ) : null}
                    {item.availableBalance != null ? (
                      <p>
                        Available Balance: {formatCurrency(item.availableBalance)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {editingBankAccountId === item.id ? (
                  <div className="flex flex-col items-end gap-2">
                    <Select
                      value={selectedClassification}
                      onValueChange={(value) =>
                        setSelectedClassification(value as ClassificationType)
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operating">Operating</SelectItem>
                        <SelectItem value="reserve">Reserve</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleClassify(item.id, selectedClassification)
                        }
                        disabled={classifyMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingBankAccountId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={classificationColor(item.currentClassification)}>
                      {classificationLabel(item.currentClassification)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingBankAccountId(item.id);
                        setSelectedClassification(item.currentClassification);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Card 3: Reserve Suggestion Preview
function ReserveSuggestionCard() {
  const { data: rule } = trpc.banking.getCashFlowRule.useQuery();
  const [amount, setAmount] = useState<string>("1000");

  const suggestion = useMemo(() => {
    if (!rule || !amount) return 0;
    const reservePercent = parseFloat(rule.reservePercent);
    const amountNum = parseFloat(amount);
    if (!Number.isFinite(amountNum)) return 0;
    return (amountNum * reservePercent) / 100;
  }, [rule, amount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Reserve Suggestion Preview
        </CardTitle>
        <CardDescription>
          Calculate suggested reserve amount
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="amount" className="text-xs">
            Amount ($)
          </Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="mt-1"
          />
        </div>

        <div className="space-y-2 rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Reserve Percent
            </span>
            <span className="font-semibold">{rule?.reservePercent ?? "0.00"}%</span>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-sm font-semibold">Suggested Reserve</span>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(suggestion)}
            </span>
          </div>
        </div>

        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs text-muted-foreground">
          Formula: {amount || "Amount"} × {rule?.reservePercent ?? "0.00"}% ={" "}
          {formatCurrency(suggestion)}
        </div>
      </CardContent>
    </Card>
  );
}

// Suggested Transfers Card Component
function SuggestedTransfersCard() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch reserve suggestions with status "suggested"
  const { data: suggestions, isLoading, refetch } = trpc.banking.getReserveSuggestions.useQuery(
    { status: "suggested" },
    { refetchInterval: 30000 } // Refetch every 30s
  );

  // Mutation to mark as completed
  const markCompletedMutation = trpc.wallet.completeReserveSuggestion.useMutation({
    onSuccess: () => {
      toast({ title: "✅ Sugerencia marcada como completada" });
      refetch();
    },
    onError: (err) => {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    },
  });

  // Mutation to dismiss
  const dismissMutation = trpc.wallet.dismissReserveSuggestion.useMutation({
    onSuccess: () => {
      toast({ title: "✅ Sugerencia descartada" });
      refetch();
    },
    onError: (err) => {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    },
  });

  // Mutation to dismiss historical suggestions
  const dismissHistoricalMutation = trpc.wallet.dismissHistoricalReserveSuggestions.useMutation({
    onSuccess: (data) => {
      toast({
        title: "✅ Limpieza completada",
        description: `${data.dismissed} sugerencias descartadas. Reserved: $${data.reservedPendingBefore.toFixed(2)} → $${data.reservedPendingAfter.toFixed(2)}`,
      });
      refetch();
    },
    onError: (err) => {
      toast({ title: "❌ Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Suggested Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Suggested Transfers
        </CardTitle>
        <CardDescription>
          {hasSuggestions
            ? `${suggestions.length} pending transfer${suggestions.length !== 1 ? "s" : ""}`
            : "No pending transfer suggestions"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSuggestions ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-muted-foreground">
              Sync transactions to generate transfer suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
          <div className="space-y-3">
            {/* Bulk dismiss button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => dismissHistoricalMutation.mutate()}
                disabled={dismissHistoricalMutation.isPending || suggestions.length === 0}
              >
                {dismissHistoricalMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Dismissing Historical...
                  </>
                ) : (
                  "Dismiss Historical Suggestions"
                )}
              </Button>
            </div>

            {suggestions.map((sugg: any) => (
              <div
                key={sugg.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRight className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-lg">
                        {formatCurrency(sugg.suggested_amount)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {sugg.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{sugg.reason}</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>From: Account {sugg.from_account_id}</span>
                      <span>To: Account {sugg.to_account_id}</span>
                      <span>
                        {sugg.created_at
                          ? new Date(sugg.created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 flex gap-2 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        markCompletedMutation.mutate({ suggestionId: sugg.id })
                      }
                      disabled={markCompletedMutation.isPending || dismissMutation.isPending}
                    >
                      {markCompletedMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Done
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        dismissMutation.mutate({ suggestionId: sugg.id })
                      }
                      disabled={dismissMutation.isPending || markCompletedMutation.isPending}
                    >
                      {dismissMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                          Dismissing...
                        </>
                      ) : (
                        "Dismiss"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// System Status Card Component
function SystemStatusCard() {
  const { data: bankAccounts, isLoading: loadingAccounts } = trpc.plaid.getBankAccounts.useQuery(undefined, {
    refetchInterval: 60000, // Refetch every 60s
  });

  const { data: rule } = trpc.banking.getCashFlowRule.useQuery();

  const hasOperatingAccount = bankAccounts?.some(
    (acc: any) => acc.classification === "operating"
  );

  const hasReserveRule = rule && rule.reservePercent > 0;

  const lastSync = bankAccounts?.[0]?.lastSyncedAt
    ? new Date(bankAccounts[0].lastSyncedAt).toLocaleString("es-ES")
    : "Never";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          System Status
        </CardTitle>
        <CardDescription>
          Health check for Auto Reserve System
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Plaid Connected</span>
            <Badge variant={bankAccounts && bankAccounts.length > 0 ? "default" : "secondary"}>
              {bankAccounts && bankAccounts.length > 0 ? "✅ Yes" : "❌ No"}
            </Badge>
          </div>

          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Bank Accounts</span>
            <Badge variant="outline">
              {loadingAccounts ? "Loading..." : `${bankAccounts?.length ?? 0} connected`}
            </Badge>
          </div>

          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Operating Account</span>
            <Badge variant={hasOperatingAccount ? "default" : "secondary"}>
              {hasOperatingAccount ? "✅ Configured" : "❌ Not set"}
            </Badge>
          </div>

          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Reserve Rule</span>
            <Badge variant={hasReserveRule ? "default" : "secondary"}>
              {hasReserveRule ? `✅ ${rule?.reservePercent}%` : "❌ Not set"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Sync</span>
            <span className="text-xs font-mono text-muted-foreground">{lastSync}</span>
          </div>
        </div>

        {(!hasOperatingAccount || !hasReserveRule) && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
            ⚠️ Complete system setup: Set an operating account and configure reserve percentage
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Component
export default function BankingCashFlow() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Cash Flow Management</h1>
        <p className="text-muted-foreground">
          Configure reserves, connect banks, sync transactions, and classify
          accounts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <CashFlowRuleCard />
        </div>

        <SystemStatusCard />
        <ReserveSuggestionCard />
        <AccountClassificationsCard />
        
        <div className="lg:col-span-2">
          <SuggestedTransfersCard />
        </div>
      </div>
    </div>
  );
}
