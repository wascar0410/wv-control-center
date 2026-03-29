/**
 * PDF Report Generator with WV Transport Branding
 * Generates branded PDF reports for exports and documents
 */

import { PDFDocument, PDFPage, rgb, degrees } from "pdf-lib";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/mSbbvEPZCkmEtZbYVdHD74/LogodeWVTransportControl(1)_686a838d.png";
const BRAND_PRIMARY = { r: 0 / 255, g: 116 / 255, b: 217 / 255 }; // Sky Blue #0074D9
const BRAND_DARK = { r: 0 / 255, g: 31 / 255, b: 63 / 255 }; // Navy Blue #001F3F
const BRAND_ACCENT = { r: 0 / 255, g: 208 / 255, b: 132 / 255 }; // Green #00D084

interface ReportOptions {
  title: string;
  subtitle?: string;
  content: string;
  generatedDate?: Date;
  generatedBy?: string;
}

/**
 * Adds header with logo and branding to PDF
 */
async function addBrandedHeader(page: PDFPage, title: string, subtitle?: string) {
  const { width, height } = page.getSize();

  // Download and embed logo
  try {
    const logoResponse = await fetch(LOGO_URL);
    const logoBuffer = await logoResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(logoBuffer);
    // Note: This is simplified - in production, you'd embed the PNG properly
  } catch (error) {
    console.warn("Could not load logo for PDF:", error);
  }

  // Draw header background
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: rgb(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b),
  });

  // Draw accent line
  page.drawRectangle({
    x: 0,
    y: height - 85,
    width: width,
    height: 5,
    color: rgb(BRAND_PRIMARY.r, BRAND_PRIMARY.g, BRAND_PRIMARY.b),
  });

  // Add title
  page.drawText(title, {
    x: 40,
    y: height - 50,
    size: 24,
    color: rgb(1, 1, 1),
    font: undefined,
  });

  // Add subtitle if provided
  if (subtitle) {
    page.drawText(subtitle, {
      x: 40,
      y: height - 70,
      size: 12,
      color: rgb(0.7, 0.7, 0.7),
      font: undefined,
    });
  }

  // Add company name
  page.drawText("WV Transport, LLC", {
    x: width - 150,
    y: height - 60,
    size: 10,
    color: rgb(0.9, 0.9, 0.9),
    font: undefined,
  });
}

/**
 * Adds footer with branding to PDF
 */
function addBrandedFooter(page: PDFPage, generatedDate?: Date, generatedBy?: string) {
  const { width, height } = page.getSize();

  // Draw footer background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 40,
    color: rgb(0.96, 0.96, 0.96),
  });

  // Draw accent line
  page.drawRectangle({
    x: 0,
    y: 40,
    width: width,
    height: 2,
    color: rgb(BRAND_PRIMARY.r, BRAND_PRIMARY.g, BRAND_PRIMARY.b),
  });

  // Add footer text
  const footerText = "© 2026 WV Transport, LLC. Todos los derechos reservados.";
  page.drawText(footerText, {
    x: 40,
    y: 15,
    size: 9,
    color: rgb(0.5, 0.5, 0.5),
    font: undefined,
  });

  // Add generated info
  let infoText = "";
  if (generatedDate) {
    infoText += `Generado: ${generatedDate.toLocaleDateString("es-ES")}`;
  }
  if (generatedBy) {
    infoText += ` | Por: ${generatedBy}`;
  }

  if (infoText) {
    page.drawText(infoText, {
      x: width - 200,
      y: 15,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
      font: undefined,
    });
  }
}

/**
 * Creates a branded PDF document
 */
