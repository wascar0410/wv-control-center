import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  alerts,
  bankAccounts,
  bankAccountClassifications,
  businessConfig,
  cashFlowRules,
  companies,
  contactSubmissions,
  driverLocations,
  driverPayments,
  exportLogs,
  fuelLogs,
  InsertBankAccount,
  InsertContactSubmission,
  InsertDriverLocation,
  InsertDriverPayment,
  InsertExportLog,
  InsertFuelLog,
  InsertLoad,
  InsertLoadAssignment,
  InsertLoadEvidence,
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
  InsertUserPreferences,
  invoicePayments,
  invoices,
  loadAssignments,
  loadEvidence,
  loadQuotations,
  loads,
  ownerDraws,
  partnership,
  paymentAudit,
  paymentBatches,
  paymentBlocks,
  podDocuments,
  quoteAnalysis,
  receivables,
  reserveTransferSuggestions,
  routeStops,
  settlementLoads,
  settlements,
  taskComments,
  tasks,
  transactions,
  transactionImports,
  users,
  userPreferences,
  wallets,
  walletLedger,
  walletTransactions,
  withdrawals,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _pool: mysql.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL not configured");
    return null;
  }

  try {
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true,
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    _db = drizzle(_pool, {
      mode: "default",
      schema: {
        users,
        userPreferences,
        loads,
        loadAssignments,
        loadQuotations,
        routeStops,
        transactions,
        partnership,
        ownerDraws,
        fuelLogs,
        podDocuments,
        bankAccounts,
        transactionImports,
        driverLocations,
        driverPayments,
        paymentBatches,
        paymentAudit,
        exportLogs,
        contactSubmissions,
        loadEvidence,
        wallets,
        walletTransactions,
        withdrawals,
        paymentBlocks,
        settlements,
        settlementLoads,
        quoteAnalysis,
        invoices,
        receivables,
        invoicePayments,
        alerts,
        tasks,
        taskComments,
        companies,
        businessConfig,
        bankAccountClassifications,
        cashFlowRules,
        reserveTransferSuggestions,
      },
    });

    console.log("[Database] Connected successfully");
    return _db;
  } catch (error) {
    console.error("[Database] Failed to connect:", error);
    _pool = null;
    _db = null;
    return null;
  }
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

  const result = await db
    .select()
    .from(loads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(loads.createdAt));

  console.log("[getLoads] filters:", filters, "count:", result.length);
  return result;
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
  if (!db) return {
    activeLoads: 0, monthIncome: 0, monthExpenses: 0, monthProfit: 0, totalLoads: 0,
    profitPerMile: 0, costPerMile: 0, revenuePerMile: 0, utilizationPercent: 0,
    avgRevenuePerLoad: 0, monthLoadsCompleted: 0, totalMilesMonth: 0,
  };
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

  // Month completed loads
  const [monthLoadsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(loads)
    .where(and(
      inArray(loads.status, ["delivered", "invoiced", "paid"]),
      gte(loads.updatedAt, startOfMonth),
      lte(loads.updatedAt, endOfMonth)
    ));

  // Revenue and cost aggregates for completed loads this month
  const [monthRevenueResult] = await db
    .select({
      totalRevenue: sql<string>`SUM(CAST(${loads.price} AS DECIMAL(12,2)))`,
      totalFuel: sql<string>`SUM(CAST(COALESCE(${loads.estimatedFuel}, 0) AS DECIMAL(12,2)))`,
      totalTolls: sql<string>`SUM(CAST(COALESCE(${loads.estimatedTolls}, 0) AS DECIMAL(12,2)))`,
    })
    .from(loads)
    .where(and(
      inArray(loads.status, ["delivered", "invoiced", "paid"]),
      gte(loads.updatedAt, startOfMonth),
      lte(loads.updatedAt, endOfMonth)
    ));

  // Miles from quotations this month (best available data source)
  let totalMiles = 0;
  try {
    const milesResult: any = await db.execute(sql`
      SELECT SUM(CAST(loadedMiles AS DECIMAL(12,2))) as totalMiles
      FROM quotations
      WHERE status IN ('accepted') AND createdAt >= ${startOfMonth} AND createdAt <= ${endOfMonth}
    `);
    const milesRows = Array.isArray(milesResult) && milesResult.length > 0 && Array.isArray(milesResult[0]) ? milesResult[0] : milesResult;
    if (Array.isArray(milesRows) && milesRows[0]?.totalMiles) {
      totalMiles = parseFloat(String(milesRows[0].totalMiles ?? "0"));
    }
  } catch (_e) { /* quotations table may not exist yet */ }

  const finSummary = await getFinancialSummary(now.getFullYear(), now.getMonth() + 1);

  const monthLoads = Number(monthLoadsResult?.count ?? 0);
  const totalRevenue = parseFloat(monthRevenueResult?.totalRevenue ?? "0");
  const totalFuel = parseFloat(monthRevenueResult?.totalFuel ?? "0");
  const totalTolls = parseFloat(monthRevenueResult?.totalTolls ?? "0");
  const totalCosts = totalFuel + totalTolls;

  // KPI calculations
  const revenuePerMile = totalMiles > 0 ? totalRevenue / totalMiles : 0;
  const costPerMile = totalMiles > 0 ? totalCosts / totalMiles : 0;
  const profitPerMile = revenuePerMile - costPerMile;
  const avgRevenuePerLoad = monthLoads > 0 ? totalRevenue / monthLoads : 0;
  // Utilization: % of working days this month with at least one active/completed load
  const businessDaysInMonth = 22;
  const utilizationPercent = Math.min(100, Math.round(
    ((Number(activeLoadsResult?.count ?? 0) + monthLoads) / businessDaysInMonth) * 100
  ));

  return {
    activeLoads: Number(activeLoadsResult?.count ?? 0),
    totalLoads: Number(totalLoadsResult?.count ?? 0),
    monthIncome: finSummary.income,
    monthExpenses: finSummary.expenses,
    monthProfit: finSummary.netProfit,
    // Pro KPIs
    profitPerMile: parseFloat(profitPerMile.toFixed(2)),
    costPerMile: parseFloat(costPerMile.toFixed(2)),
    revenuePerMile: parseFloat(revenuePerMile.toFixed(2)),
    utilizationPercent,
    avgRevenuePerLoad: parseFloat(avgRevenuePerLoad.toFixed(2)),
    monthLoadsCompleted: monthLoads,
    totalMilesMonth: parseFloat(totalMiles.toFixed(0)),
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
      load: {
        id: loads.id,
        clientName: loads.clientName,
        pickupAddress: loads.pickupAddress,
        deliveryAddress: loads.deliveryAddress,
        pickupLat: loads.pickupLat,
        pickupLng: loads.pickupLng,
        deliveryLat: loads.deliveryLat,
        deliveryLng: loads.deliveryLng,
        weight: loads.weight,
        weightUnit: loads.weightUnit,
        merchandiseType: loads.merchandiseType,
        price: loads.price,
        estimatedFuel: loads.estimatedFuel,
        estimatedTolls: loads.estimatedTolls,
        netMargin: loads.netMargin,
        status: loads.status,
        assignedDriverId: loads.assignedDriverId,
        notes: loads.notes,
        bolImageUrl: loads.bolImageUrl,
        pickupDate: loads.pickupDate,
        deliveryDate: loads.deliveryDate,
        createdAt: loads.createdAt,
        updatedAt: loads.updatedAt,
        createdBy: loads.createdBy,
      },
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

  const result = await db.insert(bankAccounts).values({
    userId: data.userId,
    bankName: data.bankName,
    accountType: data.accountType,
    accountLast4: data.accountLast4,
    plaidAccountId: data.plaidAccountId,
    plaidAccessToken: data.plaidAccessToken,
    plaidItemId: data.plaidItemId,
    isActive: data.isActive ?? true,
    lastSyncedAt: data.lastSyncedAt ?? null,
    createdAt: data.createdAt ?? new Date(),
    updatedAt: data.updatedAt ?? new Date(),
  });

  return result;
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

export async function getBankAccountsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.userId, userId),
        eq(bankAccounts.isActive, true),
        isNotNull(bankAccounts.plaidItemId)
      )
    );
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
    .set({ isActive: false, updatedAt: new Date() })
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


export async function getQuotationHistory(
  userId: number,
  opts: { status?: string; search?: string; limit?: number; offset?: number } = {}
): Promise<{ quotations: any[]; total: number }> {
  const db = await getDb();
  if (!db) return { quotations: [], total: 0 };

  const { status, search, limit = 20, offset = 0 } = opts;

  const conditions: any[] = [eq(loadQuotations.userId, userId)];

  if (status) {
    conditions.push(eq(loadQuotations.status, status as any));
  }

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        sql`${loadQuotations.pickupAddress} LIKE ${term}`,
        sql`${loadQuotations.deliveryAddress} LIKE ${term}`,
        sql`${loadQuotations.cargoDescription} LIKE ${term}`
      )
    );
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(loadQuotations)
      .where(where)
      .orderBy(desc(loadQuotations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(loadQuotations)
      .where(where),
  ]);

  return {
    quotations: rows,
    total: Number(countRows[0]?.count ?? 0),
  };
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


// ─── User Profile & Preferences ──────────────────────────────────────────────

export async function updateUserProfile(userId: number, data: {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  profileImageUrl?: string;
  bio?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
  if (data.profileImageUrl !== undefined) updateData.profileImageUrl = data.profileImageUrl;
  if (data.bio !== undefined) updateData.bio = data.bio;
  updateData.updatedAt = new Date();

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOrCreateUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Create default preferences
  const newPrefs: InsertUserPreferences = {
    userId,
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    notifyOnLoadAssignment: true,
    notifyOnLoadStatus: true,
    notifyOnPayment: true,
    notifyOnMessage: true,
    notifyOnBonus: true,
    theme: "dark",
    language: "es",
    timezone: "America/New_York",
    showOnlineStatus: true,
    allowLocationTracking: false,
  };
  
  await db.insert(userPreferences).values(newPrefs);
  return newPrefs;
}

export async function updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...data };
  updateData.updatedAt = new Date();
  
  await db.update(userPreferences).set(updateData).where(eq(userPreferences.userId, userId));
}

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Contact Submissions
 */
export async function createContactSubmission(data: InsertContactSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(contactSubmissions).values(data);
  return result;
}

export async function getContactSubmissions(status?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query: any = db.select().from(contactSubmissions);
  
  if (status) {
    query = query.where(eq(contactSubmissions.status, status as any));
  }
  
  return query.orderBy(desc(contactSubmissions.createdAt));
}

export async function updateContactSubmissionStatus(
  id: number,
  status: string,
  respondedBy?: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updates: any = {
    status: status as any,
    respondedAt: new Date(),
  };
  
  if (respondedBy) updates.respondedBy = respondedBy;
  if (notes) updates.notes = notes;
  
  return db
    .update(contactSubmissions)
    .set(updates)
    .where(eq(contactSubmissions.id, id));
}


// Contact Statistics Functions
export async function getContactStatistics() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allContacts = await db.select().from(contactSubmissions);

  const stats = {
    total: allContacts.length,
    byStatus: {
      new: allContacts.filter((c) => c.status === "new").length,
      read: allContacts.filter((c) => c.status === "read").length,
      responded: allContacts.filter((c) => c.status === "responded").length,
      archived: allContacts.filter((c) => c.status === "archived").length,
    },
    responseRate:
      allContacts.length > 0
        ? (
            (allContacts.filter((c) => c.status === "responded").length /
              allContacts.length) *
            100
          ).toFixed(2)
        : "0.00",
  };

  return stats;
}

