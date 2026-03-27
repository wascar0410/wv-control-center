import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import {
  createDriverPayment,
  getDriverPaymentById,
  getDriverPayments,
  getDriverPaymentStats,
  updateDriverPayment,
  getLoadById,
  getLoadQuotationById,
} from "../db";

export const paymentRouter = router({
  /**
   * Calculate and create payment when load is marked as delivered
   * Called automatically when driver marks load as delivered
   */
  processDeliveryPayment: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
        quotationId: z.number().optional(),
        actualDistance: z.number().optional(), // Actual distance traveled (for recalculation)
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Get load details
      const load = await getLoadById(input.loadId);
      if (!load) throw new TRPCError({ code: "NOT_FOUND", message: "Load not found" });

      // Verify driver is assigned to this load
      if (load.assignedDriverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not assigned to this load" });
      }

      // Get quotation if provided
      let quotation = null;
      if (input.quotationId) {
        quotation = await getLoadQuotationById(input.quotationId);
      }

      // Calculate payment amount
      let paymentAmount = parseFloat(String(load.price)) || 0;

      // If actual distance provided, recalculate based on actual distance
      if (input.actualDistance && quotation) {
        const quotedDistance = parseFloat(String(quotation.totalMiles)) || 0;
        const ratePerMile = parseFloat(String(quotation.ratePerMile)) || 0;
        const ratePerPound = parseFloat(String(quotation.ratePerPound)) || 0;
        const weight = parseFloat(String(quotation.weight)) || 0;

        // Recalculate: (actual distance * rate/mile) + (weight * rate/pound) + fuel surcharge
        const fuelSurcharge = parseFloat(String(quotation.fuelSurcharge)) || 0;
        paymentAmount = input.actualDistance * ratePerMile + weight * ratePerPound + fuelSurcharge;
      }

      // Create payment record
      const paymentId = await createDriverPayment({
        driverId: ctx.user.id,
        loadId: input.loadId,
        quotationId: input.quotationId,
        amount: paymentAmount.toString() as any,
        status: "pending",
        paymentMethod: "bank_transfer", // Default method
        notes: input.notes || `Payment for load #${input.loadId}`,
      });

      return {
        paymentId,
        amount: paymentAmount,
        status: "pending",
        message: "Payment created successfully. Awaiting processing.",
      };
    }),

  /**
   * Get driver's payment history
   */
  getMyPayments: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const payments = await getDriverPayments(ctx.user.id, {
        status: input.status,
      });

      return payments.slice(input.offset, input.offset + input.limit).map((p) => ({
        id: p.id,
        loadId: p.loadId,
        amount: typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount)),
        status: p.status,
        paymentMethod: p.paymentMethod,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
      }));
    }),

  /**
   * Get driver's payment statistics
   */
  getMyPaymentStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const stats = await getDriverPaymentStats(ctx.user.id);
    return {
      totalEarned: typeof stats.totalEarned === 'number' ? stats.totalEarned : parseFloat(String(stats.totalEarned)),
      totalPending: typeof stats.totalPending === 'number' ? stats.totalPending : parseFloat(String(stats.totalPending)),
      totalCompleted: typeof stats.totalCompleted === 'number' ? stats.totalCompleted : parseFloat(String(stats.totalCompleted)),
      averagePayment: typeof stats.averagePayment === 'number' ? stats.averagePayment : parseFloat(String(stats.averagePayment)),
    };
  }),

  /**
   * Admin: Get payment details
   */
  getPayment: protectedProcedure
    .input(z.object({ paymentId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const payment = await getDriverPaymentById(input.paymentId);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });

      return {
        id: payment.id,
        driverId: payment.driverId,
        loadId: payment.loadId,
        amount: typeof payment.amount === 'number' ? payment.amount : parseFloat(String(payment.amount)),
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        stripePaymentId: payment.stripePaymentId,
        processedAt: payment.processedAt,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt,
      };
    }),

  /**
   * Admin: Update payment status (mark as completed, failed, etc.)
   */
  updatePaymentStatus: protectedProcedure
    .input(
      z.object({
        paymentId: z.number(),
        status: z.enum(["pending", "processing", "completed", "failed", "refunded"]),
        stripePaymentId: z.string().optional(),
        failureReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const payment = await getDriverPaymentById(input.paymentId);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: any = {
        status: input.status,
      };

      if (input.status === "completed") {
        updateData.processedAt = new Date();
      }

      if (input.stripePaymentId) {
        updateData.stripePaymentId = input.stripePaymentId;
      }

      if (input.failureReason) {
        updateData.failureReason = input.failureReason;
      }

      await updateDriverPayment(input.paymentId, updateData);

      return {
        success: true,
        message: `Payment status updated to ${input.status}`,
      };
    }),
});
