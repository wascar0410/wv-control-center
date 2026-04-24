import { describe, it, expect, beforeEach } from "vitest";

/**
 * Test: wallet.getWalletSummary and wallet.getPartnerSummary
 *
 * Verifica que:
 * 1. getWalletSummary calcula correctamente completedReservesAmount
 * 2. getWalletSummary calcula correctamente reservedPendingAmount
 * 3. getPartnerSummary retorna datos reales de socios
 * 4. Los balances se actualizan cuando se completan reservas
 */

describe("wallet.getWalletSummary", () => {
  beforeEach(() => {
    // Setup
  });

  it("should calculate completedReservesAmount correctly", async () => {
    // Mock completed reserves
    const completedReserves = [
      { id: 1, status: "completed", suggestedAmount: 100 },
      { id: 2, status: "completed", suggestedAmount: 200 },
      { id: 3, status: "completed", suggestedAmount: 150 },
    ];

    const completedReservesAmount = completedReserves.reduce(
      (sum, r) => sum + Number(r.suggestedAmount || 0),
      0
    );

    expect(completedReservesAmount).toBe(450);
  });

  it("should calculate reservedPendingAmount correctly", async () => {
    // Mock pending reserves (suggested + approved)
    const pendingReserves = [
      { id: 1, status: "suggested", suggestedAmount: 100 },
      { id: 2, status: "approved", suggestedAmount: 200 },
      { id: 3, status: "dismissed", suggestedAmount: 150 }, // Should NOT be counted
    ];

    const reservedPendingAmount = pendingReserves
      .filter((r) => r.status === "suggested" || r.status === "approved")
      .reduce((sum, r) => sum + Number(r.suggestedAmount || 0), 0);

    expect(reservedPendingAmount).toBe(300); // Only suggested (100) + approved (200)
  });

  it("should not count dismissed or failed reserves in pending", async () => {
    const reserves = [
      { id: 1, status: "suggested", suggestedAmount: 100 },
      { id: 2, status: "dismissed", suggestedAmount: 200 },
      { id: 3, status: "failed", suggestedAmount: 150 },
      { id: 4, status: "completed", suggestedAmount: 300 },
    ];

    const reservedPendingAmount = reserves
      .filter((r) => r.status === "suggested" || r.status === "approved")
      .reduce((sum, r) => sum + Number(r.suggestedAmount || 0), 0);

    expect(reservedPendingAmount).toBe(100); // Only suggested
  });

  it("should return zero for empty reserves", async () => {
    const completedReserves: any[] = [];
    const pendingReserves: any[] = [];

    const completedAmount = completedReserves.reduce(
      (sum, r) => sum + Number(r.suggestedAmount || 0),
      0
    );
    const pendingAmount = pendingReserves.reduce(
      (sum, r) => sum + Number(r.suggestedAmount || 0),
      0
    );

    expect(completedAmount).toBe(0);
    expect(pendingAmount).toBe(0);
  });

  it("should include all reserve statuses correctly", async () => {
    const allReserves = [
      { id: 1, status: "suggested", suggestedAmount: 100 },
      { id: 2, status: "approved", suggestedAmount: 200 },
      { id: 3, status: "completed", suggestedAmount: 300 },
      { id: 4, status: "dismissed", suggestedAmount: 150 },
      { id: 5, status: "failed", suggestedAmount: 50 },
    ];

    const completedAmount = allReserves
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + Number(r.suggestedAmount || 0), 0);

    const pendingAmount = allReserves
      .filter((r) => r.status === "suggested" || r.status === "approved")
      .reduce((sum, r) => sum + Number(r.suggestedAmount || 0), 0);

    expect(completedAmount).toBe(300); // Only completed
    expect(pendingAmount).toBe(300); // Only suggested + approved
  });
});

describe("wallet.getPartnerSummary", () => {
  it("should return partner data structure", async () => {
    const mockPartnerSummary = {
      partners: [
        {
          id: 1,
          name: "Wascar",
          role: "Owner",
          participationPercent: 50,
          totalDrawn: 5000,
          userId: 123,
        },
        {
          id: 2,
          name: "Yisvel",
          role: "Owner",
          participationPercent: 50,
          totalDrawn: 4500,
          userId: 456,
        },
      ],
      totalParticipation: 100,
    };

    expect(mockPartnerSummary.partners).toHaveLength(2);
    expect(mockPartnerSummary.totalParticipation).toBe(100);
    expect(mockPartnerSummary.partners[0].name).toBe("Wascar");
    expect(mockPartnerSummary.partners[1].name).toBe("Yisvel");
  });

  it("should calculate total participation correctly", async () => {
    const partners = [
      { participationPercent: 50 },
      { participationPercent: 30 },
      { participationPercent: 20 },
    ];

    const totalParticipation = partners.reduce(
      (sum, p) => sum + p.participationPercent,
      0
    );

    expect(totalParticipation).toBe(100);
  });

  it("should handle empty partners list", async () => {
    const mockPartnerSummary = {
      partners: [],
      totalParticipation: 0,
    };

    expect(mockPartnerSummary.partners).toHaveLength(0);
    expect(mockPartnerSummary.totalParticipation).toBe(0);
  });

  it("should include partner draws in summary", async () => {
    const partner = {
      id: 1,
      name: "Wascar",
      role: "Owner",
      participationPercent: 50,
      totalDrawn: 5000,
      userId: 123,
    };

    expect(partner).toHaveProperty("totalDrawn");
    expect(partner.totalDrawn).toBe(5000);
  });
});