export async function getContactTrends(days: number = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const contacts = await db
    .select()
    .from(contactSubmissions)
    .where(gte(contactSubmissions.createdAt, cutoffDate));

  // Group by date
  const trendsByDate: Record<string, { date: string; count: number; byStatus: { new: number; read: number; responded: number; archived: number } }> = {};

  contacts.forEach((contact) => {
    const dateStr = new Date(contact.createdAt).toISOString().split("T")[0];

    if (!trendsByDate[dateStr]) {
      trendsByDate[dateStr] = {
        date: dateStr,
        count: 0,
        byStatus: { new: 0, read: 0, responded: 0, archived: 0 },
      };
    }

    trendsByDate[dateStr].count++;
    const status = (contact.status || "new") as "new" | "read" | "responded" | "archived";
    if (status in trendsByDate[dateStr].byStatus) {
      trendsByDate[dateStr].byStatus[status]++;
    }
  });

  // Convert to array and sort by date
  const trends = Object.values(trendsByDate).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return trends;
}

export async function getContactsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const contacts = await db
    .select()
    .from(contactSubmissions)
    .where(
      and(
        gte(contactSubmissions.createdAt, sql`${startDate}`),
        lte(contactSubmissions.createdAt, sql`${endDate}`)
      )
    );

  return contacts;
}

export async function getAverageResponseTime() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const respondedContacts = await db
    .select()
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, "responded"));

  if (respondedContacts.length === 0) return 0;

  const totalTime = respondedContacts.reduce((sum, contact) => {
    const createdAt = new Date(contact.createdAt).getTime();
    const respondedAt = contact.respondedAt
      ? new Date(contact.respondedAt).getTime()
      : 0;
    return sum + (respondedAt - createdAt);
  }, 0);

  // Return average in hours
  return Math.round((totalTime / respondedContacts.length / (1000 * 60 * 60)) * 10) / 10;
}

// ─── Load Evidence ────────────────────────────────────────────────────────────

export async function createLoadEvidence(data: InsertLoadEvidence) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(loadEvidence).values(data).execute() as any;
  return result.insertId as number;
}

export async function getLoadEvidenceByLoadId(loadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(loadEvidence)
    .where(eq(loadEvidence.loadId, loadId))
    .orderBy(loadEvidence.uploadedAt);
}

export async function getLoadEvidenceByDriver(driverId: number, loadId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(loadEvidence.driverId, driverId)];
  if (loadId) conditions.push(eq(loadEvidence.loadId, loadId));
  return db
    .select()
    .from(loadEvidence)
    .where(and(...conditions))
    .orderBy(desc(loadEvidence.uploadedAt));
}

// ─── Fleet Stats (Owner View) ─────────────────────────────────────────────────
export async function getFleetStats() {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const deliveredLoads = await db
      .select()
      .from(loads)
      .where(inArray(loads.status, ["delivered", "invoiced", "paid"]));

    const paidLoads = await db
      .select()
      .from(loads)
      .where(eq(loads.status, "paid"));

    const monthPaidLoads = await db
      .select()
      .from(loads)
      .where(
        and(
          eq(loads.status, "paid"),
          gte(loads.updatedAt, startOfMonth)
        )
      );

    const activeLoads = await db
      .select()
      .from(loads)
      .where(inArray(loads.status, ["available", "in_transit"]));

    const inTransitLoads = await db
      .select()
      .from(loads)
      .where(eq(loads.status, "in_transit"));

    const fuelExpenses = await db.select().from(fuelLogs);
    const totalFuelExpense = fuelExpenses.reduce((sum, log) => sum + (Number(log.amount) || 0), 0);

    const totalIncome = paidLoads.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
    const monthIncome = monthPaidLoads.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

    const totalNetMargin = paidLoads.reduce((sum, l) => {
      const fuel = Number(l.estimatedFuel) || 0;
      const tolls = Number(l.estimatedTolls) || 0;
      return sum + ((Number(l.price) || 0) - fuel - tolls);
    }, 0);

    const avgMarginPerDelivery = deliveredLoads.length > 0
      ? totalNetMargin / deliveredLoads.length
      : 0;

    const drivers = await getAllDrivers();

    return {
      totalDeliveries: deliveredLoads.length,
      totalIncome,
      monthIncome,
      totalFuelExpense,
      totalNetMargin,
      activeLoads: activeLoads.length,
      inTransitLoads: inTransitLoads.length,
      avgMarginPerDelivery: Math.round(avgMarginPerDelivery * 100) / 100,
      efficiency: totalIncome > 0 ? Math.round((totalNetMargin / totalIncome) * 100) : 0,
      totalDrivers: drivers.length,
    };
  } catch (error) {
    console.error("[Database] Error getting fleet stats:", error);
    return null;
  }
}

export async function getFleetRecentDeliveries(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(loads)
      .where(inArray(loads.status, ["delivered", "invoiced", "paid"]))
      .orderBy(desc(loads.deliveryDate))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Error getting fleet recent deliveries:", error);
    return [];
  }
}

// ── Broker Dashboard ──────────────────────────────────────────────────────────
export async function getBrokerStats() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.default.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
    });
    const [rows] = await conn.execute(`
      SELECT
        COALESCE(brokerName, 'Sin Broker') AS brokerName,
        COUNT(*) AS totalLoads,
        SUM(price) AS totalRevenue,
        SUM(price - COALESCE(estimatedFuel,0) - COALESCE(estimatedTolls,0)) AS totalProfit,
        AVG(price) AS avgRate,
        SUM(COALESCE(estimatedMiles,0)) AS totalMiles,
        MAX(COALESCE(deliveryDate, createdAt)) AS lastLoadDate
      FROM loads
      WHERE status IN ('delivered','invoiced','paid')
      GROUP BY COALESCE(brokerName, 'Sin Broker')
      ORDER BY totalRevenue DESC
    `) as any;
    await conn.end();
    return (rows as any[]).map(r => ({
      brokerName: r.brokerName,
      totalLoads: Number(r.totalLoads),
      totalRevenue: parseFloat(r.totalRevenue) || 0,
      totalProfit: parseFloat(r.totalProfit) || 0,
      avgRate: parseFloat(r.avgRate) || 0,
      totalMiles: parseFloat(r.totalMiles) || 0,
      avgProfitPerMile: r.totalMiles > 0 ? (parseFloat(r.totalProfit) / parseFloat(r.totalMiles)) : 0,
      reliabilityScore: Math.min(100, 50 + Number(r.totalLoads) * 5),
      lastLoadDate: r.lastLoadDate,
    }));
  } catch (error) {
    console.error("[Database] Error getting broker stats:", error);
    return [];
  }
}

// ── Dispatcher KPIs ───────────────────────────────────────────────────────────
export async function getDispatcherKPIs(year: number, month: number) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.default.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
    });
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    const [rows] = await conn.execute(`
      SELECT
        COUNT(*) AS totalLoads,
        SUM(price) AS totalRevenue,
        SUM(price - COALESCE(estimatedFuel,0) - COALESCE(estimatedTolls,0)) AS totalProfit,
        AVG(price) AS avgRate,
        COUNT(DISTINCT COALESCE(brokerName,'')) AS activeBrokers,
        AVG(COALESCE(loadScore,0)) AS avgLoadScore
      FROM loads
      WHERE status IN ('delivered','invoiced','paid')
        AND DATE(createdAt) BETWEEN ? AND ?
    `, [startDate, endDate]) as any;
    await conn.end();
    const r = rows[0] || {};
    return {
      totalLoads: Number(r.totalLoads) || 0,
      totalRevenue: parseFloat(r.totalRevenue) || 0,
      totalProfit: parseFloat(r.totalProfit) || 0,
      avgRate: parseFloat(r.avgRate) || 0,
      activeBrokers: Number(r.activeBrokers) || 0,
      avgLoadScore: Math.round(parseFloat(r.avgLoadScore) || 0),
    };
  } catch (error) {
    console.error("[Database] Error getting dispatcher KPIs:", error);
    return null;
  }
}

// ── Driver Feedback ───────────────────────────────────────────────────────────
export async function submitDriverFeedback(data: {
  loadId: number;
  driverId: number;
  trafficRating: number;
  difficultyRating: number;
  estimatedMinutes?: number;
  actualMinutes?: number;
  notes?: string;
}) {
  if (!process.env.DATABASE_URL) throw new Error("Database not available");
  const mysql2 = await import("mysql2/promise");
  const conn = await mysql2.default.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });
  await conn.execute(
    `INSERT INTO driver_feedback (loadId, driverId, trafficRating, difficultyRating, estimatedMinutes, actualMinutes, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE trafficRating=VALUES(trafficRating), difficultyRating=VALUES(difficultyRating),
       estimatedMinutes=VALUES(estimatedMinutes), actualMinutes=VALUES(actualMinutes), notes=VALUES(notes)`,
    [data.loadId, data.driverId, data.trafficRating, data.difficultyRating,
     data.estimatedMinutes ?? null, data.actualMinutes ?? null, data.notes ?? null]
  );
  await conn.end();
  return { success: true };
}

export async function getDriverFeedbackByLoad(loadId: number) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.default.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
    });
    const [rows] = await conn.execute(
      `SELECT * FROM driver_feedback WHERE loadId = ? ORDER BY createdAt DESC LIMIT 1`,
      [loadId]
    ) as any;
    await conn.end();
    return rows[0] || null;
  } catch (error) {
    return null;
  }
}

// ── Financial Module (Advanced) ───────────────────────────────────────────────
async function getFinanceConn() {
  if (!process.env.DATABASE_URL) throw new Error("Database not available");
  const mysql2 = await import("mysql2/promise");
  return mysql2.default.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });
}

