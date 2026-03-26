import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database helpers
vi.mock("./db", () => ({
  createLoad: vi.fn().mockResolvedValue(1),
  getLoads: vi.fn().mockResolvedValue([
    {
      id: 1,
      clientName: "Test Client",
      pickupAddress: "Miami, FL",
      deliveryAddress: "Orlando, FL",
      weight: "500",
      weightUnit: "lbs",
      merchandiseType: "Electronics",
      price: "1500.00",
      estimatedFuel: "100.00",
      estimatedTolls: "25.00",
      netMargin: "1375.00",
      status: "available",
      assignedDriverId: null,
      notes: null,
      bolImageUrl: null,
      pickupDate: null,
      deliveryDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 1,
    },
  ]),
  getLoadById: vi.fn().mockResolvedValue({
    id: 1,
    clientName: "Test Client",
    pickupAddress: "Miami, FL",
    deliveryAddress: "Orlando, FL",
    price: "1500.00",
    status: "available",
    weight: "500",
    weightUnit: "lbs",
    merchandiseType: "Electronics",
    estimatedFuel: "100.00",
    estimatedTolls: "25.00",
    netMargin: "1375.00",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateLoadStatus: vi.fn().mockResolvedValue(undefined),
  updateLoad: vi.fn().mockResolvedValue(undefined),
  deleteLoad: vi.fn().mockResolvedValue(undefined),
  createTransaction: vi.fn().mockResolvedValue(1),
  getTransactions: vi.fn().mockResolvedValue([]),
  getFinancialSummary: vi.fn().mockResolvedValue({
    income: 5000,
    expenses: 1500,
    netProfit: 3500,
    byCategory: [
      { category: "load_payment", type: "income", total: 5000 },
      { category: "fuel", type: "expense", total: 500 },
      { category: "payroll", type: "expense", total: 1000 },
    ],
  }),
  getMonthlyCashFlow: vi.fn().mockResolvedValue([
    { month: 1, income: 5000, expenses: 1500, profit: 3500 },
    { month: 2, income: 6000, expenses: 2000, profit: 4000 },
  ]),
  getPartners: vi.fn().mockResolvedValue([
    { id: 1, partnerName: "Socio A", partnerRole: "Gestor", participationPercent: "50.00", isActive: true },
    { id: 2, partnerName: "Socio B", partnerRole: "Chofer", participationPercent: "50.00", isActive: true },
  ]),
  createPartner: vi.fn().mockResolvedValue(1),
  updatePartner: vi.fn().mockResolvedValue(undefined),
  createOwnerDraw: vi.fn().mockResolvedValue(1),
  getOwnerDraws: vi.fn().mockResolvedValue([]),
  getDrawsByPeriod: vi.fn().mockResolvedValue([]),
  createFuelLog: vi.fn().mockResolvedValue(1),
  getFuelLogs: vi.fn().mockResolvedValue([]),
  getDashboardKPIs: vi.fn().mockResolvedValue({
    activeLoads: 2,
    totalLoads: 10,
    monthIncome: 5000,
    monthExpenses: 1500,
    monthProfit: 3500,
  }),
  getAllDrivers: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://cdn.example.com/test.jpg" }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@wvtransport.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createDriverContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "driver-user",
      email: "driver@wvtransport.com",
      name: "Driver User",
      loginMethod: "manus",
      role: "driver",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });
});

// ─── Dashboard Tests ──────────────────────────────────────────────────────────

describe("dashboard.kpis", () => {
  it("returns KPI data for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const kpis = await caller.dashboard.kpis();
    expect(kpis).toBeDefined();
    expect(kpis.activeLoads).toBe(2);
    expect(kpis.monthIncome).toBe(5000);
    expect(kpis.monthProfit).toBe(3500);
  });
});

// ─── Loads Tests ──────────────────────────────────────────────────────────────

