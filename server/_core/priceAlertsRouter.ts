import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
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
      return getPriceAlertsByUserId(ctx.user.id, input.limit);
    }),

  // Get unread alerts only
  getUnreadAlerts: protectedProcedure.query(async ({ ctx }) => {
    return getUnreadPriceAlerts(ctx.user.id);
  }),

  // Get alert statistics
  getAlertStats: protectedProcedure.query(async ({ ctx }) => {
    return getAlertStats(ctx.user.id);
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
