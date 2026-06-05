import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createQuoteAnalysis,
  getQuoteAnalysisById,
  getQuoteAnalysisByLoadId,
  updateQuoteAnalysisWithActuals,
  getAllQuoteAnalyses,
  getQuoteAnalysisSummary,
  importQuoteAnalysisFromQuotation,
} from "../db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const quoteVerdictSchema = z.enum(["accept", "negotiate", "reject"]);

const nullableOptionalString = z.preprocess(
  (val) => (val === null || val === "" ? undefined : val),
  z.string().optional()
);

const nullableOptionalNumber = z.preprocess(
  (val) => (val === null || val === "" ? undefined : val),
  z.number().optional()
);

const nullableOptionalVerdict = z.preprocess(
  (val) => (val === null || val === "" ? undefined : val),
  quoteVerdictSchema.optional()
);

function canManageQuoteAnalysis(role?: string) {
  return role === "admin" || role === "owner";
}

function canViewQuoteAnalysis(role?: string) {
  return role === "admin" || role === "owner" || role === "dispatcher";
}

// Scoring function for driver recommendations
function calculateDriverScore(driver: any, loadPrice: number): { score: number; breakdown: { availability: number; gps: number; distance: number; profitability: number }; recommendation: string } {
  let availabilityScore = 0;
  let gpsScore = 0;
  let distanceScore = 0;
  let profitabilityScore = 0;

  // Availability Score (0-30)
  availabilityScore = driver.availableForLoads ? 30 : 0;

  // GPS Score (0-20)
  if (!driver.gpsInactive && driver.lastLocationUpdate) {
    const lastUpdateTime = new Date(driver.lastLocationUpdate).getTime();
    const now = Date.now();
    const hoursDiff = (now - lastUpdateTime) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) gpsScore = 20;
    else if (hoursDiff < 24) gpsScore = 15;
    else if (hoursDiff < 24 * 7) gpsScore = 10;
    else gpsScore = 0;
  } else {
    gpsScore = 0;
  }

  // Distance Score (0-20)
  if (driver.distanceToPickupMiles !== null) {
    const dist = driver.distanceToPickupMiles;
    if (dist < 5) distanceScore = 20;
    else if (dist < 10) distanceScore = 18;
    else if (dist < 25) distanceScore = 15;
    else if (dist < 50) distanceScore = 10;
    else if (dist < 100) distanceScore = 5;
    else distanceScore = 0;
  } else {
    distanceScore = 0;
  }

  // Profitability Score (0-30)
  if (driver.adjustedEstimatedNet !== null && loadPrice > 0) {
    const profitPercent = (driver.adjustedEstimatedNet / loadPrice) * 100;
    if (profitPercent > 25) profitabilityScore = 30;
    else if (profitPercent > 15) profitabilityScore = 25;
    else if (profitPercent > 8) profitabilityScore = 20;
    else if (profitPercent > 0) profitabilityScore = 10;
    else profitabilityScore = 0;
  } else {
    profitabilityScore = 0;
  }

  const totalScore = availabilityScore + gpsScore + distanceScore + profitabilityScore;
  
  let recommendation = "not_recommended";
  if (totalScore >= 75) recommendation = "highly_recommended";
  else if (totalScore >= 60) recommendation = "recommended";
  else if (totalScore >= 45) recommendation = "consider";

  return {
    score: totalScore,
    breakdown: {
      availability: availabilityScore,
      gps: gpsScore,
      distance: distanceScore,
      profitability: profitabilityScore,
    },
    recommendation,
  };
}