export async function getFinancialTransactions(filters?: {
  type?: "income" | "expense";
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const conn = await getFinanceConn();
    let query = `SELECT * FROM financial_transactions WHERE 1=1`;
    const params: any[] = [];
    if (filters?.type) { query += ` AND type = ?`; params.push(filters.type); }
    if (filters?.category) { query += ` AND category = ?`; params.push(filters.category); }
    if (filters?.startDate) { query += ` AND date >= ?`; params.push(filters.startDate); }
    if (filters?.endDate) { query += ` AND date <= ?`; params.push(filters.endDate); }
    query += ` ORDER BY date DESC, id DESC`;
    if (filters?.limit) { query += ` LIMIT ?`; params.push(filters.limit); }
    const [rows] = await conn.execute(query, params) as any;
    await conn.end();
    return (rows as any[]).map(r => ({
      id: r.id,
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      name: r.name,
      merchantName: r.merchantName,
      amount: parseFloat(r.amount) || 0,
      category: r.category,
      type: r.type,
      isReviewed: Boolean(r.isReviewed),
      isTaxDeductible: Boolean(r.isTaxDeductible),
      linkedLoadId: r.linkedLoadId,
      notes: r.notes,
      source: r.source,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error("[DB] getFinancialTransactions error:", error);
    return [];
  }
}

export async function createFinancialTransaction(data: {
  date: string;
  name: string;
  merchantName?: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  isReviewed?: boolean;
  isTaxDeductible?: boolean;
  linkedLoadId?: number;
  notes?: string;
  source?: string;
  createdBy?: number;
}) {
  if (!process.env.DATABASE_URL) throw new Error("Database not available");
  const conn = await getFinanceConn();
  const [result] = await conn.execute(
    `INSERT INTO financial_transactions (date, name, merchantName, amount, category, type, isReviewed, isTaxDeductible, linkedLoadId, notes, source, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.date, data.name, data.merchantName ?? null, data.amount, data.category, data.type,
     data.isReviewed ? 1 : 0, data.isTaxDeductible ? 1 : 0, data.linkedLoadId ?? null,
     data.notes ?? null, data.source ?? "manual", data.createdBy ?? null]
  ) as any;
  await conn.end();
  return result.insertId as number;
}

export async function updateFinancialTransaction(id: number, data: {
  name?: string;
  amount?: number;
  category?: string;
  type?: "income" | "expense";
  isReviewed?: boolean;
  isTaxDeductible?: boolean;
  notes?: string;
}) {
  if (!process.env.DATABASE_URL) throw new Error("Database not available");
  const conn = await getFinanceConn();
  const sets: string[] = [];
  const params: any[] = [];
  if (data.name !== undefined) { sets.push("name = ?"); params.push(data.name); }
  if (data.amount !== undefined) { sets.push("amount = ?"); params.push(data.amount); }
  if (data.category !== undefined) { sets.push("category = ?"); params.push(data.category); }
  if (data.type !== undefined) { sets.push("type = ?"); params.push(data.type); }
  if (data.isReviewed !== undefined) { sets.push("isReviewed = ?"); params.push(data.isReviewed ? 1 : 0); }
  if (data.isTaxDeductible !== undefined) { sets.push("isTaxDeductible = ?"); params.push(data.isTaxDeductible ? 1 : 0); }
  if (data.notes !== undefined) { sets.push("notes = ?"); params.push(data.notes); }
  if (sets.length === 0) { await conn.end(); return; }
  params.push(id);
  await conn.execute(`UPDATE financial_transactions SET ${sets.join(", ")} WHERE id = ?`, params);
  await conn.end();
}

export async function deleteFinancialTransaction(id: number) {
  if (!process.env.DATABASE_URL) throw new Error("Database not available");
  const conn = await getFinanceConn();
  await conn.execute(`DELETE FROM financial_transactions WHERE id = ?`, [id]);
  await conn.end();
}

export async function getFinancialPnL(year: number, month: number) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const conn = await getFinanceConn();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const [loadRows] = await conn.execute(`
      SELECT
        COUNT(*) AS loadCount,
        COALESCE(SUM(CAST(price AS DECIMAL(12,2))), 0) AS totalRevenue,
        COALESCE(SUM(CAST(COALESCE(estimatedFuel,0) AS DECIMAL(12,2))), 0) AS totalFuel,
        COALESCE(SUM(CAST(COALESCE(estimatedTolls,0) AS DECIMAL(12,2))), 0) AS totalTolls,
        COALESCE(SUM(CAST(COALESCE(estimatedMiles,0) AS DECIMAL(12,2))), 0) AS totalMiles
      FROM loads
      WHERE status IN ('delivered','invoiced','paid')
        AND DATE(COALESCE(deliveryDate, updatedAt)) BETWEEN ? AND ?
    `, [startDate, endDate]) as any;

    const [incomeRows] = await conn.execute(`
      SELECT category, SUM(amount) AS total
      FROM financial_transactions
      WHERE type = 'income' AND date BETWEEN ? AND ?
      GROUP BY category
    `, [startDate, endDate]) as any;

    const [expenseRows] = await conn.execute(`
      SELECT category, SUM(amount) AS total
      FROM financial_transactions
      WHERE type = 'expense' AND date BETWEEN ? AND ?
      GROUP BY category
    `, [startDate, endDate]) as any;

    const [drawRows] = await conn.execute(`
      SELECT partnerId, SUM(amount) AS total
      FROM owner_draws
      WHERE period = ?
      GROUP BY partnerId
    `, [`${year}-${String(month).padStart(2, "0")}`]) as any;

    const [partnerRows] = await conn.execute(`SELECT id, partnerName FROM partnership WHERE isActive = 1`) as any;
    const partnerMap: Record<number, string> = {};
    (partnerRows as any[]).forEach((p: any) => { partnerMap[p.id] = p.partnerName; });

    await conn.end();

    const load = (loadRows as any[])[0] || {};
    const loadsRevenue = parseFloat(load.totalRevenue) || 0;
    const loadsFuel = parseFloat(load.totalFuel) || 0;
    const loadsTolls = parseFloat(load.totalTolls) || 0;
    const totalMiles = parseFloat(load.totalMiles) || 0;
    const loadCount = Number(load.loadCount) || 0;

    const manualIncome = (incomeRows as any[]).reduce((s: number, r: any) => s + (parseFloat(r.total) || 0), 0);
    const totalRevenue = loadsRevenue + manualIncome;

    const expenseByCategory: Record<string, number> = { fuel: loadsFuel, tolls: loadsTolls };
    (expenseRows as any[]).forEach((r: any) => {
      expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + (parseFloat(r.total) || 0);
    });
    const totalExpenses = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);
    const netProfit = totalRevenue - totalExpenses;

    const totalDraws = (drawRows as any[]).reduce((s: number, r: any) => s + (parseFloat(r.total) || 0), 0);
    const drawsByPartner = (drawRows as any[]).map((r: any) => ({
      partnerId: r.partnerId,
      partnerName: partnerMap[r.partnerId] || `Socio #${r.partnerId}`,
      amount: parseFloat(r.total) || 0,
    }));

    return {
      year, month, loadCount, totalMiles, loadsRevenue, manualIncome, totalRevenue,
      expenseByCategory, totalExpenses, netProfit,
      grossMarginPct: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0,
      revenuePerMile: totalMiles > 0 ? loadsRevenue / totalMiles : 0,
      profitPerMile: totalMiles > 0 ? netProfit / totalMiles : 0,
      totalDraws, drawsByPartner,
      retainedEarnings: netProfit - totalDraws,
      allocation: {
  operatingExpenses: netProfit * 0.35,
  vanFund: netProfit * 0.30,
  emergencyReserve: netProfit * 0.10,
  wascarDraw: netProfit * 0.125,
  yisvelDraw: netProfit * 0.125,
},
      taxReserve: totalRevenue * 0.20,
    };
  } catch (error) {
    console.error("[DB] getFinancialPnL error:", error);
    return null;
  }
}

export async function getAllocationSettings(userId?: number) {
  const db = await getDb();

  const DEFAULTS = {
    operatingExpensesPercent: 35,
    vanFundPercent: 30,
    emergencyReservePercent: 10,
    wascarDrawPercent: 12.5,
    yisvelDrawPercent: 12.5,
    marginAlertThreshold: 10,
    quoteVarianceThreshold: 20,
    overdueDaysThreshold: 30,
  };

  if (!db) return DEFAULTS;

  try {
    const result = userId
      ? await db
          .select()
          .from(businessConfig)
          .where(eq(businessConfig.userId, userId))
          .limit(1)
      : await db.select().from(businessConfig).limit(1);

    const config = result?.[0];

    if (!config) return DEFAULTS;

    return {
      operatingExpensesPercent: Number(config.operatingExpensesPercent ?? 35),
      vanFundPercent: Number(config.vanFundPercent ?? 30),
      emergencyReservePercent: Number(config.emergencyReservePercent ?? 10),
      wascarDrawPercent: Number(config.wascarDrawPercent ?? 12.5),
      yisvelDrawPercent: Number(config.yisvelDrawPercent ?? 12.5),
      marginAlertThreshold: Number(config.marginAlertThreshold ?? 10),
      quoteVarianceThreshold: Number(config.quoteVarianceThreshold ?? 20),
      overdueDaysThreshold: Number(config.overdueDaysThreshold ?? 30),
    };
  } catch (error) {
    console.error("[DB] getAllocationSettings error:", error);
    return DEFAULTS;
  }
}

