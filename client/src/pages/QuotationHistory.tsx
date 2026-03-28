import { useState, useMemo } from "react";
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
import { FileDown, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  quoted: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-yellow-100 text-yellow-800",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  quoted: "Cotizado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  expired: "Expirado",
};

export default function QuotationHistory() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: result, isLoading } = trpc.quotation.getQuotationHistory.useQuery({
    status: (status as any) || undefined,
    search: search || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const quotations = result?.quotations || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleExportPDF = () => {
    if (quotations.length === 0) {
      toast.error("No hay cotizaciones para exportar");
      return;
    }

    try {
      const doc = new jsPDF() as any;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;

      // Header
      doc.setFontSize(16);
      doc.text("Historial de Cotizaciones", margin, margin + 5);
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString("es-ES")}`, margin, margin + 12);

      // Filters info
      const filterText = [];
      if (status) filterText.push(`Estado: ${STATUS_LABELS[status]}`);
      if (search) filterText.push(`Búsqueda: ${search}`);
      if (filterText.length > 0) {
        doc.setFontSize(9);
        doc.text(`Filtros: ${filterText.join(" | ")}`, margin, margin + 18);
      }

      // Table
      const tableData = quotations.map((q) => [
        new Date(q.createdAt).toLocaleDateString("es-ES"),
        q.pickupAddress.substring(0, 30),
        q.deliveryAddress.substring(0, 30),
        `$${Number(q.totalPrice).toFixed(2)}`,
        `$${Number(q.estimatedProfit).toFixed(2)}`,
        `${Number(q.profitMarginPercent).toFixed(1)}%`,
        STATUS_LABELS[q.status] || q.status,
      ]);

      (doc as any).autoTable({
        head: [
          [
            "Fecha",
            "Origen",
            "Destino",
            "Precio",
            "Ganancia",
            "Margen",
            "Estado",
          ],
        ],
        body: tableData,
        startY: margin + 25,
        margin: margin,
        didDrawPage: (data: any) => {
          const pageCount = doc.internal.getPages().length;
          doc.setFontSize(8);
          doc.text(
            `Página ${pageCount}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
          );
        },
      });

      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Total de cotizaciones: ${quotations.length}`, margin, finalY);
      const totalPrice = quotations.reduce((sum, q) => sum + Number(q.totalPrice), 0);
      const totalProfit = quotations.reduce((sum, q) => sum + Number(q.estimatedProfit), 0);
      doc.text(`Ingresos totales: $${totalPrice.toFixed(2)}`, margin, finalY + 6);
      doc.text(`Ganancia total: $${totalProfit.toFixed(2)}`, margin, finalY + 12);

      doc.save(`cotizaciones-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exportado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Historial de Cotizaciones</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza, filtra y exporta todas tus cotizaciones
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por dirección..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={(val) => {
              setStatus(val === "all" ? "" : val);
              setPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="quoted">Cotizado</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button onClick={handleExportPDF} className="gap-2" disabled={isLoading}>
              <FileDown className="w-4 h-4" />
              Exportar a PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Resultados ({total} cotizaciones)
          </CardTitle>
          <CardDescription>
            Página {page + 1} de {Math.max(1, totalPages)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron cotizaciones
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-sm">
                        {new Date(q.createdAt).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {q.pickupAddress}
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {q.deliveryAddress}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(q.totalPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={Number(q.estimatedProfit) >= 0 ? "text-green-600" : "text-red-600"}>
                          ${Number(q.estimatedProfit).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(q.profitMarginPercent).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[q.status] || ""}>
                          {STATUS_LABELS[q.status] || q.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {page * pageSize + 1} a {Math.min((page + 1) * pageSize, total)} de {total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
