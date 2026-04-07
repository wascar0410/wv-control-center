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
        return await getQuoteAnalysisById(input.id);
      } catch (error) {
        console.error("[quoteAnalysis.getById] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo obtener el análisis",
        });
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
        return await getQuoteAnalysisByLoadId(input.loadId);
      } catch (error) {
        console.error("[quoteAnalysis.getByLoadId] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo obtener el análisis por carga",
        });
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
        return await getAllQuoteAnalyses({
          verdict: input.verdict,
          brokerName: input.brokerName,
          limit: input.limit,
          offset: input.offset,
        });
      } catch (error) {
        console.error("[quoteAnalysis.getAll] error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo obtener la lista de análisis",
        });
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
      return await getQuoteAnalysisSummary();
    } catch (error) {
      console.error("[quoteAnalysis.getSummary] error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No se pudo obtener el resumen de análisis",
      });
    }
  }),

  /**
   * Import from quotation
   */
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
