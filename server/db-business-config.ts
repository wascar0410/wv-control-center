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

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_BUSINESS_CONFIG = {
  fuelPricePerGallon: "3.60",
  vanMpg: "18.0",
  maintenancePerMile: "0.12",
  tiresPerMile: "0.03",
  insuranceMonthly: "450.00",
  phoneInternetMonthly: "70.00",
  loadBoardAppsMonthly: "45.00",
  accountingSoftwareMonthly: "30.00",
  otherFixedMonthly: "80.00",
  targetMilesPerMonth: 4000,
  minimumProfitPerMile: "1.50",

  // New 5-bucket allocation model
  operatingExpensesPercent: "35.00",
  vanFundPercent: "30.00",
  emergencyReservePercent: "10.00",
  wascarDrawPercent: "12.50",
  yisvelDrawPercent: "12.50",
};

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
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(businessConfig.userId, userId));
  } else {
    await db.insert(businessConfig).values({
      userId,
      ...DEFAULT_BUSINESS_CONFIG,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InsertBusinessConfig);
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
  data: InsertDistanceSurcharge
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(distanceSurcharge).values(data);

  return getDistanceSurcharges(data.userId);
}

export async function updateDistanceSurcharge(
  id: number,
  data: Partial<InsertDistanceSurcharge>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(distanceSurcharge)
    .set({
      ...data,
      updatedAt: new Date(),
    })
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
  data: InsertWeightSurcharge
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(weightSurcharge).values(data);

  return getWeightSurcharges(data.userId);
}

export async function updateWeightSurcharge(
  id: number,
  data: Partial<InsertWeightSurcharge>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(weightSurcharge)
    .set({
      ...data,
      updatedAt: new Date(),
    })
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
    if (Number(surcharge.fromMiles) <= loadedMiles) {
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
    if (Number(surcharge.fromLbs) <= weight) {
      applicable = surcharge;
    }
  }

  return applicable?.surchargePerMile || 0;
}
