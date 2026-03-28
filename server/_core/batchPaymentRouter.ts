import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import {
  createPaymentBatch,
  getPaymentBatchById,
  getPaymentBatches,
  updatePaymentBatch,
  getPendingPaymentsForBatch,
  getPaymentBatchStats,
  createPaymentAuditLog,
  getPaymentAuditByBatchId,
  updateDriverPayment,
  getDriverPaymentById,
} from "../db";

export const batchPaymentRouter = router({
  /**
   * Create a new payment batch
   * Manager can group pending payments for weekly/monthly processing
   */
  createBatch: protectedProcedure
    .input(
      z.object({
        period: z.string(),
        paymentMethod: z.enum(["bank_transfer", "stripe", "mixed"]).default("bank_transfer"),
        notes: z.string().optional(),
        paymentIds: z.number().array().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      let pendingPayments;
      if (input.paymentIds && input.paymentIds.length > 0) {
        pendingPayments = [];
        for (const paymentId of input.paymentIds) {
          const payment = await getDriverPaymentById(paymentId);
          if (payment && payment.status === "pending") {
            pendingPayments.push(payment);
          }
        }
      } else {
        pendingPayments = await getPendingPaymentsForBatch(1000);
      }

      if (pendingPayments.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending payments found for batch",
        });
      }

      const totalAmount = pendingPayments.reduce(
        (sum, p) => sum + (typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount))),
        0
      );

      const timestamp = Date.now();
      const batchNumber = `BATCH-${input.period}-${timestamp}`;

      const batchResult = await createPaymentBatch({
        batchNumber,
        createdBy: ctx.user.id,
        period: input.period,
        status: "draft",
        totalAmount: totalAmount.toString() as any,
        totalPayments: pendingPayments.length,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      });

      let batchId = 0;
      if (typeof batchResult === "object" && "insertId" in batchResult) {
        batchId = (batchResult as any).insertId;
      } else if (Array.isArray(batchResult) && batchResult.length > 0) {
        batchId = (batchResult[0] as any).id || 0;
      } else if (typeof batchResult === "object" && "id" in batchResult) {
        batchId = (batchResult as any).id;
      }
      
      if (batchId === 0) {
        throw new Error("Failed to create payment batch");
      }

      for (const payment of pendingPayments) {
        await createPaymentAuditLog({
          paymentId: payment.id,
          batchId,
          action: "created" as any,
          previousStatus: payment.status,
          newStatus: "pending",
          performedBy: ctx.user.id,
          reason: `Added to batch ${batchNumber}`,
          metadata: null,
        });
      }

      return {
        batchId,
        batchNumber,
        totalAmount,
        totalPayments: pendingPayments.length,
        status: "draft",
      };
    }),

  /**
   * Get batch details
   */
  getBatch: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const batch = await getPaymentBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

      const stats = await getPaymentBatchStats(input.batchId);

      return {
        ...batch,
        totalAmount: typeof batch.totalAmount === "number" 
          ? batch.totalAmount 
          : parseFloat(String(batch.totalAmount)),
        stats,
      };
    }),

  /**
   * List payment batches
   */
  listBatches: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "pending_review", "approved", "processing", "completed", "failed", "cancelled"]).optional(),
        period: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const batches = await getPaymentBatches({
        status: input.status,
        period: input.period,
      });

      return batches.slice(input.offset, input.offset + input.limit).map((b) => ({
        ...b,
        totalAmount: typeof b.totalAmount === "number" 
          ? b.totalAmount 
          : parseFloat(String(b.totalAmount)),
      }));
    }),

  /**
   * Submit batch for review
   */
  submitForReview: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const batch = await getPaymentBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

      if (batch.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft batches can be submitted for review",
        });
      }

      await updatePaymentBatch(input.batchId, {
        status: "pending_review",
      });

      return { success: true, status: "pending_review" };
    }),

  /**
   * Approve batch for processing
   */
  approveBatch: protectedProcedure
    .input(z.object({ batchId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const batch = await getPaymentBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

      if (batch.status !== "pending_review") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending_review batches can be approved",
        });
      }

      await updatePaymentBatch(input.batchId, {
        status: "approved",
        notes: input.notes || batch.notes,
      });

      return { success: true, status: "approved" };
    }),

  /**
   * Reject batch
   */
  rejectBatch: protectedProcedure
    .input(z.object({ batchId: z.number(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const batch = await getPaymentBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

      if (batch.status !== "pending_review") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending_review batches can be rejected",
        });
      }

      await updatePaymentBatch(input.batchId, {
        status: "cancelled",
        notes: `Rejected: ${input.reason}`,
      });

      return { success: true, status: "cancelled" };
    }),

  /**
   * Process batch (mark all payments as completed)
   */
  processBatch: protectedProcedure
    .input(z.object({ batchId: z.number(), scheduledDate: z.date().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const batch = await getPaymentBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

      if (batch.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only approved batches can be processed",
        });
      }

      const auditLogs = await getPaymentAuditByBatchId(input.batchId);
      const uniquePaymentIds = new Set(auditLogs.map((log) => log.paymentId));
      const paymentIds: number[] = [];
      uniquePaymentIds.forEach((id) => paymentIds.push(id));

      let successfulPayments = 0;
      let failedPayments = 0;

      for (let i = 0; i < paymentIds.length; i++) {
        const paymentId = paymentIds[i];
        try {
          const payment = await getDriverPaymentById(paymentId);
          if (!payment) continue;

          await updateDriverPayment(paymentId, {
            status: "completed",
            processedAt: new Date(),
          });

          await createPaymentAuditLog({
            paymentId,
            batchId: input.batchId,
            action: "processed" as any,
            previousStatus: "pending",
            newStatus: "completed",
            performedBy: ctx.user.id,
            reason: `Processed in batch ${batch.batchNumber}`,
            metadata: null,
          });

          successfulPayments++;
        } catch (error) {
          failedPayments++;
          console.error(`[Batch Payment] Failed to process payment ${paymentId}:`, error);
        }
      }

      await updatePaymentBatch(input.batchId, {
        status: "completed",
        processedDate: new Date(),
        successfulPayments,
        failedPayments,
      });

      return {
        success: true,
        batchId: input.batchId,
        successfulPayments,
        failedPayments,
        totalProcessed: successfulPayments + failedPayments,
      };
    }),

  /**
   * Get batch audit trail
   */
  getBatchAuditTrail: protectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const auditLogs = await getPaymentAuditByBatchId(input.batchId);
      return (auditLogs || []).map((log) => ({
        id: log.id,
        paymentId: log.paymentId,
        action: log.action,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        reason: log.reason,
        createdAt: log.createdAt,
      }));
    }),

  /**
   * Cancel batch
   */
  cancelBatch: protectedProcedure
    .input(z.object({ batchId: z.number(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const batch = await getPaymentBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND" });

      if (batch.status === "completed" || batch.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel ${batch.status} batch`,
        });
      }

      await updatePaymentBatch(input.batchId, {
        status: "cancelled",
        notes: `Cancelled: ${input.reason}`,
      });

      return { success: true, status: "cancelled" };
    }),
});
