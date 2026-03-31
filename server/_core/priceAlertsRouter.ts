import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import {
  getPriceAlertsByUserId,
  getUnreadPriceAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  getAlertStats,
} from "../db-price-alerts";

export const priceAlertsRouter = router({
  // Get all alerts for user
  getAlerts: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      try {
        return await getPriceAlertsByUserId(ctx.user.id, input.limit);
      } catch (error) {
        console.error("[priceAlerts.getAlerts] error:", error);
        return [];
      }
    }),

  // Get unread alerts only
  getUnreadAlerts: publicProcedure.query(async () => {
    try {
      return [];
    } catch (error) {
      console.error("[priceAlerts.getUnreadAlerts] error:", error);
      return [];
    }
  }),

  // Get alert statistics
  getAlertStats: publicProcedure.query(async () => {
    try {
      return {
        total: 0,
        unread: 0,
        critical: 0,
      };
    } catch (error) {
      console.error("[priceAlerts.getAlertStats] error:", error);
      return {
        total: 0,
        unread: 0,
        critical: 0,
      };
    }
  }),

  // Mark single alert as read
  markAsRead: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      await markAlertAsRead(input.alertId);
      return { success: true };
    }),

  // Mark all alerts as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllAlertsAsRead(ctx.user.id);
    return { success: true };
  }),

  // Delete alert
  deleteAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAlert(input.alertId);
      return { success: true };
    }),
});
