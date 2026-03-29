/**
 * Email Templates with WV Transport Branding
 * Includes logo and brand colors for all email communications
 */

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/mSbbvEPZCkmEtZbYVdHD74/LogodeWVTransportControl(1)_686a838d.png";
const BRAND_PRIMARY = "#0074D9"; // Sky Blue
const BRAND_DARK = "#001F3F"; // Navy Blue
const BRAND_ACCENT = "#00D084"; // Green for success

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Wraps email content with WV Transport branding
 */
function wrapEmailTemplate(title: string, content: string, actionUrl?: string, actionText?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND_PRIMARY} 100%);
      padding: 30px 20px;
      text-align: center;
      color: white;
    }
    .email-logo {
      height: 50px;
      margin-bottom: 15px;
    }
    .email-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      color: white;
    }
    .email-subtitle {
      font-size: 14px;
      opacity: 0.9;
      margin: 5px 0 0 0;
      color: white;
    }
    .email-body {
      padding: 30px 20px;
    }
    .email-content {
      font-size: 15px;
      line-height: 1.7;
      color: #333;
    }
    .email-action {
      margin: 30px 0;
      text-align: center;
    }
    .email-button {
      display: inline-block;
      background-color: ${BRAND_PRIMARY};
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      transition: background-color 0.3s;
    }
    .email-button:hover {
      background-color: ${BRAND_DARK};
    }
    .email-footer {
      background-color: #f9f9f9;
      padding: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .email-footer a {
      color: ${BRAND_PRIMARY};
      text-decoration: none;
    }
    .email-divider {
      height: 1px;
      background-color: #e0e0e0;
      margin: 20px 0;
    }
    .email-highlight {
      background-color: #f0f7ff;
      border-left: 4px solid ${BRAND_PRIMARY};
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success {
      color: ${BRAND_ACCENT};
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <img src="${LOGO_URL}" alt="WV Control Center" class="email-logo">
      <h1 class="email-title">${title}</h1>
      <p class="email-subtitle">WV Transport, LLC</p>
    </div>
    <div class="email-body">
      <div class="email-content">
        ${content}
      </div>
      ${actionUrl && actionText ? `
      <div class="email-action">
        <a href="${actionUrl}" class="email-button">${actionText}</a>
      </div>
      ` : ''}
    </div>
    <div class="email-footer">
      <p>© 2026 WV Transport, LLC. Todos los derechos reservados.</p>
      <p>
        <a href="https://app.wvtransports.com">Panel de Control</a> | 
        <a href="https://app.wvtransports.com/about">Acerca de Nosotros</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Welcome email for new users
 */
export function getWelcomeEmailTemplate(userName: string, loginUrl: string): EmailTemplate {
  const html = wrapEmailTemplate(
    "¡Bienvenido a WV Control Center!",
    `
    <p>Hola <strong>${userName}</strong>,</p>
    <p>Te damos la bienvenida a <strong>WV Control Center</strong>, tu plataforma integral para gestionar operaciones de transporte, finanzas y equipo.</p>
    <div class="email-highlight">
      <p><strong>¿Qué puedes hacer?</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Gestionar cargas y asignaciones</li>
        <li>Monitorear finanzas en tiempo real</li>
        <li>Comunicarte con tu equipo</li>
        <li>Generar reportes y análisis</li>
      </ul>
    </div>
    <p>Accede ahora para comenzar:</p>
    `,
    loginUrl,
    "Acceder al Panel"
  );

  const text = `
Hola ${userName},

Te damos la bienvenida a WV Control Center, tu plataforma integral para gestionar operaciones de transporte, finanzas y equipo.

¿Qué puedes hacer?
- Gestionar cargas y asignaciones
- Monitorear finanzas en tiempo real
- Comunicarte con tu equipo
- Generar reportes y análisis

Accede ahora: ${loginUrl}

© 2026 WV Transport, LLC. Todos los derechos reservados.
  `;

  return { subject: "¡Bienvenido a WV Control Center!", html, text };
}

/**
 * Load assignment notification
 */
export function getLoadAssignmentEmailTemplate(
  driverName: string,
  loadId: string,
  pickupAddress: string,
  deliveryAddress: string,
  dashboardUrl: string
): EmailTemplate {
  const html = wrapEmailTemplate(
    "Nueva Carga Asignada",
    `
    <p>Hola <strong>${driverName}</strong>,</p>
    <p>Se te ha asignado una nueva carga. Aquí están los detalles:</p>
    <div class="email-highlight">
      <p><strong>Detalles de la Carga</strong></p>
      <p><strong>ID de Carga:</strong> ${loadId}</p>
      <p><strong>Origen:</strong> ${pickupAddress}</p>
      <p><strong>Destino:</strong> ${deliveryAddress}</p>
    </div>
    <p>Revisa todos los detalles y acepta la carga en tu panel de control.</p>
    `,
    dashboardUrl,
    "Ver Carga en Panel"
  );

  const text = `
Hola ${driverName},

Se te ha asignado una nueva carga. Aquí están los detalles:

ID de Carga: ${loadId}
Origen: ${pickupAddress}
Destino: ${deliveryAddress}

Revisa todos los detalles en: ${dashboardUrl}

© 2026 WV Transport, LLC. Todos los derechos reservados.
  `;

  return { subject: `Nueva Carga Asignada - ${loadId}`, html, text };
}

/**
 * Payment notification
 */
export function getPaymentNotificationEmailTemplate(
  recipientName: string,
  amount: number,
  currency: string = "USD",
  transactionId: string,
  dashboardUrl: string
): EmailTemplate {
  const html = wrapEmailTemplate(
    "Pago Procesado",
    `
    <p>Hola <strong>${recipientName}</strong>,</p>
    <p>Tu pago ha sido procesado exitosamente.</p>
    <div class="email-highlight">
      <p><strong>Detalles del Pago</strong></p>
      <p><strong>Monto:</strong> <span class="success">${currency} ${amount.toFixed(2)}</span></p>
      <p><strong>ID de Transacción:</strong> ${transactionId}</p>
      <p><strong>Estado:</strong> <span class="success">✓ Completado</span></p>
    </div>
    <p>Puedes ver el historial completo de transacciones en tu panel de control.</p>
    `,
    dashboardUrl,
    "Ver Transacciones"
  );

  const text = `
Hola ${recipientName},

Tu pago ha sido procesado exitosamente.

Detalles del Pago:
Monto: ${currency} ${amount.toFixed(2)}
ID de Transacción: ${transactionId}
Estado: Completado

Ver transacciones: ${dashboardUrl}

© 2026 WV Transport, LLC. Todos los derechos reservados.
  `;

  return { subject: "Pago Procesado - Confirmación", html, text };
}

/**
 * Alert/Warning notification
 */
export function getAlertEmailTemplate(
  recipientName: string,
  alertTitle: string,
  alertMessage: string,
  severity: "info" | "warning" | "critical" = "info",
  actionUrl?: string,
  actionText?: string
): EmailTemplate {
  const severityColors = {
    info: "#0074D9",
    warning: "#FF9500",
    critical: "#FF4444",
  };

  const html = wrapEmailTemplate(
    alertTitle,
    `
    <p>Hola <strong>${recipientName}</strong>,</p>
    <div class="email-highlight" style="border-left-color: ${severityColors[severity]}">
      <p>${alertMessage}</p>
    </div>
    <p>Por favor, revisa tu panel de control para más detalles y tomar acciones si es necesario.</p>
    `,
    actionUrl,
    actionText || "Ver Detalles"
  );

  const text = `
Hola ${recipientName},

${alertTitle}

${alertMessage}

Por favor, revisa tu panel de control para más detalles.

© 2026 WV Transport, LLC. Todos los derechos reservados.
  `;

  return { subject: `[${severity.toUpperCase()}] ${alertTitle}`, html, text };
}

/**
 * Report/Document notification
 */
export function getReportEmailTemplate(
  recipientName: string,
  reportTitle: string,
  reportDescription: string,
  downloadUrl: string
): EmailTemplate {
  const html = wrapEmailTemplate(
    `${reportTitle} - Listo para Descargar`,
    `
    <p>Hola <strong>${recipientName}</strong>,</p>
    <p>Tu reporte <strong>${reportTitle}</strong> ha sido generado y está listo para descargar.</p>
    <div class="email-highlight">
      <p><strong>Descripción:</strong> ${reportDescription}</p>
      <p><strong>Formato:</strong> PDF</p>
      <p><strong>Generado:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
    </div>
    <p>Descarga tu reporte usando el botón de abajo:</p>
    `,
    downloadUrl,
    "Descargar Reporte"
  );

  const text = `
Hola ${recipientName},

Tu reporte ${reportTitle} ha sido generado y está listo para descargar.

Descripción: ${reportDescription}
Formato: PDF
Generado: ${new Date().toLocaleDateString('es-ES')}

Descarga: ${downloadUrl}

© 2026 WV Transport, LLC. Todos los derechos reservados.
  `;

  return { subject: `${reportTitle} - Listo para Descargar`, html, text };
}

export { LOGO_URL, BRAND_PRIMARY, BRAND_DARK, BRAND_ACCENT };
