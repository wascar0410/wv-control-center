import { describe, it, expect } from "vitest";
import {
  getWelcomeEmailTemplate,
  getLoadAssignmentEmailTemplate,
  getPaymentNotificationEmailTemplate,
  getAlertEmailTemplate,
  getReportEmailTemplate,
  LOGO_URL,
  BRAND_PRIMARY,
  BRAND_DARK,
  BRAND_ACCENT,
} from "./_core/emailTemplates";
import {
  createBrandedPDF,
  createFinancialReportPDF,
  createLoadsReportPDF,
  createQuotationPDF,
} from "./_core/pdfReports";

describe("Email Templates with Branding", () => {
  it("should generate welcome email with logo and branding", () => {
    const email = getWelcomeEmailTemplate("John Doe", "https://example.com/login");

    expect(email.subject).toContain("Bienvenido");
    expect(email.html).toContain(LOGO_URL);
    expect(email.html).toContain("WV Transport, LLC");
    expect(email.html).toContain(BRAND_PRIMARY);
    expect(email.text).toContain("John Doe");
    expect(email.text).toContain("https://example.com/login");
  });

  it("should generate load assignment email with details", () => {
    const email = getLoadAssignmentEmailTemplate(
      "Driver Name",
      "LOAD-12345",
      "New York, NY",
      "Los Angeles, CA",
      "https://example.com/dashboard"
    );

    expect(email.subject).toContain("LOAD-12345");
    expect(email.html).toContain("LOAD-12345");
    expect(email.html).toContain("New York, NY");
    expect(email.html).toContain("Los Angeles, CA");
    expect(email.html).toContain(LOGO_URL);
  });

  it("should generate payment notification email with amount", () => {
    const email = getPaymentNotificationEmailTemplate(
      "John Doe",
      1500.5,
      "USD",
      "TXN-98765",
      "https://example.com/transactions"
    );

    expect(email.subject).toContain("Pago Procesado");
    expect(email.html).toContain("1500.50");
    expect(email.html).toContain("TXN-98765");
    expect(email.html).toContain("USD");
    expect(email.html).toContain(BRAND_ACCENT); // Success color
  });

  it("should generate alert email with severity levels", () => {
    const infoEmail = getAlertEmailTemplate(
      "Admin",
      "System Update",
      "A new update is available",
      "info"
    );

    const warningEmail = getAlertEmailTemplate(
      "Admin",
      "High Load Alert",
      "System is under heavy load",
      "warning"
    );

    const criticalEmail = getAlertEmailTemplate(
      "Admin",
      "Critical Error",
      "System error detected",
      "critical"
    );

    expect(infoEmail.subject).toContain("[INFO]");
    expect(warningEmail.subject).toContain("[WARNING]");
    expect(criticalEmail.subject).toContain("[CRITICAL]");
  });

  it("should generate report email with download link", () => {
    const email = getReportEmailTemplate(
      "John Doe",
      "Monthly Financial Report",
      "Complete financial summary for March 2026",
      "https://example.com/download/report.pdf"
    );

    expect(email.subject).toContain("Monthly Financial Report");
    expect(email.html).toContain("Descargar Reporte");
    expect(email.html).toContain(LOGO_URL);
  });

  it("should include brand colors in all emails", () => {
    const emails = [
      getWelcomeEmailTemplate("User", "https://example.com"),
      getLoadAssignmentEmailTemplate("Driver", "L1", "A", "B", "https://example.com"),
      getPaymentNotificationEmailTemplate("User", 100, "USD", "T1", "https://example.com"),
      getReportEmailTemplate("User", "Report", "Desc", "https://example.com/report.pdf"),
    ];

    emails.forEach((email) => {
      expect(email.html).toContain("WV Transport, LLC");
      expect(email.html).toContain(LOGO_URL);
      expect(email.html).toContain("© 2026 WV Transport, LLC");
    });
  });
});

describe("PDF Reports with Branding", () => {
  it("should create branded PDF document", async () => {
    const pdf = await createBrandedPDF({
      title: "Test Report",
      subtitle: "Test Subtitle",
      content: "This is test content for the PDF report",
      generatedDate: new Date("2026-03-29"),
      generatedBy: "Test System",
    });

    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
    // PDF files start with %PDF signature
    expect(pdf.toString("utf8", 0, 4)).toContain("%PDF");
  });

  it("should create financial report PDF", async () => {
    const pdf = await createFinancialReportPDF("March 2026 Financial Report", {
      totalIncome: 50000,
      totalExpenses: 30000,
      netProfit: 20000,
      period: "March 2026",
      details: [
        { label: "Freight Revenue", amount: 50000 },
        { label: "Fuel Costs", amount: 15000 },
        { label: "Driver Salaries", amount: 15000 },
      ],
    });

    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.toString("utf8", 0, 4)).toContain("%PDF");
  });

  it("should create loads report PDF", async () => {
    const pdf = await createLoadsReportPDF("Weekly Loads Report", {
      loads: [
        {
          id: "LOAD-001",
          origin: "New York",
          destination: "Boston",
          status: "Completed",
          amount: 1500,
        },
        {
          id: "LOAD-002",
          origin: "Boston",
          destination: "Philadelphia",
          status: "In Transit",
          amount: 2000,
        },
      ],
      summary: {
        totalLoads: 2,
        completedLoads: 1,
        totalRevenue: 3500,
      },
    });

    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.toString("utf8", 0, 4)).toContain("%PDF");
  });

  it("should create quotation PDF", async () => {
    const pdf = await createQuotationPDF({
      quotationId: "QUOTE-2026-001",
      clientName: "ABC Logistics",
      pickupAddress: "123 Main St, New York, NY",
      deliveryAddress: "456 Oak Ave, Los Angeles, CA",
      weight: "5000 lbs",
      distance: "2800 miles",
      basePrice: 3500,
      surcharges: [
        { label: "Fuel Surcharge", amount: 500 },
        { label: "Weight Surcharge", amount: 200 },
      ],
      totalPrice: 4200,
      validUntil: new Date("2026-04-29"),
    });

    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.toString("utf8", 0, 4)).toContain("%PDF");
  });
});

describe("Brand Constants", () => {
  it("should have valid logo URL", () => {
    expect(LOGO_URL).toContain("https://");
    expect(LOGO_URL).toContain("cloudfront.net");
  });

  it("should have brand colors defined", () => {
    // Brand colors are hex strings in emailTemplates and RGB objects in pdfReports
    expect(BRAND_PRIMARY).toBeDefined();
    expect(typeof BRAND_PRIMARY).toBe('string');
    expect(BRAND_PRIMARY).toMatch(/^#[0-9A-F]{6}$/i);

    expect(BRAND_DARK).toBeDefined();
    expect(typeof BRAND_DARK).toBe('string');
    expect(BRAND_DARK).toMatch(/^#[0-9A-F]{6}$/i);

    expect(BRAND_ACCENT).toBeDefined();
    expect(typeof BRAND_ACCENT).toBe('string');
    expect(BRAND_ACCENT).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
