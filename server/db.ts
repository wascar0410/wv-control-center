import { and, desc, eq, gte, isNull, lte, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  bankAccounts,
  driverLocations,
  driverPayments,
  exportLogs,
  fuelLogs,
  InsertBankAccount,
  InsertDriverLocation,
  InsertDriverPayment,
  InsertExportLog,
  InsertFuelLog,
  InsertLoad,
  InsertLoadAssignment,
  InsertLoadQuotation,
  InsertOwnerDraw,
  InsertPartner,
  InsertPaymentAudit,
  InsertPaymentBatch,
  InsertPODDocument,
  InsertRouteStop,
  InsertTransaction,
  InsertTransactionImport,
  InsertUser,
  loadAssignments,
  loadQuotations,
  loads,
  ownerDraws,
  partnership,
  paymentAudit,
  paymentBatches,
  podDocuments,
  routeStops,
  transactions,
  transactionImports,
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

export async function getPendingAssignmentsForDriver(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: loadAssignments.id,
      loadId: loadAssignments.loadId,
      status: loadAssignments.status,
      assignedAt: loadAssignments.assignedAt,
      load: loads,
    })
    .from(loadAssignments)
    .innerJoin(loads, eq(loadAssignments.loadId, loads.id))
    .where(
      and(
        eq(loadAssignments.driverId, driverId),
        eq(loadAssignments.status, "pending")
      )
    )
    .orderBy(desc(loadAssignments.assignedAt));
}

export async function getAvailableLoads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loads).where(eq(loads.status, "available")).orderBy(desc(loads.createdAt));
}


// ─── POD Documents ───────────────────────────────────────────────────────────

export async function uploadPOD(data: InsertPODDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(podDocuments).values(data);
  return result;
}

export async function getPODsByLoadId(loadId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(podDocuments)
    .where(eq(podDocuments.loadId, loadId))
    .orderBy(desc(podDocuments.uploadedAt));
}

export async function getPODsByDriverId(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(podDocuments)
    .where(eq(podDocuments.driverId, driverId))
    .orderBy(desc(podDocuments.uploadedAt));
}

export async function getPODById(podId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(podDocuments)
    .where(eq(podDocuments.id, podId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function deletePOD(podId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(podDocuments).where(eq(podDocuments.id, podId));
}


// ─── Driver Performance Stats ─────────────────────────────────────────────────

export async function getDriverStats(driverId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Total delivered loads
    const deliveredLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          inArray(loads.status, ["delivered", "invoiced", "paid"])
        )
      );

    // Total income from paid loads
    const paidLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          eq(loads.status, "paid")
        )
      );

    const totalIncome = paidLoads.reduce((sum, load) => sum + (Number(load.price) || 0), 0);

    // Total fuel expenses
    const fuelExpenses = await db
      .select()
      .from(fuelLogs)
      .where(eq(fuelLogs.driverId, driverId));

    const totalFuelExpense = fuelExpenses.reduce((sum, log) => sum + (Number(log.amount) || 0), 0);

    // Total net margin
    const totalNetMargin = paidLoads.reduce((sum, load) => {
      const fuel = Number(load.estimatedFuel) || 0;
      const tolls = Number(load.estimatedTolls) || 0;
      return sum + ((Number(load.price) || 0) - fuel - tolls);
    }, 0);

    // Active loads
    const activeLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          inArray(loads.status, ["available", "in_transit"])
        )
      );

    // Average margin per delivery
    const avgMarginPerDelivery = deliveredLoads.length > 0 
      ? totalNetMargin / deliveredLoads.length 
      : 0;

    return {
      totalDeliveries: deliveredLoads.length,
      totalIncome,
      totalFuelExpense,
      totalNetMargin,
      activeLoads: activeLoads.length,
      avgMarginPerDelivery: Math.round(avgMarginPerDelivery * 100) / 100,
      efficiency: deliveredLoads.length > 0 
        ? Math.round((totalNetMargin / totalIncome) * 100) 
        : 0,
    };
  } catch (error) {
    console.error("[Database] Error getting driver stats:", error);
    return null;
  }
}

