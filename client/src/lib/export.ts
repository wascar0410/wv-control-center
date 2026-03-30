/**
 * Export utilities for generating PDF and Excel reports
 * Handles projections, analysis, and comparison data exports
 */

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ProjectionsData {
  completedMiles: number;
  quotedMiles: number;
  totalMilesActual: number;
  projectedTotalMiles: number;
  milesPercentage: number;
  willReachGoal: boolean;

  completedProfit: number;
  quotedProfit: number;
  totalProfitActual: number;
  projectedTotalProfit: number;

  dailyAverageMiles: number;
  dailyAverageProfit: number;
  daysPassed: number;
  daysRemaining: number;
  daysInMonth: number;
}

export interface ComparisonData {
  month: string;
  miles: number;
  income: number;
  profit: number;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number | undefined): string {
  if (!value) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format number with thousands separator
 */
function formatNumber(value: number | undefined): string {
  if (!value) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Export projections data to Excel
 */
export async function exportProjectionsToExcel(
  data: ProjectionsData,
  filename: string = "projections.xlsx"
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ["Proyecciones Mensuales - Resumen"],
    [],
    ["Métrica", "Valor"],
    ["Millas Completadas", data.completedMiles],
    ["Millas en Cotización", data.quotedMiles],
    ["Total Millas Actual", data.totalMilesActual],
    ["Millas Proyectadas", data.projectedTotalMiles],
    ["Porcentaje de Meta", `${data.milesPercentage}%`],
    ["¿Alcanzará la Meta?", data.willReachGoal ? "Sí" : "No"],
    [],
    ["Ganancia Completada", formatCurrency(data.completedProfit)],
    ["Ganancia en Cotización", formatCurrency(data.quotedProfit)],
    ["Ganancia Total Actual", formatCurrency(data.totalProfitActual)],
    ["Ganancia Proyectada", formatCurrency(data.projectedTotalProfit)],
    [],
    ["Promedio Diario de Millas", data.dailyAverageMiles],
    ["Promedio Diario de Ganancia", formatCurrency(data.dailyAverageProfit)],
    ["Días Transcurridos", data.daysPassed],
    ["Días Restantes", data.daysRemaining],
    ["Días en el Mes", data.daysInMonth],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  // Sheet 2: Detailed Breakdown
  const detailData = [
    ["Desglose Detallado"],
    [],
    ["Categoría", "Millas", "Ganancia"],
    ["Completadas", data.completedMiles, formatCurrency(data.completedProfit)],
    ["En Cotización", data.quotedMiles, formatCurrency(data.quotedProfit)],
    ["Total Actual", data.totalMilesActual, formatCurrency(data.totalProfitActual)],
    ["Proyectado", data.projectedTotalMiles, formatCurrency(data.projectedTotalProfit)],
  ];

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  detailSheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Desglose");

  // Sheet 3: Metrics
  const metricsData = [
    ["Métricas de Desempeño"],
    [],
    ["Métrica", "Valor"],
    ["Promedio Diario de Millas", data.dailyAverageMiles],
    ["Promedio Diario de Ganancia", formatCurrency(data.dailyAverageProfit)],
    ["Meta de Millas Mensuales", "4,000"],
    ["Progreso hacia Meta", `${data.milesPercentage}%`],
    ["Proyección de Alcance", data.willReachGoal ? "Sí" : "No"],
  ];

  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
  metricsSheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, metricsSheet, "Métricas");

  // Generate and download
  XLSX.writeFile(workbook, filename);
}

/**
 * Export projections data to PDF
 */
export async function exportProjectionsToPDF(
  data: ProjectionsData,
  filename: string = "projections.pdf"
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFontSize(20);
  doc.text("Reporte de Proyecciones Mensuales", margin, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-ES")}`, margin, 28);

  // Summary Section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Resumen de Proyecciones", margin, 40);

  const summaryTable = [
    ["Métrica", "Valor"],
    ["Millas Completadas", formatNumber(data.completedMiles)],
    ["Millas en Cotización", formatNumber(data.quotedMiles)],
    ["Total Millas Actual", formatNumber(data.totalMilesActual)],
    ["Millas Proyectadas", formatNumber(data.projectedTotalMiles)],
    ["Porcentaje de Meta", `${data.milesPercentage}%`],
    ["¿Alcanzará la Meta?", data.willReachGoal ? "Sí" : "No"],
  ];

  autoTable(doc, {
    head: [summaryTable[0]],
    body: summaryTable.slice(1),
    startY: 45,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  let yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Profit Section
  doc.setFontSize(14);
  doc.text("Análisis de Ganancias", margin, yPosition);

  const profitTable = [
    ["Categoría", "Ganancia"],
    ["Ganancia Completada", formatCurrency(data.completedProfit)],
    ["Ganancia en Cotización", formatCurrency(data.quotedProfit)],
    ["Ganancia Total Actual", formatCurrency(data.totalProfitActual)],
    ["Ganancia Proyectada", formatCurrency(data.projectedTotalProfit)],
  ];

  autoTable(doc, {
    head: [profitTable[0]],
    body: profitTable.slice(1),
    startY: yPosition + 5,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [46, 204, 113],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Metrics Section
  doc.setFontSize(14);
  doc.text("Métricas de Desempeño", margin, yPosition);

  const metricsTable = [
    ["Métrica", "Valor"],
    ["Promedio Diario de Millas", formatNumber(data.dailyAverageMiles)],
    ["Promedio Diario de Ganancia", formatCurrency(data.dailyAverageProfit)],
    ["Días Transcurridos", formatNumber(data.daysPassed)],
    ["Días Restantes", formatNumber(data.daysRemaining)],
    ["Días en el Mes", formatNumber(data.daysInMonth)],
  ];

  autoTable(doc, {
    head: [metricsTable[0]],
    body: metricsTable.slice(1),
    startY: yPosition + 5,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [155, 89, 182],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Página 1 de 1`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  doc.save(filename);
}

/**
 * Export comparison data to Excel
 */
export async function exportComparisonToExcel(
  data: ComparisonData[],
  filename: string = "comparison.xlsx"
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ["Análisis Comparativo - Resumen"],
    [],
    ["Mes", "Millas", "Ingresos", "Ganancias"],
    ...data.map((row) => [
      row.month,
      formatNumber(row.miles),
      formatCurrency(row.income),
      formatCurrency(row.profit),
    ]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  // Sheet 2: Statistics
  const miles = data.map((d) => d.miles);
  const income = data.map((d) => d.income);
  const profit = data.map((d) => d.profit);

  const statsData = [
    ["Estadísticas"],
    [],
    ["Métrica", "Millas", "Ingresos", "Ganancias"],
    [
      "Promedio",
      formatNumber(miles.reduce((a, b) => a + b, 0) / miles.length),
      formatCurrency(income.reduce((a, b) => a + b, 0) / income.length),
      formatCurrency(profit.reduce((a, b) => a + b, 0) / profit.length),
    ],
    [
      "Máximo",
      formatNumber(Math.max(...miles)),
      formatCurrency(Math.max(...income)),
      formatCurrency(Math.max(...profit)),
    ],
    [
      "Mínimo",
      formatNumber(Math.min(...miles)),
      formatCurrency(Math.min(...income)),
      formatCurrency(Math.min(...profit)),
    ],
  ];

  const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
  statsSheet["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, statsSheet, "Estadísticas");

  XLSX.writeFile(workbook, filename);
}

/**
 * Export comparison data to PDF
 */
export async function exportComparisonToPDF(
  data: ComparisonData[],
  filename: string = "comparison.pdf"
): Promise<void> {
  const doc = new jsPDF();
  const margin = 15;

  // Header
  doc.setFontSize(20);
  doc.text("Análisis Comparativo", margin, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-ES")}`, margin, 28);

  // Comparison Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Comparativa Mensual", margin, 40);

  const comparisonTable = [
    ["Mes", "Millas", "Ingresos", "Ganancias"],
    ...data.map((row) => [
      row.month,
      formatNumber(row.miles),
      formatCurrency(row.income),
      formatCurrency(row.profit),
    ]),
  ];

  autoTable(doc, {
    head: [comparisonTable[0]],
    body: comparisonTable.slice(1),
    startY: 45,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  let yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Statistics
  doc.setFontSize(14);
  doc.text("Estadísticas", margin, yPosition);

  const miles = data.map((d) => d.miles);
  const income = data.map((d) => d.income);
  const profit = data.map((d) => d.profit);

  const statsTable = [
    ["Métrica", "Millas", "Ingresos", "Ganancias"],
    [
      "Promedio",
      formatNumber(miles.reduce((a, b) => a + b, 0) / miles.length),
      formatCurrency(income.reduce((a, b) => a + b, 0) / income.length),
      formatCurrency(profit.reduce((a, b) => a + b, 0) / profit.length),
    ],
    [
      "Máximo",
      formatNumber(Math.max(...miles)),
      formatCurrency(Math.max(...income)),
      formatCurrency(Math.max(...profit)),
    ],
    [
      "Mínimo",
      formatNumber(Math.min(...miles)),
      formatCurrency(Math.min(...income)),
      formatCurrency(Math.min(...profit)),
    ],
  ];

  autoTable(doc, {
    head: [statsTable[0]],
    body: statsTable.slice(1),
    startY: yPosition + 5,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [46, 204, 113],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  doc.save(filename);
}

/**
 * Export all dashboard data to a comprehensive Excel file
 */
export async function exportDashboardToExcel(
  projections: ProjectionsData,
  comparison: ComparisonData[],
  filename: string = "dashboard-report.xlsx"
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryData = [
    ["Resumen Ejecutivo del Dashboard"],
    [],
    ["Período", new Date().toLocaleDateString("es-ES")],
    [],
    ["Proyecciones Mensuales"],
    ["Millas Proyectadas", formatNumber(projections.projectedTotalMiles)],
    ["Ganancia Proyectada", formatCurrency(projections.projectedTotalProfit)],
    ["Progreso hacia Meta", `${projections.milesPercentage}%`],
    ["¿Alcanzará la Meta?", projections.willReachGoal ? "Sí" : "No"],
    [],
    ["Comparativa Histórica"],
    ["Período Analizado", `${comparison.length} meses`],
    [
      "Promedio de Millas",
      formatNumber(
        comparison.reduce((a, b) => a + b.miles, 0) / comparison.length
      ),
    ],
    [
      "Promedio de Ganancias",
      formatCurrency(
        comparison.reduce((a, b) => a + b.profit, 0) / comparison.length
      ),
    ],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen Ejecutivo");

  // Sheet 2: Projections
  const projectionsData = [
    ["Proyecciones Mensuales Detalladas"],
    [],
    ["Métrica", "Valor"],
    ["Millas Completadas", formatNumber(projections.completedMiles)],
    ["Millas en Cotización", formatNumber(projections.quotedMiles)],
    ["Total Millas Actual", formatNumber(projections.totalMilesActual)],
    ["Millas Proyectadas", formatNumber(projections.projectedTotalMiles)],
    ["Ganancia Completada", formatCurrency(projections.completedProfit)],
    ["Ganancia en Cotización", formatCurrency(projections.quotedProfit)],
    ["Ganancia Total Actual", formatCurrency(projections.totalProfitActual)],
    ["Ganancia Proyectada", formatCurrency(projections.projectedTotalProfit)],
    ["Promedio Diario de Millas", formatNumber(projections.dailyAverageMiles)],
    [
      "Promedio Diario de Ganancia",
      formatCurrency(projections.dailyAverageProfit),
    ],
  ];

  const projectionsSheet = XLSX.utils.aoa_to_sheet(projectionsData);
  projectionsSheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, projectionsSheet, "Proyecciones");

  // Sheet 3: Comparison
  const comparisonTableData = [
    ["Análisis Comparativo"],
    [],
    ["Mes", "Millas", "Ingresos", "Ganancias"],
    ...comparison.map((row) => [
      row.month,
      formatNumber(row.miles),
      formatCurrency(row.income),
      formatCurrency(row.profit),
    ]),
  ];

  const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonTableData);
  comparisonSheet["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, "Comparativa");

  XLSX.writeFile(workbook, filename);
}

/**
 * Export all dashboard data to a comprehensive PDF file
 */
export async function exportDashboardToPDF(
  projections: ProjectionsData,
  comparison: ComparisonData[],
  filename: string = "dashboard-report.pdf"
): Promise<void> {
  const doc = new jsPDF();
  const margin = 15;

  // Page 1: Executive Summary
  doc.setFontSize(20);
  doc.text("Reporte del Dashboard", margin, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-ES")}`, margin, 28);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Resumen Ejecutivo", margin, 40);

  const summaryTable = [
    ["Métrica", "Valor"],
    ["Millas Proyectadas", formatNumber(projections.projectedTotalMiles)],
    ["Ganancia Proyectada", formatCurrency(projections.projectedTotalProfit)],
    ["Progreso hacia Meta", `${projections.milesPercentage}%`],
    ["¿Alcanzará la Meta?", projections.willReachGoal ? "Sí" : "No"],
    ["Período Analizado", `${comparison.length} meses`],
  ];

  autoTable(doc, {
    head: [summaryTable[0]],
    body: summaryTable.slice(1),
    startY: 45,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Add page break
  doc.addPage();

  // Page 2: Projections
  doc.setFontSize(14);
  doc.text("Proyecciones Mensuales", margin, 20);

  const projectionsTable = [
    ["Métrica", "Valor"],
    ["Millas Completadas", formatNumber(projections.completedMiles)],
    ["Millas en Cotización", formatNumber(projections.quotedMiles)],
    ["Total Millas Actual", formatNumber(projections.totalMilesActual)],
    ["Millas Proyectadas", formatNumber(projections.projectedTotalMiles)],
    ["Ganancia Completada", formatCurrency(projections.completedProfit)],
    ["Ganancia en Cotización", formatCurrency(projections.quotedProfit)],
    ["Ganancia Total Actual", formatCurrency(projections.totalProfitActual)],
    ["Ganancia Proyectada", formatCurrency(projections.projectedTotalProfit)],
  ];

  autoTable(doc, {
    head: [projectionsTable[0]],
    body: projectionsTable.slice(1),
    startY: 25,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [46, 204, 113],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Add page break
  doc.addPage();

  // Page 3: Comparison
  doc.setFontSize(14);
  doc.text("Análisis Comparativo", margin, 20);

  const comparisonTable = [
    ["Mes", "Millas", "Ingresos", "Ganancias"],
    ...comparison.map((row) => [
      row.month,
      formatNumber(row.miles),
      formatCurrency(row.income),
      formatCurrency(row.profit),
    ]),
  ];

  autoTable(doc, {
    head: [comparisonTable[0]],
    body: comparisonTable.slice(1),
    startY: 25,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  doc.save(filename);
}
