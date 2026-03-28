import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, Save, X } from "lucide-react";

export default function BusinessSettings() {
  const utils = trpc.useUtils();
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Get config
  const { data: config, isLoading: configLoading } = trpc.businessConfig.getConfig.useQuery();

  // Get surcharges
  const { data: distanceSurcharges = [], isLoading: distanceLoading } = trpc.businessConfig.getDistanceSurcharges.useQuery();
  const { data: weightSurcharges = [], isLoading: weightLoading } = trpc.businessConfig.getWeightSurcharges.useQuery();

  // Mutations
  const updateConfigMutation = trpc.businessConfig.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuración actualizada");
      utils.businessConfig.getConfig.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createDistanceMutation = trpc.businessConfig.createDistanceSurcharge.useMutation({
    onSuccess: () => {
      toast.success("Recargo de distancia agregado");
      utils.businessConfig.getDistanceSurcharges.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateDistanceMutation = trpc.businessConfig.updateDistanceSurcharge.useMutation({
    onSuccess: () => {
      toast.success("Recargo de distancia actualizado");
      utils.businessConfig.getDistanceSurcharges.invalidate();
      setEditingId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteDistanceMutation = trpc.businessConfig.deleteDistanceSurcharge.useMutation({
    onSuccess: () => {
      toast.success("Recargo de distancia eliminado");
      utils.businessConfig.getDistanceSurcharges.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createWeightMutation = trpc.businessConfig.createWeightSurcharge.useMutation({
    onSuccess: () => {
      toast.success("Recargo de peso agregado");
      utils.businessConfig.getWeightSurcharges.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateWeightMutation = trpc.businessConfig.updateWeightSurcharge.useMutation({
    onSuccess: () => {
      toast.success("Recargo de peso actualizado");
      utils.businessConfig.getWeightSurcharges.invalidate();
      setEditingId(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteWeightMutation = trpc.businessConfig.deleteWeightSurcharge.useMutation({
    onSuccess: () => {
      toast.success("Recargo de peso eliminado");
      utils.businessConfig.getWeightSurcharges.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración del Negocio</h1>
        <p className="text-muted-foreground">Gestiona costos, metas y recargos de precios</p>
      </div>

      <Tabs defaultValue="costs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="costs">Costos Base</TabsTrigger>
          <TabsTrigger value="distance">Recargos por Distancia</TabsTrigger>
          <TabsTrigger value="weight">Recargos por Peso</TabsTrigger>
        </TabsList>

        {/* Costos Base */}
        <TabsContent value="costs" className="space-y-6">
          <CostsTab config={config} updateConfigMutation={updateConfigMutation} isSaving={isSaving} setIsSaving={setIsSaving} />
        </TabsContent>

        {/* Recargos por Distancia */}
        <TabsContent value="distance" className="space-y-6">
          <DistanceSurchargesTab
            surcharges={distanceSurcharges}
            isLoading={distanceLoading}
            editingId={editingId}
            setEditingId={setEditingId}
            createMutation={createDistanceMutation}
            updateMutation={updateDistanceMutation}
            deleteMutation={deleteDistanceMutation}
          />
        </TabsContent>

        {/* Recargos por Peso */}
        <TabsContent value="weight" className="space-y-6">
          <WeightSurchargesTab
            surcharges={weightSurcharges}
            isLoading={weightLoading}
            editingId={editingId}
            setEditingId={setEditingId}
            createMutation={createWeightMutation}
            updateMutation={updateWeightMutation}
            deleteMutation={deleteWeightMutation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Costs Tab ────────────────────────────────────────────────────────────────

function CostsTab({ config, updateConfigMutation, isSaving, setIsSaving }: any) {
  const [formData, setFormData] = useState(config);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfigMutation.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Costos de Combustible</CardTitle>
          <CardDescription>Parámetros de cálculo de costo de combustible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Precio por galón (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.fuelPricePerGallon}
                onChange={(e) => setFormData({ ...formData, fuelPricePerGallon: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Rendimiento van (mpg)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.vanMpg}
                onChange={(e) => setFormData({ ...formData, vanMpg: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos Operativos por Milla</CardTitle>
          <CardDescription>Costos variables de operación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mantenimiento (USD/mi)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.maintenancePerMile}
                onChange={(e) => setFormData({ ...formData, maintenancePerMile: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Llantas (USD/mi)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tiresPerMile}
                onChange={(e) => setFormData({ ...formData, tiresPerMile: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos Fijos Mensuales</CardTitle>
          <CardDescription>Gastos mensuales fijos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Seguro (USD/mes)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.insuranceMonthly}
                onChange={(e) => setFormData({ ...formData, insuranceMonthly: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Teléfono/Internet (USD/mes)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.phoneInternetMonthly}
                onChange={(e) => setFormData({ ...formData, phoneInternetMonthly: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Load Board / Apps (USD/mes)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.loadBoardAppsMonthly}
                onChange={(e) => setFormData({ ...formData, loadBoardAppsMonthly: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Contabilidad / Software (USD/mes)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.accountingSoftwareMonthly}
                onChange={(e) => setFormData({ ...formData, accountingSoftwareMonthly: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Otros Fijos (USD/mes)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.otherFixedMonthly}
                onChange={(e) => setFormData({ ...formData, otherFixedMonthly: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metas y Objetivos</CardTitle>
          <CardDescription>Parámetros de rentabilidad</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meta de millas mensuales</Label>
              <Input
                type="number"
                value={formData.targetMilesPerMonth}
                onChange={(e) => setFormData({ ...formData, targetMilesPerMonth: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>Ganancia mínima deseada (USD/mi)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.minimumProfitPerMile}
                onChange={(e) => setFormData({ ...formData, minimumProfitPerMile: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Distance Surcharges Tab ───────────────────────────────────────────────────

function DistanceSurchargesTab({ surcharges, isLoading, editingId, setEditingId, createMutation, updateMutation, deleteMutation }: any) {
  const [newFromMiles, setNewFromMiles] = useState("");
  const [newSurcharge, setNewSurcharge] = useState("");
  const [editFromMiles, setEditFromMiles] = useState("");
  const [editSurcharge, setEditSurcharge] = useState("");

  const handleAdd = async () => {
    if (!newFromMiles || !newSurcharge) {
      toast.error("Completa todos los campos");
      return;
    }
    await createMutation.mutateAsync({
      fromMiles: parseInt(newFromMiles),
      surchargePerMile: parseFloat(newSurcharge),
    });
    setNewFromMiles("");
    setNewSurcharge("");
  };

  const handleUpdate = async (id: number) => {
    if (!editFromMiles || !editSurcharge) {
      toast.error("Completa todos los campos");
      return;
    }
    await updateMutation.mutateAsync({
      id,
      fromMiles: parseInt(editFromMiles),
      surchargePerMile: parseFloat(editSurcharge),
    });
  };

  if (isLoading) return <Loader2 className="w-8 h-8 animate-spin" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar Nuevo Recargo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Desde millas</Label>
              <Input
                type="number"
                placeholder="0"
                value={newFromMiles}
                onChange={(e) => setNewFromMiles(e.target.value)}
              />
            </div>
            <div>
              <Label>Recargo (USD/mi)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.80"
                value={newSurcharge}
                onChange={(e) => setNewSurcharge(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={createMutation.isPending} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {surcharges.map((surcharge: any) => (
          <Card key={surcharge.id}>
            <CardContent className="pt-6">
              {editingId === surcharge.id ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Desde millas</Label>
                    <Input
                      type="number"
                      value={editFromMiles}
                      onChange={(e) => setEditFromMiles(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Recargo (USD/mi)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editSurcharge}
                      onChange={(e) => setEditSurcharge(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <Button
                      onClick={() => handleUpdate(surcharge.id)}
                      disabled={updateMutation.isPending}
                      size="sm"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Desde {surcharge.fromMiles} millas</p>
                    <p className="text-sm text-muted-foreground">${surcharge.surchargePerMile}/milla</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEditingId(surcharge.id);
                        setEditFromMiles(surcharge.fromMiles.toString());
                        setEditSurcharge(surcharge.surchargePerMile.toString());
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteMutation.mutate({ id: surcharge.id })}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Weight Surcharges Tab ─────────────────────────────────────────────────────

function WeightSurchargesTab({ surcharges, isLoading, editingId, setEditingId, createMutation, updateMutation, deleteMutation }: any) {
  const [newFromLbs, setNewFromLbs] = useState("");
  const [newSurcharge, setNewSurcharge] = useState("");
  const [editFromLbs, setEditFromLbs] = useState("");
  const [editSurcharge, setEditSurcharge] = useState("");

  const handleAdd = async () => {
    if (!newFromLbs || !newSurcharge) {
      toast.error("Completa todos los campos");
      return;
    }
    await createMutation.mutateAsync({
      fromLbs: parseInt(newFromLbs),
      surchargePerMile: parseFloat(newSurcharge),
    });
    setNewFromLbs("");
    setNewSurcharge("");
  };

  const handleUpdate = async (id: number) => {
    if (!editFromLbs || !editSurcharge) {
      toast.error("Completa todos los campos");
      return;
    }
    await updateMutation.mutateAsync({
      id,
      fromLbs: parseInt(editFromLbs),
      surchargePerMile: parseFloat(editSurcharge),
    });
  };

  if (isLoading) return <Loader2 className="w-8 h-8 animate-spin" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agregar Nuevo Recargo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Desde lbs</Label>
              <Input
                type="number"
                placeholder="0"
                value={newFromLbs}
                onChange={(e) => setNewFromLbs(e.target.value)}
              />
            </div>
            <div>
              <Label>Recargo (USD/mi)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.03"
                value={newSurcharge}
                onChange={(e) => setNewSurcharge(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={createMutation.isPending} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {surcharges.map((surcharge: any) => (
          <Card key={surcharge.id}>
            <CardContent className="pt-6">
              {editingId === surcharge.id ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Desde lbs</Label>
                    <Input
                      type="number"
                      value={editFromLbs}
                      onChange={(e) => setEditFromLbs(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Recargo (USD/mi)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editSurcharge}
                      onChange={(e) => setEditSurcharge(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <Button
                      onClick={() => handleUpdate(surcharge.id)}
                      disabled={updateMutation.isPending}
                      size="sm"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Desde {surcharge.fromLbs} lbs</p>
                    <p className="text-sm text-muted-foreground">${surcharge.surchargePerMile}/milla</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEditingId(surcharge.id);
                        setEditFromLbs(surcharge.fromLbs.toString());
                        setEditSurcharge(surcharge.surchargePerMile.toString());
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteMutation.mutate({ id: surcharge.id })}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