export async function updateAllocationSettings(
  userId: number,
  data: {
    operatingExpensesPercent: number;
    vanFundPercent: number;
    emergencyReservePercent: number;
    wascarDrawPercent: number;
    yisvelDrawPercent: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const total =
    data.operatingExpensesPercent +
    data.vanFundPercent +
    data.emergencyReservePercent +
    data.wascarDrawPercent +
    data.yisvelDrawPercent;

  if (Math.abs(total - 100) > 0.001) {
    throw new Error("Allocation percentages must sum to 100");
  }

  const existing = await db
    .select()
    .from(businessConfig)
    .where(eq(businessConfig.userId, userId))
    .limit(1);

  if (!existing.length) {
    await db.insert(businessConfig).values({
      userId,
      operatingExpensesPercent: String(data.operatingExpensesPercent),
      vanFundPercent: String(data.vanFundPercent),
      emergencyReservePercent: String(data.emergencyReservePercent),
      wascarDrawPercent: String(data.wascarDrawPercent),
      yisvelDrawPercent: String(data.yisvelDrawPercent),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(businessConfig)
      .set({
        operatingExpensesPercent: String(data.operatingExpensesPercent),
        vanFundPercent: String(data.vanFundPercent),
        emergencyReservePercent: String(data.emergencyReservePercent),
        wascarDrawPercent: String(data.wascarDrawPercent),
        yisvelDrawPercent: String(data.yisvelDrawPercent),
        updatedAt: new Date(),
      })
      .where(eq(businessConfig.userId, userId));
  }

  const updated = await db
    .select()
    .from(businessConfig)
    .where(eq(businessConfig.userId, userId))
    .limit(1);

  return updated[0];
}

export async function getFinancialTrend(year: number) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const conn = await getFinanceConn();
    const [rows] = await conn.execute(`
      SELECT
        MONTH(COALESCE(deliveryDate, updatedAt)) AS month,
        COUNT(*) AS loadCount,
        COALESCE(SUM(CAST(price AS DECIMAL(12,2))), 0) AS revenue,
        COALESCE(SUM(CAST(COALESCE(estimatedFuel,0) AS DECIMAL(12,2))) + SUM(CAST(COALESCE(estimatedTolls,0) AS DECIMAL(12,2))), 0) AS loadCosts
      FROM loads
      WHERE status IN ('delivered','invoiced','paid')
        AND YEAR(COALESCE(deliveryDate, updatedAt)) = ?
      GROUP BY MONTH(COALESCE(deliveryDate, updatedAt))
    `, [year]) as any;

    const [expRows] = await conn.execute(`
      SELECT MONTH(date) AS month, SUM(amount) AS total
      FROM financial_transactions
      WHERE type = 'expense' AND YEAR(date) = ?
      GROUP BY MONTH(date)
    `, [year]) as any;

    await conn.end();

    const monthMap: Record<number, { revenue: number; loadCosts: number; manualExpenses: number; loadCount: number }> = {};
    for (let i = 1; i <= 12; i++) monthMap[i] = { revenue: 0, loadCosts: 0, manualExpenses: 0, loadCount: 0 };
    (rows as any[]).forEach((r: any) => {
      const m = Number(r.month);
      monthMap[m].revenue = parseFloat(r.revenue) || 0;
      monthMap[m].loadCosts = parseFloat(r.loadCosts) || 0;
      monthMap[m].loadCount = Number(r.loadCount) || 0;
    });
    (expRows as any[]).forEach((r: any) => {
      const m = Number(r.month);
      monthMap[m].manualExpenses = parseFloat(r.total) || 0;
    });

    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return Object.entries(monthMap).map(([m, d]) => ({
      month: months[Number(m) - 1],
      monthNum: Number(m),
      revenue: d.revenue,
      expenses: d.loadCosts + d.manualExpenses,
      profit: d.revenue - d.loadCosts - d.manualExpenses,
      loadCount: d.loadCount,
    }));
  } catch (error) {
    console.error("[DB] getFinancialTrend error:", error);
    return [];
  }
}

export function autoCategorize(name: string): { category: string; isTaxDeductible: boolean } {
  const n = name.toLowerCase();
  if (/fuel|gas|petro|diesel|pilot|loves|ta truck|flying j|kwik trip|speedway|circle k/.test(n))
    return { category: "fuel", isTaxDeductible: true };
  if (/toll|ezpass|e-zpass|pike|turnpike|bridge|tunnel/.test(n))
    return { category: "tolls", isTaxDeductible: true };
  if (/insurance|progressive|state farm|geico|travelers|great west/.test(n))
    return { category: "insurance", isTaxDeductible: true };
  if (/repair|mechanic|tire|oil change|maintenance|maint|autozone|napa|advance auto/.test(n))
    return { category: "maintenance", isTaxDeductible: true };
  if (/verizon|at&t|t-mobile|sprint|phone|cellular|wireless/.test(n))
    return { category: "phone", isTaxDeductible: true };
  if (/payroll|salary|wage|driver pay|settlement/.test(n))
    return { category: "payroll", isTaxDeductible: true };
  if (/subscription|software|saas|quickbooks|google|microsoft|apple|amazon prime/.test(n))
    return { category: "subscriptions", isTaxDeductible: true };
  if (/load payment|broker payment|coyote|dat|freight/.test(n))
    return { category: "load_payment", isTaxDeductible: false };
  return { category: "other", isTaxDeductible: false };
}


// ─── Wallets ─────────────────────────────────────────────────────────────────

/**
 * Get or create wallet for a driver
 */
export async function getOrCreateWallet(driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const existing = await db
    .select()
    .from(wallets)
    .where(eq(wallets.driverId, driverId))
    .limit(1);

  if (existing.length) return existing[0];

  await db.insert(wallets).values({
    driverId,
    totalEarnings: "0.00",
    availableBalance: "0.00",
    pendingBalance: "0.00",
    blockedBalance: "0.00",
    minimumWithdrawalAmount: "50.00",
    withdrawalFeePercent: "0.00",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const created = await db
    .select()
    .from(wallets)
    .where(eq(wallets.driverId, driverId))
    .limit(1);

  if (!created.length) {
    throw new Error("Failed to create wallet");
  }

  return created[0];
}

/**
 * Get wallet by driver ID
 */
export async function getWalletByDriverId(driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Always get the oldest wallet (by id asc) for this driver
  // This ensures we get the primary wallet with real balance
  const result = await db
    .select()
    .from(wallets)
    .where(eq(wallets.driverId, driverId))
    .orderBy(asc(wallets.id))
    .limit(1);

  return result[0] || null;
}

/**
 * Update wallet balance
 */
export async function updateWalletBalance(
  walletId: number,
  updates: {
    totalEarnings?: number | string;
    availableBalance?: number | string;
    reservedBalance?: number | string;
    pendingBalance?: number | string;
    blockedBalance?: number | string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(wallets)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, walletId));

  const result = await db
    .select()
    .from(wallets)
    .where(eq(wallets.id, walletId))
    .limit(1);

  return result[0] || null;
}

/**
 * Add transaction to wallet
 */
export async function addWalletTransaction(
  walletId: number,
  driverId: number,
  transaction: {
    type: string;
    amount: number | string;
    loadId?: number;
    settlementId?: number;
    withdrawalId?: number;
    reserveSuggestionId?: number;
    externalTransactionId?: string;
    description?: string;
    notes?: string;
    status?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result: any = await db
    .insert(walletTransactions)
    .values({
      walletId,
      driverId,
      type: transaction.type as any,
      amount: String(transaction.amount),
      loadId: transaction.loadId,
      settlementId: transaction.settlementId,
      withdrawalId: transaction.withdrawalId,
      reserveSuggestionId: transaction.reserveSuggestionId,
      externalTransactionId: transaction.externalTransactionId,
      description: transaction.description,
      notes: transaction.notes,
      status: (transaction.status || "pending") as any,
      createdAt: new Date(),
    });

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) {
    const fallback = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(1);

    return fallback[0] || null;
  }

  const rows = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.id, Number(insertId)))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get wallet transactions
 */
export async function getWalletTransactions(
  walletId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return db.query.walletTransactions.findMany({
    where: eq(walletTransactions.walletId, walletId),
    limit,
    offset,
    orderBy: desc(walletTransactions.createdAt),
  });
}

/**
 * Record withdrawal immediately as completed
 * This is real bookkeeping, not an approval workflow.
 */
export async function requestWithdrawal(
  walletId: number,
  driverId: number,
  data: {
    amount: number | string;
    fee?: number | string;
    method?: string;
    bankAccountId?: string;
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  let wallet = await getWalletByDriverId(driverId);
  if (!wallet) {
    wallet = await getOrCreateWallet(driverId);
  }

  if (!wallet) {
    throw new Error("Failed to get or create wallet");
  }

  const amount = Number(data.amount);
  const fee = Number(data.fee || 0);
  const netAmount = amount - fee;
  const availableBalance = Number(wallet.availableBalance || 0);
  const minimumWithdrawal = Number(wallet.minimumWithdrawalAmount || 50);
  const currentPending = Number(wallet.pendingBalance || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  if (!Number.isFinite(fee) || fee < 0) {
    throw new Error("Withdrawal fee must be 0 or greater");
  }

  if (amount < minimumWithdrawal) {
    throw new Error(`Minimum withdrawal is ${minimumWithdrawal}`);
  }

  if (availableBalance < amount) {
    throw new Error("Insufficient available balance");
  }

  const result: any = await db
    .insert(withdrawals)
    .values({
      walletId: wallet.id,
      driverId,
      amount: String(amount),
      fee: String(fee),
      netAmount: String(netAmount),
      method: (data.method || "other") as any,
      bankAccountId: data.bankAccountId,
      status: "completed",
      notes: data.notes,
      requestedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const withdrawalId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!withdrawalId) {
    throw new Error("Failed to create withdrawal");
  }

  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, Number(withdrawalId)))
    .limit(1);

  const withdrawal = rows[0];
  if (!withdrawal) {
    throw new Error("Withdrawal created but could not be reloaded");
  }

  await addWalletTransaction(wallet.id, driverId, {
    type: "withdrawal",
    amount: String(amount),
    withdrawalId: withdrawal.id,
    description: `Withdrawal completed: ${data.method || "other"}`,
    notes: data.notes,
    status: "completed",
  });

  await updateWalletBalance(wallet.id, {
    availableBalance: String(availableBalance - amount),
    pendingBalance: String(currentPending),
  });

  return withdrawal;
}

/**
 * Get withdrawals for driver
 */
export async function getWithdrawals(
  driverId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return db.query.withdrawals.findMany({
    where: eq(withdrawals.driverId, driverId),
    limit,
    offset,
    orderBy: desc(withdrawals.requestedAt),
  });
}

/**
 * Approve withdrawal
 * Kept for compatibility, but if already completed just return it unchanged.
 */
export async function approveWithdrawal(
  withdrawalId: number,
  approvedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const existing = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  if (!existing.length) return null;

  if (existing[0].status === "completed") {
    return existing[0];
  }

  await db
    .update(withdrawals)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedBy,
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, withdrawalId));

  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Complete withdrawal
 */
export async function completeWithdrawal(withdrawalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(withdrawals)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, withdrawalId));

  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Fail withdrawal
 */
export async function failWithdrawal(
  withdrawalId: number,
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(withdrawals)
    .set({
      status: "failed",
      failureReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, withdrawalId));

  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Optional cleanup for old requested withdrawals from demo/testing era.
 * Use manually only if you want to normalize old pending records.
 */
export async function normalizeLegacyPendingWithdrawals(driverId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const driverIds: number[] = [];

  if (driverId) {
    driverIds.push(driverId);
  } else {
    const allWallets = await db.select().from(wallets);
    allWallets.forEach((w) => {
      if (w.driverId) driverIds.push(w.driverId);
    });
  }

  let totalUpdatedWithdrawals = 0;

  for (const currentDriverId of driverIds) {
    let wallet = await getWalletByDriverId(currentDriverId);
    if (!wallet) {
      wallet = await getOrCreateWallet(currentDriverId);
    }
    if (!wallet) continue;

    const legacyPending = await db.query.withdrawals.findMany({
      where: (w, { and, eq, inArray }) =>
        and(
          eq(w.driverId, currentDriverId),
          inArray(w.status, ["requested", "approved"] as any)
        ),
    });

    if (legacyPending.length > 0) {
      await db
        .update(withdrawals)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(withdrawals.driverId, currentDriverId),
            inArray(withdrawals.status, ["requested", "approved"] as any)
          )
        );

      totalUpdatedWithdrawals += legacyPending.length;
    }

    const stillPending = await db.query.withdrawals.findMany({
      where: (w, { and, eq, inArray }) =>
        and(
          eq(w.driverId, currentDriverId),
          inArray(w.status, ["requested", "approved"] as any)
        ),
    });

    const realPendingBalance = stillPending.reduce(
      (sum, w) => sum + Number(w.amount || 0),
      0
    );

    await updateWalletBalance(wallet.id, {
      pendingBalance: String(realPendingBalance),
    });
  }

  return {
    success: true,
    updatedWithdrawals: totalUpdatedWithdrawals,
  };
}
/**
 * Get wallet summary for driver
 */
export async function getWalletSummary(driverId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  let wallet = await getWalletByDriverId(driverId);
  if (!wallet) {
    wallet = await getOrCreateWallet(driverId);
  }

  if (!wallet) return null;

  const recentTransactions = await getWalletTransactions(wallet.id, 10, 0);

  const pendingWithdrawals = await db.query.withdrawals.findMany({
    where: and(
      eq(withdrawals.driverId, driverId),
      inArray(withdrawals.status, ["requested", "approved"] as any)
    ),
    orderBy: desc(withdrawals.requestedAt),
  });

  // Calculate completed reserves (status='completed')
  const completedReserves = await db
    .select()
    .from(reserveTransferSuggestions)
    .where(
      and(
        eq(reserveTransferSuggestions.ownerId, driverId),
        eq(reserveTransferSuggestions.status, "completed")
      )
    );

  const completedReservesAmount = completedReserves.reduce(
    (sum, r) => sum + Number(r.suggestedAmount || 0),
    0
  );

  // Calculate reserved pending (status='suggested' or 'approved')
  const reservedPending = await db
    .select()
    .from(reserveTransferSuggestions)
    .where(
      and(
        eq(reserveTransferSuggestions.ownerId, driverId),
        inArray(reserveTransferSuggestions.status, ["suggested", "approved"] as any)
      )
    );

  const reservedPendingAmount = reservedPending.reduce(
    (sum, r) => sum + Number(r.suggestedAmount || 0),
    0
  );

  return {
    wallet,
    recentTransactions,
    pendingWithdrawals,
    completedReservesAmount,
    reservedPendingAmount,
  };
}

