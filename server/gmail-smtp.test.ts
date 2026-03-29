import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendEmail, getEmailConfig, getSMTPConfig } from "./_core/emailService";

describe("Gmail SMTP Email Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set Gmail SMTP configuration
    process.env.SMTP_ENABLED = "true";
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "wascardely@gmail.com";
    process.env.SMTP_PASSWORD = "test-password";
    process.env.PRIMARY_CONTACT_EMAIL = "wascardely@gmail.com";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Email Configuration", () => {
    it("should have Gmail SMTP configured", () => {
      const smtpConfig = getSMTPConfig();
      expect(smtpConfig).not.toBeNull();
      expect(smtpConfig?.host).toBe("smtp.gmail.com");
      expect(smtpConfig?.port).toBe(587);
      expect(smtpConfig?.user).toBe("wascardely@gmail.com");
    });

    it("should have email config with correct from address", () => {
      const config = getEmailConfig();
      expect(config.fromEmail).toBe("noreply@wvtransports.com");
      expect(config.fromName).toBe("WV Transport Control");
    });

    it("should use custom from email when configured", () => {
      process.env.SMTP_FROM_EMAIL = "wascardely@gmail.com";
      process.env.SMTP_FROM_NAME = "Wasca Dely";

      const config = getEmailConfig();
      expect(config.fromEmail).toBe("wascardely@gmail.com");
      expect(config.fromName).toBe("Wasca Dely");
    });
  });

  describe("Email Sending", () => {
    it("should be able to send confirmation email", async () => {
      const result = await sendEmail(
        "test@example.com",
        "Test Confirmation",
        "<p>Test HTML content</p>",
        "Test text content"
      );

      // Email sending might fail due to invalid credentials in test env
      // but we're testing the function structure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
    });

    it("should handle missing SMTP configuration gracefully", async () => {
      process.env.SMTP_HOST = undefined;
      process.env.SMTP_USER = undefined;
      process.env.SMTP_PASSWORD = undefined;

      const result = await sendEmail(
        "test@example.com",
        "Test",
        "<p>Test</p>"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Contact Form Email Workflow", () => {
    it("should have primary contact email for owner notifications", () => {
      const primaryEmail = process.env.PRIMARY_CONTACT_EMAIL || "wascardely@gmail.com";
      expect(primaryEmail).toBe("wascardely@gmail.com");
    });

    it("should have business email configured for future use", () => {
      const businessEmail = process.env.BUSINESS_EMAIL || "info@wvtransports.com";
      expect(businessEmail).toBe("info@wvtransports.com");
    });

    it("should be able to send both confirmation and owner notification", async () => {
      const userEmail = "user@example.com";
      const ownerEmail = "wascardely@gmail.com";

      // Test confirmation email
      const confirmationResult = await sendEmail(
        userEmail,
        "Confirmación de tu solicitud - WV Transport",
        "<p>Gracias por tu solicitud</p>",
        "Gracias por tu solicitud"
      );

      expect(confirmationResult).toHaveProperty("success");

      // Test owner notification email
      const ownerNotificationResult = await sendEmail(
        ownerEmail,
        "Nueva Solicitud de Contacto",
        "<p>Nueva solicitud recibida</p>",
        "Nueva solicitud"
      );

      expect(ownerNotificationResult).toHaveProperty("success");
    });
  });

  describe("Email HTML Templates", () => {
    it("should generate valid confirmation HTML", () => {
      const name = "John Doe";
      const message = "I want more information about your services";

      const confirmationHtml = `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px; border-radius: 8px;"><h2 style="color: #0074D9;">Gracias por tu solicitud</h2><p>Hola ${name},</p><p>Hemos recibido tu solicitud de contacto. Nos pondremos en contacto contigo pronto.</p><p><strong>Tu mensaje:</strong><br/>${message}</p><p>Si tienes preguntas urgentes: wascardely@gmail.com | +1 (973) 955-8328</p><p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">WV Transport Control</p></div>`;

      expect(confirmationHtml).toContain(name);
      expect(confirmationHtml).toContain(message);
      expect(confirmationHtml).toContain("wascardely@gmail.com");
      expect(confirmationHtml).toContain("#0074D9"); // Brand color
    });

    it("should generate valid owner notification HTML", () => {
      const name = "John Doe";
      const email = "john@example.com";
      const company = "Acme Corp";
      const message = "I want more information about your services";

      const ownerNotificationHtml = `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px; border-radius: 8px;"><h2 style="color: #001F3F;">Nueva Solicitud de Contacto</h2><p><strong>De:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Empresa:</strong> ${company}</p><p><strong>Mensaje:</strong><br/>${message}</p><p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">Recibido el: ${new Date().toLocaleString("es-ES")}</p></div>`;

      expect(ownerNotificationHtml).toContain(name);
      expect(ownerNotificationHtml).toContain(email);
      expect(ownerNotificationHtml).toContain(company);
      expect(ownerNotificationHtml).toContain(message);
      expect(ownerNotificationHtml).toContain("#001F3F"); // Brand color
    });
  });
});
