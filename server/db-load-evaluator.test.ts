import { describe, it, expect } from "vitest";
import { evaluateLoad, EvaluationForm, BusinessConfig, DistanceRule, WeightRule } from "./db-load-evaluator";

const defaultConfig: BusinessConfig = {
  fuelPricePerGallon: 4.15,
  vanMpg: 16,
  maintenancePerMile: 0.12,
  tiresPerMile: 0.03,
  insuranceMonthly: 1100,
  phoneInternetMonthly: 90,
  loadBoardAppsMonthly: 180,
  accountingSoftwareMonthly: 75,
  otherFixedMonthly: 150,
  targetMilesPerMonth: 8500,
  minimumProfitPerMile: 0.45,
};

const defaultDistanceRules: DistanceRule[] = [
  { id: 1, fromMiles: 0, surchargePerMile: 0 },
  { id: 2, fromMiles: 250, surchargePerMile: 0.08 },
  { id: 3, fromMiles: 500, surchargePerMile: 0.18 },
  { id: 4, fromMiles: 900, surchargePerMile: 0.3 },
];

const defaultWeightRules: WeightRule[] = [
  { id: 1, fromLbs: 0, surchargePerMile: 0 },
  { id: 2, fromLbs: 1500, surchargePerMile: 0.04 },
  { id: 3, fromLbs: 2500, surchargePerMile: 0.08 },
  { id: 4, fromLbs: 3200, surchargePerMile: 0.14 },
];

describe("Load Evaluator", () => {
  it("should calculate fuel cost per mile correctly", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "A",
      destination: "B",
      offeredPrice: 1000,
      loadedMiles: 500,
      deadheadMiles: 0,
      weightLbs: 0,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    // Fuel cost = 4.15 / 16 = 0.259375
    expect(result.fuelCostPerMile).toBeCloseTo(4.15 / 16, 5);
  });

  it("should calculate variable cost per mile correctly", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "A",
      destination: "B",
      offeredPrice: 1000,
      loadedMiles: 500,
      deadheadMiles: 0,
      weightLbs: 0,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    // Variable = fuel + maintenance + tires = 0.259375 + 0.12 + 0.03 = 0.409375
    expect(result.variableCostPerMile).toBeCloseTo(4.15 / 16 + 0.12 + 0.03, 5);
  });

  it("should calculate fixed cost per mile correctly", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "A",
      destination: "B",
      offeredPrice: 1000,
      loadedMiles: 500,
      deadheadMiles: 0,
      weightLbs: 0,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    // Monthly fixed = 1100 + 90 + 180 + 75 + 150 = 1595
    // Fixed per mile = 1595 / 8500 = 0.1876...
    const monthlyFixed = 1100 + 90 + 180 + 75 + 150;
    expect(result.fixedCostPerMile).toBeCloseTo(monthlyFixed / 8500, 5);
  });

  it("should accept good loads", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "Newark, NJ",
      destination: "Harrisburg, PA",
      offeredPrice: 1300,
      loadedMiles: 420,
      deadheadMiles: 40,
      weightLbs: 1800,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    expect(result.decision).toBe("ACCEPT");
    expect(result.estimatedProfit).toBeGreaterThan(0);
  });

  it("should reject bad loads", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "Newark, NJ",
      destination: "Harrisburg, PA",
      offeredPrice: 350,
      loadedMiles: 420,
      deadheadMiles: 60,
      weightLbs: 2800,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    expect(result.decision).toBe("REJECT");
  });

  it("should suggest negotiation for marginal loads", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "Newark, NJ",
      destination: "Harrisburg, PA",
      offeredPrice: 600,
      loadedMiles: 320,
      deadheadMiles: 40,
      weightLbs: 1200,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    expect(result.decision).toBe("NEGOTIATE");
  });

  it("should apply distance surcharge correctly", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "A",
      destination: "B",
      offeredPrice: 1000,
      loadedMiles: 500, // Should trigger 0.18 surcharge
      deadheadMiles: 0,
      weightLbs: 0,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    expect(result.distanceSurchargePerMile).toBe(0.18);
  });

  it("should apply weight surcharge correctly", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "A",
      destination: "B",
      offeredPrice: 1000,
      loadedMiles: 100,
      deadheadMiles: 0,
      weightLbs: 2500, // Should trigger 0.08 surcharge
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    expect(result.weightSurchargePerMile).toBe(0.08);
  });

  it("should calculate total miles including deadhead", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "A",
      destination: "B",
      offeredPrice: 1000,
      loadedMiles: 400,
      deadheadMiles: 100,
      weightLbs: 0,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    expect(result.totalMiles).toBe(500);
  });

  it("should calculate profit margin percentage correctly", () => {
    const form: EvaluationForm = {
      brokerName: "Test Broker",
      clientName: "Test Client",
      origin: "A",
      destination: "B",
      offeredPrice: 1000,
      loadedMiles: 400,
      deadheadMiles: 0,
      weightLbs: 0,
      notes: "",
    };

    const result = evaluateLoad(form, defaultConfig, defaultDistanceRules, defaultWeightRules);
    
    // Margin = (profit / price) * 100
    const expectedMargin = (result.estimatedProfit / 1000) * 100;
    expect(result.estimatedMarginPercent).toBeCloseTo(expectedMargin, 1);
  });
});
