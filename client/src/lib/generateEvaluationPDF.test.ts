import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEvaluationPDF } from "./generateEvaluationPDF";
import { LoadEvaluatorFormData } from "@/hooks/useLoadEvaluatorForm";

// Mock jsPDF
vi.mock("jspdf", () => {
  const mockDoc = {
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297),
      },
    },
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    line: vi.fn(),
    setFillColor: vi.fn(),
    rect: vi.fn(),
    setFont: vi.fn(),
    addPage: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    getNumberOfPages: vi.fn(() => 1),
    save: vi.fn(),
  };

  return {
    jsPDF: vi.fn(() => mockDoc),
  };
});

describe("generateEvaluationPDF", () => {
  const mockForm: LoadEvaluatorFormData = {
    brokerName: "CH Robinson",
    clientName: "Amazon",
    origin: "Newark, NJ",
    destination: "Harrisburg, PA",
    offeredPrice: "1300",
    loadedMiles: "420",
    deadheadMiles: "40",
    weightLbs: "1800",
    pickupDate: "2026-03-28",
    deliveryDate: "2026-03-29",
    notes: "Test load",
  };

  const mockEvaluation = {
    decision: "ACCEPT" as const,
    decisionReason: "Good profit margin",
    estimatedProfit: 450,
    estimatedMarginPercent: 34.6,
    totalMiles: 460,
    offeredRatePerMile: 2.83,
    recommendedMinRatePerMile: 2.15,
    totalCostPerMile: 1.48,
    estimatedProfitPerMile: 0.98,
    fuelCostPerMile: 0.26,
    variableCostPerMile: 0.41,
    fixedCostPerMile: 0.19,
    distanceSurchargePerMile: 0.18,
    weightSurchargePerMile: 0.04,
    totalEstimatedCost: 681,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate PDF without errors", () => {
    expect(() => {
      generateEvaluationPDF(mockForm, mockEvaluation);
    }).not.toThrow();
  });

  it("should call save method with correct filename", () => {
    const { jsPDF } = require("jspdf");
    generateEvaluationPDF(mockForm, mockEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    expect(mockDoc.save).toHaveBeenCalledWith(
      expect.stringContaining("evaluacion-Amazon-")
    );
  });

  it("should include form data in PDF", () => {
    const { jsPDF } = require("jspdf");
    generateEvaluationPDF(mockForm, mockEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const textCalls = mockDoc.text.mock.calls;

    const textContent = textCalls.map((call: any[]) => call[0]).join(" ");
    expect(textContent).toContain("Amazon");
    expect(textContent).toContain("CH Robinson");
    expect(textContent).toContain("Newark, NJ");
    expect(textContent).toContain("Harrisburg, PA");
  });

  it("should include evaluation results in PDF", () => {
    const { jsPDF } = require("jspdf");
    generateEvaluationPDF(mockForm, mockEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const textCalls = mockDoc.text.mock.calls;

    const textContent = textCalls.map((call: any[]) => call[0]).join(" ");
    expect(textContent).toContain("ACEPTAR");
    expect(textContent).toContain("Good profit margin");
  });

  it("should format currency values correctly", () => {
    const { jsPDF } = require("jspdf");
    generateEvaluationPDF(mockForm, mockEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const textCalls = mockDoc.text.mock.calls;

    const textContent = textCalls.map((call: any[]) => call[0]).join(" ");
    expect(textContent).toContain("$1300.00");
    expect(textContent).toContain("$450.00");
  });

  it("should set correct colors for ACCEPT decision", () => {
    const { jsPDF } = require("jspdf");
    generateEvaluationPDF(mockForm, mockEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const fillColorCalls = mockDoc.setFillColor.mock.calls;

    // Should have green color for ACCEPT (76, 175, 80)
    expect(fillColorCalls).toContainEqual([76, 175, 80]);
  });

  it("should handle NEGOTIATE decision", () => {
    const { jsPDF } = require("jspdf");
    const negotiateEvaluation = { ...mockEvaluation, decision: "NEGOTIATE" as const };

    generateEvaluationPDF(mockForm, negotiateEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const fillColorCalls = mockDoc.setFillColor.mock.calls;

    // Should have yellow color for NEGOTIATE (255, 193, 7)
    expect(fillColorCalls).toContainEqual([255, 193, 7]);
  });

  it("should handle REJECT decision", () => {
    const { jsPDF } = require("jspdf");
    const rejectEvaluation = { ...mockEvaluation, decision: "REJECT" as const };

    generateEvaluationPDF(mockForm, rejectEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const fillColorCalls = mockDoc.setFillColor.mock.calls;

    // Should have red color for REJECT (244, 67, 54)
    expect(fillColorCalls).toContainEqual([244, 67, 54]);
  });

  it("should include cost breakdown in PDF", () => {
    const { jsPDF } = require("jspdf");
    generateEvaluationPDF(mockForm, mockEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const textCalls = mockDoc.text.mock.calls;

    const textContent = textCalls.map((call: any[]) => call[0]).join(" ");
    expect(textContent).toContain("Combustible");
    expect(textContent).toContain("Mantenimiento");
    expect(textContent).toContain("Costos Fijos");
  });

  it("should include notes if provided", () => {
    const { jsPDF } = require("jspdf");
    generateEvaluationPDF(mockForm, mockEvaluation);

    const mockDoc = jsPDF().mock.results[0].value;
    const textCalls = mockDoc.text.mock.calls;

    const textContent = textCalls.map((call: any[]) => call[0]).join(" ");
    expect(textContent).toContain("Test load");
  });
});
