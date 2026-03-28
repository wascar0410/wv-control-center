import { describe, it, expect, beforeEach } from "vitest";
import {
  generateIncomeReport,
  generateExpenseReport,
  getTaxSummary,
  calculateQuarterlyEstimates,
} from "./db-tax-compliance";

describe("Tax Compliance Helpers", () => {
  const testYear = 2024;

  describe("generateIncomeReport", () => {
    it("should return a valid income report structure", async () => {
      const report = await generateIncomeReport(testYear);

      expect(report).toHaveProperty("totalIncome");
      expect(report).toHaveProperty("totalExpenses");
      expect(report).toHaveProperty("byCategory");
      expect(report).toHaveProperty("incomeBreakdown");
      expect(report).toHaveProperty("expenseBreakdown");
      expect(report).toHaveProperty("netProfit");
      expect(report).toHaveProperty("taxYear");
    });

    it("should have correct tax year", async () => {
      const report = await generateIncomeReport(testYear);
      expect(report.taxYear).toBe(testYear);
    });

    it("should have numeric values", async () => {
      const report = await generateIncomeReport(testYear);
      expect(typeof report.totalIncome).toBe("number");
      expect(typeof report.totalExpenses).toBe("number");
      expect(typeof report.netProfit).toBe("number");
    });

    it("should have non-negative income", async () => {
      const report = await generateIncomeReport(testYear);
      expect(report.totalIncome).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateExpenseReport", () => {
    it("should return a valid expense report structure", async () => {
      const report = await generateExpenseReport(testYear);

      expect(report).toHaveProperty("totalIncome");
      expect(report).toHaveProperty("totalExpenses");
      expect(report).toHaveProperty("expenseBreakdown");
      expect(report).toHaveProperty("taxYear");
    });

    it("should have correct tax year", async () => {
      const report = await generateExpenseReport(testYear);
      expect(report.taxYear).toBe(testYear);
    });

    it("should have non-negative expenses", async () => {
      const report = await generateExpenseReport(testYear);
      expect(report.totalExpenses).toBeGreaterThanOrEqual(0);
    });

    it("should have fuel breakdown", async () => {
      const report = await generateExpenseReport(testYear);
      expect(report.expenseBreakdown).toHaveProperty("fuel");
      expect(typeof report.expenseBreakdown.fuel).toBe("number");
    });
  });

  describe("getTaxSummary", () => {
    it("should return a valid tax summary", async () => {
      const summary = await getTaxSummary(testYear);

      expect(summary).toHaveProperty("taxYear");
      expect(summary).toHaveProperty("totalIncome");
      expect(summary).toHaveProperty("totalExpenses");
      expect(summary).toHaveProperty("netProfit");
      expect(summary).toHaveProperty("estimatedTaxes");
      expect(summary).toHaveProperty("effectiveTaxRate");
      expect(summary).toHaveProperty("quarterly");
    });

    it("should have correct tax year", async () => {
      const summary = await getTaxSummary(testYear);
      expect(summary.taxYear).toBe(testYear);
    });

    it("should have valid quarterly breakdown", async () => {
      const summary = await getTaxSummary(testYear);
      expect(summary.quarterly).toHaveProperty("q1");
      expect(summary.quarterly).toHaveProperty("q2");
      expect(summary.quarterly).toHaveProperty("q3");
      expect(summary.quarterly).toHaveProperty("q4");
      expect(summary.quarterly).toHaveProperty("total");
    });

    it("should calculate net profit correctly", async () => {
      const summary = await getTaxSummary(testYear);
      const expectedNetProfit = summary.totalIncome - summary.totalExpenses;
      expect(summary.netProfit).toBe(expectedNetProfit);
    });

    it("should have non-negative effective tax rate", async () => {
      const summary = await getTaxSummary(testYear);
      const rate = parseFloat(summary.effectiveTaxRate);
      expect(rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateQuarterlyEstimates", () => {
    it("should return quarterly estimates", async () => {
      const estimates = await calculateQuarterlyEstimates(testYear);

      expect(estimates).toHaveProperty("q1");
      expect(estimates).toHaveProperty("q2");
      expect(estimates).toHaveProperty("q3");
      expect(estimates).toHaveProperty("q4");
      expect(estimates).toHaveProperty("total");
    });

    it("should have non-negative quarterly values", async () => {
      const estimates = await calculateQuarterlyEstimates(testYear);
      expect(estimates.q1).toBeGreaterThanOrEqual(0);
      expect(estimates.q2).toBeGreaterThanOrEqual(0);
      expect(estimates.q3).toBeGreaterThanOrEqual(0);
      expect(estimates.q4).toBeGreaterThanOrEqual(0);
    });

    it("should have total equal to sum of quarters", async () => {
      const estimates = await calculateQuarterlyEstimates(testYear);
      const sum = estimates.q1 + estimates.q2 + estimates.q3 + estimates.q4;
      expect(estimates.total).toBe(sum);
    });

    it("should handle different tax years", async () => {
      const estimates2023 = await calculateQuarterlyEstimates(2023);
      const estimates2024 = await calculateQuarterlyEstimates(2024);

      expect(estimates2023).toHaveProperty("total");
      expect(estimates2024).toHaveProperty("total");
    });
  });

  describe("Income vs Expense consistency", () => {
    it("should have consistent income and expense reports", async () => {
      const income = await generateIncomeReport(testYear);
      const expense = await generateExpenseReport(testYear);

      expect(income.taxYear).toBe(expense.taxYear);
      expect(typeof income.totalIncome).toBe("number");
      expect(typeof expense.totalExpenses).toBe("number");
    });
  });

  describe("Edge cases", () => {
    it("should handle year 2020", async () => {
      const summary = await getTaxSummary(2020);
      expect(summary.taxYear).toBe(2020);
    });

    it("should handle current year", async () => {
      const currentYear = new Date().getFullYear();
      const summary = await getTaxSummary(currentYear);
      expect(summary.taxYear).toBe(currentYear);
    });

    it("should handle zero income scenario", async () => {
      const report = await generateIncomeReport(testYear);
      expect(report.totalIncome).toBeGreaterThanOrEqual(0);
    });
  });
});
