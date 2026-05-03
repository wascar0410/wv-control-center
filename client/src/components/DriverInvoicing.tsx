import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toMoney, toFixedSafe } from '@/utils/number';

// 🔥 HELPERS - using structured number system
const money = (v: any) => `$${toMoney(v)}`;
const rate = (v: any) => toFixedSafe(v, 2);

interface Invoice {
  id: string;
  month: string;
  year: number;
  totalLoads: number;
  totalMiles: number;
  totalEarnings: number;
  totalDeductions: number;
  netAmount: number;
  status: 'paid' | 'pending' | 'overdue';
  generatedDate: string;
  paidDate?: string;
}

interface LoadDetail {
  date: string;
  clientName: string;
  pickupCity: string;
  deliveryCity: string;
  miles: number;
  rate: number;
  earnings: number;
}

export function DriverInvoicing() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Mock invoices data
  const invoices: Invoice[] = [
    {
      id: 'INV-2026-03',
      month: 'Marzo',
      year: 2026,
      totalLoads: 24,
      totalMiles: 1250,
      totalEarnings: 3450.00,
      totalDeductions: 450.00,
      netAmount: 3000.00,
      status: 'paid',
      generatedDate: '2026-03-01',
      paidDate: '2026-03-15',
    },
    {
      id: 'INV-2026-02',
      month: 'Febrero',
      year: 2026,
      totalLoads: 22,
      totalMiles: 1180,
      totalEarnings: 3200.00,
      totalDeductions: 400.00,
      netAmount: 2800.00,
      status: 'paid',
      generatedDate: '2026-02-01',
      paidDate: '2026-02-15',
    },
    {
      id: 'INV-2026-01',
      month: 'Enero',
      year: 2026,
      totalLoads: 26,
      totalMiles: 1350,
      totalEarnings: 3800.00,
      totalDeductions: 500.00,
      netAmount: 3300.00,
      status: 'paid',
      generatedDate: '2026-01-01',
      paidDate: '2026-01-15',
    },
  ];

  // Mock load details for selected invoice
  const loadDetails: LoadDetail[] = [
    {
      date: '2026-03-01',
      clientName: 'ABC Logistics',
      pickupCity: 'Miami',
      deliveryCity: 'Tampa',
      miles: 280,
      rate: 1.50,
      earnings: 420.00,
    },
    {
      date: '2026-03-02',
      clientName: 'XYZ Shipping',
      pickupCity: 'Tampa',
      deliveryCity: 'Jacksonville',
      miles: 165,
      rate: 1.75,
      earnings: 288.75,
    },
    {
      date: '2026-03-03',
      clientName: 'FastFreight',
      pickupCity: 'Jacksonville',
      deliveryCity: 'Savannah',
      miles: 140,
      rate: 1.60,
      earnings: 224.00,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    // In a real app, this would generate and download a PDF
    console.log('Downloading PDF for invoice:', invoice.id);
    alert(`Descargando factura ${invoice.id}...`);
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetails(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Facturado (3 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$10,050.00</p>
            <p className="text-xs text-muted-foreground mt-1">72 cargas completadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$3,350.00</p>
            <p className="text-xs text-muted-foreground mt-1">Neto después de deducciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximo Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">$3,000.00</p>
            <p className="text-xs text-muted-foreground mt-1">Estimado para el 15 de abril</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">{invoice.month} {invoice.year}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.totalLoads} cargas • {invoice.totalMiles} millas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{money(invoice.netAmount)}</p>
                    <Badge className={getStatusColor(invoice.status)}>
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(invoice)}
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadPDF(invoice)}
                    title="Descargar PDF"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Factura - {selectedInvoice?.month} {selectedInvoice?.year}</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="border-b pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Factura</p>
                    <p className="font-semibold">{selectedInvoice.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Período</p>
                    <p className="font-semibold">{selectedInvoice.month} {selectedInvoice.year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Generada</p>
                    <p className="font-semibold">{selectedInvoice.generatedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <Badge className={getStatusColor(selectedInvoice.status)}>
                      {getStatusLabel(selectedInvoice.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Load Details Table */}
              <div>
                <h3 className="font-semibold mb-3">Detalles de Cargas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 px-2">Fecha</th>
                        <th className="text-left py-2 px-2">Cliente</th>
                        <th className="text-left py-2 px-2">Ruta</th>
                        <th className="text-right py-2 px-2">Millas</th>
                        <th className="text-right py-2 px-2">Tarifa</th>
                        <th className="text-right py-2 px-2">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadDetails.map((load, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{load.date}</td>
                          <td className="py-2 px-2">{load.clientName}</td>
                          <td className="py-2 px-2 text-xs">
                            {load.pickupCity} → {load.deliveryCity}
                          </td>
                          <td className="text-right py-2 px-2">{load.miles}</td>
                          <td className="text-right py-2 px-2">{rate(load.rate)}/mi</td>
                        <td className="text-right py-2 px-2">
                            {money(load.earnings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cargas:</span>
                  <span className="font-semibold">{selectedInvoice.totalLoads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Millas:</span>
                  <span className="font-semibold">{selectedInvoice.totalMiles}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-muted-foreground">Ingresos Brutos:</span>
                  <span className="font-semibold">{money(selectedInvoice.totalEarnings)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="text-muted-foreground">Deducciones:</span>
                  <span className="font-semibold">-{money(selectedInvoice.totalDeductions)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg">
                  <span className="font-semibold">Neto a Recibir:</span>
                  <span className="font-bold text-green-600">{money(selectedInvoice.netAmount)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => handleDownloadPDF(selectedInvoice)}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
