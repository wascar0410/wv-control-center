import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getAbuseReport } from "../_core/requestLogger";
import { getSystemStatus } from "../_core/adaptiveRateLimiter";
import {
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  isIPWhitelisted,
} from "../_core/ipWhitelist";
import { z } from "zod";

/**
 * Admin procedure - only for admin users
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  /**
   * Get abuse report
   */
  getAbuseReport: adminProcedure.query(() => {
    return getAbuseReport();
  }),

  /**
   * Get system status
   */
  getSystemStatus: adminProcedure.query(() => {
    return getSystemStatus();
  }),

  /**
   * Get IP whitelist
   */
  getWhitelist: adminProcedure.query(() => {
    return getWhitelist();
  }),

  /**
   * Add IP to whitelist
   */
  addToWhitelist: adminProcedure
    .input(
      z.object({
        ip: z.string(),
        reason: z.string().min(1),
        host: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      addToWhitelist(input.ip, input.reason, input.host, ctx.user?.email || undefined);
      return { success: true, message: `IP ${input.ip} added to whitelist` };
    }),

  /**
   * Remove IP from whitelist
   */
  removeFromWhitelist: adminProcedure
    .input(z.object({ ip: z.string() }))
    .mutation(({ input }) => {
      const removed = removeFromWhitelist(input.ip);
      if (!removed) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `IP ${input.ip} not found in whitelist`,
        });
      }
      return { success: true, message: `IP ${input.ip} removed from whitelist` };
    }),

  /**
   * Check if IP is whitelisted
   */
  isIPWhitelisted: adminProcedure
    .input(z.object({ ip: z.string() }))
    .query(({ input }) => {
      return isIPWhitelisted(input.ip);
    }),
});
