import { useState, useEffect } from "react";
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
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AllocationState {
  ownerDrawPercent: number;
  reserveFundPercent: number;
  reinvestmentPercent: number;
  operatingCashPercent: number;
}

const DEFAULT_ALLOCATIONS: AllocationState = {
  ownerDrawPercent: 20,
  reserveFundPercent: 15,
  reinvestmentPercent: 50,
  operatingCashPercent: 15,
};

export function AllocationSettings() {
  const [allocations, setAllocations] = useState<AllocationState>(DEFAULT_ALLOCATIONS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: currentConfig, isLoading } = trpc.financial.getAllocationSettings.useQuery();

  const updateMutation = trpc.financialExtended.updateAllocationSettings.useMutation({
    onSuccess: () => {
      setSaveStatus("success");
      setErrorMessage("");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: (error) => {
      setSaveStatus("error");
      setErrorMessage(error.message || "No se pudieron guardar los porcentajes");
      setTimeout(() => setSaveStatus("idle"), 5000);
    },
  });

  useEffect(() => {
    if (currentConfig) {
      setAllocations({
        ownerDrawPercent: Number(currentConfig.ownerDrawPercent ?? DEFAULT_ALLOCATIONS.ownerDrawPercent),
        reserveFundPercent: Number(currentConfig.reserveFundPercent ?? DEFAULT_ALLOCATIONS.reserveFundPercent),
        reinvestmentPercent: Number(currentConfig.reinvestmentPercent ?? DEFAULT_ALLOCATIONS.reinvestmentPercent),
        operatingCashPercent: Number(currentConfig.operatingCashPercent ?? DEFAULT_ALLOCATIONS.operatingCashPercent),
      });
    }
  }, [currentConfig]);

  const total =
    allocations.ownerDrawPercent +
    allocations.reserveFundPercent +
    allocations.reinvestmentPercent +
    allocations.operatingCashPercent;

  const isValid = Math.abs(total - 100) < 0.01;

  const handleChange = (field: keyof AllocationState, rawValue: string) => {
    const parsed = Number(rawValue);

    setAllocations((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0,
    }));
  };

  const handleSave = async () => {
    if (!isValid) {
      setErrorMessage(`Los porcentajes deben sumar 100%. Actualmente suman ${total.toFixed(2)}%`);
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
          <p className="text-sm text-muted-foreground mt-2">
            Cargando configuración de porcentajes...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Allocation Settings</CardTitle>
        <CardDescription>
          Define cómo se distribuye la utilidad neta del negocio después de gastos.
          Esta configuración está adaptada a su etapa actual: operar, ahorrar para la van
          y sacar una parte para gastos personales.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ownerDraw" className="text-sm font-medium">
              Personal Draw
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="ownerDraw"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.ownerDrawPercent}
                onChange={(e) => handleChange("ownerDrawPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dinero que ustedes pueden sacar para casa y gastos personales.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reserveFund" className="text-sm font-medium">
              Emergency Reserve
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="reserveFund"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.reserveFundPercent}
                onChange={(e) => handleChange("reserveFundPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Fondo de seguridad para imprevistos, semanas flojas y emergencias.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reinvestment" className="text-sm font-medium">
              Van Fund
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="reinvestment"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.reinvestmentPercent}
                onChange={(e) => handleChange("reinvestmentPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ahorro principal para comprar la van y fortalecer el negocio.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operatingCash" className="text-sm font-medium">
              Business Operating Cash
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="operatingCash"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.operatingCashPercent}
                onChange={(e) => handleChange("operatingCashPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Efectivo operativo para gasolina, apps, movimiento y operación actual.
            </p>
          </div>
        </div>

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
                Los porcentajes deben sumar exactamente 100%. Ahora mismo suman {total.toFixed(2)}%.
              </AlertDescription>
            </Alert>
          )}

          {isValid && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                La distribución es válida y suma 100%.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {saveStatus === "success" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Los porcentajes se guardaron correctamente.
            </AlertDescription>
          </Alert>
        )}

        {saveStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Recommended setup for your current stage:</strong> 20% Personal Draw,
            15% Emergency Reserve, 50% Van Fund, and 15% Business Operating Cash.
            This reflects that the business is still building capital for the van while
            also covering current operations and allowing limited personal withdrawals.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
