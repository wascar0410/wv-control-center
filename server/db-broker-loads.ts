import { getDb } from "./db";
import { brokerLoads, syncLogs, brokerCredentials } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function createBrokerLoad(data: {
  userId: number;
  brokerId: string;
  brokerName: "coyote" | "dat" | "manual" | "other";
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  weight: number;
  weightUnit?: string;
  commodity?: string;
  offeredRate: number;
  calculatedDistance?: number;
  calculatedProfit?: number;
  marginPercent?: number;
  verdict?: "ACEPTAR" | "NEGOCIAR" | "RECHAZAR";
  pickupDate?: Date;
  deliveryDate?: Date;
  expiresAt?: Date;
  rawData?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertData: any = {
    userId: data.userId,
    brokerId: data.brokerId,
    brokerName: data.brokerName,
    pickupAddress: data.pickupAddress,
    deliveryAddress: data.deliveryAddress,
    weight: Number(data.weight),
    weightUnit: data.weightUnit || 'lbs',
    commodity: data.commodity,
    offeredRate: Number(data.offeredRate),
    verdict: data.verdict || 'NEGOCIAR',
    rawData: data.rawData,
  };

  if (data.pickupLat) insertData.pickupLat = Number(data.pickupLat);
  if (data.pickupLng) insertData.pickupLng = Number(data.pickupLng);
  if (data.deliveryLat) insertData.deliveryLat = Number(data.deliveryLat);
  if (data.deliveryLng) insertData.deliveryLng = Number(data.deliveryLng);
  if (data.calculatedDistance) insertData.calculatedDistance = Number(data.calculatedDistance);
  if (data.calculatedProfit) insertData.calculatedProfit = Number(data.calculatedProfit);
  if (data.marginPercent) insertData.marginPercent = Number(data.marginPercent);
  if (data.pickupDate) insertData.pickupDate = data.pickupDate;
  if (data.deliveryDate) insertData.deliveryDate = data.deliveryDate;
  if (data.expiresAt) insertData.expiresAt = data.expiresAt;

  const result = await db.insert(brokerLoads).values(insertData);

  return result;
}

export async function getBrokerLoadsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(brokerLoads)
    .where(eq(brokerLoads.userId, userId));
}

export async function getBrokerLoadById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(brokerLoads)
    .where(eq(brokerLoads.id, id));

  return result[0] || null;
}

export async function updateBrokerLoad(
  id: number,
  data: Partial<{
    status: "new" | "reviewed" | "accepted" | "rejected" | "expired" | "converted";
    verdict: "ACEPTAR" | "NEGOCIAR" | "RECHAZAR";
    convertedQuotationId: number;
    calculatedProfit: number;
    marginPercent: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.verdict) updateData.verdict = data.verdict;
  if (data.convertedQuotationId) updateData.convertedQuotationId = data.convertedQuotationId;
  if (data.calculatedProfit !== undefined) updateData.calculatedProfit = Number(data.calculatedProfit);
  if (data.marginPercent !== undefined) updateData.marginPercent = Number(data.marginPercent);

  return await db
    .update(brokerLoads)
    .set(updateData)
    .where(eq(brokerLoads.id, id));
}

export async function getBrokerLoadsByStatus(userId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(brokerLoads)
    .where(and(eq(brokerLoads.userId, userId), eq(brokerLoads.status, status as any)));
}

export async function createSyncLog(data: {
  userId: number;
  brokerName: "coyote" | "dat" | "manual" | "other";
  loadsFound: number;
  loadsImported: number;
  loadsSkipped: number;
  status: "success" | "failed" | "partial";
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(syncLogs).values(data);
}

export async function getSyncLogsByUserId(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.userId, userId))
    .orderBy((t: any) => t.createdAt)
    .limit(limit);
}

export async function checkDuplicateBrokerLoad(userId: number, brokerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(brokerLoads)
    .where(and(eq(brokerLoads.userId, userId), eq(brokerLoads.brokerId, brokerId)));

  return result.length > 0;
}

export async function deleteBrokerLoad(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(brokerLoads).where(eq(brokerLoads.id, id));
}