// ─── Settlements ─────────────────────────────────────────────────────────────

/**
 * Create settlement for a period
 */
export async function createSettlement(data: {
  settlementPeriod: string; // YYYY-MM format
  startDate: Date;
  endDate: Date;
  partner1Id: number;
  partner2Id: number;
  partner1Share?: number | string;
  partner2Share?: number | string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const partner1Share = String(data.partner1Share ?? 50);
  const partner2Share = String(data.partner2Share ?? 50);
  const now = new Date();

  const result = await db.execute(
    sql`
      INSERT INTO settlements (
        settlementPeriod, startDate, endDate, totalLoadsCompleted,
        totalIncome, totalExpenses, totalProfit,
        partner1Id, partner1Share, partner1Amount,
        partner2Id, partner2Share, partner2Amount,
        status, createdAt, updatedAt
      ) VALUES (
        ${data.settlementPeriod},
        ${data.startDate},
        ${data.endDate},
        ${0},
        ${"0.00"},
        ${"0.00"},
        ${"0.00"},
        ${data.partner1Id},
        ${partner1Share},
        ${"0.00"},
        ${data.partner2Id},
        ${partner2Share},
        ${"0.00"},
        ${"draft"},
        ${now},
        ${now}
      )
    `
  );

  const insertId =
    (result as any)?.[0]?.insertId ??
    (result as any)?.insertId ??
    null;

  if (!insertId) {
    throw new Error("Failed to create settlement record");
  }

  const created = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, Number(insertId)))
    .limit(1);

  if (!created.length) {
    throw new Error("Settlement was inserted but could not be reloaded");
  }

  return created[0];
}

/**
 * Get settlement by ID with loads
 */
export async function getSettlementWithLoads(settlementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const settlement = await db.query.settlements.findFirst({
    where: eq(settlements.id, settlementId),
  });

  if (!settlement) return null;

  const settlementLoadsList = await db.query.settlementLoads.findMany({
    where: eq(settlementLoads.settlementId, settlementId),
    orderBy: asc(settlementLoads.id),
  });

  return {
    settlement,
    loads: settlementLoadsList,
  };
}

/**
 * Add load to settlement
 */
export async function addLoadToSettlement(
  settlementId: number,
  loadId: number,
  loadIncome: number | string,
  loadExpenses: number | string,
  partner1Share: number | string,
  partner2Share: number | string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const income = Number(loadIncome);
  const expenses = Number(loadExpenses);
  const profit = income - expenses;
  const p1Share = Number(partner1Share);
  const p2Share = Number(partner2Share);

  const partner1Amount = (profit * p1Share) / 100;
  const partner2Amount = (profit * p2Share) / 100;

  const result: any = await db.insert(settlementLoads).values({
    settlementId,
    loadId,
    loadIncome: String(income),
    loadExpenses: String(expenses),
    loadProfit: String(profit),
    partner1Amount: String(partner1Amount),
    partner2Amount: String(partner2Amount),
    createdAt: new Date(),
  });

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) {
    throw new Error("Failed to add load to settlement");
  }

  const rows = await db
    .select()
    .from(settlementLoads)
    .where(eq(settlementLoads.id, Number(insertId)))
    .limit(1);

  return rows[0] || null;
}

/**
 * Calculate settlement totals
 */
