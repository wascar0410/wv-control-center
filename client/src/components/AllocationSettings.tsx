import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AllocationState {
  ownerDrawPercent: number;
  reserveFundPercent: number;
  reinvestmentPercent: number;
  operatingCashPercent: number;
}

export function AllocationSettings() {
  const [allocations, setAllocations] = useState<AllocationState>({
    ownerDrawPercent: 40,
    reserveFundPercent: 20,
    reinvestmentPercent: 20,
    operatingCashPercent: 20,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Load current allocations from database
  const { data: currentConfig, isLoading } = trpc.financial.getAllocationSettings.useQuery();

  // Update mutation
  const updateMutation = trpc.financialExtended.updateAllocationSettings.useMutation({
    onSuccess: () => {
      setSaveStatus("success");
      setErrorMessage("");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: (error) => {
      setSaveStatus("error");
      setErrorMessage(error.message || "Failed to update allocations");
      setTimeout(() => setSaveStatus("idle"), 5000);
    },
  });

  // Load saved allocations on mount
  useEffect(() => {
    if (currentConfig) {
      setAllocations({
        ownerDrawPercent: Number(currentConfig.ownerDrawPercent || 40),
        reserveFundPercent: Number(currentConfig.reserveFundPercent || 20),
        reinvestmentPercent: Number(currentConfig.reinvestmentPercent || 20),
        operatingCashPercent: Number(currentConfig.operatingCashPercent || 20),
      });
    }
  }, [currentConfig]);

  const total =
    allocations.ownerDrawPercent +
    allocations.reserveFundPercent +
    allocations.reinvestmentPercent +
    allocations.operatingCashPercent;

  const isValid = Math.abs(total - 100) < 0.01;

  const handleChange = (field: keyof AllocationState, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [field]: Math.max(0, Math.min(100, value)),
    }));
  };

  const handleSave = async () => {
    if (!isValid) {
      setErrorMessage(`Allocations must sum to 100%, currently ${total.toFixed(2)}%`);
      setSaveStatus("error");
      return;
    }

    setIsSaving(true);
    try {
      await updateMutation.mutateAsync(allocations);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading allocation settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Allocation Settings</CardTitle>
        <CardDescription>
          Configure how net profit is allocated across owner draw, reserves, reinvestment, and operating cash
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Allocation Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Owner Draw */}
          <div className="space-y-2">
            <Label htmlFor="ownerDraw" className="text-sm font-medium">
              Owner Draw
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="ownerDraw"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.ownerDrawPercent}
                onChange={(e) => handleChange("ownerDrawPercent", parseFloat(e.target.value))}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Personal income for owner</p>
          </div>

          {/* Reserve Fund */}
          <div className="space-y-2">
            <Label htmlFor="reserveFund" className="text-sm font-medium">
              Reserve Fund
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="reserveFund"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.reserveFundPercent}
                onChange={(e) => handleChange("reserveFundPercent", parseFloat(e.target.value))}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Emergency & contingency fund</p>
          </div>

          {/* Reinvestment */}
          <div className="space-y-2">
            <Label htmlFor="reinvestment" className="text-sm font-medium">
              Reinvestment
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="reinvestment"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.reinvestmentPercent}
                onChange={(e) => handleChange("reinvestmentPercent", parseFloat(e.target.value))}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Fleet expansion & equipment</p>
          </div>

          {/* Operating Cash */}
          <div className="space-y-2">
            <Label htmlFor="operatingCash" className="text-sm font-medium">
              Operating Cash
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="operatingCash"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.operatingCashPercent}
                onChange={(e) => handleChange("operatingCashPercent", parseFloat(e.target.value))}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Working capital & operations</p>
          </div>
        </div>

        {/* Total Validation */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Total Allocation</span>
            <span className={`text-lg font-bold ${isValid ? "text-green-600" : "text-red-600"}`}>
              {total.toFixed(2)}%
            </span>
          </div>

          {!isValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Allocations must sum to exactly 100%. Currently {total.toFixed(2)}%. Adjust values to continue.
              </AlertDescription>
            </Alert>
          )}

          {isValid && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Allocations are valid and sum to 100%
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Status Messages */}
        {saveStatus === "success" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Allocation settings saved successfully. P&L calculations will use these percentages.
            </AlertDescription>
          </Alert>
        )}

        {saveStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="flex-1"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Allocation Settings"
            )}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>How allocations work:</strong> After calculating net profit from all loads, these percentages
            determine how profit is distributed. For example, with 40% owner draw on $10,000 profit, $4,000 goes to
            owner, $2,000 to reserves, $2,000 to reinvestment, and $2,000 to operating cash.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
