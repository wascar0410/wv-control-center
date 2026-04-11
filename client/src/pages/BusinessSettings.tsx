import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatCurrency(value: number, suffix = "") {
  return `$${Number(value || 0).toFixed(2)}${suffix}`;
}

function formatNumber(value: number, suffix = "") {
  return `${Number(value || 0).toLocaleString()}${suffix}`;
}

export default function BusinessSettings() {
  const { data, error, isLoading } = trpc.businessConfig.getConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const config = data || {
    fuelPricePerGallon: 3.6,
    vanMpg: 18,
    maintenancePerMile: 0.12,
    tiresPerMile: 0.03,
    insuranceMonthly: 450,
    loadBoardAppsMonthly: 45,
    accountingSoftwareMonthly: 30,
    targetMilesPerMonth: 4000,
    minimumProfitPerMile: 1.5,
  };

  const derived = useMemo(() => {
    const fixedMonthly =
      Number(config.insuranceMonthly || 0) +
      Number(config.loadBoardAppsMonthly || 0) +
      Number(config.accountingSoftwareMonthly || 0);

    const variablePerMile =
      (Number(config.fuelPricePerGallon || 0) / Math.max(Number(config.vanMpg || 1), 1)) +
      Number(config.maintenancePerMile || 0) +
      Number(config.tiresPerMile || 0);

    const estimatedMonthlyVariable =
      variablePerMile * Number(config.targetMilesPerMonth || 0);

    const estimatedMonthlyOperating =
      fixedMonthly + estimatedMonthlyVariable;

    return {
      fixedMonthly,
      variablePerMile,
      estimatedMonthlyVariable,
      estimatedMonthlyOperating,
    };
  }, [config]);

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
            Vista de referencia para costos base, costos fijos y objetivos operativos.
          </p>
        </div>

        {error ? (
          <Badge className="w-fit bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Modo seguro
          </Badge>
        ) : (
          <Badge variant="outline" className="w-fit">
            Configuración activa
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
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Combustible por galón</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(config.fuelPricePerGallon)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Rendimiento de la van</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(config.vanMpg, " MPG")}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Mantenimiento por milla</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(config.maintenancePerMile, "/mi")}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Llantas por milla</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(config.tiresPerMile, "/mi")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos Fijos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Seguro mensual</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(config.insuranceMonthly)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Apps de load board</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(config.loadBoardAppsMonthly)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Software contable</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(config.accountingSoftwareMonthly)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objetivos Operativos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Millas objetivo por mes</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(config.targetMilesPerMonth, " mi")}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Profit mínimo por milla</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(config.minimumProfitPerMile, "/mi")}
            </p>
          </div>
        </CardContent>
      </Card>

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
              {formatNumber(config.targetMilesPerMonth, " mi")}
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
