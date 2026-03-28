import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLoadEvaluatorForm } from "./useLoadEvaluatorForm";

// Mock trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    loadEvaluator: {
      evaluate: {
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
        })),
      },
      save: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
    },
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useLoadEvaluatorForm", () => {
  it("should initialize with default form values", () => {
    const { result } = renderHook(() => useLoadEvaluatorForm());

    expect(result.current.form.brokerName).toBe("");
    expect(result.current.form.clientName).toBe("");
    expect(result.current.form.origin).toBe("");
    expect(result.current.form.destination).toBe("");
    expect(result.current.form.offeredPrice).toBe("");
    expect(result.current.form.loadedMiles).toBe("");
    expect(result.current.form.deadheadMiles).toBe("0");
    expect(result.current.form.weightLbs).toBe("0");
  });

  it("should update form field when handleChange is called", () => {
    const { result } = renderHook(() => useLoadEvaluatorForm());

    act(() => {
      result.current.handleChange("brokerName", "CH Robinson");
    });

    expect(result.current.form.brokerName).toBe("CH Robinson");
  });

  it("should not allow evaluation when price or miles are missing", () => {
    const { result } = renderHook(() => useLoadEvaluatorForm());

    expect(result.current.canEvaluate).toBe(false);
  });

  it("should allow evaluation when price and miles are provided", () => {
    const { result } = renderHook(() => useLoadEvaluatorForm());

    act(() => {
      result.current.handleChange("offeredPrice", "1000");
      result.current.handleChange("loadedMiles", "500");
    });

    expect(result.current.canEvaluate).toBe(true);
  });

  it("should reset form to initial state", () => {
    const { result } = renderHook(() => useLoadEvaluatorForm());

    act(() => {
      result.current.handleChange("brokerName", "Test Broker");
      result.current.handleChange("clientName", "Test Client");
    });

    expect(result.current.form.brokerName).toBe("Test Broker");
    expect(result.current.form.clientName).toBe("Test Client");

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.form.brokerName).toBe("");
    expect(result.current.form.clientName).toBe("");
  });

  it("should have stable callbacks", () => {
    const { result, rerender } = renderHook(() => useLoadEvaluatorForm());

    const handleChange1 = result.current.handleChange;
    const resetForm1 = result.current.resetForm;
    const handleSave1 = result.current.handleSave;

    rerender();

    const handleChange2 = result.current.handleChange;
    const resetForm2 = result.current.resetForm;
    const handleSave2 = result.current.handleSave;

    // Callbacks should be stable across re-renders
    expect(handleChange1).toBe(handleChange2);
    expect(resetForm1).toBe(resetForm2);
    expect(handleSave1).toBe(handleSave2);
  });

  it("should parse numeric values correctly", () => {
    const { result } = renderHook(() => useLoadEvaluatorForm());

    act(() => {
      result.current.handleChange("offeredPrice", "1500.50");
      result.current.handleChange("loadedMiles", "420");
      result.current.handleChange("deadheadMiles", "50");
      result.current.handleChange("weightLbs", "2500");
    });

    // Verify the form stores string values
    expect(result.current.form.offeredPrice).toBe("1500.50");
    expect(result.current.form.loadedMiles).toBe("420");
    expect(result.current.form.deadheadMiles).toBe("50");
    expect(result.current.form.weightLbs).toBe("2500");
  });
});
