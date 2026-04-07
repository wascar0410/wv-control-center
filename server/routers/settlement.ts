import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createSettlement,
  getSettlementWithLoads,
  addLoadToSettlement,
  calculateSettlement,
  approveSettlement,
  processSettlement,
  completeSettlement,
  getAllSettlements,
} from "../db";

export const settlementRouter = router({
  /**
   * Create new settlement (admin only)
   */
  create: protectedProcedure
    .input(
      z.object({
        settlementPeriod: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"),
        startDate: z.date(),
        endDate: z.date(),
        partner1Id: z.number(),
        partner2Id: z.number(),
        partner1Share: z.number().default(50),
        partner2Share: z.number().default(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return await createSettlement({
          settlementPeriod: input.settlementPeriod,
          startDate: input.startDate,
          endDate: input.endDate,
          partner1Id: input.partner1Id,
          partner2Id: input.partner2Id,
          partner1Share: input.partner1Share,
          partner2Share: input.partner2Share,
        });
      } catch (err) {
        console.error("[settlement.create] Error:", err);
        throw err;
      }
    }),

  /**
   * Get settlement with loads
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getSettlementWithLoads(input.id);
      } catch (err) {
        console.error("[settlement.getById] Error:", err);
        return null;
      }
    }),

  /**
   * Add load to settlement
   */
  addLoad: protectedProcedure
    .input(
      z.object({
        settlementId: z.number(),
        loadId: z.number(),
        loadIncome: z.number(),
        loadExpenses: z.number(),
        partner1Share: z.number().default(50),
        partner2Share: z.number().default(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return await addLoadToSettlement(
          input.settlementId,
          input.loadId,
          input.loadIncome,
          input.loadExpenses,
          input.partner1Share,
          input.partner2Share
        );
      } catch (err) {
        console.error("[settlement.addLoad] Error:", err);
        throw err;
      }
    }),

  /**
   * Calculate settlement totals
   */
  calculate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return await calculateSettlement(input.id);
      } catch (err) {
        console.error("[settlement.calculate] Error:", err);
        throw err;
      }
    }),

  /**
   * Approve settlement
   */
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return await approveSettlement(input.id, ctx.user.id);
      } catch (err) {
        console.error("[settlement.approve] Error:", err);
        throw err;
      }
    }),

  /**
   * Process settlement (distribute funds)
   */
  process: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return await processSettlement(input.id);
      } catch (err) {
        console.error("[settlement.process] Error:", err);
        throw err;
      }
    }),

  /**
   * Complete settlement
   */
  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return await completeSettlement(input.id);
      } catch (err) {
        console.error("[settlement.complete] Error:", err);
        throw err;
      }
    }),

  /**
   * Get all settlements
   */
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        const result = await getAllSettlements(input.limit, input.offset);
        return result || [];
      } catch (err) {
        console.error("[settlement.getAll] Error:", err);
        return [];
      }
    }),
});
