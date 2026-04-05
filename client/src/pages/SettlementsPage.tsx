import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import CreateSettlementModal from "@/components/CreateSettlementModal";

export default function SettlementsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");

  // Fetch settlements
  const { data: settlements, isLoading, refetch } = trpc.settlement.getAll.useQuery({ limit: 50, offset: 0 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando settlements...</p>
        </div>
      </div>
    );
  }

  // Filter settlements by status
  const draftSettlements = settlements?.filter((s) => s.status === "draft") || [];
  const calculatedSettlements = settlements?.filter((s) => s.status === "calculated") || [];
  const approvedSettlements = settlements?.filter((s) => s.status === "approved") || [];
  const processedSettlements = settlements?.filter((s) => s.status === "processed") || [];
  const completedSettlements = settlements?.filter((s) => s.status === "completed") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Borrador</Badge>;
      case "calculated":
        return <Badge variant="secondary">Calculado</Badge>;
      case "approved":
        return <Badge className="bg-blue-600">Aprobado</Badge>;
      case "processed":
        return <Badge className="bg-purple-600">Procesado</Badge>;
      case "completed":
        return <Badge className="bg-green-600">Completado</Badge>;
      case "disputed":
        return <Badge variant="destructive">Disputado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const SettlementCard = ({ settlement }: { settlement: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Período {settlement.settlementPeriod}</CardTitle>
            <CardDescription>
              {new Date(settlement.startDate).toLocaleDateString("es-ES")} -{" "}
              {new Date(settlement.endDate).toLocaleDateString("es-ES")}
            </CardDescription>
          </div>
          {getStatusBadge(settlement.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted p-3 rounded">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="font-bold">{formatCurrency(settlement.totalIncome)}</p>
          </div>
          <div className="bg-muted p-3 rounded">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="font-bold">{formatCurrency(settlement.totalExpenses)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <p className="text-xs text-muted-foreground">Ganancia</p>
            <p className="font-bold text-green-600">{formatCurrency(settlement.totalProfit)}</p>
          </div>
        </div>

        {/* Partner Distribution */}
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">Distribución de Ganancias</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-xs text-muted-foreground">Socio 1 ({settlement.partner1Share}%)</p>
              <p className="font-bold text-blue-600">{formatCurrency(settlement.partner1Amount)}</p>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <p className="text-xs text-muted-foreground">Socio 2 ({settlement.partner2Share}%)</p>
              <p className="font-bold text-purple-600">{formatCurrency(settlement.partner2Amount)}</p>
            </div>
          </div>
        </div>

        {/* Cargas */}
        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground">{settlement.totalLoadsCompleted} cargas incluidas</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          {settlement.status === "draft" && (
            <>
              <Button size="sm" variant="outline" className="flex-1">
                Agregar Cargas
              </Button>
              <Button size="sm" className="flex-1">
                Calcular
              </Button>
            </>
          )}
          {settlement.status === "calculated" && (
            <Button size="sm" className="w-full">
              Aprobar
            </Button>
          )}
          {settlement.status === "approved" && (
            <Button size="sm" className="w-full">
              Procesar
            </Button>
          )}
          {settlement.status === "processed" && (
            <Button size="sm" className="w-full">
              Completar
            </Button>
          )}
          {settlement.status === "completed" && (
            <Button size="sm" variant="outline" className="w-full">
              Ver Detalles
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlements</h1>
          <p className="text-muted-foreground">Gestiona la distribución de ganancias entre socios</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2">
          <DollarSign className="w-4 h-4" />
          Nuevo Settlement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{draftSettlements.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{calculatedSettlements.length + approvedSettlements.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              En Proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{processedSettlements.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Completados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{completedSettlements.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todos ({settlements?.length || 0})</TabsTrigger>
          <TabsTrigger value="draft">Borradores ({draftSettlements.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({calculatedSettlements.length + approvedSettlements.length})</TabsTrigger>
          <TabsTrigger value="processing">Procesando ({processedSettlements.length})</TabsTrigger>
          <TabsTrigger value="completed">Completados ({completedSettlements.length})</TabsTrigger>
        </TabsList>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-4">
          {settlements && settlements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settlements.map((settlement) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No hay settlements aún</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Draft Tab */}
        <TabsContent value="draft" className="space-y-4">
          {draftSettlements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftSettlements.map((settlement) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No hay borradores</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          {(calculatedSettlements.length > 0 || approvedSettlements.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...calculatedSettlements, ...approvedSettlements].map((settlement) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No hay settlements pendientes</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-4">
          {processedSettlements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedSettlements.map((settlement) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No hay settlements en proceso</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          {completedSettlements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedSettlements.map((settlement) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No hay settlements completados</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Settlement Modal */}
      {showCreateModal && (
        <CreateSettlementModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
