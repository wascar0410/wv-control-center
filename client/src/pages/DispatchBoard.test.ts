import { describe, it, expect } from "vitest";

/**
 * DispatchBoard Filter Logic Tests
 * Verify that margin filters don't exclude fallback loads
 */

describe("DispatchBoard Filter Logic", () => {
  // Mock filter logic from DispatchBoard.tsx
  const createFilterLogic = (filters: any, adviceMap: any, aiFilter: any) => {
    return (loads: any[]) => {
      return loads.filter((load: any) => {
        const snapshot = load.financialSnapshot || {
          margin: 0,
          profit: 0,
          ratePerMile: 0,
          status: "loss",
          routeStatus: "missing_coords" as const,
          distanceSource: "fallback_120" as const,
          distanceConfidence: "low" as const,
          isDecisionBlocked: true,
          profitIsReliable: false,
        };

        const matchesStatus =
          filters.status.length === 0 || filters.status.includes(String(load.status || ""));

        const matchesSearch =
          !filters.search ||
          String(load.id || "").toLowerCase().includes(filters.search.toLowerCase()) ||
          String(load.clientName || "").toLowerCase().includes(filters.search.toLowerCase());

        const margin = Number(snapshot.margin || 0);
        // 🚨 CRITICAL: Don't exclude fallback loads by margin filter
        const isUsingFallback = snapshot.distanceSource === "fallback_120";
        const matchesMargin =
          isUsingFallback || (margin >= filters.marginRange[0] && margin <= filters.marginRange[1]);

        // Apply AI recommendation filter
        if (aiFilter !== "all") {
          const advice = adviceMap.get(load.id);
          if (!advice || advice.recommendation !== aiFilter) {
            return false;
          }
        }

        return matchesStatus && matchesSearch && matchesMargin;
      });
    };
  };

  it("should include fallback loads even if margin is outside filter range", () => {
    const filters = {
      status: ["available"],
      marginRange: [8, 15],
      search: "",
    };
    const adviceMap = new Map();
    const aiFilter = "all";

    const filterFn = createFilterLogic(filters, adviceMap, aiFilter);

    const loads = [
      {
        id: 510001,
        status: "available",
        clientName: "Client A",
        financialSnapshot: {
          margin: 89.92,
          profit: 100,
          ratePerMile: 2.5,
          status: "healthy",
          routeStatus: "missing_coords",
          distanceSource: "fallback_120",
          distanceConfidence: "low",
          isDecisionBlocked: true,
          profitIsReliable: false,
        },
      },
    ];

    const filtered = filterFn(loads);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(510001);
  });

  it("should exclude real-coordinate loads outside margin range", () => {
    const filters = {
      status: ["available"],
      marginRange: [8, 15],
      search: "",
    };
    const adviceMap = new Map();
    const aiFilter = "all";

    const filterFn = createFilterLogic(filters, adviceMap, aiFilter);

    const loads = [
      {
        id: 100001,
        status: "available",
        clientName: "Client B",
        financialSnapshot: {
          margin: 89.92,
          profit: 100,
          ratePerMile: 2.5,
          status: "healthy",
          routeStatus: "valid_coords",
          distanceSource: "calculated",
          distanceConfidence: "high",
          isDecisionBlocked: false,
          profitIsReliable: true,
        },
      },
    ];

    const filtered = filterFn(loads);
    expect(filtered.length).toBe(0);
  });

  it("should include real-coordinate loads within margin range", () => {
    const filters = {
      status: ["available"],
      marginRange: [80, 100],
      search: "",
    };
    const adviceMap = new Map();
    const aiFilter = "all";

    const filterFn = createFilterLogic(filters, adviceMap, aiFilter);

    const loads = [
      {
        id: 100001,
        status: "available",
        clientName: "Client B",
        financialSnapshot: {
          margin: 89.92,
          profit: 100,
          ratePerMile: 2.5,
          status: "healthy",
          routeStatus: "valid_coords",
          distanceSource: "calculated",
          distanceConfidence: "high",
          isDecisionBlocked: false,
          profitIsReliable: true,
        },
      },
    ];

    const filtered = filterFn(loads);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(100001);
  });

  it("should handle default margin range [0, 100] correctly", () => {
    const filters = {
      status: ["available"],
      marginRange: [0, 100],
      search: "",
    };
    const adviceMap = new Map();
    const aiFilter = "all";

    const filterFn = createFilterLogic(filters, adviceMap, aiFilter);

    const loads = [
      {
        id: 100001,
        status: "available",
        clientName: "Client A",
        financialSnapshot: {
          margin: 89.92,
          profit: 100,
          ratePerMile: 2.5,
          status: "healthy",
          routeStatus: "valid_coords",
          distanceSource: "calculated",
          distanceConfidence: "high",
          isDecisionBlocked: false,
          profitIsReliable: true,
        },
      },
      {
        id: 100002,
        status: "available",
        clientName: "Client B",
        financialSnapshot: {
          margin: 5.5,
          profit: 50,
          ratePerMile: 1.2,
          status: "loss",
          routeStatus: "valid_coords",
          distanceSource: "calculated",
          distanceConfidence: "high",
          isDecisionBlocked: false,
          profitIsReliable: true,
        },
      },
    ];

    const filtered = filterFn(loads);
    expect(filtered.length).toBe(2);
  });

  it("should not exclude loads when margin is undefined", () => {
    const filters = {
      status: ["available"],
      marginRange: [8, 15],
      search: "",
    };
    const adviceMap = new Map();
    const aiFilter = "all";

    const filterFn = createFilterLogic(filters, adviceMap, aiFilter);

    const loads = [
      {
        id: 100001,
        status: "available",
        clientName: "Client A",
        financialSnapshot: {
          margin: undefined,
          profit: 0,
          ratePerMile: 0,
          status: "loss",
          routeStatus: "missing_coords",
          distanceSource: "fallback_120",
          distanceConfidence: "low",
          isDecisionBlocked: true,
          profitIsReliable: false,
        },
      },
    ];

    const filtered = filterFn(loads);
    expect(filtered.length).toBe(1);
  });

  it("should apply status filter correctly", () => {
    const filters = {
      status: ["available"],
      marginRange: [0, 100],
      search: "",
    };
    const adviceMap = new Map();
    const aiFilter = "all";

    const filterFn = createFilterLogic(filters, adviceMap, aiFilter);

    const loads = [
      {
        id: 100001,
        status: "available",
        clientName: "Client A",
        financialSnapshot: {
          margin: 50,
          profit: 100,
          ratePerMile: 2.5,
          status: "healthy",
          routeStatus: "valid_coords",
          distanceSource: "calculated",
          distanceConfidence: "high",
          isDecisionBlocked: false,
          profitIsReliable: true,
        },
      },
      {
        id: 100002,
        status: "assigned",
        clientName: "Client B",
        financialSnapshot: {
          margin: 50,
          profit: 100,
          ratePerMile: 2.5,
          status: "healthy",
          routeStatus: "valid_coords",
          distanceSource: "calculated",
          distanceConfidence: "high",
          isDecisionBlocked: false,
          profitIsReliable: true,
        },
      },
    ];

    const filtered = filterFn(loads);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(100001);
  });
});