export async function calculateSettlement(settlementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const settlementData = await getSettlementWithLoads(settlementId);
  if (!settlementData) return null;

  const { loads: settlementLoadsList } = settlementData;

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalProfit = 0;
  let partner1Total = 0;
  let partner2Total = 0;

  settlementLoadsList.forEach((sl) => {
    totalIncome += Number(sl.loadIncome || 0);
    totalExpenses += Number(sl.loadExpenses || 0);
    totalProfit += Number(sl.loadProfit || 0);
    partner1Total += Number(sl.partner1Amount || 0);
    partner2Total += Number(sl.partner2Amount || 0);
  });

  await db
    .update(settlements)
    .set({
      totalLoadsCompleted: settlementLoadsList.length,
      totalIncome: String(totalIncome),
      totalExpenses: String(totalExpenses),
      totalProfit: String(totalProfit),
      partner1Amount: String(partner1Total),
      partner2Amount: String(partner2Total),
      status: "calculated",
      calculatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(settlements.id, settlementId));

  const rows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Approve settlement
 */
export async function approveSettlement(
  settlementId: number,
  approvedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(settlements)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedBy,
      updatedAt: new Date(),
    })
    .where(eq(settlements.id, settlementId));

  const rows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Process settlement (distribute funds to partner wallets)
 */
export async function processSettlement(settlementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const settlementData = await getSettlementWithLoads(settlementId);
  if (!settlementData) return null;

  const { settlement: sett } = settlementData;

  const partner1Wallet =
    (await getWalletByDriverId(sett.partner1Id)) ||
    (await getOrCreateWallet(sett.partner1Id));

  const partner2Wallet =
    (await getWalletByDriverId(sett.partner2Id)) ||
    (await getOrCreateWallet(sett.partner2Id));

  if (!partner1Wallet || !partner2Wallet) {
    throw new Error("Failed to initialize partner wallets");
  }

  if (Number(sett.partner1Amount || 0) > 0) {
    await db.insert(walletTransactions).values({
      walletId: partner1Wallet.id,
      driverId: sett.partner1Id,
      type: "adjustment",
      amount: String(sett.partner1Amount),
      settlementId,
      description: `Settlement for period ${sett.settlementPeriod}`,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
    });

    await db
      .update(wallets)
      .set({
        availableBalance: String(
          Number(partner1Wallet.availableBalance || 0) +
            Number(sett.partner1Amount || 0)
        ),
        totalEarnings: String(
          Number(partner1Wallet.totalEarnings || 0) +
            Number(sett.partner1Amount || 0)
        ),
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, partner1Wallet.id));
  }

  if (Number(sett.partner2Amount || 0) > 0) {
    await db.insert(walletTransactions).values({
      walletId: partner2Wallet.id,
      driverId: sett.partner2Id,
      type: "adjustment",
      amount: String(sett.partner2Amount),
      settlementId,
      description: `Settlement for period ${sett.settlementPeriod}`,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
    });

    await db
      .update(wallets)
      .set({
        availableBalance: String(
          Number(partner2Wallet.availableBalance || 0) +
            Number(sett.partner2Amount || 0)
        ),
        totalEarnings: String(
          Number(partner2Wallet.totalEarnings || 0) +
            Number(sett.partner2Amount || 0)
        ),
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, partner2Wallet.id));
  }

  await db
    .update(settlements)
    .set({
      status: "processed",
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(settlements.id, settlementId));

  const rows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Complete settlement
 */
export async function completeSettlement(settlementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(settlements)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(settlements.id, settlementId));

  const rows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  return rows[0] || null;
}

export async function deleteSettlement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const existing = await db.query.settlements.findFirst({
    where: eq(settlements.id, id),
  });

  if (!existing) {
    throw new Error("Settlement not found");
  }

  if (existing.status !== "draft") {
    throw new Error("Only draft settlements can be deleted");
  }

  await db.delete(settlementLoads).where(eq(settlementLoads.settlementId, id));
  await db.delete(settlements).where(eq(settlements.id, id));

  return { success: true };
}

/**
 * Get all settlements
 */
export async function getAllSettlements(
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return db.query.settlements.findMany({
    limit,
    offset,
    orderBy: desc(settlements.createdAt),
  });
}
/**
 * Process settlement (distribute funds to wallets)
 */

/**
 * ===== QUOTE ANALYSIS HELPERS =====
 * Formal quotation analysis with assumptions and decision tracking
 */

/**
 * Create quote analysis
 */
export async function createQuoteAnalysis(data: {
  loadId: number;
  brokerId?: number;
  brokerName?: string;
  routeName?: string;
  totalMiles: number;
  loadedMiles: number;
  emptyMiles?: number;
  baseRate: number;
  distanceSurcharge?: number;
  weightSurcharge?: number;
  otherSurcharges?: number;
  totalIncome: number;
  estimatedFuel: number;
  estimatedTolls?: number;
  estimatedMaintenance?: number;
  estimatedInsurance?: number;
  estimatedOther?: number;
  totalEstimatedCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
  ratePerLoadedMile: number;
  recommendedMinimumRate: number;
  rateVsMinimum: number;
  verdict: "accept" | "negotiate" | "reject";
  decisionReason?: string;
  analyzedBy: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result: any = await db.insert(quoteAnalysis).values(data);
  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) throw new Error("Failed to create quote analysis");

  const rows = await db
    .select()
    .from(quoteAnalysis)
    .where(eq(quoteAnalysis.id, Number(insertId)))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get quote analysis by ID
 */
export async function getQuoteAnalysisById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.query.quoteAnalysis.findFirst({
    where: eq(quoteAnalysis.id, id),
  });
}

/**
 * Get quote analysis by load ID
 */
export async function getQuoteAnalysisByLoadId(loadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.query.quoteAnalysis.findFirst({
    where: eq(quoteAnalysis.loadId, loadId),
  });
}

/**
 * Update quote analysis with actual costs
 */
export async function updateQuoteAnalysisWithActuals(id: number, data: {
  actualFuel?: number;
  actualTolls?: number;
  actualMaintenance?: number;
  actualInsurance?: number;
  actualOther?: number;
  totalActualCost?: number;
  actualProfit?: number;
  actualMargin?: number;
  costVariance?: number;
  profitVariance?: number;
  marginVariance?: number;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(quoteAnalysis)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(quoteAnalysis.id, id));

  const rows = await db
    .select()
    .from(quoteAnalysis)
    .where(eq(quoteAnalysis.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get all quote analyses with optional filters
 */
export async function getAllQuoteAnalyses(filters?: {
  verdict?: "accept" | "negotiate" | "reject";
  brokerName?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const db = await getDb();
    if (!db) return [];
    
    if (filters?.verdict) {
      return await db.query.quoteAnalysis.findMany({
        where: eq(quoteAnalysis.verdict, filters.verdict),
        orderBy: desc(quoteAnalysis.createdAt),
        limit: filters?.limit || 100,
        offset: filters?.offset || 0,
      });
    }

    return await db.query.quoteAnalysis.findMany({
      orderBy: desc(quoteAnalysis.createdAt),
      limit: filters?.limit || 100,
      offset: filters?.offset || 0,
    });
  } catch (error) {
    console.error("Error in getAllQuoteAnalyses:", error);
    return [];
  }
}

/**
 * Get quote analysis summary (profitability by broker/route)
 */
export async function getQuoteAnalysisSummary() {
  try {
    const db = await getDb();
    if (!db) return {};
    
    const analyses = await db.query.quoteAnalysis.findMany({
      where: isNotNull(quoteAnalysis.completedAt),
    });

    const summary: Record<string, {
      count: number;
      avgMargin: number;
      avgVariance: number;
      profitable: number;
      unprofitable: number;
    }> = {};

    analyses.forEach((qa: any) => {
      const key = qa.brokerName || "Unknown";
      if (!summary[key]) {
        summary[key] = {
          count: 0,
          avgMargin: 0,
          avgVariance: 0,
          profitable: 0,
          unprofitable: 0,
        };
      }
      summary[key].count++;
      summary[key].avgMargin += Number(qa.actualMargin || qa.estimatedMargin || 0);
      summary[key].avgVariance += Number(qa.marginVariance || 0);
      if (Number(qa.actualProfit || qa.estimatedProfit || 0) > 0) {
        summary[key].profitable++;
      } else {
        summary[key].unprofitable++;
      }
    });

    // Calculate averages
    Object.keys(summary).forEach((key) => {
      summary[key].avgMargin = summary[key].count > 0 ? summary[key].avgMargin / summary[key].count : 0;
      summary[key].avgVariance = summary[key].count > 0 ? summary[key].avgVariance / summary[key].count : 0;
    });

    return summary;
  } catch (error) {
    console.error("Error in getQuoteAnalysisSummary:", error);
    return {};
  }
}

/**
 * Import quote analysis from quoteAnalysis import
 */
export async function importQuoteAnalysisFromQuotation(quotationId: number, analyzedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const quotation = await db.query.loadQuotations.findFirst({
    where: eq(loadQuotations.id, quotationId),
  });

  if (!quotation) throw new Error("Quotation not found");

  const estimatedCost = Number(quotation.estimatedFuel || 0) +
    Number(quotation.estimatedTolls || 0) +
    Number(quotation.estimatedMaintenance || 0) +
    Number(quotation.estimatedInsurance || 0) +
    Number(quotation.estimatedOther || 0);

  const estimatedProfit = Number(quotation.totalIncome || 0) - estimatedCost;
  const estimatedMargin = estimatedProfit > 0 ? (estimatedProfit / Number(quotation.totalIncome || 1)) * 100 : 0;
  const ratePerLoadedMile = quotation.loadedMiles ? Number(quotation.totalIncome || 0) / Number(quotation.loadedMiles) : 0;

  return createQuoteAnalysis({
    loadId: quotation.loadId,
    brokerId: quotation.brokerId,
    brokerName: quotation.brokerName,
    routeName: quotation.routeName,
    totalMiles: Number(quotation.totalMiles || 0),
    loadedMiles: Number(quotation.loadedMiles || 0),
    emptyMiles: Number(quotation.emptyMiles || 0),
    baseRate: Number(quotation.baseRate || 0),
    distanceSurcharge: Number(quotation.distanceSurcharge || 0),
    weightSurcharge: Number(quotation.weightSurcharge || 0),
    otherSurcharges: Number(quotation.otherSurcharges || 0),
    totalIncome: Number(quotation.totalIncome || 0),
    estimatedFuel: Number(quotation.estimatedFuel || 0),
    estimatedTolls: Number(quotation.estimatedTolls || 0),
    estimatedMaintenance: Number(quotation.estimatedMaintenance || 0),
    estimatedInsurance: Number(quotation.estimatedInsurance || 0),
    estimatedOther: Number(quotation.estimatedOther || 0),
    totalEstimatedCost: estimatedCost,
    estimatedProfit,
    estimatedMargin,
    ratePerLoadedMile,
    recommendedMinimumRate: Number(quotation.recommendedMinimumRate || ratePerLoadedMile),
    rateVsMinimum: ratePerLoadedMile - Number(quotation.recommendedMinimumRate || ratePerLoadedMile),
    verdict: quotation.verdict as "accept" | "negotiate" | "reject",
    decisionReason: quotation.decisionReason,
    analyzedBy,
    notes: quotation.notes,
  });
}


/**
 * ===== INVOICING HELPERS =====
 * Formal invoicing with status tracking and aging
 */

/**
 * Create invoice
 */
export async function createInvoice(data: {
  loadId: number;
  brokerName: string;
  brokerId?: number;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  dueDate: Date;
  terms?: string;
  notes?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const invoiceNumber = `INV-${Date.now()}`;

  const result: any = await db
    .insert(invoices)
    .values({
      ...data,
      invoiceNumber,
      remainingBalance: data.total,
    });

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) throw new Error("Failed to create invoice");

  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, Number(insertId)))
    .limit(1);

  const invoice = invoiceRows[0] || null;

  if (invoice) {
    await db.insert(receivables).values({
      invoiceId: invoice.id,
      brokerName: data.brokerName,
      brokerId: data.brokerId,
      invoiceAmount: data.total,
      outstandingAmount: data.total,
      agingBucket: "current",
      status: "current",
    });
  }

  return invoice;
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.query.invoices.findFirst({
    where: eq(invoices.id, id),
  });
}

/**
 * Get all invoices with optional filters
 */
export async function getAllInvoices(filters?: {
  status?: string;
  brokerName?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  let query = db.query.invoices.findMany({
    orderBy: desc(invoices.createdAt),
    limit: filters?.limit || 100,
    offset: filters?.offset || 0,
  });

  if (filters?.status) {
    query = db.query.invoices.findMany({
      where: eq(invoices.status, filters.status as any),
      orderBy: desc(invoices.createdAt),
      limit: filters?.limit || 100,
      offset: filters?.offset || 0,
    });
  }

  return query;
}

/**
 * Record invoice payment
 */
export async function recordInvoicePayment(data: {
  invoiceId: number;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result: any = await db
    .insert(invoicePayments)
    .values(data);

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) throw new Error("Failed to create invoice payment");

  const paymentRows = await db
    .select()
    .from(invoicePayments)
    .where(eq(invoicePayments.id, Number(insertId)))
    .limit(1);

  const payment = paymentRows[0] || null;

  const invoice = await getInvoiceById(data.invoiceId);
  if (invoice) {
    const newPaidAmount = Number(invoice.paidAmount || 0) + data.amount;
    const newRemainingBalance = Number(invoice.total) - newPaidAmount;
    const newStatus = newRemainingBalance <= 0 ? "paid" : "partially_paid";

    await db
      .update(invoices)
      .set({
        paidAmount: newPaidAmount,
        remainingBalance: newRemainingBalance,
        status: newStatus as any,
        paidAt: newStatus === "paid" ? new Date() : invoice.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, data.invoiceId));
  }

  return payment;
}

/**
 * Get receivables aging report
 */
export async function getReceivablesAgingReport() {
  const db = await getDb();
  if (!db) {
    return {
      current: { count: 0, total: 0 },
      "30_days": { count: 0, total: 0 },
      "60_days": { count: 0, total: 0 },
      "90_days": { count: 0, total: 0 },
      "120_plus": { count: 0, total: 0 },
      totalOutstanding: 0,
    };
  }

  try {
    const recs = await db
      .select()
      .from(receivables)
      .where(inArray(receivables.status, ["current", "overdue"]));

    const summary = {
      current: { count: 0, total: 0 },
      "30_days": { count: 0, total: 0 },
      "60_days": { count: 0, total: 0 },
      "90_days": { count: 0, total: 0 },
      "120_plus": { count: 0, total: 0 },
      totalOutstanding: 0,
    };

    recs.forEach((rec: any) => {
      const bucket = rec.agingBucket || "current";

      if (!summary[bucket as keyof typeof summary]) return;

      summary[bucket as keyof typeof summary].count++;
      summary[bucket as keyof typeof summary].total += Number(rec.outstandingAmount || 0);
      summary.totalOutstanding += Number(rec.outstandingAmount || 0);
    });

    return summary;
  } catch (error) {
    console.error("[DB] getReceivablesAgingReport error:", error);
    return {
      current: { count: 0, total: 0 },
      "30_days": { count: 0, total: 0 },
      "60_days": { count: 0, total: 0 },
      "90_days": { count: 0, total: 0 },
      "120_plus": { count: 0, total: 0 },
      totalOutstanding: 0,
    };
  }
}

/**
 * Get receivables by broker
 */
export async function getReceivablesByBroker(brokerName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  return db.query.receivables.findMany({
    where: eq(receivables.brokerName, brokerName),
  });
}

/**
 * Update receivable aging
 */
export async function updateReceivableAging(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const rec = await db.query.receivables.findFirst({
    where: eq(receivables.id, id),
  });

  if (!rec) return null;

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, rec.invoiceId),
  });

  if (!invoice) return null;

  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  let agingBucket = "current";
  if (daysOverdue > 0) {
    if (daysOverdue <= 30) agingBucket = "30_days";
    else if (daysOverdue <= 60) agingBucket = "60_days";
    else if (daysOverdue <= 90) agingBucket = "90_days";
    else agingBucket = "120_plus";
  }

  const status = daysOverdue > 0 ? "overdue" : "current";

  await db
    .update(receivables)
    .set({
      daysOverdue: Math.max(0, daysOverdue),
      agingBucket: agingBucket as any,
      status: status as any,
      updatedAt: new Date(),
    })
    .where(eq(receivables.id, id));

  const rows = await db
    .select()
    .from(receivables)
    .where(eq(receivables.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Issue invoice (change status to issued)
 */
export async function issueInvoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(invoices)
    .set({
      status: "issued",
      issuedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Cancel invoice
 */
export async function cancelInvoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(invoices)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, id));

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get invoice with payments
 */
export async function getInvoiceWithPayments(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;
  
  const payments = await db.query.invoicePayments.findMany({
    where: eq(invoicePayments.invoiceId, id),
    orderBy: desc(invoicePayments.paymentDate),
  });
  
  return { invoice, payments };
}


/**
 * ===== ALERTS & TASKS HELPERS =====
 * System alerts and team task management
 */

/**
 * Create alert
 */
export async function createAlert(data: {
  type: string;
  title: string;
  message: string;
  severity?: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  recipientUserId: number;
  recipientRole?: string;
  actionUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result: any = await db
    .insert(alerts)
    .values({
      ...data,
      severity: data.severity || "info",
    });

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) throw new Error("Failed to create alert");

  const rows = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, Number(insertId)))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get alerts for user
 */
export async function getAlertsForUser(userId: number, filters?: {
  isRead?: boolean;
  severity?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  let query = db.query.alerts.findMany({
    where: eq(alerts.recipientUserId, userId),
    orderBy: desc(alerts.createdAt),
    limit: filters?.limit || 50,
  });

  if (filters?.isRead !== undefined) {
    query = db.query.alerts.findMany({
      where: and(
        eq(alerts.recipientUserId, userId),
        eq(alerts.isRead, filters.isRead)
      ),
      orderBy: desc(alerts.createdAt),
      limit: filters?.limit || 50,
    });
  }

  return query;
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(alerts)
    .set({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(alerts.id, id));

  const rows = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Mark alert as acknowledged
 */
export async function acknowledgeAlert(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(alerts)
    .set({
      isAcknowledged: true,
      acknowledgedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(alerts.id, id));

  const rows = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get unread alert count for user
 */
export async function getUnreadAlertCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const result = await db.query.alerts.findMany({
    where: and(
      eq(alerts.recipientUserId, userId),
      eq(alerts.isRead, false)
    ),
  });
  
  return result.length;
}

/**
 * Create task
 */
export async function createTask(data: {
  title: string;
  description?: string;
  priority?: string;
  assignedTo: number;
  createdBy: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  dueDate?: Date;
  tags?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result: any = await db
    .insert(tasks)
    .values({
      ...data,
      priority: data.priority || "medium",
    });

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) throw new Error("Failed to create task");

  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, Number(insertId)))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get tasks for user
 */
export async function getTasksForUser(userId: number, filters?: {
  status?: string;
  priority?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  let query = db.query.tasks.findMany({
    where: eq(tasks.assignedTo, userId),
    orderBy: [desc(tasks.priority), asc(tasks.dueDate)],
    limit: filters?.limit || 100,
  });

  if (filters?.status) {
    query = db.query.tasks.findMany({
      where: and(
        eq(tasks.assignedTo, userId),
        eq(tasks.status, filters.status as any)
      ),
      orderBy: [desc(tasks.priority), asc(tasks.dueDate)],
      limit: filters?.limit || 100,
    });
  }

  return query;
}

/**
 * Update task status
 */
export async function updateTaskStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const completedAt = status === "completed" ? new Date() : null;

  await db
    .update(tasks)
    .set({
      status: status as any,
      completedAt,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));

  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Update task progress
 */
export async function updateTaskProgress(id: number, progress: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(tasks)
    .set({
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));

  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get task with comments
 */
export async function getTaskWithComments(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
  });
  
  if (!task) return null;
  
  const comments = await db.query.taskComments.findMany({
    where: eq(taskComments.taskId, id),
    orderBy: desc(taskComments.createdAt),
  });
  
  return { task, comments };
}

/**
 * Add comment to task
 */
export async function addTaskComment(taskId: number, comment: string, authorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result: any = await db
    .insert(taskComments)
    .values({
      taskId,
      comment,
      authorId,
    });

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) throw new Error("Failed to add task comment");

  const rows = await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.id, Number(insertId)))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const now = new Date();
  return db.query.tasks.findMany({
    where: and(
      inArray(tasks.status, ["pending", "in_progress"]),
      lt(tasks.dueDate, now)
    ),
    orderBy: asc(tasks.dueDate),
  });
}

/**
 * Get tasks due today
 */
export async function getTasksDueToday() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return db.query.tasks.findMany({
    where: and(
      inArray(tasks.status, ["pending", "in_progress"]),
      gte(tasks.dueDate, today),
      lt(tasks.dueDate, tomorrow)
    ),
    orderBy: asc(tasks.dueDate),
  });
}

/**
 * Get task statistics
 */
export async function getTaskStats(userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const allTasks = userId
    ? await db.query.tasks.findMany({
        where: eq(tasks.assignedTo, userId),
      })
    : await db.query.tasks.findMany();
  
  return {
    total: allTasks.length,
    pending: allTasks.filter((t: any) => t.status === "pending").length,
    inProgress: allTasks.filter((t: any) => t.status === "in_progress").length,
    completed: allTasks.filter((t: any) => t.status === "completed").length,
    cancelled: allTasks.filter((t: any) => t.status === "cancelled").length,
    overdue: allTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed").length,
  };
}


// ─── Companies ──────────────────────────────────────────────────────────────

/**
 * Create a new company
 */
export async function createCompany(data: {
  name: string;
  dotNumber?: string;
  mcNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  logoUrl?: string;
  description?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  complianceStatus?: "active" | "suspended" | "inactive";
  ownerId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const result: any = await db
    .insert(companies)
    .values({
      name: data.name,
      dotNumber: data.dotNumber,
      mcNumber: data.mcNumber,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country || "USA",
      logoUrl: data.logoUrl,
      description: data.description,
      insuranceProvider: data.insuranceProvider,
      insurancePolicyNumber: data.insurancePolicyNumber,
      insuranceExpiryDate: data.insuranceExpiryDate,
      complianceStatus: data.complianceStatus || "active",
      ownerId: data.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const insertId =
    result?.insertId ??
    result?.[0]?.insertId ??
    result?.[0]?.insertedId;

  if (!insertId) throw new Error("Failed to create company");

  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.id, Number(insertId)))
    .limit(1);

  return rows[0] || null;
}

/**
 * Get company by ID
 */
export async function getCompanyById(companyId: number) {
  const db = await getDb();
  if (!db) return null;

  return db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });
}

