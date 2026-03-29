import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

export interface SMSOptions {
  to: string;
  body: string;
  mediaUrl?: string;
}

/**
 * Send SMS notification to driver
 * @param options SMS options including phone number and message body
 * @returns Promise with message SID if successful
 */
export async function sendSMS(options: SMSOptions): Promise<string | null> {
  if (!client || !fromPhoneNumber) {
    console.warn('Twilio not configured. SMS not sent:', options.body);
    return null;
  }

  try {
    const message = await client.messages.create({
      body: options.body,
      from: fromPhoneNumber,
      to: options.to,
      ...(options.mediaUrl && { mediaUrl: [options.mediaUrl] }),
    });

    console.log(`SMS sent successfully: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

/**
 * Send new load assignment notification
 */
export async function notifyNewLoadAssignment(
  driverPhone: string,
  clientName: string,
  pickupCity: string,
  deliveryCity: string,
  miles: number,
  rate: number
): Promise<string | null> {
  const body = `🚚 Nueva carga asignada!\n${clientName}\n${pickupCity} → ${deliveryCity}\n${miles} millas | $${rate.toFixed(2)}\n\nAbre la app para más detalles.`;
  return sendSMS({ to: driverPhone, body });
}

/**
 * Send urgent message notification
 */
export async function notifyUrgentMessage(
  driverPhone: string,
  dispatcherName: string,
  message: string
): Promise<string | null> {
  const body = `⚠️ Mensaje urgente de ${dispatcherName}:\n${message}`;
  return sendSMS({ to: driverPhone, body });
}

/**
 * Send delivery confirmation reminder
 */
export async function notifyDeliveryReminder(
  driverPhone: string,
  clientName: string
): Promise<string | null> {
  const body = `📦 Recordatorio: Confirma la entrega en ${clientName} en la app para completar la carga.`;
  return sendSMS({ to: driverPhone, body });
}

/**
 * Send payment notification
 */
export async function notifyPayment(
  driverPhone: string,
  amount: number,
  date: string
): Promise<string | null> {
  const body = `💰 Pago procesado: $${amount.toFixed(2)} el ${date}. Revisa tu estado de cuenta en la app.`;
  return sendSMS({ to: driverPhone, body });
}

/**
 * Send bonus notification
 */
export async function notifyBonus(
  driverPhone: string,
  bonusAmount: number,
  reason: string
): Promise<string | null> {
  const body = `🎉 ¡Bonificación ganada! +$${bonusAmount.toFixed(2)} por ${reason}. Revisa tu panel de bonus en la app.`;
  return sendSMS({ to: driverPhone, body });
}
