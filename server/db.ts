import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  fuelLogs,
  InsertFuelLog,
  InsertLoad,
  InsertLoadAssignment,
  InsertOwnerDraw,
  InsertPartner,
  InsertTransaction,
  InsertUser,
  loadAssignments,
  loads,
  ownerDraws,
  partnership,
  transactions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllDrivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "driver"));
}

// ─── Loads ────────────────────────────────────────────────────────────────────

export async function createLoad(data: InsertLoad) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const netMargin = (
    parseFloat(String(data.price)) -
    parseFloat(String(data.estimatedFuel ?? 0)) -
    parseFloat(String(data.estimatedTolls ?? 0))
  ).toFixed(2);
  const [result] = await db.insert(loads).values({ ...data, netMargin }).execute() as any;
  return result.insertId as number;
}

export async function getLoads(filters?: { status?: string; driverId?: number; includeUnassigned?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(loads.status, filters.status as any));
  
  if (filters?.driverId) {
    if (filters.includeUnassigned) {
      conditions.push(
        or(
          eq(loads.assignedDriverId, filters.driverId),
          and(eq(loads.status, "available" as any), isNull(loads.assignedDriverId))
        )
      );
    } else {
      conditions.push(eq(loads.assignedDriverId, filters.driverId));
    }
  }
  
  return db.select().from(loads).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(loads.createdAt));
}

export async function getLoadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(loads).where(eq(loads.id, id)).limit(1);
  return result[0];
}

export async function updateLoadStatus(id: number, status: string, extra?: Partial<InsertLoad>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(loads).set({ status: status as any, ...extra }).where(eq(loads.id, id));
}

export async function updateLoad(id: number, data: Partial<InsertLoad>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<InsertLoad> = { ...data };
  if (data.price !== undefined || data.estimatedFuel !== undefined || data.estimatedTolls !== undefined) {
    const current = await getLoadById(id);
    if (current) {
      const price = parseFloat(String(data.price ?? current.price));
      const fuel = parseFloat(String(data.estimatedFuel ?? current.estimatedFuel ?? 0));
      const tolls = parseFloat(String(data.estimatedTolls ?? current.estimatedTolls ?? 0));
      updateData.netMargin = (price - fuel - tolls).toFixed(2) as any;
    }
  }
  await db.update(loads).set(updateData).where(eq(loads.id, id));
}

export async function deleteLoad(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(loads).where(eq(loads.id, id));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(transactions).values(data).execute() as any;
  return result.insertId as number;
}

export async function getTransactions(filters?: { type?: string; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.type) conditions.push(eq(transactions.type, filters.type as any));
  if (filters?.startDate) conditions.push(gte(transactions.transactionDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(transactions.transactionDate, filters.endDate));
  return db.select().from(transactions).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(transactions.transactionDate));
}

export async function getFinancialSummary(year: number, month: number) {
  const db = await getDb();
  if (!db) return { income: 0, expenses: 0, netProfit: 0, byCategory: [] };
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const rows = await db
    .select({
      type: transactions.type,
      category: transactions.category,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(gte(transactions.transactionDate, startDate), lte(transactions.transactionDate, endDate)))
    .groupBy(transactions.type, transactions.category);

  let income = 0;
  let expenses = 0;
  const byCategory: { category: string; type: string; total: number }[] = [];

  rows.forEach((r) => {
    const total = parseFloat(r.total ?? "0");
    if (r.type === "income") income += total;
    else expenses += total;
    byCategory.push({ category: r.category ?? "", type: r.type ?? "", total });
  });

  return { income, expenses, netProfit: income - expenses, byCategory };
}

export async function getMonthlyCashFlow(year: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 0, 23, 59, 59);

  try {
    const result: any = await db.execute(sql`
      SELECT 
        MONTH(transactionDate) as month,
        type,
        SUM(amount) as total
      FROM transactions
      WHERE transactionDate >= ${startDate} AND transactionDate <= ${endDate}
      GROUP BY MONTH(transactionDate), type
    `);

    const rows = Array.isArray(result) && result.length > 0 && Array.isArray(result[0]) ? result[0] : (Array.isArray(result) ? result : []);
    const monthMap: Record<number, { income: number; expenses: number }> = {};
    for (let i = 1; i <= 12; i++) monthMap[i] = { income: 0, expenses: 0 };

    if (Array.isArray(rows)) {
      rows.forEach((r: any) => {
        if (r && r.month !== undefined && r.type !== undefined && r.total !== undefined) {
          const m = Number(r.month);
          const total = parseFloat(String(r.total ?? "0"));
          if (r.type === "income") monthMap[m].income += total;
          else monthMap[m].expenses += total;
        }
      });
    }
    return Object.entries(monthMap).map(([month, data]) => ({
      month: parseInt(month),
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }));
  } catch (error) {
    console.error("[getMonthlyCashFlow] Error executing query:", error);
    const monthMap: Record<number, { income: number; expenses: number }> = {};
    for (let i = 1; i <= 12; i++) monthMap[i] = { income: 0, expenses: 0 };

    return Object.entries(monthMap).map(([month, data]) => ({
      month: parseInt(month),
      income: data.income,
      expenses: data.expenses,
      profit: data.income - data.expenses,
    }));
  }
}