/**
 * Get all companies for an owner
 */
export async function getCompaniesByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.query.companies.findMany({
    where: eq(companies.ownerId, ownerId),
    orderBy: desc(companies.createdAt),
  });
}

/**
 * Update company
 */
export async function updateCompany(companyId: number, data: Partial<typeof companies.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(companies)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Delete company
 */
export async function deleteCompany(companyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db.delete(companies).where(eq(companies.id, companyId));
  return true;
}


/**
 * Get cash flow rule for an owner
 */
export async function getCashFlowRule(ownerId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const rules = await db.select().from(cashFlowRules).where(eq(cashFlowRules.ownerId, ownerId)).limit(1);
  return rules[0] || null;
}

/**
 * Save or update cash flow rule
 */
export async function saveCashFlowRule(ownerId: number, data: {
  reservePercent?: number;
  minReserveAmount?: number;
  maxReserveAmount?: number;
  autoTransferEnabled?: boolean;
  autoTransferDay?: number | null;
  operatingAccountId?: number | null;
  reserveAccountId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const existing = await getCashFlowRule(ownerId);
  
  if (existing) {
    // Update existing
    await db
      .update(cashFlowRules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(cashFlowRules.ownerId, ownerId));
    
    return getCashFlowRule(ownerId);
  } else {
    // Create new
    const result = await db.insert(cashFlowRules).values({
      ownerId,
      reservePercent: data.reservePercent ?? 20,
      minReserveAmount: data.minReserveAmount ?? 0,
      maxReserveAmount: data.maxReserveAmount ?? 999999.99,
      autoTransferEnabled: data.autoTransferEnabled ?? false,
      autoTransferDay: data.autoTransferDay ?? null,
      operatingAccountId: data.operatingAccountId ?? null,
      reserveAccountId: data.reserveAccountId ?? null,
    });
    
    return getCashFlowRule(ownerId);
  }
}

/**
 * Get bank account classifications for an owner
 */
export async function getBankAccountClassifications(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all bank account classifications for owner's accounts
  const classifications = await db
    .select()
    .from(bankAccountClassifications)
    .innerJoin(
      bankAccounts,
      eq(bankAccountClassifications.bankAccountId, bankAccounts.id)
    )
    .where(eq(bankAccounts.userId, ownerId));
  
  // Return only the classification data, not the joined account data
  return classifications.map(row => row.bank_account_classifications);
}

/**
 * Set bank account classification
 */
export async function setBankAccountClassification(
  bankAccountId: number,
  classification: "operating" | "reserve" | "personal",
  label?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const existingRows = await db
    .select()
    .from(bankAccountClassifications)
    .where(eq(bankAccountClassifications.bankAccountId, bankAccountId))
    .limit(1);
  const existing = existingRows[0];
  
  if (existing) {
    // Update existing
    await db
      .update(bankAccountClassifications)
      .set({
        classification,
        label: label ?? existing.label,
        updatedAt: new Date(),
      })
      .where(eq(bankAccountClassifications.bankAccountId, bankAccountId));
  } else {
    // Create new
    await db.insert(bankAccountClassifications).values({
      bankAccountId,
      classification,
      label: label ?? null,
      isActive: true,
    });
  }
  
  const resultRows = await db
    .select()
    .from(bankAccountClassifications)
    .where(eq(bankAccountClassifications.bankAccountId, bankAccountId))
    .limit(1);
  return resultRows[0] || null;
}

/**
 * Calculate reserve suggestion
 */
export function calculateReserveSuggestion(amount: number, reservePercent: number): number {
  if (!amount || !reservePercent) return 0;
  return (amount * reservePercent) / 100;
}

/**
 * Get cash flow summary for reporting
 */
export async function getCashFlowSummary(ownerId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const rule = await getCashFlowRule(ownerId);
  const classifications = await getBankAccountClassifications(ownerId);
  
  return {
    rule,
    classifications,
    reservePercent: rule?.reservePercent ?? 20,
  };
}

/**
 * Get partner summary with real partner data
 */
export async function getPartnerSummary(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    // Get all active partners
    const partners = await db
      .select()
      .from(partnership)
      .where(eq(partnership.isActive, true));

    if (!partners || partners.length === 0) {
      return {
        partners: [],
        totalParticipation: 0,
      };
    }

    // For each partner, calculate their balance based on participation
    const partnerSummaries = await Promise.all(
      partners.map(async (partner) => {
        // Get owner draws for this partner
        const draws = await db
          .select()
          .from(ownerDraws)
          .where(eq(ownerDraws.partnerId, partner.id));

        const totalDrawn = draws.reduce(
          (sum, d) => sum + Number(d.amount || 0),
          0
        );

        // Get wallet if partner has userId
        let wallet = null;
        if (partner.userId) {
          const walletData = await getWalletByDriverId(partner.userId);
          wallet = walletData;
        }

        const totalAssigned = wallet ? Number(wallet.totalEarnings || 0) : 0;
        const availableBalance = wallet ? Number(wallet.availableBalance || 0) : 0;
        const reservedBalance = wallet ? Number(wallet.reservedBalance || 0) : 0;
        const pendingBalance = wallet ? Number(wallet.pendingBalance || 0) : 0;

        return {
          id: partner.id,
          name: partner.partnerName,
          role: partner.partnerRole,
          participationPercent: Number(partner.participationPercent || 0),
          totalAssigned,
          withdrawn: totalDrawn,
          available: availableBalance,
          reserved: reservedBalance,
          pending: pendingBalance,
          userId: partner.userId,
        };
      })
    );

    const totalParticipation = partnerSummaries.reduce(
      (sum, p) => sum + p.participationPercent,
      0
    );

    return {
      partners: partnerSummaries,
      totalParticipation,
    };
  } catch (err) {
    console.error("[getPartnerSummary] Error:", err);
    return {
      partners: [],
      totalParticipation: 0,
    };
  }
}

/**
 * Get financial history for user
 * Shows all accounting events: reserves, withdrawals, adjustments, etc.
 */
export async function getFinancialHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    // Get wallet transactions (reserve transfers, withdrawals, etc.)
    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.driverId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);

    // Get reserve transfer suggestions (all statuses)
    const reserves = await db
      .select()
      .from(reserveTransferSuggestions)
      .where(eq(reserveTransferSuggestions.ownerId, userId))
      .orderBy(desc(reserveTransferSuggestions.createdAt))
      .limit(limit);

    // Get withdrawals
    const withdrawalRecords = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.driverId, userId))
      .orderBy(desc(withdrawals.createdAt))
      .limit(limit);

    // Combine and sort by date
    const history = [
      ...transactions.map((t) => ({
        type: "transaction",
        subtype: t.type,
        status: t.status,
        amount: Number(t.amount || 0),
        description: t.description,
        timestamp: t.createdAt,
        id: `tx-${t.id}`,
        details: {
          reserveSuggestionId: t.reserveSuggestionId,
          externalTransactionId: t.externalTransactionId,
        },
      })),
      ...reserves.map((r) => ({
        type: "reserve",
        subtype: r.status,
        status: r.status,
        amount: Number(r.suggestedAmount || 0),
        description: `Reserve ${r.status}`,
        timestamp: r.createdAt,
        id: `reserve-${r.id}`,
        details: {
          suggestionId: r.id,
          externalTransactionId: r.externalTransactionId,
        },
      })),
      ...withdrawalRecords.map((w: any) => ({
        type: "withdrawal",
        subtype: w.status,
        status: w.status,
        amount: Number(w.amount || 0),
        description: `Withdrawal ${w.status}`,
        timestamp: w.createdAt,
        id: `withdrawal-${w.id}`,
        details: {
          method: w.method,
          netAmount: Number(w.netAmount || 0),
        },
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return history;
  } catch (err) {
    console.error("[getFinancialHistory] Error:", err);
    return [];
  }
}

/**
 * Backfill reservedBalance for users with completed reserves
 * Safe operation: only updates if reservedBalance is still 0
 */
export async function backfillReservedBalance() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    // Get all users with completed reserves
    const usersWithCompletedReserves = await db
      .select({
        ownerId: reserveTransferSuggestions.ownerId,
        totalAmount: sql`SUM(CAST(${reserveTransferSuggestions.suggestedAmount} AS DECIMAL(12,2)))`,
      })
      .from(reserveTransferSuggestions)
      .where(eq(reserveTransferSuggestions.status, "completed"))
      .groupBy(reserveTransferSuggestions.ownerId);

    console.log(`[Backfill] Found ${usersWithCompletedReserves.length} users with completed reserves`);

    let updatedCount = 0;

    for (const record of usersWithCompletedReserves) {
      const userId = record.ownerId;
      const totalAmount = Number(record.totalAmount || 0);

      if (totalAmount === 0) continue;

      // Get wallet
      const wallet = await getWalletByDriverId(userId);
      if (!wallet) {
        console.log(`[Backfill] No wallet found for user ${userId}`);
        continue;
      }

      // Only backfill if reservedBalance is still 0
      if (Number(wallet.reservedBalance || 0) !== 0) {
        console.log(`[Backfill] User ${userId} already has reservedBalance: ${wallet.reservedBalance}`);
        continue;
      }

      // Update wallet
      await updateWalletBalance(wallet.id, {
        reservedBalance: String(totalAmount),
      });

      console.log(`[Backfill] Updated user ${userId}: reservedBalance = ${totalAmount}`);
      updatedCount++;
    }

    console.log(`[Backfill] Completed: ${updatedCount} wallets updated`);
    return { success: true, updatedCount };
  } catch (err) {
    console.error("[backfillReservedBalance] Error:", err);
    return { success: false, error: String(err) };
  }
}


