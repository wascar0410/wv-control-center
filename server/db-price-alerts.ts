import { getDb } from "./db";
import { priceAlerts, InsertPriceAlert } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function createPriceAlert(data: InsertPriceAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(priceAlerts).values(data);
  return result;
}

export async function getPriceAlertsByUserId(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.userId, userId))
    .orderBy(priceAlerts.createdAt)
    .limit(limit);
}

export async function getUnreadPriceAlerts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(priceAlerts)
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.isRead, false)))
    .orderBy(priceAlerts.createdAt);
}

export async function markAlertAsRead(alertId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(priceAlerts)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(priceAlerts.id, alertId));
}

export async function markAllAlertsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(priceAlerts)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.isRead, false)));
}

export async function deleteAlert(alertId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(priceAlerts).where(eq(priceAlerts.id, alertId));
}

export async function getAlertStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const alerts = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.userId, userId));

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.isRead).length;

  return {
    totalAlerts: alerts.length,
    unreadAlerts: unreadCount,
    criticalAlerts: criticalCount,
  };
}
