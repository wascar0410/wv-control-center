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
import { FileDown } from "lucide-react";
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

  const {
    data,
    isLoading,
    error,
  } = trpc.quotation.getQuotationHistory.useQuery(
    {
      status: status && status !== "all" ? (status as any) : undefined,
      search: search || undefined,
      limit: pageSize,
      offset: page * pageSize,
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const quotations = Array.isArray(data?.quotations) ? data?.quotations : [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleExportPDF = () => {
    if (quotations.length === 0) {
      toast.error("No hay cotizaciones para exportar");
      return;
    }

    try {
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(16);
      doc.text("Historial de Cotizaciones", 10, y);
      y += 10;

      quotations.forEach((q) => {
        doc.setFontSize(10);
        doc.text(
          `${new Date(q.createdAt).toLocaleDateString()} - ${q.pickupAddress} → ${q.deliveryAddress}`,
          10,
          y
        );
        y += 6;
      });

      doc.save("cotizaciones.pdf");
      toast.success("PDF exportado");
    } catch (e) {
      console.error(e);
      toast.error("Error exportando PDF");
    }
  };

  if (error) {
    console.error("QuotationHistory error:", error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cotizaciones</CardTitle>
          <CardDescription>Vista segura</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* filtros */}
          <div className="flex gap-4 flex-wrap">
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="quoted">Cotizado</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportPDF}>
              <FileDown className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>

          {error && (
            <div className="text-red-400 text-sm">
              Error cargando historial (modo seguro)
            </div>
          )}

          {/* tabla */}
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
                    <TableCell colSpan={7} className="text-center py-8">
                      No hay datos
                    </TableCell>
                  </TableRow>
                ) : (
                  quotations.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        {new Date(q.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{q.pickupAddress}</TableCell>
                      <TableCell>{q.deliveryAddress}</TableCell>
                      <TableCell>${Number(q.totalPrice).toFixed(2)}</TableCell>
                      <TableCell>${Number(q.estimatedProfit).toFixed(2)}</TableCell>
                      <TableCell>{Number(q.profitMarginPercent).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[q.status]}>
                          {STATUS_LABELS[q.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* paginación */}
          <div className="flex justify-between">
            <Button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>

            <Button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
