import { eq } from "drizzle-orm";
import {
  businessConfig,
  distanceSurcharge,
  weightSurcharge,
  InsertBusinessConfig,
  InsertDistanceSurcharge,
  InsertWeightSurcharge,
} from "../drizzle/schema";
import { getDb } from "./db";

// ─── Business Config ───────────────────────────────────────────────────────────

export async function getBusinessConfig(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(businessConfig)
    .where(eq(businessConfig.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateBusinessConfig(
  userId: number,
  data: Partial<InsertBusinessConfig>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getBusinessConfig(userId);

  if (existing) {
    await db
      .update(businessConfig)
      .set(data)
      .where(eq(businessConfig.userId, userId));
  } else {
    await db
      .insert(businessConfig)
      .values({ userId, ...data } as InsertBusinessConfig);
  }

  return getBusinessConfig(userId);
}

export async function createOrUpdateBusinessConfig(
  userId: number,
  data: Partial<InsertBusinessConfig>
) {
  return updateBusinessConfig(userId, data);
}

// ─── Distance Surcharge ────────────────────────────────────────────────────────

export async function getDistanceSurcharges(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(distanceSurcharge)
    .where(eq(distanceSurcharge.userId, userId))
    .orderBy(distanceSurcharge.fromMiles);
}

export async function createDistanceSurcharge(
  userId: number,
  data: Omit<InsertDistanceSurcharge, "userId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(distanceSurcharge)
    .values({ userId, ...data } as InsertDistanceSurcharge);

  return getDistanceSurcharges(userId);
}

export async function updateDistanceSurcharge(
  id: number,
  data: Partial<InsertDistanceSurcharge>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(distanceSurcharge)
    .set(data)
    .where(eq(distanceSurcharge.id, id));
}

export async function deleteDistanceSurcharge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(distanceSurcharge).where(eq(distanceSurcharge.id, id));
}

// ─── Weight Surcharge ──────────────────────────────────────────────────────────

export async function getWeightSurcharges(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(weightSurcharge)
    .where(eq(weightSurcharge.userId, userId))
    .orderBy(weightSurcharge.fromLbs);
}

export async function createWeightSurcharge(
  userId: number,
  data: Omit<InsertWeightSurcharge, "userId">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(weightSurcharge)
    .values({ userId, ...data } as InsertWeightSurcharge);

  return getWeightSurcharges(userId);
}

export async function updateWeightSurcharge(
  id: number,
  data: Partial<InsertWeightSurcharge>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(weightSurcharge)
    .set(data)
    .where(eq(weightSurcharge.id, id));
}

export async function deleteWeightSurcharge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(weightSurcharge).where(eq(weightSurcharge.id, id));
}

// ─── Helper: Calculate applicable surcharge ───────────────────────────────────

export async function getApplicableDistanceSurcharge(
  userId: number,
  loadedMiles: number
) {
  const surcharges = await getDistanceSurcharges(userId);

  let applicable = surcharges[0];
  for (const surcharge of surcharges) {
    if (surcharge.fromMiles <= loadedMiles) {
      applicable = surcharge;
    }
  }

  return applicable?.surchargePerMile || 0;
}

export async function getApplicableWeightSurcharge(
  userId: number,
  weight: number
) {
  const surcharges = await getWeightSurcharges(userId);

  let applicable = surcharges[0];
  for (const surcharge of surcharges) {
    if (surcharge.fromLbs <= weight) {
      applicable = surcharge;
    }
  }

  return applicable?.surchargePerMile || 0;
}