/**
 * Recalculate wallet balances from ledger
 * Ensures consistency between wallet balances and ledger entries
 * Safe operation: reads ledger, calculates balances, updates wallet
 */
export async function recalculateWallet(walletId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    console.log("[recalculateWallet] Starting recalculation for wallet", walletId);

    // Get all ledger entries for this wallet, ordered by creation
    const ledgerEntries = await db
      .select()
      .from(walletLedger)
      .where(eq(walletLedger.walletId, walletId))
      .orderBy(asc(walletLedger.createdAt));

    if (ledgerEntries.length === 0) {
      console.log("[recalculateWallet] No ledger entries found for wallet", walletId);
      return {
        success: true,
        message: "No ledger entries to recalculate",
        walletId,
        entriesProcessed: 0,
      };
    }

    // Get wallet
    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    // Recalculate balances from ledger
    let calculatedAvailable = 0;
    let calculatedReserved = 0;
    let calculatedPending = 0;
    let calculatedBlocked = 0;
    let totalEarnings = 0;

    for (const entry of ledgerEntries) {
      const amount = Number(entry.amount || 0);
      const isCredit = entry.direction === "credit";

      // Track total earnings (all income entries)
      if (entry.type === "income" && isCredit) {
        totalEarnings += amount;
      }

      // Update balance categories based on type
      if (entry.type === "income") {
        if (isCredit) calculatedAvailable += amount;
        else calculatedAvailable -= amount;
      } else if (entry.type === "reserve_move") {
        if (isCredit) {
          calculatedReserved += amount;
          calculatedAvailable -= amount;
        } else {
          calculatedReserved -= amount;
          calculatedAvailable += amount;
        }
      } else if (entry.type === "withdrawal") {
        if (isCredit) calculatedPending += amount;
        else calculatedAvailable += amount;
      } else if (entry.type === "adjustment") {
        if (isCredit) calculatedAvailable += amount;
        else calculatedAvailable -= amount;
      } else if (entry.type === "fee") {
        if (isCredit) calculatedBlocked += amount;
        else calculatedBlocked -= amount;
      } else if (entry.type === "bonus") {
        if (isCredit) calculatedAvailable += amount;
        else calculatedAvailable -= amount;
      } else if (entry.type === "reversal") {
        if (isCredit) calculatedAvailable -= amount;
        else calculatedAvailable += amount;
      }
    }

    // Ensure non-negative balances
    calculatedAvailable = Math.max(0, calculatedAvailable);
    calculatedReserved = Math.max(0, calculatedReserved);
    calculatedPending = Math.max(0, calculatedPending);
    calculatedBlocked = Math.max(0, calculatedBlocked);

    // Update wallet with recalculated balances
    await db
      .update(wallets)
      .set({
        totalEarnings: String(totalEarnings),
        availableBalance: String(calculatedAvailable),
        reservedBalance: String(calculatedReserved),
        pendingBalance: String(calculatedPending),
        blockedBalance: String(calculatedBlocked),
      })
      .where(eq(wallets.id, walletId));

    console.log("[recalculateWallet] ✅ Recalculation complete", {
      walletId,
      totalEarnings,
      availableBalance: calculatedAvailable,
      reservedBalance: calculatedReserved,
      pendingBalance: calculatedPending,
      blockedBalance: calculatedBlocked,
      entriesProcessed: ledgerEntries.length,
    });

    return {
      success: true,
      message: "Wallet recalculated successfully",
      walletId,
      entriesProcessed: ledgerEntries.length,
      balances: {
        totalEarnings,
        availableBalance: calculatedAvailable,
        reservedBalance: calculatedReserved,
        pendingBalance: calculatedPending,
        blockedBalance: calculatedBlocked,
      },
    };
  } catch (err) {
    console.error("[recalculateWallet] Error:", err);
    return {
      success: false,
      message: String(err),
      walletId,
      entriesProcessed: 0,
    };
  }
}

/**
 * Add ledger entry for wallet movement
 * Called before updating wallet balance to maintain trazability
 */
export async function addLedgerEntry(
  walletId: number,
  type: "income" | "reserve_move" | "withdrawal" | "adjustment" | "fee" | "bonus" | "reversal",
  amount: number,
  direction: "debit" | "credit",
  balanceAfter: number,
  referenceType?: string,
  referenceId?: number,
  description?: string,
  createdBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  try {
    await db.insert(walletLedger).values({
      walletId,
      type,
      amount: String(amount),
      direction,
      balanceAfter: String(balanceAfter),
      referenceType,
      referenceId,
      description,
      createdBy,
    });

    console.log("[addLedgerEntry] ✅ Entry added", {
      walletId,
      type,
      amount,
      direction,
      balanceAfter,
    });
  } catch (err) {
    console.error("[addLedgerEntry] Error:", err);
    throw err;
  }
}


/**
 * Process a bank transaction and create wallet ledger entry
 * Converts Plaid transactions into wallet accounting events
 */
/**
 * Classify Plaid transactions into wallet transaction types
 * Maps transaction names/patterns to specific categories
 */
function classifyTransaction(transactionName: string): {
  type: "load_payment" | "other_income" | "owner_investment" | "unknown";
  category: string;
} {
  const name = transactionName.toLowerCase();

  // Zelle transfers = Owner investments (NOT withdrawable)
  if (name.includes("zelle")) {
    return { type: "owner_investment", category: "owner_investment" };
  }

  // Refunds = Other income
  if (name.includes("refund")) {
    return { type: "other_income", category: "refund" };
  }

  // Load payments from broker/dispatch systems
  if (name.includes("broker") || name.includes("dispatch") || name.includes("load")) {
    return { type: "load_payment", category: "load_payment" };
  }

  // Unknown/unclassified - do not process
  return { type: "unknown", category: "unknown" };
}

export async function processBankTransaction(
  userId: number,
  transaction: {
    amount: number;
    type: "income" | "expense";
    name: string;
    date: string;
    plaidTransactionId: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Only process income transactions for wallet
    if (transaction.type !== "income") {
      console.log("[LEDGER] Skipping expense transaction:", transaction.name);
      return null;
    }

    // Classify transaction using improved classifier
    const classification = classifyTransaction(transaction.name);
    console.log("[LEDGER] Transaction classified:", {
      name: transaction.name,
      type: classification.type,
      category: classification.category,
    });

    // Skip unknown/unclassified transactions
    if (classification.type === "unknown") {
      console.log("[LEDGER] Skipping unclassified transaction:", transaction.name);
      return null;
    }

    // Check for duplicates in ledger (single source of truth)
    const existingLedger = await db
      .select()
      .from(walletLedger)
      .where(
        and(
          eq(walletLedger.referenceType, "plaid_transaction"),
          eq(walletLedger.referenceId, transaction.plaidTransactionId)
        )
      )
      .limit(1);

    if (existingLedger.length > 0) {
      console.log("[LEDGER] Duplicate transaction skipped (already in ledger):", transaction.plaidTransactionId);
      return null;
    }

    // Get or create wallet
    let wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.driverId, userId))
      .limit(1);

    if (!wallet || wallet.length === 0) {
      const inserted = await db
        .insert(wallets)
        .values({
          driverId: userId,
          totalEarnings: 0,
          availableBalance: 0,
          reservedBalance: 0,
          pendingBalance: 0,
          blockedBalance: 0,
        })
        .returning();
      wallet = inserted;
    }

    const walletId = wallet[0].id;

    // Determine ledger type based on classification
    // Only load_payment and bonus affect availableBalance
    // other_income is optional, owner_investment doesn't affect withdrawable
    const affectsBalance = classification.type === "load_payment" || classification.type === "bonus";

    let ledgerType: "income" | "bonus" | "adjustment" = "income";
    if (classification.type === "bonus") ledgerType = "bonus";
    else if (classification.type === "adjustment") ledgerType = "adjustment";

    // Get current wallet balance before this entry (for balanceAfter calculation)
    const currentWallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .limit(1)
      .then((rows) => rows[0]);

    const currentBalance = Number(currentWallet?.availableBalance || 0);
    const newBalance = affectsBalance ? currentBalance + transaction.amount : currentBalance;

    // CREATE LEDGER ENTRY (single source of truth for accounting)
    const ledgerResult = await db
      .insert(walletLedger)
      .values({
        walletId,
        type: ledgerType,
        amount: String(transaction.amount),
        direction: "credit",
        balanceAfter: String(newBalance),
        referenceType: "plaid_transaction",
        referenceId: transaction.plaidTransactionId, // Use Plaid ID for deduplication
        description: `Bank sync (${classification.category}): ${transaction.name}`,
        createdBy: userId,
      })
      .returning();

    console.log("[LEDGER] Ledger entry created (single source of truth)", {
      amount: transaction.amount,
      type: ledgerType,
      category: classification.category,
      userId,
      plaidTransactionId: transaction.plaidTransactionId,
    });

    // OPTIONALLY: Create walletTransactions entry for UI history (non-accounting)
    // This is purely for UI display and does NOT affect balance calculations
    try {
      await db
        .insert(walletTransactions)
        .values({
          walletId,
          driverId: userId,
          type: classification.type,
          status: "completed",
          amount: transaction.amount,
          description: `Bank sync (${classification.category}): ${transaction.name}`,
          externalTransactionId: transaction.plaidTransactionId,
        })
        .catching(() => {
          // Silently fail - walletTransactions is just for UI, not critical
        });
    } catch (err) {
      console.warn("[LEDGER] Warning: Could not create walletTransactions entry (non-critical):", err);
    }

    // Recalculate wallet from ledger (single source of truth)
    await recalculateWallet(walletId);

    return ledgerResult[0];
  } catch (error) {
    console.error("[LEDGER] Error processing transaction:", error);
    throw error;
  }
}

