"use client";
import { useState } from "react";
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
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = margin + 10;

      // Header
      doc.setFontSize(16);
      doc.text("Historial de Cotizaciones", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString("es-ES")}`, margin, yPosition);
      yPosition += 8;

      // Filters info
      const filterText = [];
      if (status) filterText.push(`Estado: ${STATUS_LABELS[status]}`);
      if (search) filterText.push(`Búsqueda: ${search}`);
      if (filterText.length > 0) {
        doc.setFontSize(9);
        doc.text(`Filtros: ${filterText.join(" | ")}`, margin, yPosition);
        yPosition += 6;
      }

      yPosition += 4;

      // Table headers
      const colWidths = [20, 35, 35, 25, 25, 20, 25];
      const headers = ["Fecha", "Origen", "Destino", "Precio", "Ganancia", "Margen", "Estado"];

      doc.setFontSize(9);
      (doc as any).setFont(undefined, "bold");
      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos, yPosition, { maxWidth: colWidths[i] - 2 } as any);
        xPos += colWidths[i];
      });
      yPosition += 6;

      // Table rows
      (doc as any).setFont(undefined, "normal");
      doc.setFontSize(8);
      quotations.forEach((q) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = margin;
        }

        const rowData = [
          new Date(q.createdAt).toLocaleDateString("es-ES"),
          q.pickupAddress.substring(0, 30),
          q.deliveryAddress.substring(0, 30),
          `$${Number(q.totalPrice).toFixed(2)}`,
          `$${Number(q.estimatedProfit).toFixed(2)}`,
          `${Number(q.profitMarginPercent).toFixed(1)}%`,
          STATUS_LABELS[q.status] || q.status,
        ];

        xPos = margin;
        rowData.forEach((cell, i) => {
          doc.text(String(cell), xPos, yPosition, { maxWidth: colWidths[i] - 2 } as any);
          xPos += colWidths[i];
        });
        yPosition += 5;
      });

      // Summary
      yPosition += 5;
      doc.setFontSize(10);
      (doc as any).setFont(undefined, "bold");
      doc.text(`Total de cotizaciones: ${quotations.length}`, margin, yPosition);
      yPosition += 6;

      const totalPrice = quotations.reduce((sum, q) => sum + Number(q.totalPrice), 0);
      const totalProfit = quotations.reduce((sum, q) => sum + Number(q.estimatedProfit), 0);
      const avgMargin =
        quotations.length > 0
          ? quotations.reduce((sum, q) => sum + Number(q.profitMarginPercent), 0) /
            quotations.length
          : 0;

      doc.text(`Ingresos totales: $${totalPrice.toFixed(2)}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Ganancia total: $${totalProfit.toFixed(2)}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Margen promedio: ${avgMargin.toFixed(1)}%`, margin, yPosition);

      // Save
      doc.save(`cotizaciones-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exportado exitosamente");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al exportar PDF");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cotizaciones</CardTitle>
          <CardDescription>Ver y exportar todas tus cotizaciones calculadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por dirección..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            <Select value={status} onValueChange={(value) => {
              setStatus(value);
              setPage(0);
            }}>
              <SelectTrigger className="w-[200px]">
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

            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Ganancia</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : quotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay cotizaciones
                    </TableCell>
                  </TableRow>
                ) : (
                  quotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>{new Date(q.createdAt).toLocaleDateString("es-ES")}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{q.pickupAddress}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {q.deliveryAddress}
                      </TableCell>
                      <TableCell>${Number(q.totalPrice).toFixed(2)}</TableCell>
                      <TableCell>${Number(q.estimatedProfit).toFixed(2)}</TableCell>
                      <TableCell>{Number(q.profitMarginPercent).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[q.status] || "bg-gray-100"}>
                          {STATUS_LABELS[q.status] || q.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {quotations.length > 0 ? page * pageSize + 1 : 0} a{" "}
              {Math.min((page + 1) * pageSize, total)} de {total} cotizaciones
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
                disabled={page >= totalPages - 1}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
