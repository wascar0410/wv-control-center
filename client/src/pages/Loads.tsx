import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Package, MapPin, Weight, DollarSign, Fuel, TrendingUp,
  TrendingDown, Pencil, Trash2, ChevronDown, Filter, Search, X
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

type LoadFormData = {
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: string;
  weightUnit: string;
  merchandiseType: string;
  price: string;
  estimatedFuel: string;
  estimatedTolls: string;
  notes: string;
  pickupDate: string;
  deliveryDate: string;
};

const EMPTY_FORM: LoadFormData = {
  clientName: "", pickupAddress: "", deliveryAddress: "",
  weight: "", weightUnit: "lbs", merchandiseType: "",
  price: "", estimatedFuel: "", estimatedTolls: "",
  notes: "", pickupDate: "", deliveryDate: "",
};

export default function Loads() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LoadFormData>(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: loads, isLoading } = trpc.loads.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus } : undefined
  );

  const createMutation = trpc.loads.create.useMutation({
    onSuccess: () => {
      utils.loads.list.invalidate();
      utils.dashboard.kpis.invalidate();
      utils.dashboard.recentLoads.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success("Carga registrada exitosamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.loads.update.useMutation({
    onSuccess: () => {
      utils.loads.list.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast.success("Carga actualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMutation = trpc.loads.updateStatus.useMutation({
    onSuccess: () => {
      utils.loads.list.invalidate();
      utils.dashboard.kpis.invalidate();
      utils.finance.transactions.invalidate();
      toast.success("Estado actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.loads.delete.useMutation({
    onSuccess: () => {
      utils.loads.list.invalidate();
      utils.dashboard.kpis.invalidate();
      toast.success("Carga eliminada");
    },
    onError: (e) => toast.error(e.message),
  });

  const price = parseFloat(form.price) || 0;
  const fuel = parseFloat(form.estimatedFuel) || 0;
  const tolls = parseFloat(form.estimatedTolls) || 0;
  const netMargin = price - fuel - tolls;

  const handleSubmit = () => {
    if (!form.clientName || !form.pickupAddress || !form.deliveryAddress || !form.price || !form.weight || !form.merchandiseType) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    const payload = {
      clientName: form.clientName,
      pickupAddress: form.pickupAddress,
      deliveryAddress: form.deliveryAddress,
      weight: parseFloat(form.weight),
      weightUnit: form.weightUnit,
      merchandiseType: form.merchandiseType,
      price: parseFloat(form.price),
      estimatedFuel: parseFloat(form.estimatedFuel) || 0,
      estimatedTolls: parseFloat(form.estimatedTolls) || 0,
      notes: form.notes || undefined,
      pickupDate: form.pickupDate || undefined,
      deliveryDate: form.deliveryDate || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (load: any) => {
    setForm({
      clientName: load.clientName ?? "",
      pickupAddress: load.pickupAddress ?? "",
      deliveryAddress: load.deliveryAddress ?? "",
      weight: String(load.weight ?? ""),
      weightUnit: load.weightUnit ?? "lbs",
      merchandiseType: load.merchandiseType ?? "",
      price: String(load.price ?? ""),
      estimatedFuel: String(load.estimatedFuel ?? ""),
      estimatedTolls: String(load.estimatedTolls ?? ""),
      notes: load.notes ?? "",
      pickupDate: load.pickupDate ? new Date(load.pickupDate).toISOString().slice(0, 16) : "",
      deliveryDate: load.deliveryDate ? new Date(load.deliveryDate).toISOString().slice(0, 16) : "",
    });
    setEditingId(load.id);
    setShowForm(true);
  };

  const filteredLoads = (loads ?? []).filter((l) =>
    search === "" ||
    l.clientName.toLowerCase().includes(search.toLowerCase()) ||
    l.pickupAddress.toLowerCase().includes(search.toLowerCase()) ||
    l.deliveryAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Cargas</h1>
          <p className="text-sm text-muted-foreground mt-1">Registra y administra todos los envíos</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }} className="gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Nueva Carga
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44 bg-card border-border">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loads Table */}
      <Card className="bg-card border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Cargando...</div>
        ) : filteredLoads.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No hay cargas registradas</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Crea tu primera carga para comenzar</p>
            <Button variant="outline" className="mt-4" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Registrar Carga
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
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
                            <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{load?.clientName ?? 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{load?.weight ?? 'N/A'} {load?.weightUnit ?? 'lbs'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-muted-foreground space-y-0.5 max-w-[180px]">
                          <p className="truncate"><span className="text-green-400">A</span> {load?.pickupAddress ?? 'N/A'}</p>
                          <p className="truncate"><span className="text-red-400">B</span> {load?.deliveryAddress ?? 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{load?.merchandiseType ?? 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-foreground">{formatCurrency(load?.price ?? 0)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}>
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
                          {statusCfg.next && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 hidden sm:flex"
                              onClick={() => statusMutation.mutate({ id: load?.id ?? 0, status: statusCfg.next as any })}
                              disabled={statusMutation.isPending}
                            >
                              {STATUS_NEXT_LABEL[load?.status ?? 'available']}
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(load ?? {} as any)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("¿Eliminar esta carga?")) deleteMutation.mutate({ id: load?.id ?? 0 }); }}
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

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Carga" : "Nueva Carga"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Client */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input
                placeholder="Nombre del cliente"
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                className="bg-background border-border"
              />
            </div>

            {/* Route */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center font-bold">A</span>
                  Punto de Recogida *
                </Label>
                <Input
                  placeholder="Dirección de recogida"
                  value={form.pickupAddress}
                  onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold">B</span>
                  Punto de Entrega *
                </Label>
                <Input
                  placeholder="Dirección de entrega"
                  value={form.deliveryAddress}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Cargo Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Peso *</Label>
                <Input
                  type="number" placeholder="0"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select value={form.weightUnit} onValueChange={(v) => setForm((f) => ({ ...f, weightUnit: v }))}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="tons">tons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Tipo de Mercancía *</Label>
                <Input
                  placeholder="Ej: Electrónicos, Alimentos..."
                  value={form.merchandiseType}
                  onChange={(e) => setForm((f) => ({ ...f, merchandiseType: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Pricing Calculator */}
            <div className="rounded-xl bg-background border border-border p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Calculadora de Rentabilidad
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Precio de la Carga ($) *</Label>
                  <Input
                    type="number" placeholder="0.00"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Fuel className="w-3 h-3" /> Est. Combustible ($)
                  </Label>
                  <Input
                    type="number" placeholder="0.00"
                    value={form.estimatedFuel}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedFuel: e.target.value }))}
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Est. Peajes ($)</Label>
                  <Input
                    type="number" placeholder="0.00"
                    value={form.estimatedTolls}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedTolls: e.target.value }))}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              {/* Net Margin Display */}
              {price > 0 && (
                <div className={`flex items-center justify-between rounded-lg p-3 ${netMargin >= 0 ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  <div className="flex items-center gap-2">
                    {netMargin >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium text-foreground">Margen Neto Estimado</span>
                  </div>
                  <span className={`text-lg font-bold ${netMargin >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {netMargin >= 0 ? "+" : ""}{formatCurrency(netMargin)}
                  </span>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Recogida</Label>
                <Input
                  type="datetime-local"
                  value={form.pickupDate}
                  onChange={(e) => setForm((f) => ({ ...f, pickupDate: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Entrega Estimada</Label>
                <Input
                  type="datetime-local"
                  value={form.deliveryDate}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Instrucciones especiales, observaciones..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-background border-border resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editingId ? "Actualizar" : "Registrar Carga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