describe("loads", () => {
  it("lists loads for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.loads.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].clientName).toBe("Test Client");
  });

  it("creates a new load with net margin calculation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.loads.create({
      clientName: "New Client",
      pickupAddress: "Tampa, FL",
      deliveryAddress: "Jacksonville, FL",
      weight: 1000,
      weightUnit: "lbs",
      merchandiseType: "Furniture",
      price: 2000,
      estimatedFuel: 150,
      estimatedTolls: 30,
    });
    expect(result.id).toBe(1);
  });

  it("updates load status to in_transit", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.loads.updateStatus({ id: 1, status: "in_transit" });
    expect(result.success).toBe(true);
  });

  it("creates income transaction when load is marked as paid", async () => {
    const { createTransaction } = await import("./db");
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await caller.loads.updateStatus({ id: 1, status: "paid" });
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "income", category: "load_payment" })
    );
  });

  it("deletes a load", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.loads.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Finance Tests ────────────────────────────────────────────────────────────

describe("finance", () => {
  it("returns financial summary for a given month", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.finance.summary({ year: 2026, month: 3 });
    expect(summary.income).toBe(5000);
    expect(summary.expenses).toBe(1500);
    expect(summary.netProfit).toBe(3500);
  });

  it("returns monthly cash flow for a year", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const cashFlow = await caller.finance.cashFlow({ year: 2026 });
    expect(Array.isArray(cashFlow)).toBe(true);
    expect(cashFlow.length).toBeGreaterThan(0);
  });

  it("adds an expense transaction", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finance.addExpense({
      category: "fuel",
      amount: 200,
      description: "Gasolina viaje Miami-Orlando",
    });
    expect(result.id).toBe(1);
  });

  it("sends notification for large expenses (>=500)", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await caller.finance.addExpense({ category: "maintenance", amount: 600, description: "Reparación de frenos" });
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Gasto Importante") })
    );
  });
});

// ─── Partnership Tests ────────────────────────────────────────────────────────

describe("partnership", () => {
  it("lists partners", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const partners = await caller.partnership.list();
    expect(partners.length).toBe(2);
    expect(partners[0].partnerName).toBe("Socio A");
  });

  it("calculates distribution correctly for 50/50 split", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const dist = await caller.partnership.distribution({ year: 2026, month: 3 });
    // netAfterPayroll = 3500 - 1000 = 2500
    expect(dist.netAfterPayroll).toBe(2500);
    // Each partner gets 50% of 2500 = 1250
    expect(dist.partners[0].distribution).toBe(1250);
    expect(dist.partners[1].distribution).toBe(1250);
  });

  it("creates a partner", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.partnership.create({
      partnerName: "Nuevo Socio",
      partnerRole: "Gestor",
      participationPercent: 50,
    });
    expect(result.id).toBe(1);
  });

  it("registers an owner draw and sends notification", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.partnership.createDraw({
      partnerId: 1,
      amount: 1250,
      period: "2026-03",
      notes: "Retiro mensual",
    });
    expect(result.id).toBe(1);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Retiro de Socio") })
    );
  });
});

// ─── Driver Tests ─────────────────────────────────────────────────────────────

describe("driver", () => {
  it("returns assigned loads for driver", async () => {
    const ctx = createDriverContext();
    const caller = appRouter.createCaller(ctx);
    const loads = await caller.driver.myLoads();
    expect(Array.isArray(loads)).toBe(true);
  });

  it("logs fuel expense and creates transaction", async () => {
    const { createFuelLog, createTransaction } = await import("./db");
    const ctx = createDriverContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.driver.logFuel({
      amount: 80,
      gallons: 20,
      pricePerGallon: 4.0,
      location: "Shell Station, Miami",
    });
    expect(result.id).toBe(1);
    expect(createFuelLog).toHaveBeenCalled();
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "expense", category: "fuel" })
    );
  });

  it("updates load status to delivered and notifies owner", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const ctx = createDriverContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.driver.updateLoadStatus({ id: 1, status: "delivered" });
    expect(result.success).toBe(true);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Entregada") })
    );
  });
});
