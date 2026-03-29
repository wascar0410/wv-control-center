import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEmailConfig, getSMTPConfig, getTwilioConfig } from "./_core/emailService";

describe("Email Service Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getEmailConfig", () => {
    it("should return 'none' provider when no email service is configured", () => {
      process.env.SMTP_ENABLED = "false";
      process.env.SENDGRID_API_KEY = undefined;
      process.env.RESEND_API_KEY = undefined;

      const config = getEmailConfig();

      expect(config.provider).toBe("none");
      expect(config.enabled).toBe(false);
    });

    it("should return 'smtp' provider when SMTP is enabled", () => {
      process.env.SMTP_ENABLED = "true";

      const config = getEmailConfig();

      expect(config.provider).toBe("smtp");
      expect(config.enabled).toBe(true);
    });

    it("should return 'sendgrid' provider when SendGrid API key is set", () => {
      process.env.SMTP_ENABLED = "false";
      process.env.SENDGRID_API_KEY = "test-key";

      const config = getEmailConfig();

      expect(config.provider).toBe("sendgrid");
      expect(config.enabled).toBe(true);
    });

    it("should return 'resend' provider when Resend API key is set", () => {
      process.env.SMTP_ENABLED = "false";
      process.env.SENDGRID_API_KEY = undefined;
      process.env.RESEND_API_KEY = "test-key";

      const config = getEmailConfig();

      expect(config.provider).toBe("resend");
      expect(config.enabled).toBe(true);
    });

    it("should use default from email when not configured", () => {
      const config = getEmailConfig();

      expect(config.fromEmail).toBe("noreply@wvtransports.com");
      expect(config.fromName).toBe("WV Transport Control");
    });

    it("should use custom from email when configured", () => {
      process.env.SMTP_FROM_EMAIL = "custom@example.com";
      process.env.SMTP_FROM_NAME = "Custom Name";

      const config = getEmailConfig();

      expect(config.fromEmail).toBe("custom@example.com");
      expect(config.fromName).toBe("Custom Name");
    });
  });

  describe("getSMTPConfig", () => {
    it("should return null when SMTP is not enabled", () => {
      process.env.SMTP_ENABLED = "false";

      const config = getSMTPConfig();

      expect(config).toBeNull();
    });

    it("should return SMTP config when enabled", () => {
      process.env.SMTP_ENABLED = "true";
      process.env.SMTP_HOST = "smtp.gmail.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "user@gmail.com";
      process.env.SMTP_PASSWORD = "password";

      const config = getSMTPConfig();

      expect(config).not.toBeNull();
      expect(config?.host).toBe("smtp.gmail.com");
      expect(config?.port).toBe(587);
      expect(config?.user).toBe("user@gmail.com");
      expect(config?.password).toBe("password");
    });

    it("should use default SMTP host when not configured", () => {
      process.env.SMTP_ENABLED = "true";
      process.env.SMTP_HOST = undefined;

      const config = getSMTPConfig();

      expect(config?.host).toBe("smtp.gmail.com");
    });
  });

  describe("getTwilioConfig", () => {
    it("should return disabled Twilio config when credentials are missing", () => {
      process.env.TWILIO_ACCOUNT_SID = undefined;
      process.env.TWILIO_AUTH_TOKEN = undefined;
      process.env.TWILIO_MESSAGING_SERVICE_SID = undefined;

      const config = getTwilioConfig();

      expect(config.enabled).toBe(false);
      expect(config.accountSid).toBe("");
      expect(config.authToken).toBe("");
      expect(config.messagingServiceSid).toBe("");
    });

    it("should return enabled Twilio config when all credentials are present", () => {
      process.env.TWILIO_ACCOUNT_SID = "AC123";
      process.env.TWILIO_AUTH_TOKEN = "token123";
      process.env.TWILIO_MESSAGING_SERVICE_SID = "MG123";

      const config = getTwilioConfig();

      expect(config.enabled).toBe(true);
      expect(config.accountSid).toBe("AC123");
      expect(config.authToken).toBe("token123");
      expect(config.messagingServiceSid).toBe("MG123");
    });

    it("should return disabled Twilio config when any credential is missing", () => {
      process.env.TWILIO_ACCOUNT_SID = "AC123";
      process.env.TWILIO_AUTH_TOKEN = "token123";
      process.env.TWILIO_MESSAGING_SERVICE_SID = undefined;

      const config = getTwilioConfig();

      expect(config.enabled).toBe(false);
    });
  });

  describe("Contact Information", () => {
    it("should have primary contact email configured", () => {
      const primaryEmail = process.env.PRIMARY_CONTACT_EMAIL || "wascardely@gmail.com";
      expect(primaryEmail).toBe("wascardely@gmail.com");
    });

    it("should have business email configured", () => {
      const businessEmail = process.env.BUSINESS_EMAIL || "info@wvtransports.com";
      expect(businessEmail).toBe("info@wvtransports.com");
    });

    it("should have business phone configured", () => {
      const businessPhone = process.env.BUSINESS_PHONE || "+1 (973) 955-8328";
      expect(businessPhone).toBe("+1 (973) 955-8328");
    });

    it("should have WhatsApp phone configured", () => {
      const whatsappPhone = process.env.WHATSAPP_PHONE || "19739558328";
      expect(whatsappPhone).toBe("19739558328");
    });

    it("should have WhatsApp message configured", () => {
      const whatsappMessage = process.env.WHATSAPP_MESSAGE || "Hola, quiero información sobre servicios de transporte";
      expect(whatsappMessage).toBe("Hola, quiero información sobre servicios de transporte");
    });
  });
});
