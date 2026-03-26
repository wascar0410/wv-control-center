import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Users, DollarSign, Plus, TrendingUp, Wallet, History,
  PieChart, Pencil, ArrowDownLeft, Calculator
} from "lucide-react";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("es-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Partnership() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);

  const [partnerForm, setPartnerForm] = useState({ partnerName: "", partnerRole: "", participationPercent: "" });
  const [drawForm, setDrawForm] = useState({ partnerId: "", amount: "", notes: "" });

  const utils = trpc.useUtils();
  const { data: partners, isLoading: partnersLoading } = trpc.partnership.list.useQuery();
  const { data: distribution, isLoading: distLoading } = trpc.partnership.distribution.useQuery(
    { year: selectedYear, month: selectedMonth }
  );
  const { data: draws, isLoading: drawsLoading } = trpc.partnership.draws.useQuery(
    selectedPartnerId ? { partnerId: selectedPartnerId } : undefined
  );

  const createPartnerMutation = trpc.partnership.create.useMutation({
    onSuccess: () => {
      utils.partnership.list.invalidate();
      utils.partnership.distribution.invalidate();
      setShowPartnerForm(false);
      setPartnerForm({ partnerName: "", partnerRole: "", participationPercent: "" });
      toast.success("Socio registrado exitosamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePartnerMutation = trpc.partnership.update.useMutation({
    onSuccess: () => {
      utils.partnership.list.invalidate();
      utils.partnership.distribution.invalidate();
      setShowPartnerForm(false);
      setEditingPartner(null);
      setPartnerForm({ partnerName: "", partnerRole: "", participationPercent: "" });
      toast.success("Socio actualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const createDrawMutation = trpc.partnership.createDraw.useMutation({
    onSuccess: () => {
      utils.partnership.draws.invalidate();
      setShowDrawForm(false);
      setDrawForm({ partnerId: "", amount: "", notes: "" });
      toast.success("Retiro registrado exitosamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSavePartner = () => {
    if (!partnerForm.partnerName || !partnerForm.partnerRole || !partnerForm.participationPercent) {
      toast.error("Completa todos los campos");
      return;
    }
    const percent = parseFloat(partnerForm.participationPercent);
    if (percent < 0 || percent > 100) { toast.error("El porcentaje debe estar entre 0 y 100"); return; }

    if (editingPartner) {
      updatePartnerMutation.mutate({ id: editingPartner.id, ...partnerForm, participationPercent: percent });
    } else {
      createPartnerMutation.mutate({ ...partnerForm, participationPercent: percent });
    }
  };

  const handleCreateDraw = () => {
    if (!drawForm.partnerId || !drawForm.amount) { toast.error("Selecciona socio y monto"); return; }
    const period = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    createDrawMutation.mutate({
      partnerId: parseInt(drawForm.partnerId),
      amount: parseFloat(drawForm.amount),
      period,
      notes: drawForm.notes || undefined,
    });
  };

  const handleEditPartner = (partner: any) => {
    setPartnerForm({
      partnerName: partner.partnerName,
      partnerRole: partner.partnerRole,
      participationPercent: String(partner.participationPercent),
    });
    setEditingPartner(partner);
    setShowPartnerForm(true);
  };

  const totalPercent = (partners ?? []).reduce((sum, p) => sum + parseFloat(String(p?.participationPercent ?? 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Socios y Pagos</h1>
          <p className="text-sm text-muted-foreground mt-1">Distribución de utilidades y retiros de socios</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="distribution">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="distribution" className="gap-2">
            <Calculator className="w-4 h-4" /> Distribución
          </TabsTrigger>
          <TabsTrigger value="partners" className="gap-2">
            <Users className="w-4 h-4" /> Socios
          </TabsTrigger>
          <TabsTrigger value="draws" className="gap-2">
            <History className="w-4 h-4" /> Retiros
          </TabsTrigger>
        </TabsList>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-5 mt-5">
          {/* Financial Summary */}
          {distLoading ? (
            <div className="p-8 text-center text-muted-foreground">Calculando distribución...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryCard label="Ingreso Bruto" value={formatCurrency(distribution?.grossIncome ?? 0)} color="text-green-400" bg="bg-green-500/10" />
                <SummaryCard label="Gastos Totales" value={formatCurrency(distribution?.totalExpenses ?? 0)} color="text-red-400" bg="bg-red-500/10" />
                <SummaryCard label="Nómina" value={formatCurrency(distribution?.payroll ?? 0)} color="text-amber-400" bg="bg-amber-500/10" />
                <SummaryCard label="Utilidad Neta" value={formatCurrency(distribution?.netAfterPayroll ?? 0)} color="text-primary" bg="bg-primary/10" highlight />
              </div>

              {/* Formula */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    Fórmula de Distribución — {MONTHS[selectedMonth - 1]} {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl bg-background border border-border p-4 space-y-3 font-mono text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ingreso Bruto</span>
                      <span className="text-green-400 font-semibold">{formatCurrency(distribution?.grossIncome ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">− Gastos Operativos</span>
                      <span className="text-red-400 font-semibold">−{formatCurrency((distribution?.totalExpenses ?? 0) - (distribution?.payroll ?? 0))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">− Nómina (Payroll)</span>
                      <span className="text-amber-400 font-semibold">−{formatCurrency(distribution?.payroll ?? 0)}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between items-center">
                      <span className="text-foreground font-semibold">= Utilidad Neta para Socios</span>
                      <span className="text-primary font-bold text-base">{formatCurrency(distribution?.netAfterPayroll ?? 0)}</span>
                    </div>
                  </div>

                  {/* Partner Distribution */}
                  {(distribution?.partners ?? []).length > 0 ? (
                    <div className="mt-5 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Distribución por Socio</h4>
                      {distribution?.partners?.map((partner) => (
                        <div key={partner.id} className="rounded-xl bg-background border border-border p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                                <span className="text-sm font-bold text-primary">
                                  {partner.partnerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{partner.partnerName}</p>
                                <p className="text-xs text-muted-foreground">{partner.partnerRole}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">{formatCurrency(partner.distribution)}</p>
                              <p className="text-xs text-muted-foreground">{parseFloat(String(partner.participationPercent))}% de participación</p>
                            </div>
                          </div>
                          <Progress value={parseFloat(String(partner.participationPercent))} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 text-center py-6">
                      <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No hay socios configurados</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowPartnerForm(true)}>
                        Agregar Socio
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Register Draw Button */}
              {(distribution?.partners ?? []).length > 0 && (
                <Button
                  onClick={() => setShowDrawForm(true)}
                  className="gap-2 w-full sm:w-auto"
                  variant="outline"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Registrar Retiro (Owner's Draw)
                </Button>
              )}
            </>
          )}
        </TabsContent>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-5 mt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total de participación configurada: <span className={`font-semibold ${totalPercent === 100 ? "text-green-400" : "text-amber-400"}`}>{totalPercent}%</span>
                {totalPercent !== 100 && <span className="text-amber-400 ml-1">(debe sumar 100%)</span>}
              </p>
            </div>
            <Button onClick={() => { setEditingPartner(null); setPartnerForm({ partnerName: "", partnerRole: "", participationPercent: "" }); setShowPartnerForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Agregar Socio
            </Button>
          </div>

          {partnersLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : (partners ?? []).length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No hay socios registrados</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowPartnerForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar Primer Socio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(partners ?? []).map((partner) => (
                <Card key={partner.id} className="bg-card border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {partner.partnerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{partner.partnerName}</p>
                          <p className="text-sm text-muted-foreground">{partner.partnerRole}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditPartner(partner)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Participación</span>
                        <span className="font-bold text-primary">{parseFloat(String(partner.participationPercent))}%</span>
                      </div>
                      <Progress value={parseFloat(String(partner.participationPercent))} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Draws Tab */}
        <TabsContent value="draws" className="space-y-5 mt-5">
          <div className="flex items-center justify-between">
            <div>
              <Select value={selectedPartnerId ? String(selectedPartnerId) : "all"} onValueChange={(v) => setSelectedPartnerId(v === "all" ? null : parseInt(v))}>
                <SelectTrigger className="w-48 bg-card border-border">
                  <SelectValue placeholder="Todos los socios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los socios</SelectItem>
                  {(partners ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.partnerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowDrawForm(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Registrar Retiro
            </Button>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {drawsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Cargando...</div>
              ) : (draws ?? []).length === 0 ? (
                <div className="p-12 text-center">
                  <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay retiros registrados</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {(draws ?? []).map((draw) => {
                    const partner = (partners ?? []).find((p) => p.id === draw.partnerId);
                    return (
                      <div key={draw.id} className="flex items-center gap-3 px-6 py-4 hover:bg-accent/20 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{partner?.partnerName ?? "Socio"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(draw.drawDate)} · Período: {draw.period}
                            {draw.notes && ` · ${draw.notes}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-amber-400">−{formatCurrency(parseFloat(String(draw.amount)))}</p>
                          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 mt-0.5">Retiro</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Partner Form Dialog */}
      <Dialog open={showPartnerForm} onOpenChange={(open) => { if (!open) { setShowPartnerForm(false); setEditingPartner(null); } }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingPartner ? "Editar Socio" : "Agregar Socio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre del Socio *</Label>
              <Input
                placeholder="Nombre completo"
                value={partnerForm.partnerName}
                onChange={(e) => setPartnerForm((f) => ({ ...f, partnerName: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Input
                placeholder="Ej: Gestor de Oficina, Operador/Chofer"
                value={partnerForm.partnerRole}
                onChange={(e) => setPartnerForm((f) => ({ ...f, partnerRole: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Porcentaje de Participación (%) *</Label>
              <Input
                type="number" min="0" max="100" placeholder="50"
                value={partnerForm.participationPercent}
                onChange={(e) => setPartnerForm((f) => ({ ...f, participationPercent: e.target.value }))}
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">Total actual: {totalPercent}% (debe sumar 100%)</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowPartnerForm(false); setEditingPartner(null); }}>Cancelar</Button>
            <Button onClick={handleSavePartner} disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}>
              {createPartnerMutation.isPending || updatePartnerMutation.isPending ? "Guardando..." : editingPartner ? "Actualizar" : "Agregar Socio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draw Form Dialog */}
      <Dialog open={showDrawForm} onOpenChange={setShowDrawForm}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Registrar Retiro (Owner's Draw)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Socio *</Label>
              <Select value={drawForm.partnerId} onValueChange={(v) => setDrawForm((f) => ({ ...f, partnerId: v }))}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Seleccionar socio" />
                </SelectTrigger>
                <SelectContent>
                  {(partners ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.partnerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto del Retiro ($) *</Label>
              <Input
                type="number" placeholder="0.00"
                value={drawForm.amount}
                onChange={(e) => setDrawForm((f) => ({ ...f, amount: e.target.value }))}
                className="bg-background border-border"
              />
              {drawForm.partnerId && distribution && (
                <p className="text-xs text-muted-foreground">
                  Distribución calculada para {MONTHS[selectedMonth - 1]}:{" "}
                  <span className="text-primary font-semibold">
                    {formatCurrency(distribution?.partners?.find((p) => p?.id === parseInt(drawForm.partnerId))?.distribution ?? 0)}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                placeholder="Motivo del retiro..."
                value={drawForm.notes}
                onChange={(e) => setDrawForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="rounded-lg bg-background border border-border p-3 text-xs text-muted-foreground">
              Período: <span className="text-foreground font-medium">{MONTHS[selectedMonth - 1]} {selectedYear}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDrawForm(false)}>Cancelar</Button>
            <Button onClick={handleCreateDraw} disabled={createDrawMutation.isPending}>
              {createDrawMutation.isPending ? "Registrando..." : "Registrar Retiro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, color, bg, highlight }: { label: string; value: string; color: string; bg: string; highlight?: boolean }) {
  return (
    <Card className={`bg-card border-border ${highlight ? "ring-1 ring-primary/30" : ""}`}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
