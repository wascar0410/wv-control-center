import { useState } from "react";
import { FileText, Download, Upload, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import jsPDF from "jspdf";
import OCRDocumentUpload from "@/components/OCRDocumentUpload";
import FiscalReportDownload from "@/components/FiscalReportDownload";

export default function TaxCompliance() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch tax summary
  const { data: taxSummary, isLoading: summaryLoading } = trpc.taxCompliance.getSummary.useQuery(
    { taxYear: selectedYear },
    { enabled: !!selectedYear }
  );

  // Fetch income report
  const { data: incomeReport } = trpc.taxCompliance.getIncomeReport.useQuery(
    { taxYear: selectedYear },
    { enabled: !!selectedYear }
  );

  // Fetch expense report
  const { data: expenseReport } = trpc.taxCompliance.getExpenseReport.useQuery(
    { taxYear: selectedYear },
    { enabled: !!selectedYear }
  );

  // Fetch quarterly estimates
  const { data: quarterly } = trpc.taxCompliance.getQuarterlyEstimates.useQuery(
    { taxYear: selectedYear },
    { enabled: !!selectedYear }
  );



  const generateTaxReport = () => {
    if (!taxSummary) return;

    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(33, 150, 243);
    doc.text("Tax Compliance Report", 20, yPosition);
    yPosition += 15;

    // Year and date
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Tax Year: ${selectedYear}`, 20, yPosition);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition + 6);
    yPosition += 20;

    // Summary section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Annual Summary", 20, yPosition);
    yPosition += 10;

    const summaryData = [
      ["Total Income:", `$${taxSummary.totalIncome.toFixed(2)}`],
      ["Total Expenses:", `$${taxSummary.totalExpenses.toFixed(2)}`],
      ["Net Profit:", `$${taxSummary.netProfit.toFixed(2)}`],
      ["Estimated Taxes:", `$${taxSummary.estimatedTaxes.toFixed(2)}`],
      ["Effective Tax Rate:", `${taxSummary.effectiveTaxRate}%`],
    ];

    doc.setFontSize(11);
    summaryData.forEach(([label, value]) => {
      doc.setTextColor(80, 80, 80);
      doc.text(label, 25, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(value, 130, yPosition);
      yPosition += 6;
    });

    yPosition += 10;

    // Quarterly breakdown
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Quarterly Tax Estimates", 20, yPosition);
    yPosition += 10;

    const quarterlyData = [
      [`Q1 (Jan-Mar):`, `$${taxSummary.quarterly.q1.toFixed(2)}`],
      [`Q2 (Apr-Jun):`, `$${taxSummary.quarterly.q2.toFixed(2)}`],
      [`Q3 (Jul-Sep):`, `$${taxSummary.quarterly.q3.toFixed(2)}`],
      [`Q4 (Oct-Dec):`, `$${taxSummary.quarterly.q4.toFixed(2)}`],
    ];

    doc.setFontSize(11);
    quarterlyData.forEach(([label, value]) => {
      doc.setTextColor(80, 80, 80);
      doc.text(label, 25, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(value, 130, yPosition);
      yPosition += 6;
    });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `WV Control Center - Tax Compliance Report - ${selectedYear}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    doc.save(`tax-report-${selectedYear}.pdf`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="w-8 h-8" />
          Tax Compliance Center
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your tax documents, generate reports, and prepare for IRS compliance
        </p>
      </div>

      {/* Year selector */}
      <div className="flex gap-2">
        {years.map((year) => (
          <Button
            key={year}
            variant={selectedYear === year ? "default" : "outline"}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </Button>
        ))}
      </div>

      {/* Alert for estimated taxes */}
      {taxSummary && taxSummary.estimatedTaxes > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Estimated quarterly taxes for {selectedYear}: <strong>${taxSummary.estimatedTaxes.toFixed(2)}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {summaryLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : taxSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${taxSummary.totalIncome.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ${taxSummary.totalExpenses.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${taxSummary.netProfit.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Est. Taxes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${taxSummary.estimatedTaxes.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tax Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{taxSummary.effectiveTaxRate}%</div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <FiscalReportDownload year={selectedYear} onYearChange={setSelectedYear} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Income Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {incomeReport && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${incomeReport.totalIncome.toFixed(2)}
                      </p>
                    </div>
                    <Button onClick={generateTaxReport} className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Expense Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseReport && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${expenseReport.totalExpenses.toFixed(2)}
                      </p>
                    </div>
                    <Button onClick={generateTaxReport} className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <OCRDocumentUpload />
        </TabsContent>

        {/* Quarterly Tab */}
        <TabsContent value="quarterly" className="space-y-6">
          {quarterly && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Q1 (Jan-Mar)", value: quarterly.q1 },
                { label: "Q2 (Apr-Jun)", value: quarterly.q2 },
                { label: "Q3 (Jul-Sep)", value: quarterly.q3 },
                { label: "Q4 (Oct-Dec)", value: quarterly.q4 },
              ].map((quarter) => (
                <Card key={quarter.label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{quarter.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      ${quarter.value.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
