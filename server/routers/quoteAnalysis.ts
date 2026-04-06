import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
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

export const quoteAnalysisRouter = router({
  /**
   * Create new quote analysis
   */
  create: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
        brokerId: z.number().optional(),
        brokerName: z.string().optional(),
        routeName: z.string().optional(),
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
        verdict: z.enum(["accept", "negotiate", "reject"]),
        decisionReason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createQuoteAnalysis({
        ...input,
        analyzedBy: ctx.user.id,
      });
    }),

  /**
   * Get quote analysis by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getQuoteAnalysisById(input.id);
    }),

  /**
   * Get quote analysis by load ID
   */
  getByLoadId: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ input }) => {
      return getQuoteAnalysisByLoadId(input.loadId);
    }),

  /**
   * Update with actual costs
   */
  updateWithActuals: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        actualFuel: z.number().optional(),
        actualTolls: z.number().optional(),
        actualMaintenance: z.number().optional(),
        actualInsurance: z.number().optional(),
        actualOther: z.number().optional(),
        totalActualCost: z.number().optional(),
        actualProfit: z.number().optional(),
        actualMargin: z.number().optional(),
        costVariance: z.number().optional(),
        profitVariance: z.number().optional(),
        marginVariance: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      return updateQuoteAnalysisWithActuals(id, {
        ...data,
        completedAt: new Date(),
      });
    }),

  /**
   * Get all quote analyses
   */
  getAll: protectedProcedure
    .input(
      z.object({
        verdict: z.enum(["accept", "negotiate", "reject"]).optional(),
        brokerName: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return getAllQuoteAnalyses(input);
    }),

  /**
   * Get quote analysis summary (profitability by broker/route)
   */
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getQuoteAnalysisSummary();
  }),

  /**
   * Import from quotation
   */
  importFromQuotation: protectedProcedure
    .input(z.object({ quotationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return importQuoteAnalysisFromQuotation(input.quotationId, ctx.user.id);
    }),
});
