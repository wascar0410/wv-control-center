import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, FileUp } from "lucide-react";
import { toast } from "sonner";

export default function ImportBrokerLoads() {
  const [activeTab, setActiveTab] = useState("manual");
  const [brokerName, setBrokerName] = useState<"coyote" | "dat" | "manual" | "other">("manual");
  const [isLoading, setIsLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const [manualForm, setManualForm] = useState({
    brokerId: "",
    pickupAddress: "",
    deliveryAddress: "",
    pickupLat: "",
    pickupLng: "",
    deliveryLat: "",
    deliveryLng: "",
    weight: "",
    commodity: "",
    offeredRate: "",
    pickupDate: "",
    deliveryDate: "",
  });

  const importLoadMutation = trpc.brokerLoads.importLoad.useMutation();
  const importCSVMutation = trpc.brokerLoads.importLoadsFromCSV.useMutation();

  const {
    data: syncLogs,
    error: syncLogsError,
    refetch: refetchSyncLogs,
  } = trpc.brokerLoads.getSyncLogs.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const safeSyncLogs = Array.isArray(syncLogs) ? syncLogs : [];

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await importLoadMutation.mutateAsync({
        brokerName,
        brokerId: manualForm.brokerId || undefined,
        pickupAddress: manualForm.pickupAddress,
        deliveryAddress: manualForm.deliveryAddress,
        pickupLat: manualForm.pickupLat ? parseFloat(manualForm.pickupLat) : undefined,
        pickupLng: manualForm.pickupLng ? parseFloat(manualForm.pickupLng) : undefined,
        deliveryLat: manualForm.deliveryLat ? parseFloat(manualForm.deliveryLat) : undefined,
        deliveryLng: manualForm.deliveryLng ? parseFloat(manualForm.deliveryLng) : undefined,
        weight: parseFloat(manualForm.weight),
        commodity: manualForm.commodity || undefined,
        offeredRate: parseFloat(manualForm.offeredRate),
        pickupDate: manualForm.pickupDate ? new Date(manualForm.pickupDate) : undefined,
        deliveryDate: manualForm.deliveryDate ? new Date(manualForm.deliveryDate) : undefined,
      });

      toast.success("Carga importada exitosamente");
      setManualForm({
        brokerId: "",
        pickupAddress: "",
        deliveryAddress: "",
        pickupLat: "",
        pickupLng: "",
        deliveryLat: "",
        deliveryLng: "",
        weight: "",
        commodity: "",
        offeredRate: "",
        pickupDate: "",
        deliveryDate: "",
      });
      refetchSyncLogs();
    } catch (error: any) {
      toast.error(error?.message || "Error al importar carga");
    } finally {
      setIsLoading(false);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length === 0) {
          setCsvPreview([]);
          setCsvErrors(["El archivo CSV está vacío"]);
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

        const errors: string[] = [];
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());

          if (values.length < 4) {
            errors.push(`Fila ${i + 1}: faltan columnas requeridas`);
            continue;
          }

          const row: any = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });

          if (!row.pickupaddress || !row.deliveryaddress || !row.weight || !row.offeredrate) {
            errors.push(
              `Fila ${i + 1}: faltan campos requeridos (pickupAddress, deliveryAddress, weight, offeredRate)`
            );
            continue;
          }

          const parsedWeight = parseFloat(row.weight);
          const parsedRate = parseFloat(row.offeredrate);

          if (Number.isNaN(parsedWeight) || Number.isNaN(parsedRate)) {
            errors.push(`Fila ${i + 1}: weight o offeredRate inválidos`);
            continue;
          }

          rows.push({
            brokerId: row.brokerid || undefined,
            pickupAddress: row.pickupaddress,
            deliveryAddress: row.deliveryaddress,
            pickupLat: row.pickuplat ? parseFloat(row.pickuplat) : undefined,
            pickupLng: row.pickuplng ? parseFloat(row.pickuplng) : undefined,
            deliveryLat: row.deliverylat ? parseFloat(row.deliverylat) : undefined,
            deliveryLng: row.deliverylng ? parseFloat(row.deliverylng) : undefined,
            weight: parsedWeight,
            weightUnit: row.weightunit || "lbs",
            commodity: row.commodity || undefined,
            offeredRate: parsedRate,
            pickupDate: row.pickupdate ? new Date(row.pickupdate) : undefined,
            deliveryDate: row.deliverydate ? new Date(row.deliverydate) : undefined,
          });
        }

        setCsvPreview(rows);
        setCsvErrors(errors);

        if (errors.length === 0) {
          toast.success(`${rows.length} cargas cargadas correctamente`);
        } else {
          toast.warning(`${errors.length} errores encontrados en el CSV`);
        }
      } catch (error: any) {
        toast.error("Error al procesar CSV");
        setCsvErrors([error?.message || "Error desconocido al procesar CSV"]);
        setCsvPreview([]);
      }
    };

    reader.readAsText(file);
  };

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Por favor selecciona un archivo CSV");
      return;
    }

    setCsvFile(file);
    parseCSV(file);
  };

  const handleCSVSubmit = async () => {
    if (csvPreview.length === 0) {
      toast.error("No hay cargas válidas para importar");
      return;
    }

    setIsLoading(true);
    try {
      const result = await importCSVMutation.mutateAsync({
        brokerName,
        loads: csvPreview,
      });

      toast.success(`${result.imported} cargas importadas exitosamente`);

      if (result.skipped > 0) {
        toast.info(`${result.skipped} cargas omitidas`);
      }

      setCsvFile(null);
      setCsvPreview([]);
      setCsvErrors([]);
      refetchSyncLogs();
    } catch (error: any) {
      toast.error(error?.message || "Error al importar CSV");
    } finally {
      setIsLoading(false);
    }
  };

  if (syncLogsError) {
    console.error("ImportBrokerLoads sync logs error:", syncLogsError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Cargas</h1>
        <p className="text-muted-foreground mt-2">
          Importa cargas manualmente o desde un archivo CSV.
        </p>
      </div>

      {syncLogsError && (
        <div className="text-sm text-yellow-600 dark:text-yellow-400">
          Historial no disponible temporalmente.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar Broker</CardTitle>
          <CardDescription>Elige de dónde proviene la carga</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={brokerName} onValueChange={(value: any) => setBrokerName(value)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual (Ingreso Manual)</SelectItem>
              <SelectItem value="coyote">Coyote</SelectItem>
              <SelectItem value="dat">DAT</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manual">Importación Manual</TabsTrigger>
          <TabsTrigger value="csv">Importar CSV</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingreso Manual de Carga</CardTitle>
              <CardDescription>Completa los datos de la carga manualmente</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="brokerId">ID del Broker (Opcional)</Label>
                  <Input
                    id="brokerId"
                    placeholder="ej: COYOTE-12345"
                    value={manualForm.brokerId}
                    onChange={(e) => setManualForm({ ...manualForm, brokerId: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Información de Ruta</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pickupAddress">Dirección de Recogida *</Label>
                      <Input
                        id="pickupAddress"
                        placeholder="ej: Houston, TX"
                        value={manualForm.pickupAddress}
                        onChange={(e) => setManualForm({ ...manualForm, pickupAddress: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryAddress">Dirección de Entrega *</Label>
                      <Input
                        id="deliveryAddress"
                        placeholder="ej: Los Angeles, CA"
                        value={manualForm.deliveryAddress}
                        onChange={(e) => setManualForm({ ...manualForm, deliveryAddress: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="pickupLat">Latitud Recogida</Label>
                      <Input
                        id="pickupLat"
                        type="number"
                        step="0.0001"
                        placeholder="29.7604"
                        value={manualForm.pickupLat}
                        onChange={(e) => setManualForm({ ...manualForm, pickupLat: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pickupLng">Longitud Recogida</Label>
                      <Input
                        id="pickupLng"
                        type="number"
                        step="0.0001"
                        placeholder="-95.3698"
                        value={manualForm.pickupLng}
                        onChange={(e) => setManualForm({ ...manualForm, pickupLng: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryLat">Latitud Entrega</Label>
                      <Input
                        id="deliveryLat"
                        type="number"
                        step="0.0001"
                        placeholder="34.0522"
                        value={manualForm.deliveryLat}
                        onChange={(e) => setManualForm({ ...manualForm, deliveryLat: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryLng">Longitud Entrega</Label>
                      <Input
                        id="deliveryLng"
                        type="number"
                        step="0.0001"
                        placeholder="-118.2437"
                        value={manualForm.deliveryLng}
                        onChange={(e) => setManualForm({ ...manualForm, deliveryLng: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Información de Carga</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weight">Peso (lbs) *</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="45000"
                        value={manualForm.weight}
                        onChange={(e) => setManualForm({ ...manualForm, weight: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="commodity">Tipo de Mercancía</Label>
                      <Input
                        id="commodity"
                        placeholder="ej: Electronics"
                        value={manualForm.commodity}
                        onChange={(e) => setManualForm({ ...manualForm, commodity: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Tarificación</h3>

                  <div>
                    <Label htmlFor="offeredRate">Tarifa Ofrecida ($) *</Label>
                    <Input
                      id="offeredRate"
                      type="number"
                      step="0.01"
                      placeholder="2500.00"
                      value={manualForm.offeredRate}
                      onChange={(e) => setManualForm({ ...manualForm, offeredRate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Fechas</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pickupDate">Fecha de Recogida</Label>
                      <Input
                        id="pickupDate"
                        type="datetime-local"
                        value={manualForm.pickupDate}
                        onChange={(e) => setManualForm({ ...manualForm, pickupDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryDate">Fecha de Entrega</Label>
                      <Input
                        id="deliveryDate"
                        type="datetime-local"
                        value={manualForm.deliveryDate}
                        onChange={(e) => setManualForm({ ...manualForm, deliveryDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar Carga
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar desde CSV</CardTitle>
              <CardDescription>
                Carga un archivo CSV con múltiples cargas. Columnas requeridas:
                pickupAddress, deliveryAddress, weight, offeredRate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVChange}
                  className="hidden"
                  id="csvInput"
                />
                <label htmlFor="csvInput" className="cursor-pointer">
                  <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">Selecciona un archivo CSV</p>
                  <p className="text-sm text-muted-foreground">o arrastra y suelta aquí</p>
                </label>
              </div>

              {csvErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">{csvErrors.length} errores encontrados:</p>
                    <ul className="text-sm space-y-1">
                      {csvErrors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                      {csvErrors.length > 5 && (
                        <li>• ... y {csvErrors.length - 5} más</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {csvPreview.length > 0 && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {csvPreview.length} cargas listas para importar
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left">Recogida</th>
                          <th className="px-4 py-2 text-left">Entrega</th>
                          <th className="px-4 py-2 text-right">Peso (lbs)</th>
                          <th className="px-4 py-2 text-right">Tarifa ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 5).map((load, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 truncate">{load.pickupAddress}</td>
                            <td className="px-4 py-2 truncate">{load.deliveryAddress}</td>
                            <td className="px-4 py-2 text-right">
                              {Number(load.weight).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              ${Number(load.offeredRate).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {csvPreview.length > 5 && (
                    <p className="text-sm text-muted-foreground">
                      ... y {csvPreview.length - 5} cargas más
                    </p>
                  )}

                  <Button
                    onClick={handleCSVSubmit}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importar {csvPreview.length} Cargas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {safeSyncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Sincronizaciones</CardTitle>
            <CardDescription>Últimas importaciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safeSyncLogs.slice(0, 5).map((log: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold capitalize">{log.brokerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.loadsImported} importadas, {log.loadsSkipped} omitidas
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        log.status === "success"
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {log.status === "success" ? "✓ Exitosa" : "⚠ Parcial"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