export async function createBrandedPDF(options: ReportOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  // Add branding
  await addBrandedHeader(page, options.title, options.subtitle);
  addBrandedFooter(page, options.generatedDate, options.generatedBy);

  // Add content (simplified - in production, you'd parse HTML/markdown)
  const { height } = page.getSize();
  let yPosition = height - 120;

  // Split content into lines and add to page
  const lines = options.content.split("\n");
  for (const line of lines) {
    if (yPosition < 60) {
      // Create new page if needed
      const newPage = pdfDoc.addPage();
      await addBrandedHeader(newPage, options.title, options.subtitle);
      addBrandedFooter(newPage, options.generatedDate, options.generatedBy);
      yPosition = newPage.getHeight() - 120;
    }

    page.drawText(line, {
      x: 40,
      y: yPosition,
      size: 11,
      color: rgb(0.2, 0.2, 0.2),
      font: undefined,
    });

    yPosition -= 15;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Creates a financial report PDF
 */
export async function createFinancialReportPDF(
  title: string,
  data: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    period: string;
    details: Array<{ label: string; amount: number }>;
  }
): Promise<Buffer> {
  const content = `
Período: ${data.period}

RESUMEN FINANCIERO
================

Ingresos Totales: $${data.totalIncome.toFixed(2)}
Gastos Totales: $${data.totalExpenses.toFixed(2)}
Ganancia Neta: $${data.netProfit.toFixed(2)}

DETALLES
========

${data.details.map((d) => `${d.label}: $${d.amount.toFixed(2)}`).join("\n")}

Generado por: WV Control Center
Fecha: ${new Date().toLocaleDateString("es-ES")}
  `;

  return createBrandedPDF({
    title,
    subtitle: "Reporte Financiero",
    content,
    generatedDate: new Date(),
    generatedBy: "Sistema WV Control Center",
  });
}

/**
 * Creates a loads/shipments report PDF
 */
export async function createLoadsReportPDF(
  title: string,
  data: {
    loads: Array<{
      id: string;
      origin: string;
      destination: string;
      status: string;
      amount: number;
    }>;
    summary: {
      totalLoads: number;
      completedLoads: number;
      totalRevenue: number;
    };
  }
): Promise<Buffer> {
  const content = `
RESUMEN DE CARGAS
================

Total de Cargas: ${data.summary.totalLoads}
Cargas Completadas: ${data.summary.completedLoads}
Ingresos Totales: $${data.summary.totalRevenue.toFixed(2)}

DETALLE DE CARGAS
=================

${data.loads
  .map(
    (load) =>
      `
ID: ${load.id}
Origen: ${load.origin}
Destino: ${load.destination}
Estado: ${load.status}
Monto: $${load.amount.toFixed(2)}
---`
  )
  .join("\n")}

Generado por: WV Control Center
Fecha: ${new Date().toLocaleDateString("es-ES")}
  `;

  return createBrandedPDF({
    title,
    subtitle: "Reporte de Cargas",
    content,
    generatedDate: new Date(),
    generatedBy: "Sistema WV Control Center",
  });
}

/**
 * Creates a quotation/estimate PDF
 */
export async function createQuotationPDF(
  data: {
    quotationId: string;
    clientName: string;
    pickupAddress: string;
    deliveryAddress: string;
    weight: string;
    distance: string;
    basePrice: number;
    surcharges: Array<{ label: string; amount: number }>;
    totalPrice: number;
    validUntil: Date;
  }
): Promise<Buffer> {
  const surchargesText = data.surcharges.map((s) => `${s.label}: $${s.amount.toFixed(2)}`).join("\n");

  const content = `
COTIZACIÓN DE TRANSPORTE
========================

ID de Cotización: ${data.quotationId}
Cliente: ${data.clientName}
Válido hasta: ${data.validUntil.toLocaleDateString("es-ES")}

DETALLES DEL ENVÍO
==================

Origen: ${data.pickupAddress}
Destino: ${data.deliveryAddress}
Peso: ${data.weight}
Distancia: ${data.distance}

PRECIOS
=======

Precio Base: $${data.basePrice.toFixed(2)}

Recargos:
${surchargesText}

TOTAL: $${data.totalPrice.toFixed(2)}

Términos y Condiciones:
- Esta cotización es válida hasta la fecha indicada
- Los precios pueden variar según cambios en combustible
- Sujeto a confirmación de disponibilidad
- Contacte a WV Transport para más información

Generado por: WV Control Center
Fecha: ${new Date().toLocaleDateString("es-ES")}
  `;

  return createBrandedPDF({
    title: "Cotización de Transporte",
    subtitle: `ID: ${data.quotationId}`,
    content,
    generatedDate: new Date(),
    generatedBy: "Sistema WV Control Center",
  });
}

export { LOGO_URL, BRAND_PRIMARY, BRAND_DARK, BRAND_ACCENT };
