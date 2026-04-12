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
  operatingExpensesPercent: number;
  vanFundPercent: number;
  emergencyReservePercent: number;
  wascarDrawPercent: number;
  yisvelDrawPercent: number;
}

const DEFAULT_ALLOCATIONS: AllocationState = {
  operatingExpensesPercent: 35,
  vanFundPercent: 30,
  emergencyReservePercent: 10,
  wascarDrawPercent: 12.5,
  yisvelDrawPercent: 12.5,
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
        operatingExpensesPercent: Number(
          currentConfig.operatingExpensesPercent ?? DEFAULT_ALLOCATIONS.operatingExpensesPercent
        ),
        vanFundPercent: Number(
          currentConfig.vanFundPercent ?? DEFAULT_ALLOCATIONS.vanFundPercent
        ),
        emergencyReservePercent: Number(
          currentConfig.emergencyReservePercent ?? DEFAULT_ALLOCATIONS.emergencyReservePercent
        ),
        wascarDrawPercent: Number(
          currentConfig.wascarDrawPercent ?? DEFAULT_ALLOCATIONS.wascarDrawPercent
        ),
        yisvelDrawPercent: Number(
          currentConfig.yisvelDrawPercent ?? DEFAULT_ALLOCATIONS.yisvelDrawPercent
        ),
      });
    }
  }, [currentConfig]);

  const total =
    allocations.operatingExpensesPercent +
    allocations.vanFundPercent +
    allocations.emergencyReservePercent +
    allocations.wascarDrawPercent +
    allocations.yisvelDrawPercent;

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
          Define cómo se distribuye el 100% del dinero que entra a la empresa.
          Así separan claramente operación, ahorro para la van, reserva y retiros personales.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="operatingExpenses" className="text-sm font-medium">
              Operating Expenses
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="operatingExpenses"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.operatingExpensesPercent}
                onChange={(e) => handleChange("operatingExpensesPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gasolina, apps, movimiento del negocio y gastos operativos actuales.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vanFund" className="text-sm font-medium">
              Van Fund
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="vanFund"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.vanFundPercent}
                onChange={(e) => handleChange("vanFundPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ahorro principal para comprar la van.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyReserve" className="text-sm font-medium">
              Emergency Reserve
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="emergencyReserve"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.emergencyReservePercent}
                onChange={(e) => handleChange("emergencyReservePercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Fondo de seguridad para imprevistos y semanas flojas.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wascarDraw" className="text-sm font-medium">
              Wascar Draw
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="wascarDraw"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.wascarDrawPercent}
                onChange={(e) => handleChange("wascarDrawPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Retiro personal disponible para Wascar.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="yisvelDraw" className="text-sm font-medium">
              Yisvel Draw
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="yisvelDraw"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allocations.yisvelDrawPercent}
                onChange={(e) => handleChange("yisvelDrawPercent", e.target.value)}
                className="flex-1"
                disabled={isSaving}
              />
              <span className="text-sm font-semibold text-muted-foreground w-12">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Retiro personal disponible para Yisvel.
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
            <strong>Recommended setup for your current stage:</strong> 35% Operating Expenses,
            30% Van Fund, 10% Emergency Reserve, 12.5% Wascar Draw, and 12.5% Yisvel Draw.
            This reflects that all income enters the business first, and from there you separate
            business needs, van savings, protection, and personal withdrawals without mixing them.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