export async function getDriverMonthlyTrends(driverId: number, months: number = 6) {
  const db = await getDb();
  if (!db) return [];

  try {
    const paidLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          eq(loads.status, "paid")
        )
      );

    // Group by month
    const trends: Record<string, { income: number; expenses: number; deliveries: number }> = {};

    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      trends[monthKey] = { income: 0, expenses: 0, deliveries: 0 };
    }

    // Add load data
    paidLoads.forEach((load) => {
      if (load.deliveryDate) {
        const monthKey = new Date(load.deliveryDate).toISOString().slice(0, 7);
        if (trends[monthKey]) {
          trends[monthKey].income += Number(load.price) || 0;
          trends[monthKey].expenses += (Number(load.estimatedFuel) || 0) + (Number(load.estimatedTolls) || 0);
          trends[monthKey].deliveries += 1;
        }
      }
    });

    // Add fuel expenses
    const fuelLogsData = await db
      .select()
      .from(fuelLogs)
      .where(eq(fuelLogs.driverId, driverId));

    fuelLogsData.forEach((log) => {
      if (log.logDate) {
        const monthKey = new Date(log.logDate).toISOString().slice(0, 7);
        if (trends[monthKey]) {
          trends[monthKey].expenses += Number(log.amount) || 0;
        }
      }
    });

    return Object.entries(trends).map(([month, data]) => ({
      month,
      income: Math.round(data.income * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
      netMargin: Math.round((data.income - data.expenses) * 100) / 100,
      deliveries: data.deliveries,
    }));
  } catch (error) {
    console.error("[Database] Error getting driver monthly trends:", error);
    return [];
  }
}

export async function getDriverRecentDeliveries(driverId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.assignedDriverId, driverId),
          inArray(loads.status, ["delivered", "invoiced", "paid"])
        )
      )
      .orderBy(desc(loads.deliveryDate))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Error getting recent deliveries:", error);
    return [];
  }
}


// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function createBankAccount(data: InsertBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bankAccounts).values(data);
  return result;
}

export async function getBankAccountsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.userId, userId), eq(bankAccounts.isActive, true)))
    .orderBy(desc(bankAccounts.createdAt));
}

