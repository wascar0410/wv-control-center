import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadFiscalReportPDF } from "@/lib/generateFiscalReportPDF";
import { downloadFiscalReportExcel } from "@/lib/generateFiscalReportExcel";
import { trpc } from "@/lib/trpc";

interface FiscalReportDownloadProps {
  year: number;
  onYearChange?: (year: number) => void;
}

export default function FiscalReportDownload({
  year,
  onYearChange,
}: FiscalReportDownloadProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Fetch report data
  const month = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
  const { data: reportData, isLoading } = trpc.irsCompliance.getComplianceSummary.useQuery(
    { year },
    { enabled: !!year }
  );

  const handleDownloadPDF = async () => {
    if (!reportData) return;

    setIsDownloadingPDF(true);
    try {
      const data = {
        year,
        month: month,
        totalIncome: reportData.totalIncome,
        totalExpenses: reportData.totalExpenses,
        totalBusinessMiles: reportData.totalBusinessMiles,
        mileageDeduction: reportData.mileageDeduction,
        netIncome: reportData.netIncome,
        complianceScore: reportData.complianceScore,
        unresolvedAlerts: reportData.unresolvedAlerts,
      };

      downloadFiscalReportPDF(data);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!reportData) return;

    setIsDownloadingExcel(true);
    try {
      const data = {
        year,
        month: month,
        totalIncome: reportData.totalIncome,
        totalExpenses: reportData.totalExpenses,
        totalBusinessMiles: reportData.totalBusinessMiles,
        mileageDeduction: reportData.mileageDeduction,
        netIncome: reportData.netIncome,
        complianceScore: reportData.complianceScore,
        unresolvedAlerts: reportData.unresolvedAlerts,
      };

      downloadFiscalReportExcel(data);
    } catch (error) {
      console.error("Error downloading Excel:", error);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Descargar Reportes Fiscales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Año</label>
            <Select value={year.toString()} onValueChange={(v) => onYearChange?.(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Período</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Año Completo</SelectItem>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  const monthName = new Date(year, i).toLocaleString("es-ES", {
                    month: "long",
                  });
                  return (
                    <SelectItem key={month} value={month.toString()}>
                      {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {isLoading ? (
                <span>Cargando datos...</span>
              ) : reportData ? (
                <span>
                  Ingresos: ${reportData.totalIncome.toFixed(2)} | Gastos: $
                  {reportData.totalExpenses.toFixed(2)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF || isDownloadingExcel || !reportData}
            className="flex-1"
            variant="default"
          >
            {isDownloadingPDF ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Descargando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </>
            )}
          </Button>

          <Button
            onClick={handleDownloadExcel}
            disabled={isDownloadingPDF || isDownloadingExcel || !reportData}
            className="flex-1"
            variant="outline"
          >
            {isDownloadingExcel ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Descargando Excel...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Descargar Excel
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <p>
            Los reportes incluyen ingresos, gastos, millas comerciales y deducciones calculadas
            según regulaciones del IRS.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
