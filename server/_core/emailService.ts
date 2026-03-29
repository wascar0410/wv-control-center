import { ENV } from "./env";

/**
 * Email Service Configuration
 * Supports multiple providers: SMTP, SendGrid, Resend
 * Twilio SMS integration for notifications
 */

export interface EmailConfig {
  provider: "smtp" | "sendgrid" | "resend" | "none";
  enabled: boolean;
  fromEmail: string;
  fromName: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
  enabled: boolean;
}

/**
 * Get email configuration based on environment variables
 */
export function getEmailConfig(): EmailConfig {
  const smtpEnabled = process.env.SMTP_ENABLED === "true";
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  let provider: "smtp" | "sendgrid" | "resend" | "none" = "none";

  if (smtpEnabled) {
    provider = "smtp";
  } else if (sendgridKey) {
    provider = "sendgrid";
  } else if (resendKey) {
    provider = "resend";
  }

  return {
    provider,
    enabled: provider !== "none",
    fromEmail: process.env.SMTP_FROM_EMAIL || "noreply@wvtransports.com",
    fromName: process.env.SMTP_FROM_NAME || "WV Transport Control",
  };
}

/**
 * Get SMTP configuration
 */
export function getSMTPConfig(): SMTPConfig | null {
  if (process.env.SMTP_ENABLED !== "true") {
    return null;
  }

  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
  };
}

/**
 * Get Twilio configuration
 */
export function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || "";

  return {
    accountSid,
    authToken,
    messagingServiceSid,
    enabled: !!(accountSid && authToken && messagingServiceSid),
  };
}

/**
 * Send email via configured provider
 * Currently returns a placeholder - implement actual sending based on provider
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getEmailConfig();

  if (!config.enabled) {
    console.warn("[Email] Email service not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    switch (config.provider) {
      case "smtp":
        return await sendViaSmtp(to, subject, html, text);
      case "sendgrid":
        return await sendViaSendGrid(to, subject, html, text);
      case "resend":
        return await sendViaResend(to, subject, html, text);
      default:
        return { success: false, error: "No email provider configured" };
    }
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email via SMTP (Gmail, custom SMTP server, etc.)
 * Requires nodemailer package to be installed
 */
async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const nodemailer = await import('nodemailer');
    const config = getSMTPConfig();
    
    if (!config) {
      return { success: false, error: "SMTP not configured" };
    }

    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    const emailConfig = getEmailConfig();
    const result = await transporter.sendMail({
      from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
      to,
      subject,
      text: text || subject,
      html,
    });

    console.log(`[Email] Email sent via SMTP to ${to}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("[Email] SMTP error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMTP error",
    };
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return { success: false, error: "SendGrid API key not configured" };
    }

    const config = getEmailConfig();
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.fromEmail, name: config.fromName },
        subject,
        content: [
          { type: "text/plain", value: text || subject },
          { type: "text/html", value: html },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true, messageId: response.headers.get("X-Message-Id") || undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SendGrid error",
    };
  }
}

/**
 * Send email via Resend API
 */
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Resend API key not configured" };
    }

    const config = getEmailConfig();
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json() as { id?: string };
    return { success: true, messageId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Resend error",
    };
  }
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getTwilioConfig();

  if (!config.enabled) {
    console.warn("[SMS] Twilio not configured");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    // Placeholder - requires twilio package
    // const twilio = require('twilio');
    // const client = twilio(config.accountSid, config.authToken);
    // const result = await client.messages.create({...});
    // return { success: true, messageId: result.sid };

    console.warn("[SMS] Twilio SMS sending not yet implemented");
    return { success: false, error: "Twilio SMS sending not yet implemented" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS error",
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsApp(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getTwilioConfig();

  if (!config.enabled) {
    console.warn("[WhatsApp] Twilio not configured");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    // Placeholder - requires twilio package
    // const twilio = require('twilio');
    // const client = twilio(config.accountSid, config.authToken);
    // const result = await client.messages.create({
    //   from: 'whatsapp:+1234567890',
    //   to: `whatsapp:${phoneNumber}`,
    //   body: message
    // });
    // return { success: true, messageId: result.sid };

    console.warn("[WhatsApp] Twilio WhatsApp sending not yet implemented");
    return { success: false, error: "Twilio WhatsApp sending not yet implemented" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp error",
    };
  }
}