export const quoteAnalysisRouter = router({
  /**
   * Create new quote analysis
   */
  create: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
        brokerId: nullableOptionalNumber,
        brokerName: nullableOptionalString,
        routeName: nullableOptionalString,
        totalMiles: z.number(),
        loadedMiles: z.number(),
        emptyMiles: z.number().default(0),
        baseRate: z.number(),
        distanceSurcharge: z.number().default(0),
        weightSurcharge: z.number().default(0),
        otherSurcharges: z.number().default(0),
        totalIncome: z.number(),
        estimatedFuel: z.number(),
        estimatedTolls: z.number().default(0),
        estimatedMaintenance: z.number().default(0),
        estimatedInsurance: z.number().default(0),
        estimatedOther: z.number().default(0),
        totalEstimatedCost: z.number(),
        estimatedProfit: z.number(),
        estimatedMargin: z.number(),
        ratePerLoadedMile: z.number(),
        recommendedMinimumRate: z.number(),
        rateVsMinimum: z.number(),
        verdict: quoteVerdictSchema,
        decisionReason: nullableOptionalString,
        notes: nullableOptionalString,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!canManageQuoteAnalysis(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await createQuoteAnalysis({
          ...input,
          analyzedBy: ctx.user.id,
        });
      } catch (error) {
        console.error("[quoteAnalysis.create] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo crear el análisis de cotización",
        });
      }
    }),

  /**
   * Get quote analysis by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!canViewQuoteAnalysis(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        const result = await getQuoteAnalysisById(input.id);
        return result || null;
      } catch (error) {
        console.error("[quoteAnalysis.getById] error:", error);
        return null;
      }
    }),

  /**
   * Get quote analysis by load ID
   */
  getByLoadId: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!canViewQuoteAnalysis(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        const result = await getQuoteAnalysisByLoadId(input.loadId);
        return result || null;
      } catch (error) {
        console.error("[quoteAnalysis.getByLoadId] error:", error);
        return null;
      }
    }),

  /**
   * Update with actual costs
   */
  updateWithActuals: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        actualFuel: nullableOptionalNumber,
        actualTolls: nullableOptionalNumber,
        actualMaintenance: nullableOptionalNumber,
        actualInsurance: nullableOptionalNumber,
        actualOther: nullableOptionalNumber,
        totalActualCost: nullableOptionalNumber,
        actualProfit: nullableOptionalNumber,
        actualMargin: nullableOptionalNumber,
        costVariance: nullableOptionalNumber,
        profitVariance: nullableOptionalNumber,
        marginVariance: nullableOptionalNumber,
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!canManageQuoteAnalysis(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        const { id, ...data } = input;
        return await updateQuoteAnalysisWithActuals(id, {
          ...data,
          completedAt: new Date(),
        });
      } catch (error) {
        console.error("[quoteAnalysis.updateWithActuals] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo actualizar el análisis con costos reales",
        });
      }
    }),

  /**
   * Get all quote analyses
   */
  getAll: protectedProcedure
    .input(
      z.object({
        verdict: nullableOptionalVerdict,
        brokerName: nullableOptionalString,
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!canViewQuoteAnalysis(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        const result = await getAllQuoteAnalyses({
          verdict: input.verdict,
          brokerName: input.brokerName,
          limit: input.limit,
          offset: input.offset,
        });
        return result || [];
      } catch (error) {
        console.error("[quoteAnalysis.getAll] error:", error);
        return [];
      }
    }),

  /**
   * Get quote analysis summary (profitability by broker/route)
   */
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    if (!canViewQuoteAnalysis(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
    }

    try {
      const result = await getQuoteAnalysisSummary();
      return result || {
        totalAnalyzed: 0,
        acceptedCount: 0,
        negotiateCount: 0,
        rejectedCount: 0,
        avgMargin: 0,
        brokerSummary: [],
      };
    } catch (error) {
      console.error("[quoteAnalysis.getSummary] error:", error);
      return {
        totalAnalyzed: 0,
        acceptedCount: 0,
        negotiateCount: 0,
        rejectedCount: 0,
        avgMargin: 0,
        brokerSummary: [],
      };
    }
  }),

  /**
   * Import from quotation
   */
  /**
   * Recommend drivers for a load based on scoring
   */
  recommendDrivers: protectedProcedure
    .input(
      z.object({
        loadId: z.number().optional(),
        pickupLat: z.number(),
        pickupLng: z.number(),
        deliveryLat: z.number().optional(),
        deliveryLng: z.number().optional(),
        loadPrice: z.number(),
        estimatedTolls: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!canViewQuoteAnalysis(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        // Call nearby.getDrivers to get drivers with deadhead economics
        // This is a bit of a hack - we'll need to call it via tRPC or duplicate the logic
        // For now, we'll return an empty array and let frontend call nearby.getDrivers
        // Then we'll calculate scoring on the frontend
        return {
          topRecommendations: [],
          alternativeDrivers: [],
          noDriversAvailable: true,
        };
      } catch (error) {
        console.error("[quoteAnalysis.recommendDrivers] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo obtener recomendaciones de drivers",
        });
      }
    }),

  importFromQuotation: protectedProcedure
    .input(z.object({ quotationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!canManageQuoteAnalysis(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await importQuoteAnalysisFromQuotation(input.quotationId, ctx.user.id);
      } catch (error) {
        console.error("[quoteAnalysis.importFromQuotation] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo importar el análisis desde quotation",
        });
      }
    }),
});
