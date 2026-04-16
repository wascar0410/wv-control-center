/**
 * BankingCashFlow.tsx
 * Minimal UI for cash flow management
 * Cards: Cash Flow Rule, Account Classifications, Reserve Suggestion
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { AlertCircle, DollarSign, Percent, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

// Card 1: Cash Flow Rule Editor
function CashFlowRuleCard() {
  const { toast } = useToast();
  const { data: rule, isLoading: ruleLoading, refetch: refetchRule } = trpc.banking.getCashFlowRule.useQuery();
  const saveMutation = trpc.banking.saveCashFlowRule.useMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    reservePercent: 20,
    minReserveAmount: 0,
    maxReserveAmount: 999999.99,
  });

  // Initialize form with current rule data
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
      refetchRule();
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
        <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Cash Flow Rule
        </CardTitle>
        <CardDescription>Configure reserve percentage and limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <>
            {/* Display Mode */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Reserve Percent</span>
                <span className="font-semibold text-lg">{rule?.reservePercent}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Min Reserve Amount</span>
                <span className="font-semibold">{formatCurrency(rule?.minReserveAmount || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Max Reserve Amount</span>
                <span className="font-semibold">{formatCurrency(rule?.maxReserveAmount || 0)}</span>
              </div>
            </div>
            <Button onClick={handleEdit} className="w-full" variant="outline">
              Edit Rule
            </Button>
          </>
        ) : (
          <>
            {/* Edit Mode */}
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
                    setFormData({ ...formData, reservePercent: parseFloat(e.target.value) || 0 })
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
                    setFormData({ ...formData, minReserveAmount: parseFloat(e.target.value) || 0 })
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
                    setFormData({ ...formData, maxReserveAmount: parseFloat(e.target.value) || 0 })
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

// Card 2: Account Classifications
function AccountClassificationsCard() {
  const { toast } = useToast();
  const { data: classifications, isLoading: classLoading, refetch: refetchClassifications } = 
    trpc.banking.getBankAccountClassifications.useQuery();
  const classifyMutation = trpc.banking.setBankAccountClassification.useMutation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string>("");

  const handleClassify = async (bankAccountId: number, classification: string) => {
    try {
      await classifyMutation.mutateAsync({
        bankAccountId,
        classification: classification as "operating" | "reserve" | "personal",
        label: `Account ${bankAccountId}`,
      });
      toast({
        title: "Success",
        description: "Account classification updated",
      });
      setEditingId(null);
      refetchClassifications();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update classification",
        variant: "destructive",
      });
    }
  };

  const classificationColor = (type: string) => {
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
  };

  if (classLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Account Classifications
        </CardTitle>
        <CardDescription>Classify accounts for cash flow management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!classifications || classifications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No accounts classified yet</p>
          </div>
        ) : (
          classifications.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-semibold">Account {item.bankAccountId}</p>
                <p className="text-xs text-muted-foreground">{item.label || "Unclassified"}</p>
              </div>
              {editingId === item.id ? (
                <div className="flex gap-2 items-center">
                  <Select value={selectedClassification} onValueChange={setSelectedClassification}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operating">Operating</SelectItem>
                      <SelectItem value="reserve">Reserve</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => handleClassify(item.bankAccountId, selectedClassification)}
                    disabled={classifyMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <Badge className={classificationColor(item.classification)}>
                    {item.classification}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(item.id);
                      setSelectedClassification(item.classification);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
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
    return (amountNum * reservePercent) / 100;
  }, [rule, amount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Reserve Suggestion Preview
        </CardTitle>
        <CardDescription>Calculate suggested reserve amount</CardDescription>
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

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Reserve Percent</span>
            <span className="font-semibold">{rule?.reservePercent}%</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-semibold">Suggested Reserve</span>
            <span className="text-lg font-bold text-green-600">{formatCurrency(suggestion)}</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded border border-blue-200">
          Formula: {amount || "Amount"} × {rule?.reservePercent}% = {formatCurrency(suggestion)}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function BankingCashFlow() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Cash Flow Management</h1>
        <p className="text-muted-foreground">Configure reserves and classify accounts</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <CashFlowRuleCard />
        </div>
        <AccountClassificationsCard />
        <ReserveSuggestionCard />
      </div>
    </div>
  );
}
