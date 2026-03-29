import * as XLSX from "xlsx";

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

export function generateFiscalReportExcel(data: FiscalReportData) {
  const workbook = XLSX.utils.book_new();

  const periodLabel = data.month
    ? `${new Date(data.year, data.month - 1).toLocaleString("en-US", {
        month: "long",
      })} ${data.year}`
    : `Year ${data.year}`;

  // Summary Sheet
  const summaryData = [
    ["Fiscal Compliance Report"],
    [periodLabel],
    [],
    ["Financial Summary"],
    ["Total Income", data.totalIncome],
    ["Total Expenses", data.totalExpenses],
    ["Business Miles", data.totalBusinessMiles],
    ["Mileage Deduction (@ $0.67/mi)", data.mileageDeduction],
    ["Net Income", data.netIncome],
    [],
    ["Compliance Status"],
    ["Compliance Score", `${data.complianceScore}%`],
    ["Unresolved Alerts", data.unresolvedAlerts],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Income Records Sheet
  if (data.incomeRecords && data.incomeRecords.length > 0) {
    const incomeData = [
      ["Date", "Source", "Broker", "Amount"],
      ...data.incomeRecords.map((record) => [
        new Date(record.date).toLocaleDateString(),
        record.source,
        record.brokerName || "-",
        record.amount,
      ]),
    ];

    const incomeSheet = XLSX.utils.aoa_to_sheet(incomeData);
    incomeSheet["!cols"] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income");
  }

  // Expense Records Sheet
  if (data.expenseRecords && data.expenseRecords.length > 0) {
    const expenseData = [
      ["Date", "Category", "Vendor", "Amount", "Description"],
      ...data.expenseRecords.map((record) => [
        new Date(record.date).toLocaleDateString(),
        record.category,
        record.vendor,
        record.amount,
        record.description || "",
      ]),
    ];

    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
    expenseSheet["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");
  }

  // Mileage Records Sheet
  if (data.mileageRecords && data.mileageRecords.length > 0) {
    const mileageData = [
      ["Date", "Business Miles", "Purpose", "Deduction @ $0.67/mi"],
      ...data.mileageRecords.map((record) => [
        new Date(record.date).toLocaleDateString(),
        record.businessMiles,
        record.purpose,
        record.businessMiles * 0.67,
      ]),
    ];

    const mileageSheet = XLSX.utils.aoa_to_sheet(mileageData);
    mileageSheet["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, mileageSheet, "Mileage");
  }

  return workbook;
}

export function downloadFiscalReportExcel(data: FiscalReportData) {
  const workbook = generateFiscalReportExcel(data);
  const periodLabel = data.month
    ? `${new Date(data.year, data.month - 1).toLocaleString("en-US", {
        month: "long",
      })}-${data.year}`
    : `${data.year}`;
  XLSX.writeFile(workbook, `fiscal-report-${periodLabel}.xlsx`);
}
