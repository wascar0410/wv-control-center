import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import CreateSettlementModal from "@/components/CreateSettlementModal";

export default function SettlementsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");

  const { data: settlements, isLoading, error, refetch } = trpc.settlement.getAll.useQuery(
    { limit: 50, offset: 0 },
    { retry: 1 }
  );

  const deleteSettlementMutation = trpc.settlement.delete.useMutation({
    onSuccess: () => {
      toast.success("Borrador eliminado correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "No se pudo eliminar el borrador");
    },
  });

  const handleDeleteDraft = (id: number) => {
    const confirmed = window.confirm("¿Seguro que quieres eliminar este settlement en borrador?");
    if (!confirmed) return;
    deleteSettlementMutation.mutate({ id });
  };

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
        <div className="flex items-center justify-between gap-3">
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
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted p-3 rounded">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="font-bold">{formatCurrency(settlement.totalIncome || 0)}</p>
          </div>
          <div className="bg-muted p-3 rounded">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="font-bold">{formatCurrency(settlement.totalExpenses || 0)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <p className="text-xs text-muted-foreground">Ganancia</p>
            <p className="font-bold text-green-600">
              {formatCurrency(settlement.totalProfit || 0)}
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">Distribución de Ganancias</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-xs text-muted-foreground">
                Socio 1 ({settlement.partner1Share || 50}%)
              </p>
              <p className="font-bold text-blue-600">
                {formatCurrency(settlement.partner1Amount || 0)}
              </p>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <p className="text-xs text-muted-foreground">
                Socio 2 ({settlement.partner2Share || 50}%)
              </p>
              <p className="font-bold text-purple-600">
                {formatCurrency(settlement.partner2Amount || 0)}
              </p>
            </div>
          </div>
        </div>

        {settlement.status === "draft" && (
          <div className="border-t pt-3 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteDraft(settlement.id)}
              disabled={deleteSettlementMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleteSettlementMutation.isPending ? "Eliminando..." : "Eliminar borrador"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">Aviso</p>
            <p className="text-sm text-yellow-800">
              No se pudieron cargar los settlements. Intenta recargar la página.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlements</h1>
          <p className="text-muted-foreground">
            Gestiona la distribución de ganancias entre socios
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="lg" className="gap-2">
          <DollarSign className="w-4 h-4" />
          Nuevo Settlement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{settlements?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Borradores</p>
            <p className="text-2xl font-bold text-gray-600">{draftSettlements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Calculados</p>
            <p className="text-2xl font-bold text-blue-600">{calculatedSettlements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Aprobados</p>
            <p className="text-2xl font-bold text-purple-600">{approvedSettlements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Completados</p>
            <p className="text-2xl font-bold text-green-600">{completedSettlements.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todos ({settlements?.length || 0})</TabsTrigger>
          <TabsTrigger value="draft">Borradores ({draftSettlements.length})</TabsTrigger>
          <TabsTrigger value="calculated">Calculados ({calculatedSettlements.length})</TabsTrigger>
          <TabsTrigger value="approved">Aprobados ({approvedSettlements.length})</TabsTrigger>
          <TabsTrigger value="processed">Procesados ({processedSettlements.length})</TabsTrigger>
          <TabsTrigger value="completed">Completados ({completedSettlements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {settlements && settlements.length > 0 ? (
            <div className="space-y-4">
              {settlements.map((settlement: any) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">No hay settlements</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {draftSettlements.length > 0 ? (
            <div className="space-y-4">
              {draftSettlements.map((settlement: any) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">No hay borradores</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calculated" className="space-y-4">
          {calculatedSettlements.length > 0 ? (
            <div className="space-y-4">
              {calculatedSettlements.map((settlement: any) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No hay settlements calculados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedSettlements.length > 0 ? (
            <div className="space-y-4">
              {approvedSettlements.map((settlement: any) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No hay settlements aprobados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {processedSettlements.length > 0 ? (
            <div className="space-y-4">
              {processedSettlements.map((settlement: any) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No hay settlements procesados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedSettlements.length > 0 ? (
            <div className="space-y-4">
              {completedSettlements.map((settlement: any) => (
                <SettlementCard key={settlement.id} settlement={settlement} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  No hay settlements completados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateSettlementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
