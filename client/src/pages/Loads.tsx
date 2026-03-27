import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package, MapPin, Weight, DollarSign, Fuel, TrendingUp,
  TrendingDown, Pencil, Trash2, ChevronDown, Filter, Search, X, Eye, CheckCircle
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string; next?: string }> = {
  available: { label: "Disponible", className: "bg-blue-500/15 text-blue-400 border-blue-500/30", next: "in_transit" },
  in_transit: { label: "En Tránsito", className: "bg-amber-500/15 text-amber-400 border-amber-500/30", next: "delivered" },
  delivered: { label: "Entregada", className: "bg-green-500/15 text-green-400 border-green-500/30", next: "invoiced" },
  invoiced: { label: "Facturada", className: "bg-purple-500/15 text-purple-400 border-purple-500/30", next: "paid" },
  paid: { label: "Pagada", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

const STATUS_NEXT_LABEL: Record<string, string> = {
  available: "Iniciar Tránsito",
  in_transit: "Marcar Entregada",
  delivered: "Facturar",
  invoiced: "Marcar Pagada",
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default function Loads() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const utils = trpc.useUtils();
  const { data: loads, isLoading } = trpc.loads.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus } : undefined
  );

  const statusMutation = trpc.loads.updateStatus.useMutation({
    onSuccess: () => {
      utils.loads.list.invalidate();
      utils.dashboard.kpis.invalidate();
      utils.finance.transactions.invalidate();
      toast.success("Estado actualizado exitosamente");
      setShowDetails(false);
    },
    onError: (e) => {
      console.error("Error updating status:", e);
      toast.error(`Error: ${e.message}`);
    },
  });

  const deleteMutation = trpc.loads.delete.useMutation({
    onSuccess: () => {
      utils.loads.list.invalidate();
      utils.dashboard.kpis.invalidate();
      toast.success("Carga eliminada");
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter loads
  const filteredLoads = loads?.filter((load) => {
    const matchesStatus = filterStatus === "all" || load?.status === filterStatus;
    const matchesSearch = search === "" || 
      load?.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      load?.pickupAddress?.toLowerCase().includes(search.toLowerCase()) ||
      load?.deliveryAddress?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const handleStatusChange = (newStatus: string) => {
    if (selectedLoad?.id) {
      statusMutation.mutate({ id: selectedLoad.id, status: newStatus as any });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Cargas</h1>
          <p className="text-muted-foreground mt-1">Visualiza y actualiza el estado de tus cargas</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Para crear cargas, ve a</p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/quotation"}>
            Cotizaciones
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <Label className="text-xs mb-2 block">Buscar carga</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cliente, origen, destino..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background border-border"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="w-full sm:w-48">
          <Label className="text-xs mb-2 block">Filtrar por estado</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loads Table */}
      <Card className="bg-card border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando cargas...</div>
        ) : filteredLoads.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No hay cargas registradas</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Crea cargas desde Cotizaciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Ruta</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Mercancía</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Precio</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Margen</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLoads.map((load) => {
                  const statusCfg = STATUS_CONFIG[load?.status ?? 'available'] ?? STATUS_CONFIG.available;
                  const margin = parseFloat(String(load?.netMargin ?? 0));
                  const isPositive = margin >= 0;
                  return (
                    <tr key={load?.id ?? Math.random()} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{load?.clientName ?? "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-xs">{load?.pickupAddress?.split(",")[0] ?? "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                        {load?.merchandiseType ?? "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold">{formatCurrency(load?.price ?? 0)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                          {isPositive ? "+" : ""}{formatCurrency(margin)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={`text-xs border ${statusCfg.className} whitespace-nowrap`}>
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => {
                              setSelectedLoad(load);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detalles
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("¿Eliminar esta carga?")) {
                                deleteMutation.mutate({ id: load?.id ?? 0 });
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>Detalles de Carga #{selectedLoad?.id}</DialogTitle>
          </DialogHeader>

          {selectedLoad && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="text-sm font-medium mt-1">{selectedLoad.clientName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mercancía</Label>
                  <p className="text-sm font-medium mt-1">{selectedLoad.merchandiseType}</p>
                </div>
              </div>

              {/* Route */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">A</span>
                    Punto de Recogida
                  </Label>
                  <p className="text-sm font-medium mt-1">{selectedLoad.pickupAddress}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold">B</span>
                    Punto de Entrega
                  </Label>
                  <p className="text-sm font-medium mt-1">{selectedLoad.deliveryAddress}</p>
                </div>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Weight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Peso</span>
                  </div>
                  <p className="text-sm font-semibold">{selectedLoad.weight} {selectedLoad.weightUnit}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Precio</span>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(selectedLoad.price)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Fuel className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Combustible</span>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(selectedLoad.estimatedFuel)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Margen</span>
                  </div>
                  <p className={`text-sm font-semibold ${selectedLoad.netMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(selectedLoad.netMargin)}
                  </p>
                </div>
              </div>

              {/* Status Change */}
              <div className="border-t border-border pt-4">
                <Label className="text-xs text-muted-foreground">Estado Actual</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="outline" className={`text-sm border ${STATUS_CONFIG[selectedLoad.status]?.className}`}>
                    {STATUS_CONFIG[selectedLoad.status]?.label}
                  </Badge>
                  {STATUS_CONFIG[selectedLoad.status]?.next && (
                    <>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      <Button
                        onClick={() => handleStatusChange(STATUS_CONFIG[selectedLoad.status]?.next!)}
                        disabled={statusMutation.isPending}
                        size="sm"
                        className="gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {STATUS_NEXT_LABEL[selectedLoad.status]}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedLoad.notes && (
                <div className="border-t border-border pt-4">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <p className="text-sm mt-2 text-muted-foreground">{selectedLoad.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
