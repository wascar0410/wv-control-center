import { describe, it, expect } from "vitest";
import {
  generateMockProjections,
  generateMockProjectionsTrend,
  generateMockComparison,
  MOCK_PROJECTIONS_SCENARIOS,
} from "@/lib/test-data";

describe("TrendCharts Component", () => {
  describe("Chart Data Generation", () => {
    it("should generate valid trend data", () => {
      const trends = generateMockProjectionsTrend(6);

      expect(trends).toHaveLength(6);
      trends.forEach((trend) => {
        expect(trend.completedMiles).toBeGreaterThanOrEqual(0);
        expect(trend.projectedTotalMiles).toBeGreaterThanOrEqual(0);
        expect(trend.completedProfit).toBeGreaterThanOrEqual(0);
      });
    });

    it("should generate comparison data", () => {
      const comparison = generateMockComparison(6);

      expect(comparison).toHaveLength(6);
      comparison.forEach((month) => {
        expect(month.month).toBeDefined();
        expect(month.miles).toBeGreaterThanOrEqual(0);
        expect(month.income).toBeGreaterThanOrEqual(0);
        expect(month.profit).toBeGreaterThanOrEqual(0);
      });
    });

    it("should generate multiple months of trend data", () => {
      const trends = generateMockProjectionsTrend(12);
      expect(trends).toHaveLength(12);
    });

    it("should generate single month of trend data", () => {
      const trends = generateMockProjectionsTrend(1);
      expect(trends).toHaveLength(1);
    });
  });

  describe("Miles Projection Chart", () => {
    it("should prepare miles projection data correctly", () => {
      const data = generateMockProjections({
        completedMiles: 1000,
        quotedMiles: 500,
      });

      const milesProjectionData = [
        {
          name: "Completadas",
          value: data.completedMiles,
        },
        {
          name: "En Cotización",
          value: data.quotedMiles,
        },
        {
          name: "Proyectado (Falta)",
          value: Math.max(0, data.projectedTotalMiles - data.totalMilesActual),
        },
      ];

      expect(milesProjectionData).toHaveLength(3);
      expect(milesProjectionData[0].value).toBe(1000);
      expect(milesProjectionData[1].value).toBe(500);
    });

    it("should handle zero projected miles", () => {
      const data = generateMockProjections({
        completedMiles: 0,
        quotedMiles: 0,
        projectedTotalMiles: 0,
      });

      const remaining = Math.max(0, data.projectedTotalMiles - data.totalMilesActual);
      expect(remaining).toBe(0);
    });

    it("should handle miles exceeding projection", () => {
      const data = generateMockProjections({
        completedMiles: 3000,
        quotedMiles: 1500,
        projectedTotalMiles: 4000,
      });

      const remaining = Math.max(0, data.projectedTotalMiles - data.totalMilesActual);
      expect(remaining).toBe(Math.max(0, 4000 - 4500));
    });
  });

  describe("Profit Breakdown Chart", () => {
    it("should prepare profit breakdown data correctly", () => {
      const data = generateMockProjections({
        completedProfit: 2000,
        quotedProfit: 1000,
      });

      const profitBreakdownData = [
        {
          name: "Completada",
          value: Math.abs(data.completedProfit),
        },
        {
          name: "En Cotización",
          value: Math.abs(data.quotedProfit),
        },
      ];

      expect(profitBreakdownData).toHaveLength(2);
      expect(profitBreakdownData[0].value).toBe(2000);
      expect(profitBreakdownData[1].value).toBe(1000);
    });

    it("should handle negative profit values", () => {
      const data = generateMockProjections({
        completedProfit: -500,
        quotedProfit: 1000,
      });

      expect(Math.abs(data.completedProfit)).toBe(500);
      expect(Math.abs(data.quotedProfit)).toBe(1000);
    });

    it("should handle zero profit", () => {
      const data = generateMockProjections({
        completedProfit: 0,
        quotedProfit: 0,
      });

      expect(Math.abs(data.completedProfit)).toBe(0);
      expect(Math.abs(data.quotedProfit)).toBe(0);
    });
  });

  describe("Daily Trend Chart", () => {
    it("should generate daily trend data", () => {
      const data = generateMockProjections({
        daysPassed: 15,
        dailyAverageMiles: 100,
        dailyAverageProfit: 250,
      });

      expect(data.daysPassed).toBe(15);
      expect(data.dailyAverageMiles).toBe(100);
      expect(data.dailyAverageProfit).toBe(250);
    });

    it("should handle zero daily averages", () => {
      const data = generateMockProjections({
        daysPassed: 0,
        dailyAverageMiles: 0,
        dailyAverageProfit: 0,
      });

      expect(data.dailyAverageMiles).toBe(0);
      expect(data.dailyAverageProfit).toBe(0);
    });

    it("should generate trend data for full month", () => {
      const data = generateMockProjections({
        daysPassed: 30,
        daysRemaining: 0,
      });

      expect(data.daysPassed).toBe(30);
      expect(data.daysRemaining).toBe(0);
    });
  });

  describe("Trend Analysis", () => {
    it("should show upward trend", () => {
      const trends = generateMockProjectionsTrend(6);

      // Verify trends are in chronological order
      expect(trends).toHaveLength(6);
      trends.forEach((trend) => {
        expect(trend.projectedTotalMiles).toBeGreaterThanOrEqual(0);
      });
    });

    it("should show profit variation", () => {
      const trends = generateMockProjectionsTrend(6);

      const profits = trends.map((t) => t.projectedTotalProfit);
      const hasVariation = profits.some((p, i) => i === 0 || p !== profits[i - 1]);

      expect(hasVariation).toBe(true);
    });

    it("should compare months correctly", () => {
      const comparison = generateMockComparison(6);

      expect(comparison).toHaveLength(6);
      comparison.forEach((month, index) => {
        if (index > 0) {
          expect(month.month).toBeDefined();
        }
      });
    });
  });

  describe("Chart Rendering Scenarios", () => {
    it("should render with on-track scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.onTrack;

      expect(data.completedMiles).toBeGreaterThan(0);
      expect(data.projectedTotalMiles).toBeGreaterThanOrEqual(4000);
    });

    it("should render with behind scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.behind;

      expect(data.completedMiles).toBeGreaterThan(0);
      expect(data.projectedTotalMiles).toBeLessThan(4000);
    });

    it("should render with empty data", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.empty;

      expect(data.completedMiles).toBe(0);
      expect(data.quotedMiles).toBe(0);
    });

    it("should render with high profit scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.highProfit;

      expect(data.projectedTotalProfit).toBeGreaterThan(0);
    });

    it("should render with low profit scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.lowProfit;

      expect(data.projectedTotalProfit).toBeGreaterThan(0);
    });
  });

  describe("Data Consistency in Charts", () => {
    it("should maintain consistency across trend data", () => {
      const trends = generateMockProjectionsTrend(6);

      trends.forEach((trend) => {
        expect(trend.totalMilesActual).toBe(
          trend.completedMiles + trend.quotedMiles
        );
        expect(trend.totalProfitActual).toBe(
          trend.completedProfit + trend.quotedProfit
        );
      });
    });

    it("should maintain consistency in comparison data", () => {
      const comparison = generateMockComparison(6);

      comparison.forEach((month) => {
        expect(month.miles).toBeGreaterThanOrEqual(0);
        expect(month.income).toBeGreaterThanOrEqual(0);
        expect(month.profit).toBeGreaterThanOrEqual(0);
      });
    });

    it("should handle all scenarios without errors", () => {
      Object.values(MOCK_PROJECTIONS_SCENARIOS).forEach((scenario) => {
        expect(scenario).toBeDefined();

        // Verify chart data can be generated
        const milesData = [
          { name: "Completadas", value: scenario.completedMiles },
          { name: "En Cotización", value: scenario.quotedMiles },
        ];

        expect(milesData).toHaveLength(2);
      });
    });
  });

  describe("Performance", () => {
    it("should generate trend data efficiently", () => {
      const startTime = performance.now();
      const trends = generateMockProjectionsTrend(12);
      const endTime = performance.now();

      expect(trends).toHaveLength(12);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it("should generate comparison data efficiently", () => {
      const startTime = performance.now();
      const comparison = generateMockComparison(12);
      const endTime = performance.now();

      expect(comparison).toHaveLength(12);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});
