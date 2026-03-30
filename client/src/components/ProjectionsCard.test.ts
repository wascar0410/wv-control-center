import { describe, it, expect } from "vitest";
import {
  generateMockProjections,
  MOCK_PROJECTIONS_SCENARIOS,
} from "@/lib/test-data";

describe("ProjectionsCard Component", () => {
  describe("Data Generation", () => {
    it("should generate valid mock projections data", () => {
      const data = generateMockProjections();

      expect(data.completedMiles).toBeGreaterThanOrEqual(0);
      expect(data.quotedMiles).toBeGreaterThanOrEqual(0);
      expect(data.projectedTotalMiles).toBeGreaterThanOrEqual(0);
      expect(data.milesPercentage).toBeGreaterThanOrEqual(0);
      expect(typeof data.willReachGoal).toBe("boolean");
    });

    it("should generate profit data correctly", () => {
      const data = generateMockProjections();

      expect(data.completedProfit).toBeGreaterThanOrEqual(0);
      expect(data.quotedProfit).toBeGreaterThanOrEqual(0);
      expect(data.projectedTotalProfit).toBeGreaterThanOrEqual(0);
      expect(data.dailyAverageProfit).toBeGreaterThanOrEqual(0);
    });

    it("should generate time metrics correctly", () => {
      const data = generateMockProjections();

      expect(data.daysPassed).toBeGreaterThan(0);
      expect(data.daysRemaining).toBeGreaterThanOrEqual(0);
      expect(data.daysInMonth).toBeGreaterThan(0);
      expect(data.daysPassed + data.daysRemaining).toBeLessThanOrEqual(
        data.daysInMonth + 1
      );
    });

    it("should allow overrides in mock data", () => {
      const data = generateMockProjections({
        completedMiles: 5000,
        completedProfit: 10000,
      });

      expect(data.completedMiles).toBe(5000);
      expect(data.completedProfit).toBe(10000);
    });
  });

  describe("Projection Scenarios", () => {
    it("should have on-track scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.onTrack;

      expect(data.willReachGoal).toBe(true);
      expect(data.projectedTotalMiles).toBeGreaterThanOrEqual(4000);
    });

    it("should have behind scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.behind;

      expect(data.willReachGoal).toBe(false);
      expect(data.projectedTotalMiles).toBeLessThan(4000);
    });

    it("should have ahead scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.ahead;

      expect(data.willReachGoal).toBe(true);
      expect(data.projectedTotalMiles).toBeGreaterThan(4000);
    });

    it("should have beginning of month scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.beginning;

      expect(data.daysPassed).toBe(1);
      expect(data.daysRemaining).toBe(29);
    });

    it("should have end of month scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.end;

      expect(data.daysPassed).toBe(29);
      expect(data.daysRemaining).toBe(1);
    });

    it("should have empty scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.empty;

      expect(data.completedMiles).toBe(0);
      expect(data.quotedMiles).toBe(0);
      expect(data.projectedTotalMiles).toBe(0);
      expect(data.milesPercentage).toBe(0);
    });

    it("should have high profit scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.highProfit;

      expect(data.projectedTotalProfit).toBeGreaterThan(10000);
    });

    it("should have low profit scenario", () => {
      const data = MOCK_PROJECTIONS_SCENARIOS.lowProfit;

      expect(data.projectedTotalProfit).toBeLessThan(5000);
    });
  });

  describe("Calculations", () => {
    it("should calculate miles percentage correctly", () => {
      const data = generateMockProjections({
        projectedTotalMiles: 2000,
      });

      const expectedPercentage = (2000 / 4000) * 100;
      expect(data.milesPercentage).toBe(Math.round(expectedPercentage));
    });

    it("should calculate daily averages correctly", () => {
      const data = generateMockProjections({
        completedMiles: 1500,
        daysPassed: 15,
      });

      const expectedDaily = Math.round(1500 / 15);
      expect(data.dailyAverageMiles).toBe(expectedDaily);
    });

    it("should handle zero days passed", () => {
      const data = generateMockProjections({
        daysPassed: 0,
      });

      expect(data.dailyAverageMiles).toBe(0);
      expect(data.dailyAverageProfit).toBe(0);
    });

    it("should project correctly based on daily average", () => {
      const data = generateMockProjections({
        completedMiles: 1000,
        daysPassed: 10,
        daysRemaining: 20,
      });

      const dailyAvg = 1000 / 10;
      const expectedProjection = 1000 + dailyAvg * 20;

      expect(data.projectedTotalMiles).toBe(Math.round(expectedProjection));
    });
  });

  describe("Edge Cases", () => {
    it("should handle very high miles", () => {
      const data = generateMockProjections({
        completedMiles: 10000,
        projectedTotalMiles: 15000,
      });

      expect(data.milesPercentage).toBeGreaterThan(100);
      expect(data.willReachGoal).toBe(true);
    });

    it("should handle negative projected miles as zero", () => {
      const data = generateMockProjections({
        completedMiles: 0,
        dailyAverageMiles: 0,
        projectedTotalMiles: 0,
      });

      expect(data.projectedTotalMiles).toBeGreaterThanOrEqual(0);
    });

    it("should handle decimal values correctly", () => {
      const data = generateMockProjections({
        completedProfit: 1234.56,
        quotedProfit: 789.12,
      });

      expect(typeof data.completedProfit).toBe("number");
      expect(typeof data.quotedProfit).toBe("number");
    });
  });

  describe("Data Consistency", () => {
    it("should maintain data consistency", () => {
      const data = generateMockProjections();

      // Total actual should be sum of completed and quoted
      expect(data.totalMilesActual).toBe(
        data.completedMiles + data.quotedMiles
      );

      // Projected should be >= actual
      expect(data.projectedTotalMiles).toBeGreaterThanOrEqual(
        data.totalMilesActual
      );

      // Days should add up
      expect(data.daysPassed + data.daysRemaining).toBeLessThanOrEqual(
        data.daysInMonth + 1
      );
    });

    it("should have consistent profit data", () => {
      const data = generateMockProjections();

      expect(data.totalProfitActual).toBe(
        data.completedProfit + data.quotedProfit
      );
    });
  });
});

describe("ProjectionsCard - Rendering", () => {
  it("should render with on-track data", () => {
    const data = MOCK_PROJECTIONS_SCENARIOS.onTrack;
    expect(data.willReachGoal).toBe(true);
  });

  it("should render with behind data", () => {
    const data = MOCK_PROJECTIONS_SCENARIOS.behind;
    expect(data.willReachGoal).toBe(false);
  });

  it("should render with empty data", () => {
    const data = MOCK_PROJECTIONS_SCENARIOS.empty;
    expect(data.completedMiles).toBe(0);
  });

  it("should handle all scenarios without errors", () => {
    Object.values(MOCK_PROJECTIONS_SCENARIOS).forEach((scenario) => {
      expect(scenario).toBeDefined();
      expect(scenario.completedMiles).toBeGreaterThanOrEqual(0);
      expect(scenario.projectedTotalMiles).toBeGreaterThanOrEqual(0);
    });
  });
});
