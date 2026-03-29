import { useState } from "react";
import { DriverMapInteractive } from "@/components/DriverMapInteractive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Truck, AlertCircle, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function RealtimeDashboard() {
  const [activeTab, setActiveTab] = useState("map");

  // Get active drivers
  const { data: drivers, isLoading: driversLoading } = trpc.location.getAllActiveDrivers.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  // Get active loads
  const { data: loads, isLoading: loadsLoading } = trpc.loads.list.useQuery(
    { status: "assigned" },
    { refetchInterval: 5000 }
  );

  const activeDrivers = drivers || [];
  const activeLoads = loads || [];

  // Calculate statistics
  const stats = {
    activeDrivers: activeDrivers.length,
    activeLoads: activeLoads.length,
    driversWithLoad: activeDrivers.filter((d) => d.loadId).length,
    idleDrivers: activeDrivers.filter((d) => !d.loadId).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard en Tiempo Real</h1>
          <p className="text-muted-foreground mt-1">Monitoreo de choferes y cargas activas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">En vivo</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Choferes Activos</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.driversWithLoad} en carga, {stats.idleDrivers} disponibles
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cargas Activas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLoads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((stats.driversWithLoad / Math.max(stats.activeLoads, 1)) * 100)}% asignadas
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeDrivers > 0 ? Math.round((stats.driversWithLoad / stats.activeDrivers) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Utilización de choferes</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.idleDrivers}</div>
            <p className="text-xs text-muted-foreground mt-1">Listos para nueva carga</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="map">Mapa Interactivo</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <DriverMapInteractive />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Active Drivers List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Choferes Activos</CardTitle>
                <CardDescription>{activeDrivers.length} conductor{activeDrivers.length !== 1 ? "es" : ""}</CardDescription>
              </CardHeader>
              <CardContent>
                {driversLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando choferes...</div>
                ) : activeDrivers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay choferes activos</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {activeDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{driver.name}</p>
                            <p className="text-xs text-muted-foreground">{driver.email}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              driver.loadId
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                : "bg-green-500/10 text-green-600 border-green-500/30"
                            }
                          >
                            {driver.loadId ? "En Carga" : "Disponible"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>📍 {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}</div>
                          <div>⚡ {driver.speed ? `${driver.speed.toFixed(1)} km/h` : "N/A"}</div>
                          {driver.loadId && <div>📦 Carga: #{driver.loadId}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Loads List */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Cargas Activas</CardTitle>
                <CardDescription>{activeLoads.length} carga{activeLoads.length !== 1 ? "s" : ""}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando cargas...</div>
                ) : activeLoads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay cargas activas</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {activeLoads.map((load: any) => (
                      <div
                        key={load.id}
                        className="p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">Carga #{load.id}</p>
                            <p className="text-xs text-muted-foreground">{load.client}</p>
                          </div>
                          <Badge variant="secondary">{load.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>📦 {load.weight} lbs - {load.commodity}</div>
                          <div>💰 ${load.price}</div>
                          <div>
                            📍 {load.pickupLocation} → {load.deliveryLocation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
