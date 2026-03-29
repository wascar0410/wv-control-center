import jsPDF from "jspdf";
import "jspdf-autotable";

export interface FiscalReportData {
  year: number;
  month?: number;
  totalIncome: number;
  totalExpenses: number;
  totalBusinessMiles: number;
  mileageDeduction: number;
  netIncome: number;
  complianceScore: number;
  unresolvedAlerts: number;
  mileageRecords?: Array<{
    date: Date;
    businessMiles: number;
    purpose: string;
  }>;
  expenseRecords?: Array<{
    date: Date;
    vendor: string;
    category: string;
    amount: number;
    description?: string;
  }>;
  incomeRecords?: Array<{
    date: Date;
    source: string;
    amount: number;
    brokerName?: string;
  }>;
}

export function generateFiscalReportPDF(data: FiscalReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  const periodLabel = data.month
    ? `${new Date(data.year, data.month - 1).toLocaleString("en-US", {
        month: "long",
      })} ${data.year}`
    : `Year ${data.year}`;

  // Header
  doc.setFontSize(18);
  doc.text("Fiscal Compliance Report", pageWidth / 2, yPosition, {
    align: "center",
  });
  yPosition += 10;

  doc.setFontSize(14);
  doc.text(periodLabel, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Financial Summary
  doc.setFontSize(12);
  doc.text("Financial Summary", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  const summaryData = [
    ["Total Income:", `$${data.totalIncome.toFixed(2)}`],
    ["Total Expenses:", `$${data.totalExpenses.toFixed(2)}`],
    ["Business Miles:", `${data.totalBusinessMiles.toFixed(1)}`],
    ["Mileage Deduction (@ $0.67/mi):", `$${data.mileageDeduction.toFixed(2)}`],
    ["Net Income:", `$${data.netIncome.toFixed(2)}`],
  ];

  summaryData.forEach((row) => {
    doc.text(row[0], 25, yPosition);
    doc.text(row[1], 150, yPosition);
    yPosition += 7;
  });

  yPosition += 10;

  // Compliance Status
  doc.setFontSize(12);
  doc.text("Compliance Status", 20, yPosition);
  yPosition += 8;

  doc.setFontSize(11);
  doc.text(`Compliance Score: ${data.complianceScore}%`, 25, yPosition);
  yPosition += 7;
  doc.text(`Unresolved Alerts: ${data.unresolvedAlerts}`, 25, yPosition);
  yPosition += 15;

  // Income Records Table
  if (data.incomeRecords && data.incomeRecords.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.text("Income Records", 20, yPosition);
    yPosition += 8;

    const incomeTableData = data.incomeRecords.map((record) => [
      new Date(record.date).toLocaleDateString(),
      record.source,
      record.brokerName || "-",
      `$${record.amount.toFixed(2)}`,
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [["Date", "Source", "Broker", "Amount"]],
      body: incomeTableData,
      margin: { left: 20, right: 20 },
      didDrawPage: () => {
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expense Records Table
  if (data.expenseRecords && data.expenseRecords.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.text("Expense Records", 20, yPosition);
    yPosition += 8;

    const expenseTableData = data.expenseRecords.map((record) => [
      new Date(record.date).toLocaleDateString(),
      record.category,
      record.vendor,
      `$${record.amount.toFixed(2)}`,
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [["Date", "Category", "Vendor", "Amount"]],
      body: expenseTableData,
      margin: { left: 20, right: 20 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Mileage Records Table
  if (data.mileageRecords && data.mileageRecords.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.text("Mileage Records", 20, yPosition);
    yPosition += 8;

    const mileageTableData = data.mileageRecords.map((record) => [
      new Date(record.date).toLocaleDateString(),
      record.businessMiles.toFixed(1),
      record.purpose,
      `$${(record.businessMiles * 0.67).toFixed(2)}`,
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [["Date", "Miles", "Purpose", "Deduction"]],
      body: mileageTableData,
      margin: { left: 20, right: 20 },
    });
  }

  // Footer
  doc.setFontSize(9);
  doc.text(
    "This report was generated for IRS compliance purposes. Keep this document for your records.",
    pageWidth / 2,
    pageHeight - 15,
    { align: "center" }
  );
  doc.text(
    `Generated on ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  return doc;
}

export function downloadFiscalReportPDF(data: FiscalReportData) {
  const doc = generateFiscalReportPDF(data);
  const periodLabel = data.month
    ? `${new Date(data.year, data.month - 1).toLocaleString("en-US", {
        month: "long",
      })}-${data.year}`
    : `${data.year}`;
  doc.save(`fiscal-report-${periodLabel}.pdf`);
}
