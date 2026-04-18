/**
 * BankingCashFlow.tsx
 * Banking + Cash Flow Management UI
 * Cards:
 * 1. Cash Flow Rule
 * 2. Connected Accounts + Classifications
 * 3. Reserve Suggestion Preview
 */

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Reuse existing Plaid integration if already present in the project.
// Adjust the import path if your component lives somewhere else.
import PlaidLinkButton from "@/components/PlaidLinkButton";

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

  const syncMutation = trpc.plaid.syncTransactions.useMutation({
    onSuccess: async () => {
      toast({
        title: "Sync complete",
        description: "Transactions synced successfully",
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
          <Button
            type="button"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                syncMutation.isPending ? "animate-spin" : ""
              }`}
            />
            {syncMutation.isPending ? "Syncing..." : "Sync Transactions"}
          </Button>
        </div>

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
          mergedAccounts.map((item) => (
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
          ))
        )}
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

        <AccountClassificationsCard />
        <ReserveSuggestionCard />
      </div>
    </div>
  );
}
