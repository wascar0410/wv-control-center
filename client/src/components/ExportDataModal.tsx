import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ExportType = "transactions" | "loads" | "payments";

interface ExportDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportType: ExportType;
}

export function ExportDataModal({ open, onOpenChange, exportType }: ExportDataModalProps) {
  const [format, setFormat] = useState<"excel" | "csv" | "json" | "pdf">("csv");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const exportTransactionsMutation = trpc.export.exportTransactions.useMutation({
    onSuccess: (result) => {
      toast.success("Exportación completada", {
        description: `${result.recordCount} registros exportados`,
      });
      onOpenChange(false);
      if (result.fileUrl) {
        window.open(result.fileUrl, "_blank");
      }
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const exportLoadsMutation = trpc.export.exportLoads.useMutation({
    onSuccess: (result) => {
      toast.success("Exportación completada", {
        description: `${result.recordCount} registros exportados`,
      });
      onOpenChange(false);
      if (result.fileUrl) {
        window.open(result.fileUrl, "_blank");
      }
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const exportPaymentsMutation = trpc.export.exportPayments.useMutation({
    onSuccess: (result) => {
      toast.success("Exportación completada", {
        description: `${result.recordCount} registros exportados`,
      });
      onOpenChange(false);
      if (result.fileUrl) {
        window.open(result.fileUrl, "_blank");
      }
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const isLoading =
    exportTransactionsMutation.isPending ||
    exportLoadsMutation.isPending ||
    exportPaymentsMutation.isPending;

  const handleExport = () => {
    const dateStart = new Date(startDate);
    const dateEnd = new Date(endDate);

    if (dateStart > dateEnd) {
      toast.error("Error", {
        description: "La fecha de inicio debe ser anterior a la fecha de fin",
      });
      return;
    }

    if (exportType === "transactions") {
      exportTransactionsMutation.mutate({
        format,
        startDate: dateStart,
        endDate: dateEnd,
      });
    } else if (exportType === "loads") {
      exportLoadsMutation.mutate({
        format,
        startDate: dateStart,
        endDate: dateEnd,
      });
    } else if (exportType === "payments") {
      exportPaymentsMutation.mutate({
        format,
        startDate: dateStart,
        endDate: dateEnd,
      });
    }
  };

  const getTitle = () => {
    switch (exportType) {
      case "transactions":
        return "Exportar Transacciones";
      case "loads":
        return "Exportar Cargas";
      case "payments":
        return "Exportar Pagos";
    }
  };

  const getDescription = () => {
    switch (exportType) {
      case "transactions":
        return "Descarga un reporte de todas las transacciones en el rango de fechas seleccionado";
      case "loads":
        return "Descarga un reporte de todas las cargas en el rango de fechas seleccionado";
      case "payments":
        return "Descarga un reporte de todos los pagos en el rango de fechas seleccionado";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium">Formato</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Hoja de cálculo)</SelectItem>
                <SelectItem value="json">JSON (Datos estructurados)</SelectItem>
                <SelectItem value="excel">Excel (Libro de trabajo)</SelectItem>
                <SelectItem value="pdf">PDF (Documento)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Desde</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium">Hasta</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Format Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 text-sm text-muted-foreground">
              <p>
                {format === "csv" && "CSV es ideal para importar en Excel o Google Sheets"}
                {format === "json" && "JSON es útil para integración con sistemas externos"}
                {format === "excel" && "Excel incluye formato y estilos profesionales"}
                {format === "pdf" && "PDF es perfecto para imprimir o compartir"}
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
