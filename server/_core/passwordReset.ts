import * as crypto from "crypto";
import { sendEmail } from "./emailService";
import { getEmailConfig } from "./emailService";

/**
 * Generate a secure reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetLink: string
): Promise<boolean> {
  const config = getEmailConfig();
  if (!config.enabled) {
    console.warn("[PasswordReset] Email service not configured");
    return false;
  }

  const subject = "Recupera tu contraseña - WV Control Center";
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
          .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            <p>Recibimos una solicitud para recuperar tu contraseña en WV Control Center. Si no realizaste esta solicitud, puedes ignorar este email.</p>
            
            <p>Para establecer una nueva contraseña, haz clic en el siguiente enlace:</p>
            <a href="${resetLink}" class="button">Recuperar Contraseña</a>
            
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
              ${resetLink}
            </p>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este enlace expirará en 24 horas por razones de seguridad.
            </div>
            
            <p>Si tienes problemas para hacer clic en el enlace, cópialo y pégalo en la barra de direcciones de tu navegador.</p>
          </div>
          <div class="footer">
            <p>© 2026 WV Control Center. Todos los derechos reservados.</p>
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await sendEmail(email, subject, htmlContent);
    return result.success;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

/**
 * Calculate token expiration time (24 hours from now)
 */
export function getTokenExpirationTime(): Date {
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 24);
  return expirationTime;
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
