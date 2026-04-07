import { z } from "zod";
import { TRPCError } from "@trpc/server";
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

const settlementPeriodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM");

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

const settlementShareSchema = z.number().min(0).max(100);

function canManageSettlements(role?: string) {
  return role === "admin" || role === "owner";
}

function assertSettlementAccess(role?: string) {
  if (!canManageSettlements(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Unauthorized",
    });
  }
}

function validateShares(partner1Share: number, partner2Share: number) {
  const total = partner1Share + partner2Share;
  if (Math.abs(total - 100) > 0.0001) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Partner shares must total 100",
    });
  }
}

export const settlementRouter = router({
  /**
   * Create new settlement
   */
  create: protectedProcedure
    .input(
      z
        .object({
          settlementPeriod: settlementPeriodSchema,
          startDate: z.date(),
          endDate: z.date(),
          partner1Id: z.number().int().positive(),
          partner2Id: z.number().int().positive(),
          partner1Share: settlementShareSchema.default(50),
          partner2Share: settlementShareSchema.default(50),
        })
        .superRefine((data, ctx) => {
          if (data.endDate < data.startDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "endDate must be after startDate",
              path: ["endDate"],
            });
          }

          if (data.partner1Id === data.partner2Id) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Partners must be different users",
              path: ["partner2Id"],
            });
          }

          if (Math.abs(data.partner1Share + data.partner2Share - 100) > 0.0001) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Partner shares must total 100",
              path: ["partner2Share"],
            });
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);

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
        console.error("[settlement.create]", err);

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create settlement",
        });
      }
    }),

  /**
   * Get settlement with loads
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);

        const result = await getSettlementWithLoads(input.id);
        return result ?? null;
      } catch (err) {
        console.error("[settlement.getById]", err);
        return null;
      }
    }),

  /**
   * Add load to settlement
   */
  addLoad: protectedProcedure
    .input(
      z
        .object({
          settlementId: z.number().int().positive(),
          loadId: z.number().int().positive(),
          loadIncome: z.number().min(0),
          loadExpenses: z.number().min(0),
          partner1Share: settlementShareSchema.default(50),
          partner2Share: settlementShareSchema.default(50),
        })
        .superRefine((data, ctx) => {
          if (Math.abs(data.partner1Share + data.partner2Share - 100) > 0.0001) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Partner shares must total 100",
              path: ["partner2Share"],
            });
          }
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);
        validateShares(input.partner1Share, input.partner2Share);

        return await addLoadToSettlement(
          input.settlementId,
          input.loadId,
          input.loadIncome,
          input.loadExpenses,
          input.partner1Share,
          input.partner2Share
        );
      } catch (err) {
        console.error("[settlement.addLoad]", err);

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add load to settlement",
        });
      }
    }),

  /**
   * Calculate settlement totals
   */
  calculate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);
        return await calculateSettlement(input.id);
      } catch (err) {
        console.error("[settlement.calculate]", err);

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate settlement",
        });
      }
    }),

  /**
   * Approve settlement
   */
  approve: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);
        return await approveSettlement(input.id, ctx.user.id);
      } catch (err) {
        console.error("[settlement.approve]", err);

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve settlement",
        });
      }
    }),

  /**
   * Process settlement (distribute funds)
   */
  process: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);
        return await processSettlement(input.id);
      } catch (err) {
        console.error("[settlement.process]", err);

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process settlement",
        });
      }
    }),

  /**
   * Complete settlement
   */
  complete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);
        return await completeSettlement(input.id);
      } catch (err) {
        console.error("[settlement.complete]", err);

        if (err instanceof TRPCError) {
          throw err;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete settlement",
        });
      }
    }),

  /**
   * Get all settlements
   */
  getAll: protectedProcedure
    .input(paginationSchema)
    .query(async ({ ctx, input }) => {
      try {
        assertSettlementAccess(ctx.user.role);

        const result = await getAllSettlements(input.limit, input.offset);
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error("[settlement.getAll]", err);
        return [];
      }
    }),
});
