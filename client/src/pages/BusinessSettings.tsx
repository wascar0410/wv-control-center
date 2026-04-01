import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BusinessSettings() {
  const { data, error, isLoading } = trpc.businessConfig.getConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  if (error) {
    console.error("BusinessSettings error:", error);
  }

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

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-3xl font-bold">Configuración del Negocio</h1>

      {error && (
        <div className="text-yellow-500">
          Modo seguro (backend no disponible)
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Costos Base</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Combustible: ${config.fuelPricePerGallon}</p>
          <p>MPG: {config.vanMpg}</p>
          <p>Mantenimiento: ${config.maintenancePerMile}/mi</p>
          <p>Llantas: ${config.tiresPerMile}/mi</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos Fijos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Seguro: ${config.insuranceMonthly}</p>
          <p>Apps: ${config.loadBoardAppsMonthly}</p>
          <p>Software: ${config.accountingSoftwareMonthly}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objetivos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Millas/mes: {config.targetMilesPerMonth}</p>
          <p>Profit mínimo: ${config.minimumProfitPerMile}/mi</p>
        </CardContent>
      </Card>
    </div>
  );
}
