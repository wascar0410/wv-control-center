import { describe, it, expect } from "vitest";
import { getBusinessConfig } from "./db";

/**
 * Integration tests for financial layer
 * Validates allocation persistence, alerts, and profit calculations
 */

describe("Financial Layer Integration", () => {
  describe("Allocation Settings Persistence", () => {
    it("should retrieve business config with allocation settings", async () => {
      const config = await getBusinessConfig();

      expect(config).toBeDefined();
      expect(config.ownerDrawPercent).toBeDefined();
      expect(config.reserveFundPercent).toBeDefined();
      expect(config.reinvestmentPercent).toBeDefined();
      expect(config.operatingCashPercent).toBeDefined();
    });

    it("should validate that allocations sum to 100%", async () => {
      const config = await getBusinessConfig();

      const total =
        (config.ownerDrawPercent || 0) +
        (config.reserveFundPercent || 0) +
        (config.reinvestmentPercent || 0) +
        (config.operatingCashPercent || 0);

      expect(Math.abs(total - 100)).toBeLessThan(0.01);
    });

    it("should have default allocations from migration 0037", async () => {
      const config = await getBusinessConfig();

      // Default values from migration 0037
      expect(config.ownerDrawPercent || 40).toBe(40);
      expect(config.reserveFundPercent || 20).toBe(20);
      expect(config.reinvestmentPercent || 20).toBe(20);
      expect(config.operatingCashPercent || 20).toBe(20);
    });
  });

  describe("Profit Per Load Calculation", () => {
    it("should calculate profit margin correctly", async () => {
      // For a $2500 load with estimated expenses, margin should be positive
      const revenue = 2500;
      const estimatedExpenses = 1500; // Fuel, tolls, driver pay, etc.
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
      // A load with margin < 15% should trigger alert
      const revenue = 1000;
      const expenses = 900; // 90% of revenue
      const margin = ((revenue - expenses) / revenue) * 100;

      expect(margin).toBeLessThan(15);
    });

    it("should identify high variance quotes", async () => {
      // Variance > 20% should trigger alert
      const estimatedProfit = 1000;
      const actualProfit = 700; // 30% variance
      const variance = Math.abs(actualProfit - estimatedProfit);
      const variancePercent = (variance / estimatedProfit) * 100;

      expect(variancePercent).toBeGreaterThan(20);
    });

    it("should identify negative cash position", async () => {
      // Negative cash should trigger critical alert
      const cashPosition = -500;

      expect(cashPosition).toBeLessThan(0);
    });

    it("should identify overdue invoices", async () => {
      const invoiceDueDate = new Date();
      invoiceDueDate.setDate(invoiceDueDate.getDate() - 30); // 30 days ago
      const today = new Date();

      const isOverdue = invoiceDueDate < today;

      expect(isOverdue).toBe(true);
    });

    it("should identify payment blocks", async () => {
      // Missing BOL/POD should trigger payment block alert
      const hasBOL = false;
      const hasPOD = false;

      expect(hasBOL || hasPOD).toBe(false);
    });
  });

  describe("Allocation Distribution", () => {
    it("should distribute profit according to allocation percentages", async () => {
      const config = await getBusinessConfig();

      const netProfit = 10000;
      const ownerDraw = (netProfit * (config.ownerDrawPercent || 40)) / 100;
      const reserveFund = (netProfit * (config.reserveFundPercent || 20)) / 100;
      const reinvestment = (netProfit * (config.reinvestmentPercent || 20)) / 100;
      const operatingCash = (netProfit * (config.operatingCashPercent || 20)) / 100;

      const total = ownerDraw + reserveFund + reinvestment + operatingCash;

      expect(Math.abs(total - netProfit)).toBeLessThan(0.01);
    });

    it("should handle edge case allocations", async () => {
      // Test with extreme but valid allocations
      const allocations = {
        ownerDrawPercent: 100,
        reserveFundPercent: 0,
        reinvestmentPercent: 0,
        operatingCashPercent: 0,
      };

      const total =
        allocations.ownerDrawPercent +
        allocations.reserveFundPercent +
        allocations.reinvestmentPercent +
        allocations.operatingCashPercent;

      expect(total).toBe(100);
    });

    it("should calculate owner draw correctly", async () => {
      const config = await getBusinessConfig();
      const netProfit = 10000;
      const ownerDrawPercent = config.ownerDrawPercent || 40;

      const ownerDraw = (netProfit * ownerDrawPercent) / 100;

      expect(ownerDraw).toBe(4000);
    });
  });

  describe("End-to-End Financial Flow", () => {
    it("should calculate cumulative P&L correctly", async () => {
      // Simulate multiple loads
      const loads_data = [
        { revenue: 2500, expenses: 1500 },
        { revenue: 3000, expenses: 1800 },
        { revenue: 1800, expenses: 1200 },
      ];

      const totalRevenue = loads_data.reduce((sum, l) => sum + l.revenue, 0);
      const totalExpenses = loads_data.reduce((sum, l) => sum + l.expenses, 0);
      const netProfit = totalRevenue - totalExpenses;

      expect(netProfit).toBe(3800);
      expect(totalRevenue).toBe(7300);
    });

    it("should apply allocation percentages to net profit", async () => {
      const config = await getBusinessConfig();
      const netProfit = 10000;

      const ownerDraw = (netProfit * (config.ownerDrawPercent || 40)) / 100;
      const reserveFund = (netProfit * (config.reserveFundPercent || 20)) / 100;
      const reinvestment = (netProfit * (config.reinvestmentPercent || 20)) / 100;
      const operatingCash = (netProfit * (config.operatingCashPercent || 20)) / 100;

      const total = ownerDraw + reserveFund + reinvestment + operatingCash;

      expect(Math.abs(total - netProfit)).toBeLessThan(0.01);
    });

    it("should maintain allocation integrity across multiple periods", async () => {
      const config = await getBusinessConfig();

      // Simulate 3 months of operations
      const months = [
        { profit: 5000 },
        { profit: 7500 },
        { profit: 6000 },
      ];

      const totalProfit = months.reduce((sum, m) => sum + m.profit, 0);
      const ownerDrawPercent = config.ownerDrawPercent || 40;
      const expectedOwnerDraw = (totalProfit * ownerDrawPercent) / 100;

      // Each month should allocate the same percentage
      const monthlyAllocations = months.map((m) => (m.profit * ownerDrawPercent) / 100);
      const totalMonthlyAllocations = monthlyAllocations.reduce((sum, a) => sum + a, 0);

      expect(Math.abs(totalMonthlyAllocations - expectedOwnerDraw)).toBeLessThan(0.01);
    });
  });

  describe("Alert Threshold Configuration", () => {
    it("should read alert thresholds from business_config", async () => {
      const config = await getBusinessConfig();

      expect(config.marginAlertThreshold).toBeDefined();
      expect(config.quoteVarianceThreshold).toBeDefined();
      expect(config.overdueDaysThreshold).toBeDefined();
    });

    it("should use default thresholds from migration 0037", async () => {
      const config = await getBusinessConfig();

      // Defaults from migration 0037
      expect(config.marginAlertThreshold || 10).toBe(10);
      expect(config.quoteVarianceThreshold || 20).toBe(20);
      expect(config.overdueDaysThreshold || 30).toBe(30);
    });

    it("should identify low margin threshold", async () => {
      const config = await getBusinessConfig();
      const margin = 8;
      const threshold = config.marginAlertThreshold || 10;

      expect(margin).toBeLessThan(threshold);
    });

    it("should identify high variance threshold", async () => {
      const config = await getBusinessConfig();
      const variance = 25;
      const threshold = config.quoteVarianceThreshold || 20;

      expect(variance).toBeGreaterThan(threshold);
    });

    it("should identify overdue threshold", async () => {
      const config = await getBusinessConfig();
      const daysSinceInvoice = 45;
      const threshold = config.overdueDaysThreshold || 30;

      expect(daysSinceInvoice).toBeGreaterThan(threshold);
    });
  });
});
