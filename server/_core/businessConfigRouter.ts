import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type BusinessConfigState = {
  fuelPricePerGallon: number;
  vanMpg: number;
  maintenancePerMile: number;
  tiresPerMile: number;
  insuranceMonthly: number;
  phoneInternetMonthly: number;
  loadBoardAppsMonthly: number;
  accountingSoftwareMonthly: number;
  otherFixedMonthly: number;
  targetMilesPerMonth: number;
  minimumProfitPerMile: number;
};

const DEFAULT_CONFIG: BusinessConfigState = {
  fuelPricePerGallon: 3.6,
  vanMpg: 18,
  maintenancePerMile: 0.12,
  tiresPerMile: 0.03,
  insuranceMonthly: 450,
  phoneInternetMonthly: 70,
  loadBoardAppsMonthly: 45,
  accountingSoftwareMonthly: 30,
  otherFixedMonthly: 80,
  targetMilesPerMonth: 4000,
  minimumProfitPerMile: 1.5,
};

function formatCurrency(value: number, suffix = "") {
  return `$${Number(value || 0).toFixed(2)}${suffix}`;
}

function formatNumber(value: number, suffix = "") {
  return `${Number(value || 0).toLocaleString()}${suffix}`;
}

export default function BusinessSettings() {
  const utils = trpc.useUtils();

  const { data, error, isLoading } = trpc.businessConfig.getConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [form, setForm] = useState<BusinessConfigState>(DEFAULT_CONFIG);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const updateMutation = trpc.businessConfig.updateConfig.useMutation({
    onSuccess: async () => {
      setSaveStatus("success");
      setErrorMessage("");
      await utils.businessConfig.getConfig.invalidate();
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: (err) => {
      setSaveStatus("error");
      setErrorMessage(err.message || "No se pudo guardar la configuración");
      setTimeout(() => setSaveStatus("idle"), 5000);
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        fuelPricePerGallon: Number(data.fuelPricePerGallon ?? DEFAULT_CONFIG.fuelPricePerGallon),
        vanMpg: Number(data.vanMpg ?? DEFAULT_CONFIG.vanMpg),
        maintenancePerMile: Number(data.maintenancePerMile ?? DEFAULT_CONFIG.maintenancePerMile),
        tiresPerMile: Number(data.tiresPerMile ?? DEFAULT_CONFIG.tiresPerMile),
        insuranceMonthly: Number(data.insuranceMonthly ?? DEFAULT_CONFIG.insuranceMonthly),
        phoneInternetMonthly: Number(data.phoneInternetMonthly ?? DEFAULT_CONFIG.phoneInternetMonthly),
        loadBoardAppsMonthly: Number(data.loadBoardAppsMonthly ?? DEFAULT_CONFIG.loadBoardAppsMonthly),
        accountingSoftwareMonthly: Number(
          data.accountingSoftwareMonthly ?? DEFAULT_CONFIG.accountingSoftwareMonthly
        ),
        otherFixedMonthly: Number(data.otherFixedMonthly ?? DEFAULT_CONFIG.otherFixedMonthly),
        targetMilesPerMonth: Number(data.targetMilesPerMonth ?? DEFAULT_CONFIG.targetMilesPerMonth),
        minimumProfitPerMile: Number(
          data.minimumProfitPerMile ?? DEFAULT_CONFIG.minimumProfitPerMile
        ),
      });
    }
  }, [data]);

  const derived = useMemo(() => {
    const fixedMonthly =
      Number(form.insuranceMonthly || 0) +
      Number(form.phoneInternetMonthly || 0) +
      Number(form.loadBoardAppsMonthly || 0) +
      Number(form.accountingSoftwareMonthly || 0) +
      Number(form.otherFixedMonthly || 0);

    const variablePerMile =
      Number(form.fuelPricePerGallon || 0) / Math.max(Number(form.vanMpg || 1), 1) +
      Number(form.maintenancePerMile || 0) +
      Number(form.tiresPerMile || 0);

    const estimatedMonthlyVariable = variablePerMile * Number(form.targetMilesPerMonth || 0);
    const estimatedMonthlyOperating = fixedMonthly + estimatedMonthlyVariable;

    return {
      fixedMonthly,
      variablePerMile,
      estimatedMonthlyVariable,
      estimatedMonthlyOperating,
    };
  }, [form]);

  const handleChange = (field: keyof BusinessConfigState, value: string) => {
    const parsed = value === "" ? 0 : Number(value);
    setForm((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleSave = async () => {
    setSaveStatus("idle");
    setErrorMessage("");

    await updateMutation.mutateAsync({
      ...form,
    });
  };

  if (isLoading) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  if (error) {
    console.error("BusinessSettings error:", error);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración del Negocio</h1>
          <p className="text-sm text-muted-foreground">
            Ajusta costos base, costos fijos y objetivos operativos desde esta página.
          </p>
        </div>

        {error ? (
          <Badge className="w-fit bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Modo seguro
          </Badge>
        ) : (
          <Badge variant="outline" className="w-fit">
            Configuración editable
          </Badge>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-300">
          No se pudo cargar el backend. Se están mostrando valores de respaldo para que la página siga siendo usable.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Costo fijo mensual</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(derived.fixedMonthly)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Costo variable por milla</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">
              {formatCurrency(derived.variablePerMile, "/mi")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Costo variable mensual estimado</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">
              {formatCurrency(derived.estimatedMonthlyVariable)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Costo operativo mensual estimado</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(derived.estimatedMonthlyOperating)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Costos Base</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fuelPricePerGallon">Combustible por galón</Label>
            <Input
              id="fuelPricePerGallon"
              type="number"
              step="0.01"
              value={form.fuelPricePerGallon}
              onChange={(e) => handleChange("fuelPricePerGallon", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vanMpg">Rendimiento de la van (MPG)</Label>
            <Input
              id="vanMpg"
              type="number"
              step="0.1"
              value={form.vanMpg}
              onChange={(e) => handleChange("vanMpg", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenancePerMile">Mantenimiento por milla</Label>
            <Input
              id="maintenancePerMile"
              type="number"
              step="0.01"
              value={form.maintenancePerMile}
              onChange={(e) => handleChange("maintenancePerMile", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiresPerMile">Llantas por milla</Label>
            <Input
              id="tiresPerMile"
              type="number"
              step="0.01"
              value={form.tiresPerMile}
              onChange={(e) => handleChange("tiresPerMile", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos Fijos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="insuranceMonthly">Seguro mensual</Label>
            <Input
              id="insuranceMonthly"
              type="number"
              step="0.01"
              value={form.insuranceMonthly}
              onChange={(e) => handleChange("insuranceMonthly", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneInternetMonthly">Teléfono / Internet</Label>
            <Input
              id="phoneInternetMonthly"
              type="number"
              step="0.01"
              value={form.phoneInternetMonthly}
              onChange={(e) => handleChange("phoneInternetMonthly", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loadBoardAppsMonthly">Apps de load board</Label>
            <Input
              id="loadBoardAppsMonthly"
              type="number"
              step="0.01"
              value={form.loadBoardAppsMonthly}
              onChange={(e) => handleChange("loadBoardAppsMonthly", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountingSoftwareMonthly">Software contable</Label>
            <Input
              id="accountingSoftwareMonthly"
              type="number"
              step="0.01"
              value={form.accountingSoftwareMonthly}
              onChange={(e) => handleChange("accountingSoftwareMonthly", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="otherFixedMonthly">Otros costos fijos mensuales</Label>
            <Input
              id="otherFixedMonthly"
              type="number"
              step="0.01"
              value={form.otherFixedMonthly}
              onChange={(e) => handleChange("otherFixedMonthly", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objetivos Operativos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="targetMilesPerMonth">Millas objetivo por mes</Label>
            <Input
              id="targetMilesPerMonth"
              type="number"
              step="1"
              value={form.targetMilesPerMonth}
              onChange={(e) => handleChange("targetMilesPerMonth", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumProfitPerMile">Profit mínimo por milla</Label>
            <Input
              id="minimumProfitPerMile"
              type="number"
              step="0.01"
              value={form.minimumProfitPerMile}
              onChange={(e) => handleChange("minimumProfitPerMile", e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {saveStatus === "success" && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Configuración guardada correctamente.
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage || "No se pudo guardar la configuración."}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar configuración"
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lectura Rápida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Con esta configuración, tu operación estima un costo variable de{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(derived.variablePerMile, "/mi")}
            </span>{" "}
            antes de otros gastos no modelados.
          </p>
          <p>
            A tu meta de{" "}
            <span className="font-semibold text-foreground">
              {formatNumber(form.targetMilesPerMonth, " mi")}
            </span>
            , el costo operativo mensual estimado sería de{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(derived.estimatedMonthlyOperating)}
            </span>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