export async function getBankAccountById(accountId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.id, accountId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateBankAccount(accountId: number, data: Partial<InsertBankAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(bankAccounts)
    .set(data)
    .where(eq(bankAccounts.id, accountId));
}

export async function deactivateBankAccount(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(bankAccounts)
    .set({ isActive: false })
    .where(eq(bankAccounts.id, accountId));
}

// ─── Transaction Imports ──────────────────────────────────────────────────────

export async function createTransactionImport(data: InsertTransactionImport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(transactionImports).values(data);
  return result;
}

export async function getTransactionImportsByBankAccount(bankAccountId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(transactionImports)
    .where(eq(transactionImports.bankAccountId, bankAccountId))
    .orderBy(desc(transactionImports.transactionDate))
    .limit(limit);
}

export async function getUnmatchedTransactionImports(bankAccountId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(transactionImports)
    .where(
      and(
        eq(transactionImports.bankAccountId, bankAccountId),
        eq(transactionImports.isMatched, false)
      )
    )
    .orderBy(desc(transactionImports.transactionDate));
}

export async function matchTransactionImport(importId: number, transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(transactionImports)
    .set({ transactionId, isMatched: true })
    .where(eq(transactionImports.id, importId));
}

export async function getTransactionImportById(importId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(transactionImports)
    .where(eq(transactionImports.id, importId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function deleteTransactionImport(importId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(transactionImports)
    .where(eq(transactionImports.id, importId));
}

export async function getTransactionImportsByDateRange(
  bankAccountId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(transactionImports)
    .where(
      and(
        eq(transactionImports.bankAccountId, bankAccountId),
        gte(transactionImports.transactionDate, startDate),
        lte(transactionImports.transactionDate, endDate)
      )
    )
    .orderBy(desc(transactionImports.transactionDate));
}


// ─── Load Quotations ──────────────────────────────────────────────────────────

export async function createLoadQuotation(data: InsertLoadQuotation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(loadQuotations).values(data);
  return result;
}

export async function getLoadQuotationById(quotationId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(loadQuotations)
    .where(eq(loadQuotations.id, quotationId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getLoadQuotationsByUserId(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(loadQuotations)
    .where(eq(loadQuotations.userId, userId))
    .orderBy(desc(loadQuotations.createdAt))
    .limit(limit);
}

export async function updateLoadQuotation(quotationId: number, data: Partial<InsertLoadQuotation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(loadQuotations)
    .set(data)
    .where(eq(loadQuotations.id, quotationId));
}

export async function deleteLoadQuotation(quotationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(loadQuotations)
    .where(eq(loadQuotations.id, quotationId));
}

export async function getQuotationsByDateRange(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(loadQuotations)
    .where(
      and(
        eq(loadQuotations.userId, userId),
        gte(loadQuotations.createdAt, startDate),
        lte(loadQuotations.createdAt, endDate)
      )
    )
    .orderBy(desc(loadQuotations.createdAt));
}

export async function getQuotationsByStatus(userId: number, status: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(loadQuotations)
    .where(
      and(
        eq(loadQuotations.userId, userId),
        eq(loadQuotations.status, status as any)
      )
    )
    .orderBy(desc(loadQuotations.createdAt));
}


// ─── Route Stops ──────────────────────────────────────────────────────────────

export async function createRouteStop(data: InsertRouteStop) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(routeStops).values(data);
  return result;
}

export async function createMultipleRouteStops(stops: InsertRouteStop[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (stops.length === 0) return [];

  const result = await db.insert(routeStops).values(stops);
  return result;
}

export async function getRouteStopsByQuotationId(quotationId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(routeStops)
    .where(eq(routeStops.quotationId, quotationId))
    .orderBy(routeStops.stopOrder);
}

export async function updateRouteStop(stopId: number, data: Partial<InsertRouteStop>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(routeStops)
    .set(data)
    .where(eq(routeStops.id, stopId));
}

export async function deleteRouteStop(stopId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(routeStops)
    .where(eq(routeStops.id, stopId));
}

export async function deleteRouteStopsByQuotationId(quotationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(routeStops)
    .where(eq(routeStops.quotationId, quotationId));
}

export async function getRouteStopById(stopId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(routeStops)
    .where(eq(routeStops.id, stopId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateRouteStopsOrder(quotationId: number, stops: Array<{ id: number; stopOrder: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const stop of stops) {
    await db
      .update(routeStops)
      .set({ stopOrder: stop.stopOrder })
      .where(eq(routeStops.id, stop.id));
  }
}


// ─── Driver Locations ────────────────────────────────────────────────────────

export async function recordDriverLocation(location: InsertDriverLocation): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(driverLocations).values(location);
  return Number((result as any).insertId || 0);
}

export async function getLatestDriverLocation(driverId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(driverLocations)
    .where(eq(driverLocations.driverId, driverId))
    .orderBy(desc(driverLocations.timestamp))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getDriverLocationHistory(driverId: number, minutesBack: number = 60) {
  const db = await getDb();
  if (!db) return [];
  const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
  return await db
    .select()
    .from(driverLocations)
    .where(
      and(
        eq(driverLocations.driverId, driverId),
        gte(driverLocations.timestamp, cutoffTime)
      )
    )
    .orderBy(desc(driverLocations.timestamp));
}

export async function getAllActiveDriverLocations() {
  const db = await getDb();
  if (!db) return [];
  // Get latest location for each driver in last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const result = await db
    .select()
    .from(driverLocations)
    .where(gte(driverLocations.timestamp, fiveMinutesAgo))
    .orderBy(desc(driverLocations.timestamp));
  
  // Group by driverId and keep only latest
  const latestByDriver = new Map();
  for (const loc of result) {
    if (!latestByDriver.has(loc.driverId)) {
      latestByDriver.set(loc.driverId, loc);
    }
  }
  return Array.from(latestByDriver.values());
}

export async function getDriverLocationsByLoadId(loadId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(driverLocations)
    .where(eq(driverLocations.loadId, loadId))
    .orderBy(desc(driverLocations.timestamp));
}

export async function deleteOldDriverLocations(daysOld: number = 30) {
  const db = await getDb();
  if (!db) return;
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  await db
    .delete(driverLocations)
    .where(lte(driverLocations.createdAt, cutoffDate));
}


// ─── Driver Payments ──────────────────────────────────────────────────────────

export async function createDriverPayment(data: InsertDriverPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(driverPayments).values(data).execute() as any;
  return result.insertId as number;
}

export async function getDriverPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(driverPayments).where(eq(driverPayments.id, id)).limit(1);
  return result[0];
}

export async function getDriverPaymentsByLoadId(loadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(driverPayments).where(eq(driverPayments.loadId, loadId));
}

export async function getDriverPayments(driverId: number, filters?: { status?: string; startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(driverPayments.driverId, driverId)];
  if (filters?.status) conditions.push(eq(driverPayments.status, filters.status as any));
  if (filters?.startDate) conditions.push(gte(driverPayments.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(driverPayments.createdAt, filters.endDate));
  return db.select().from(driverPayments).where(and(...conditions)).orderBy(desc(driverPayments.createdAt));
}

export async function updateDriverPayment(id: number, data: Partial<InsertDriverPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(driverPayments).set(data).where(eq(driverPayments.id, id));
}

export async function getDriverPaymentStats(driverId: number) {
  const db = await getDb();
  if (!db) return { totalEarned: 0, totalPending: 0, totalCompleted: 0, averagePayment: 0 };
  
  const result = await db
    .select({
      status: driverPayments.status,
      total: sql<string>`SUM(${driverPayments.amount})`,
      count: sql<string>`COUNT(*)`,
    })
    .from(driverPayments)
    .where(eq(driverPayments.driverId, driverId))
    .groupBy(driverPayments.status);

  let totalEarned = 0;
  let totalPending = 0;
  let totalCompleted = 0;
  let totalCount = 0;

  result.forEach((r) => {
    const total = parseFloat(r.total ?? "0");
    const count = parseInt(String(r.count ?? "0"));
    totalEarned += total;
    totalCount += count;
    if (r.status === "pending") totalPending += total;
    if (r.status === "completed") totalCompleted += total;
  });

  return {
    totalEarned,
    totalPending,
    totalCompleted,
    averagePayment: totalCount > 0 ? totalEarned / totalCount : 0,
  };
}


// ─── Payment Batches ──────────────────────────────────────────────────────────

export async function createPaymentBatch(data: InsertPaymentBatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentBatches).values(data);
  return result;
}

export async function getPaymentBatchById(batchId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(paymentBatches)
    .where(eq(paymentBatches.id, batchId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getPaymentBatches(filters?: {
  status?: string;
  period?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(paymentBatches.status, filters.status as any));
  if (filters?.period) conditions.push(eq(paymentBatches.period, filters.period));
  if (filters?.startDate) conditions.push(gte(paymentBatches.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(paymentBatches.createdAt, filters.endDate));

  const query = db.select().from(paymentBatches);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(paymentBatches.createdAt));
  }
  return query.orderBy(desc(paymentBatches.createdAt));
}

export async function updatePaymentBatch(batchId: number, data: Partial<InsertPaymentBatch>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(paymentBatches)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(paymentBatches.id, batchId));
}

export async function getPaymentsByBatchId(batchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(driverPayments)
    .innerJoin(paymentAudit, eq(driverPayments.id, paymentAudit.paymentId))
    .where(eq(paymentAudit.batchId, batchId))
    .orderBy(desc(driverPayments.createdAt));
}

export async function getPendingPaymentsForBatch(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(driverPayments)
    .where(eq(driverPayments.status, "pending"))
    .orderBy(desc(driverPayments.createdAt))
    .limit(limit);
}

export async function getPaymentBatchStats(batchId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const batch = await getPaymentBatchById(batchId);
  if (!batch) return null;

  const payments = await db
    .select({
      status: driverPayments.status,
      total: sql<string>`SUM(${driverPayments.amount})`,
      count: sql<string>`COUNT(*)`,
    })
    .from(driverPayments)
    .innerJoin(paymentAudit, eq(driverPayments.id, paymentAudit.paymentId))
    .where(eq(paymentAudit.batchId, batchId))
    .groupBy(driverPayments.status);

  let totalAmount = 0;
  let completedAmount = 0;
  let failedAmount = 0;
  let completedCount = 0;
  let failedCount = 0;

  payments.forEach((p) => {
    const total = parseFloat(p.total ?? "0");
    const count = parseInt(String(p.count ?? "0"));
    totalAmount += total;
    if (p.status === "completed") {
      completedAmount += total;
      completedCount += count;
    } else if (p.status === "failed") {
      failedAmount += total;
      failedCount += count;
    }
  });

  return {
    totalAmount,
    completedAmount,
    failedAmount,
    completedCount,
    failedCount,
    successRate: batch.totalPayments > 0 ? (completedCount / batch.totalPayments) * 100 : 0,
  };
}

// ─── Payment Audit ────────────────────────────────────────────────────────────

export async function createPaymentAuditLog(data: InsertPaymentAudit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentAudit).values(data);
  return result;
}

export async function getPaymentAuditByPaymentId(paymentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(paymentAudit)
    .where(eq(paymentAudit.paymentId, paymentId))
    .orderBy(desc(paymentAudit.createdAt));
}

export async function getPaymentAuditByBatchId(batchId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(paymentAudit)
    .where(eq(paymentAudit.batchId, batchId))
    .orderBy(desc(paymentAudit.createdAt));
}

// ─── Export Logs ──────────────────────────────────────────────────────────────

export async function createExportLog(data: InsertExportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(exportLogs).values(data);
  return result;
}

export async function getExportLogById(exportId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(exportLogs)
    .where(eq(exportLogs.id, exportId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getExportLogs(filters?: {
  exportType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.exportType) conditions.push(eq(exportLogs.exportType, filters.exportType as any));
  if (filters?.status) conditions.push(eq(exportLogs.status, filters.status as any));
  if (filters?.startDate) conditions.push(gte(exportLogs.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(exportLogs.createdAt, filters.endDate));

  const query = db.select().from(exportLogs);
  if (conditions.length > 0) {
    return query
      .where(and(...conditions))
      .orderBy(desc(exportLogs.createdAt))
      .limit(filters?.limit || 100);
  }
  return query.orderBy(desc(exportLogs.createdAt)).limit(filters?.limit || 100);
}

export async function updateExportLog(exportId: number, data: Partial<InsertExportLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(exportLogs)
    .set(data)
    .where(eq(exportLogs.id, exportId));
}

export async function getTransactionsForExport(filters?: {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  type?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.startDate) conditions.push(gte(transactions.transactionDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(transactions.transactionDate, filters.endDate));
  if (filters?.category) conditions.push(eq(transactions.category, filters.category as any));
  if (filters?.type) conditions.push(eq(transactions.type, filters.type as any));

  const query = db.select().from(transactions);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(transactions.transactionDate));
  }
  return query.orderBy(desc(transactions.transactionDate));
}

export async function getLoadsForExport(filters?: {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  driverId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.startDate) conditions.push(gte(loads.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(loads.createdAt, filters.endDate));
  if (filters?.status) conditions.push(eq(loads.status, filters.status as any));
  if (filters?.driverId) conditions.push(eq(loads.assignedDriverId, filters.driverId));

  const query = db.select().from(loads);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(loads.createdAt));
  }
  return query.orderBy(desc(loads.createdAt));
}

export async function getPaymentsForExport(filters?: {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  driverId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.startDate) conditions.push(gte(driverPayments.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(driverPayments.createdAt, filters.endDate));
  if (filters?.status) conditions.push(eq(driverPayments.status, filters.status as any));
  if (filters?.driverId) conditions.push(eq(driverPayments.driverId, filters.driverId));

  const query = db.select().from(driverPayments);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(driverPayments.createdAt));
  }
  return query.orderBy(desc(driverPayments.createdAt));
}