// ─── Partnership ──────────────────────────────────────────────────────────────

export async function getPartners() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnership).where(eq(partnership.isActive, true));
}

export async function createPartner(data: InsertPartner) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(partnership).values(data).execute() as any;
  return result.insertId as number;
}

export async function updatePartner(id: number, data: Partial<InsertPartner>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(partnership).set(data).where(eq(partnership.id, id));
}

export async function createOwnerDraw(data: InsertOwnerDraw) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(ownerDraws).values(data).execute() as any;
  return result.insertId as number;
}

export async function getOwnerDraws(partnerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const condition = partnerId ? eq(ownerDraws.partnerId, partnerId) : undefined;
  return db.select().from(ownerDraws).where(condition).orderBy(desc(ownerDraws.drawDate));
}

export async function getDrawsByPeriod(period: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ownerDraws).where(eq(ownerDraws.period, period));
}

// ─── Fuel Logs ────────────────────────────────────────────────────────────────

export async function createFuelLog(data: InsertFuelLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(fuelLogs).values(data).execute() as any;
  return result.insertId as number;
}

export async function getFuelLogs(driverId?: number, loadId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (driverId) conditions.push(eq(fuelLogs.driverId, driverId));
  if (loadId) conditions.push(eq(fuelLogs.loadId, loadId));
  return db.select().from(fuelLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(fuelLogs.logDate));
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export async function getDashboardKPIs() {
  const db = await getDb();
  if (!db) return { activeLoads: 0, monthIncome: 0, monthExpenses: 0, monthProfit: 0, totalLoads: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [activeLoadsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(loads)
    .where(eq(loads.status, "in_transit"));

  const [totalLoadsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(loads);

  const finSummary = await getFinancialSummary(now.getFullYear(), now.getMonth() + 1);

  return {
    activeLoads: Number(activeLoadsResult?.count ?? 0),
    totalLoads: Number(totalLoadsResult?.count ?? 0),
    monthIncome: finSummary.income,
    monthExpenses: finSummary.expenses,
    monthProfit: finSummary.netProfit,
  };
}


// ─── Load Assignments ─────────────────────────────────────────────────────────

export async function createLoadAssignment(data: InsertLoadAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(loadAssignments).values(data).execute() as any;
  return result.insertId as number;
}

export async function getLoadAssignments(driverId?: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (driverId) conditions.push(eq(loadAssignments.driverId, driverId));
  if (status) conditions.push(eq(loadAssignments.status, status as any));
  return db
    .select()
    .from(loadAssignments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(loadAssignments.assignedAt));
}

export async function getAssignmentById(assignmentId: number) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.select().from(loadAssignments).where(eq(loadAssignments.id, assignmentId));
  return result || null;
}

export async function updateAssignmentStatus(assignmentId: number, status: string, completedAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (status === "accepted") updateData.acceptedAt = new Date();
  if (status === "completed" || completedAt) updateData.completedAt = completedAt || new Date();
  
  await db.update(loadAssignments).set(updateData).where(eq(loadAssignments.id, assignmentId));
}

export async function getAvailableLoads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loads).where(eq(loads.status, "available")).orderBy(desc(loads.createdAt));
}
