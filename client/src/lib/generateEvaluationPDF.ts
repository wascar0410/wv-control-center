import jsPDF from "jspdf";
import { LoadEvaluatorFormData } from "@/hooks/useLoadEvaluatorForm";

interface EvaluationResult {
  decision: "ACCEPT" | "NEGOTIATE" | "REJECT";
  decisionReason: string;
  estimatedProfit: number;
  estimatedMarginPercent: number;
  totalMiles: number;
  offeredRatePerMile: number;
  recommendedMinRatePerMile: number;
  totalCostPerMile: number;
  estimatedProfitPerMile: number;
  fuelCostPerMile: number;
  variableCostPerMile: number;
  fixedCostPerMile: number;
  distanceSurchargePerMile: number;
  weightSurchargePerMile: number;
  totalEstimatedCost: number;
}

export function generateEvaluationPDF(
  form: LoadEvaluatorFormData,
  evaluation: EvaluationResult
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add a line
  const addLine = (y: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, pageWidth - 20, y);
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Set font for title
  doc.setFontSize(24);
  doc.setTextColor(33, 150, 243);
  doc.text("Evaluación de Carga", 20, yPosition);
  yPosition += 15;

  // Add timestamp
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const now = new Date().toLocaleString("es-ES");
  doc.text(`Generado: ${now}`, 20, yPosition);
  yPosition += 10;

  addLine(yPosition);
  yPosition += 8;

  // Section 1: Información de la Carga
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Información de la Carga", 20, yPosition);
  yPosition += 8;

  const loadInfo = [
    [`Cliente:`, form.clientName || "N/A"],
    [`Broker:`, form.brokerName || "N/A"],
    [`Origen:`, form.origin],
    [`Destino:`, form.destination],
    [`Fecha Pickup:`, form.pickupDate || "N/A"],
    [`Fecha Entrega:`, form.deliveryDate || "N/A"],
  ];

  doc.setFontSize(11);
  loadInfo.forEach(([label, value]) => {
    doc.setTextColor(80, 80, 80);
    doc.text(label, 25, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), 80, yPosition);
    yPosition += 6;
  });

  yPosition += 4;
  addLine(yPosition);
  yPosition += 8;

  // Section 2: Decisión y Recomendación
  checkNewPage(40);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Decisión y Recomendación", 20, yPosition);
  yPosition += 8;

  // Decision box with color
  const decisionColors = {
    ACCEPT: { bg: [76, 175, 80], text: "ACEPTAR" },
    NEGOTIATE: { bg: [255, 193, 7], text: "NEGOCIAR" },
    REJECT: { bg: [244, 67, 54], text: "RECHAZAR" },
  };

  const colors = decisionColors[evaluation.decision];
  doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
  doc.rect(25, yPosition - 5, 160, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(undefined as any, "bold");
  doc.text(`${colors.text}`, 110, yPosition + 2, { align: "center" });

  yPosition += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined as any, "normal");
  doc.setFontSize(11);
  const reasonText = doc.splitTextToSize(evaluation.decisionReason, 160);
  doc.text(reasonText, 25, yPosition);
  yPosition += reasonText.length * 5 + 4;

  yPosition += 4;
  addLine(yPosition);
  yPosition += 8;

  // Section 3: Resumen Financiero
  checkNewPage(50);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Resumen Financiero", 20, yPosition);
  yPosition += 8;

  const financialSummary: Array<[string, string, boolean?]> = [
    [`Pago Ofrecido:`, `$${parseFloat(form.offeredPrice).toFixed(2)}`],
    [`Costo Total Estimado:`, `$${evaluation.totalEstimatedCost.toFixed(2)}`],
    [`Ganancia Estimada:`, `$${evaluation.estimatedProfit.toFixed(2)}`, true],
    [`Margen de Ganancia:`, `${evaluation.estimatedMarginPercent.toFixed(1)}%`, true],
  ];

  doc.setFontSize(11);
  financialSummary.forEach(([label, value, isBold]) => {
    if (isBold) {
      doc.setFont(undefined as any, "bold");
      doc.setTextColor(33, 150, 243);
    } else {
      doc.setFont(undefined as any, "normal");
      doc.setTextColor(80, 80, 80);
    }
    doc.text(label, 25, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.text(value, 130, yPosition);
    yPosition += 6;
  });

  yPosition += 4;
  addLine(yPosition);
  yPosition += 8;

  // Section 4: Métricas por Milla
  checkNewPage(50);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Métricas por Milla", 20, yPosition);
  yPosition += 8;

  const metricsPerMile = [
    [`Millas Totales:`, `${evaluation.totalMiles.toFixed(0)} mi`],
    [`Tarifa Ofrecida:`, `$${evaluation.offeredRatePerMile.toFixed(2)}/mi`],
    [`Tarifa Mínima Recomendada:`, `$${evaluation.recommendedMinRatePerMile.toFixed(2)}/mi`],
    [`Costo Total:`, `$${evaluation.totalCostPerMile.toFixed(2)}/mi`],
    [`Ganancia:`, `$${evaluation.estimatedProfitPerMile.toFixed(2)}/mi`],
  ];

  doc.setFontSize(11);
  metricsPerMile.forEach(([label, value]) => {
    doc.setTextColor(80, 80, 80);
    doc.text(label, 25, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), 130, yPosition);
    yPosition += 6;
  });

  yPosition += 4;
  addLine(yPosition);
  yPosition += 8;

  // Section 5: Desglose de Costos
  checkNewPage(60);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Desglose de Costos por Milla", 20, yPosition);
  yPosition += 8;

  const costBreakdown = [
    ["Concepto", "Costo/Milla"],
    ["Combustible", `$${evaluation.fuelCostPerMile.toFixed(2)}`],
    ["Mantenimiento", `$${(evaluation.variableCostPerMile - evaluation.fuelCostPerMile).toFixed(2)}`],
    ["Costos Fijos", `$${evaluation.fixedCostPerMile.toFixed(2)}`],
    ["Recargo Distancia", `$${evaluation.distanceSurchargePerMile.toFixed(2)}`],
    ["Recargo Peso", `$${evaluation.weightSurchargePerMile.toFixed(2)}`],
    ["TOTAL", `$${evaluation.totalCostPerMile.toFixed(2)}`],
  ];

  // Table header
  doc.setFont(undefined as any, "bold");
  doc.setFillColor(33, 150, 243);
  doc.setTextColor(255, 255, 255);
  doc.text(costBreakdown[0][0], 25, yPosition);
  doc.text(costBreakdown[0][1], 130, yPosition);
  yPosition += 6;

  // Table rows
  doc.setFont(undefined as any, "normal");
  doc.setTextColor(0, 0, 0);
  costBreakdown.slice(1).forEach((row, index) => {
    if (index === costBreakdown.length - 2) {
      // Last row (TOTAL)
      doc.setFont(undefined as any, "bold");
      doc.setFillColor(240, 240, 240);
      doc.rect(25, yPosition - 4, 160, 5, "F");
    }
    doc.text(row[0], 25, yPosition);
    doc.text(row[1], 130, yPosition);
    yPosition += 6;
  });

  yPosition += 8;
  addLine(yPosition);
  yPosition += 8;

  // Section 6: Notas
  if (form.notes) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Notas", 20, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    const notesText = doc.splitTextToSize(form.notes, 160);
    doc.text(notesText, 25, yPosition);
    yPosition += notesText.length * 5;
  }

  // Footer
  yPosition = pageHeight - 15;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `WV Control Center - Evaluación de Carga - Página ${doc.getNumberOfPages()}`,
    pageWidth / 2,
    yPosition,
    { align: "center" }
  );

  // Generate filename
  const clientName = form.clientName || "cliente";
  const date = new Date().toISOString().split("T")[0];
  const filename = `evaluacion-${clientName}-${date}.pdf`;

  // Save PDF
  doc.save(filename);
}
