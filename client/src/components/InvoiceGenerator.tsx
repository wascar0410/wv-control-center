import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface InvoiceGeneratorProps {
  loadId: number;
  clientName: string;
  price: number;
  status: string;
}

export function InvoiceGenerator({ loadId, clientName, price, status }: InvoiceGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateInvoice = async () => {
    if (status !== "delivered") {
      toast.error("Solo se pueden generar facturas para cargas entregadas");
      return;
    }

    setIsGenerating(true);
    try {
      // Generate PDF invoice
      const response = await fetch("/api/trpc/finance.generateInvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId, clientName, price }),
      });

      if (!response.ok) {
        throw new Error("Error al generar factura");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factura-${loadId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Factura generada y descargada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar factura");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendInvoice = async () => {
    if (status !== "delivered") {
      toast.error("Solo se pueden enviar facturas para cargas entregadas");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/trpc/finance.sendInvoiceEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId, clientName, price }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar factura");
      }

      toast.success(`Factura enviada a ${clientName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar factura");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Facturación
        </CardTitle>
        <CardDescription>Generar y enviar factura automáticamente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleGenerateInvoice}
            disabled={isGenerating || status !== "delivered"}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </Button>
          <Button
            onClick={handleSendInvoice}
            disabled={isGenerating || status !== "delivered"}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            Enviar por Email
          </Button>
        </div>
        {status !== "delivered" && (
          <p className="text-sm text-muted-foreground">
            La factura se puede generar cuando la carga esté entregada
          </p>
        )}
      </CardContent>
    </Card>
  );
}
