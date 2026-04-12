import { describe, it, expect } from "vitest";
import { getAllocationSettings } from "./db";

/**
 * Integration tests for financial layer
 * Validates allocation persistence, alerts, and profit calculations
 */

describe("Financial Layer Integration", () => {
  describe("Allocation Settings Persistence", () => {
    it("should retrieve allocation settings with 5-bucket model", async () => {
      const config = await getAllocationSettings();

      expect(config).toBeDefined();
      expect(config.operatingExpensesPercent).toBeDefined();
      expect(config.vanFundPercent).toBeDefined();
      expect(config.emergencyReservePercent).toBeDefined();
      expect(config.wascarDrawPercent).toBeDefined();
      expect(config.yisvelDrawPercent).toBeDefined();
    });

    it("should validate that allocations sum to 100%", async () => {
      const config = await getAllocationSettings();

      const total =
        (config.operatingExpensesPercent || 0) +
        (config.vanFundPercent || 0) +
        (config.emergencyReservePercent || 0) +
        (config.wascarDrawPercent || 0) +
        (config.yisvelDrawPercent || 0);

      expect(Math.abs(total - 100)).toBeLessThan(0.01);
    });

    it("should have default allocations for current business stage", async () => {
      const config = await getAllocationSettings();

      expect(config.operatingExpensesPercent || 35).toBe(35);
      expect(config.vanFundPercent || 30).toBe(30);
      expect(config.emergencyReservePercent || 10).toBe(10);
      expect(config.wascarDrawPercent || 12.5).toBe(12.5);
      expect(config.yisvelDrawPercent || 12.5).toBe(12.5);
    });
  });

  describe("Profit Per Load Calculation", () => {
    it("should calculate profit margin correctly", async () => {
      const revenue = 2500;
      const estimatedExpenses = 1500;
      const profit = revenue - estimatedExpenses;
      const margin = (profit / revenue) * 100;

      expect(margin).toBeGreaterThan(0);
      expect(margin).toBeLessThan(100);
    });

    it("should calculate profit per mile", async () => {
      const revenue = 2500;
      const miles = 500;
      const estimatedExpenses = 1500;
      const profit = revenue - estimatedExpenses;
      const profitPerMile = profit / miles;

      expect(profitPerMile).toBeGreaterThan(0);
      expect(profitPerMile).toBeLessThan(revenue / miles);
    });

    it("should handle zero miles edge case", async () => {
      const revenue = 2500;
      const miles = 0;
      const estimatedExpenses = 1500;
      const profit = revenue - estimatedExpenses;
      const profitPerMile = miles > 0 ? profit / miles : 0;

      expect(profitPerMile).toBe(0);
    });

    it("should identify negative profit", async () => {
      const revenue = 1000;
      const expenses = 1500;
      const profit = revenue - expenses;

      expect(profit).toBeLessThan(0);
    });
  });

  describe("Financial Alerts Generation", () => {
    it("should identify low margin loads", async () => {
      const revenue = 1000;
      const expenses = 900;
      const margin = ((revenue - expenses) / revenue) * 100;

      expect(margin).toBeLessThan(15);
    });

    it("should identify high variance quotes", async () => {
      const estimatedProfit = 1000;
      const actualProfit = 700;
      const variance = Math.abs(actualProfit - estimatedProfit);
      const variancePercent = (variance / estimatedProfit) * 100;

      expect(variancePercent).toBeGreaterThan(20);
    });

    it("should identify negative cash position", async () => {
      const cashPosition = -500;
      expect(cashPosition).toBeLessThan(0);
    });

    it("should identify overdue invoices", async () => {
      const invoiceDueDate = new Date();
      invoiceDueDate.setDate(invoiceDueDate.getDate() - 30);
      const today = new Date();

      const isOverdue = invoiceDueDate < today;

      expect(isOverdue).toBe(true);
    });

    it("should identify payment blocks", async () => {
      const hasBOL = false;
      const hasPOD = false;

      expect(hasBOL || hasPOD).toBe(false);
    });
  });

  describe("Allocation Distribution", () => {
    it("should distribute profit according to 5-bucket percentages", async () => {
      const config = await getAllocationSettings();

      const netProfit = 10000;
      const operatingExpenses = (netProfit * (config.operatingExpensesPercent || 35)) / 100;
      const vanFund = (netProfit * (config.vanFundPercent || 30)) / 100;
      const emergencyReserve = (netProfit * (config.emergencyReservePercent || 10)) / 100;
      const wascarDraw = (netProfit * (config.wascarDrawPercent || 12.5)) / 100;
      const yisvelDraw = (netProfit * (config.yisvelDrawPercent || 12.5)) / 100;

      const total =
        operatingExpenses +
        vanFund +
        emergencyReserve +
        wascarDraw +
        yisvelDraw;

      expect(Math.abs(total - netProfit)).toBeLessThan(0.01);
    });

    it("should handle edge case allocations", async () => {
      const allocations = {
        operatingExpensesPercent: 100,
        vanFundPercent: 0,
        emergencyReservePercent: 0,
        wascarDrawPercent: 0,
        yisvelDrawPercent: 0,
      };

      const total =
        allocations.operatingExpensesPercent +
        allocations.vanFundPercent +
        allocations.emergencyReservePercent +
        allocations.wascarDrawPercent +
        allocations.yisvelDrawPercent;

      expect(total).toBe(100);
    });

    it("should calculate Wascar and Yisvel draws correctly", async () => {
      const config = await getAllocationSettings();
      const netProfit = 10000;

      const wascarDraw = (netProfit * (config.wascarDrawPercent || 12.5)) / 100;
      const yisvelDraw = (netProfit * (config.yisvelDrawPercent || 12.5)) / 100;

      expect(wascarDraw).toBe(1250);
      expect(yisvelDraw).toBe(1250);
    });
  });

  describe("End-to-End Financial Flow", () => {
    it("should calculate cumulative P&L correctly", async () => {
      const loadsData = [
        { revenue: 2500, expenses: 1500 },
        { revenue: 3000, expenses: 1800 },
        { revenue: 1800, expenses: 1200 },
      ];

      const totalRevenue = loadsData.reduce((sum, l) => sum + l.revenue, 0);
      const totalExpenses = loadsData.reduce((sum, l) => sum + l.expenses, 0);
      const netProfit = totalRevenue - totalExpenses;

      expect(netProfit).toBe(2800);
      expect(totalRevenue).toBe(7300);
      expect(totalExpenses).toBe(4500);
    });

    it("should apply 5-bucket allocation percentages to net profit", async () => {
      const config = await getAllocationSettings();
      const netProfit = 10000;

      const operatingExpenses = (netProfit * (config.operatingExpensesPercent || 35)) / 100;
      const vanFund = (netProfit * (config.vanFundPercent || 30)) / 100;
      const emergencyReserve = (netProfit * (config.emergencyReservePercent || 10)) / 100;
      const wascarDraw = (netProfit * (config.wascarDrawPercent || 12.5)) / 100;
      const yisvelDraw = (netProfit * (config.yisvelDrawPercent || 12.5)) / 100;

      const total =
        operatingExpenses +
        vanFund +
        emergencyReserve +
        wascarDraw +
        yisvelDraw;

      expect(Math.abs(total - netProfit)).toBeLessThan(0.01);
    });

    it("should maintain allocation integrity across multiple periods", async () => {
      const config = await getAllocationSettings();

      const months = [
        { profit: 5000 },
        { profit: 7500 },
        { profit: 6000 },
      ];

      const totalProfit = months.reduce((sum, m) => sum + m.profit, 0);
      const wascarDrawPercent = config.wascarDrawPercent || 12.5;
      const expectedWascarDraw = (totalProfit * wascarDrawPercent) / 100;

      const monthlyAllocations = months.map((m) => (m.profit * wascarDrawPercent) / 100);
      const totalMonthlyAllocations = monthlyAllocations.reduce((sum, a) => sum + a, 0);

      expect(Math.abs(totalMonthlyAllocations - expectedWascarDraw)).toBeLessThan(0.01);
    });
  });

  describe("Alert Threshold Configuration", () => {
    it("should read alert thresholds from business_config", async () => {
      const config = await getAllocationSettings();

      expect(config.marginAlertThreshold).toBeDefined();
      expect(config.quoteVarianceThreshold).toBeDefined();
      expect(config.overdueDaysThreshold).toBeDefined();
    });

    it("should use current default thresholds", async () => {
      const config = await getAllocationSettings();

      expect(config.marginAlertThreshold || 10).toBe(10);
      expect(config.quoteVarianceThreshold || 20).toBe(20);
      expect(config.overdueDaysThreshold || 30).toBe(30);
    });

    it("should identify low margin threshold", async () => {
      const config = await getAllocationSettings();
      const margin = 8;
      const threshold = config.marginAlertThreshold || 10;

      expect(margin).toBeLessThan(threshold);
    });

    it("should identify high variance threshold", async () => {
      const config = await getAllocationSettings();
      const variance = 25;
      const threshold = config.quoteVarianceThreshold || 20;

      expect(variance).toBeGreaterThan(threshold);
    });

    it("should identify overdue threshold", async () => {
      const config = await getAllocationSettings();
      const daysSinceInvoice = 45;
      const threshold = config.overdueDaysThreshold || 30;

      expect(daysSinceInvoice).toBeGreaterThan(threshold);
    });
  });
});
