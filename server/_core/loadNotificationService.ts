import { getDb } from "../db";
import { loadNotifications, loads as loadsTable, users as usersTable } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "./emailService";

export interface LoadNotificationPayload {
  loadId: number;
  driverId: number;
  loadDetails: {
    clientName: string;
    pickupAddress: string;
    deliveryAddress: string;
    weight: number;
    weightUnit: string;
    price: number;
    pickupDate?: Date;
    deliveryDate?: Date;
    notes?: string;
  };
  driverEmail: string;
  driverName: string;
}

/**
 * Send load notification email to driver
 */
export async function sendLoadNotificationEmail(payload: LoadNotificationPayload): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create notification record
    await db.insert(loadNotifications).values({
      loadId: payload.loadId,
      driverId: payload.driverId,
      status: "sent",
      emailSent: false,
    });

    // Format dates
    const pickupDate = payload.loadDetails.pickupDate
      ? new Date(payload.loadDetails.pickupDate).toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Por confirmar";

    const deliveryDate = payload.loadDetails.deliveryDate
      ? new Date(payload.loadDetails.deliveryDate).toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Por confirmar";

    // Build email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Nueva Carga Disponible</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <p>Hola ${payload.driverName},</p>
          <p>Tienes una nueva carga disponible. Revisa los detalles a continuación:</p>
          
          <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-top: 0;">Detalles de la Carga</h2>
            
            <div style="margin-bottom: 15px;">
              <strong>Cliente:</strong> ${payload.loadDetails.clientName}
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong>Recogida:</strong><br/>
              Dirección: ${payload.loadDetails.pickupAddress}<br/>
              Fecha: ${pickupDate}
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong>Entrega:</strong><br/>
              Dirección: ${payload.loadDetails.deliveryAddress}<br/>
              Fecha: ${deliveryDate}
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong>Mercancía:</strong> ${payload.loadDetails.weight} ${payload.loadDetails.weightUnit}
            </div>
            
            <div style="margin-bottom: 15px; background-color: #ecfdf5; padding: 10px; border-radius: 4px; border-left: 4px solid #10b981;">
              <strong style="color: #059669;">Compensación: $${payload.loadDetails.price.toFixed(2)}</strong>
            </div>
            
            ${payload.loadDetails.notes ? `<div style="margin-bottom: 15px;"><strong>Notas:</strong><br/>${payload.loadDetails.notes}</div>` : ""}
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.VITE_OAUTH_PORTAL_URL || "http://localhost:3000"}/driver" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Ver en mi Panel</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Este es un mensaje automático de WV Control Center. Por favor, no respondas a este email.
          </p>
        </div>
      </div>
    `;

    // Send email
    const emailResult = await sendEmail(
      payload.driverEmail,
      "Nueva Carga Disponible - WV Control Center",
      emailHtml
    );

    if (emailResult.success) {
      // Update notification record with email sent timestamp
      const notification = await db
        .select()
        .from(loadNotifications)
        .where(and(eq(loadNotifications.loadId, payload.loadId), eq(loadNotifications.driverId, payload.driverId)))
        .limit(1)
        .then((rows) => rows[0]);

      if (notification) {
        await db
          .update(loadNotifications)
          .set({ emailSent: true, emailSentAt: new Date() })
          .where(eq(loadNotifications.id, notification.id));
      }
    }

    return emailResult.success;
  } catch (error) {
    console.error("Error sending load notification:", error);
    return false;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(loadNotifications)
    .set({ status: "read", readAt: new Date() })
    .where(eq(loadNotifications.id, notificationId));
}

/**
 * Get pending notifications for driver
 */
export async function getDriverNotifications(driverId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: loadNotifications.id,
      loadId: loadNotifications.loadId,
      status: loadNotifications.status,
      emailSent: loadNotifications.emailSent,
      createdAt: loadNotifications.createdAt,
      load: {
        clientName: loadsTable.clientName,
        pickupAddress: loadsTable.pickupAddress,
        deliveryAddress: loadsTable.deliveryAddress,
        weight: loadsTable.weight,
        price: loadsTable.price,
        pickupDate: loadsTable.pickupDate,
        deliveryDate: loadsTable.deliveryDate,
      },
    })
    .from(loadNotifications)
    .innerJoin(loadsTable, eq(loadNotifications.loadId, loadsTable.id))
    .where(eq(loadNotifications.driverId, driverId))
    .orderBy((table) => table.createdAt)
    .limit(limit);
}

/**
 * Get notification statistics for driver
 */
export async function getNotificationStats(driverId: number) {
  const db = await getDb();
  if (!db) return { sent: 0, read: 0, accepted: 0, rejected: 0 };

  const stats = await db
    .select()
    .from(loadNotifications)
    .where(eq(loadNotifications.driverId, driverId));

  return {
    sent: stats.filter((n) => n.status === "sent").length,
    read: stats.filter((n) => n.status === "read").length,
    accepted: stats.filter((n) => n.status === "accepted").length,
    rejected: stats.filter((n) => n.status === "rejected").length,
  };
}
