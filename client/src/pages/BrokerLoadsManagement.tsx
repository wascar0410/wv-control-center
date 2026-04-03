import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Filter, ArrowRight, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
  converted: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  reviewed: "Revisado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  expired: "Expirado",
  converted: "Convertido",
};

const VERDICT_COLORS: Record<string, string> = {
  ACEPTAR: "bg-green-50 border-green-200 text-green-800",
  NEGOCIAR: "bg-amber-50 border-amber-200 text-amber-800",
  RECHAZAR: "bg-red-50 border-red-200 text-red-800",
};

export default function BrokerLoadsManagement() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    data: loads,
    isLoading: loadsLoading,
    error: loadsError,
    refetch,
  } = trpc.brokerLoads.getLoads.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const updateLoadMutation = trpc.brokerLoads.updateLoad.useMutation();
  const deleteLoadMutation = trpc.brokerLoads.deleteLoad.useMutation();
  const createQuotationMutation = trpc.quotation.calculateQuotation.useMutation();

  const safeLoads = Array.isArray(loads) ? loads : [];

  const filteredLoads = useMemo(() => {
    return safeLoads.filter((load: any) => {
      const matchesStatus = !status || load.status === status;
      const matchesSearch =
        !search ||
        String(load.pickupAddress || "").toLowerCase().includes(search.toLowerCase()) ||
        String(load.deliveryAddress || "").toLowerCase().includes(search.toLowerCase()) ||
        String(load.brokerName || "").toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [safeLoads, search, status]);

  const handleConvertToQuotation = async () => {
    if (!selectedLoad) return;

    setIsLoading(true);
    try {
      await createQuotationMutation.mutateAsync({
        vanAddress: "Current Location",
        vanLat: 0,
        vanLng: 0,
        pickupAddress: selectedLoad.pickupAddress,
        deliveryAddress: selectedLoad.deliveryAddress,
        pickupLat: selectedLoad.pickupLat || 0,
        pickupLng: selectedLoad.pickupLng || 0,
        deliveryLat: selectedLoad.deliveryLat || 0,
        deliveryLng: selectedLoad.deliveryLng || 0,
        weight: Number(selectedLoad.weight || 0),
        weightUnit: "lbs",
        cargoDescription: selectedLoad.commodity || undefined,
        ratePerMile:
          Number(selectedLoad.offeredRate || 0) /
          Math.max(Number(selectedLoad.calculatedDistance || 1), 1),
        offeredPrice: Number(selectedLoad.offeredRate || 0),
        fuelSurcharge: 0,
        includeReturnEmpty: false,
      });

      await updateLoadMutation.mutateAsync({
        id: selectedLoad.id,
        status: "converted",
      });

      toast.success("Carga convertida a cotización exitosamente");
      setIsConvertDialogOpen(false);
      setSelectedLoad(null);
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Error al convertir a cotización");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta carga?")) return;

    try {
      await deleteLoadMutation.mutateAsync({ id });
      toast.success("Carga eliminada");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Error al eliminar");
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await updateLoadMutation.mutateAsync({
        id,
        status: newStatus as any,
      });
      toast.success("Estado actualizado");
      await refetch();
    } catch (error: any) {
      toast.error(error?.message || "Error al actualizar");
    }
  };

  if (loadsError) {
    console.error("BrokerLoadsManagement loads error:", loadsError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Cargas Importadas</h1>
        <p className="text-muted-foreground mt-2">
          Revisa, filtra y convierte cargas importadas a cotizaciones.
        </p>
      </div>

      {loadsError && (
        <div className="text-sm text-yellow-600 dark:text-yellow-400">
          Algunas funciones están en modo seguro. Si ves datos vacíos, es por auth o backend pendiente.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cargas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{safeLoads.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nuevas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {safeLoads.filter((l: any) => l.status === "new").length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aceptadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {safeLoads.filter((l: any) => l.status === "accepted").length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Convertidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {safeLoads.filter((l: any) => l.status === "converted").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por dirección o broker..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={status || "all"} onValueChange={(val) => setStatus(val === "all" ? "" : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="new">Nuevo</SelectItem>
                <SelectItem value="reviewed">Revisado</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="converted">Convertido</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-end">
              <p className="text-sm text-muted-foreground">
                {filteredLoads.length} de {safeLoads.length} cargas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cargas Importadas</CardTitle>
          <CardDescription>
            {filteredLoads.length === 0 ? "No hay cargas que coincidan con los filtros" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLoads.length === 0 ? (
            <Alert>
              <AlertDescription>
                No hay cargas importadas. Comienza importando desde la página de Importar Cargas.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Broker</TableHead>
                    <TableHead>Recogida</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead className="text-right">Peso (lbs)</TableHead>
                    <TableHead className="text-right">Tarifa ($)</TableHead>
                    <TableHead>Veredicto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoads.map((load: any) => (
                    <TableRow key={load.id} className="cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="button"], [data-no-nav]')) return; setLocation(`/loads/${load.id}`); }}>
                      <TableCell className="font-medium capitalize">
                        {load.brokerName}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {load.pickupAddress}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {load.deliveryAddress}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(load.weight || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(load.offeredRate || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={VERDICT_COLORS[load.verdict] || "bg-gray-100 text-gray-800"}>
                          {load.verdict || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[load.status] || "bg-gray-100 text-gray-800"}>
                          {STATUS_LABELS[load.status] || load.status || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLoad(load)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalles de Carga</DialogTitle>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-4 py-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Broker</p>
                                <p className="font-semibold capitalize">{load.brokerName}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">ID Broker</p>
                                <p className="font-semibold">{load.brokerId || "N/A"}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-sm text-muted-foreground">Recogida</p>
                                <p className="font-semibold">{load.pickupAddress}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-sm text-muted-foreground">Entrega</p>
                                <p className="font-semibold">{load.deliveryAddress}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Peso</p>
                                <p className="font-semibold">
                                  {Number(load.weight || 0).toLocaleString()} lbs
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Mercancía</p>
                                <p className="font-semibold">{load.commodity || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Tarifa Ofrecida</p>
                                <p className="font-semibold">
                                  ${Number(load.offeredRate || 0).toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Distancia</p>
                                <p className="font-semibold">
                                  {load.calculatedDistance
                                    ? `${Number(load.calculatedDistance).toFixed(1)} mi`
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Veredicto</p>
                                <Badge className={VERDICT_COLORS[load.verdict] || "bg-gray-100 text-gray-800"}>
                                  {load.verdict || "N/A"}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Estado</p>
                                <Badge className={STATUS_COLORS[load.status] || "bg-gray-100 text-gray-800"}>
                                  {STATUS_LABELS[load.status] || load.status || "N/A"}
                                </Badge>
                              </div>
                              {load.pickupDate && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Fecha Recogida</p>
                                  <p className="font-semibold">
                                    {new Date(load.pickupDate).toLocaleDateString("es-ES")}
                                  </p>
                                </div>
                              )}
                              {load.deliveryDate && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Fecha Entrega</p>
                                  <p className="font-semibold">
                                    {new Date(load.deliveryDate).toLocaleDateString("es-ES")}
                                  </p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {load.status !== "converted" && (
                          <Dialog
                            open={isConvertDialogOpen && selectedLoad?.id === load.id}
                            onOpenChange={setIsConvertDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLoad(load);
                                  setIsConvertDialogOpen(true);
                                }}
                                title="Convertir a cotización"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>

                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Convertir a Cotización</DialogTitle>
                                <DialogDescription>
                                  Esta carga se convertirá en una cotización oficial en el sistema.
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4 py-4">
                                <div>
                                  <p className="text-sm font-medium">Recogida</p>
                                  <p className="text-sm text-muted-foreground">
                                    {load.pickupAddress}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Entrega</p>
                                  <p className="text-sm text-muted-foreground">
                                    {load.deliveryAddress}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">Tarifa Propuesta</p>
                                  <p className="text-lg font-semibold">
                                    ${Number(load.offeredRate || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsConvertDialogOpen(false);
                                    setSelectedLoad(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={handleConvertToQuotation}
                                  disabled={isLoading}
                                >
                                  {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  Convertir
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(load.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
