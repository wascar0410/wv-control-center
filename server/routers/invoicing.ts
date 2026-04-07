import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createInvoice,
  getInvoiceById,
  getAllInvoices,
  recordInvoicePayment,
  getReceivablesAgingReport,
  getReceivablesByBroker,
  updateReceivableAging,
  issueInvoice,
  cancelInvoice,
  getInvoiceWithPayments,
} from "../db";
import { TRPCError } from "@trpc/server";

export const invoicingRouter = router({
  /**
   * Create invoice
   */
  create: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
        brokerName: z.string(),
        brokerId: z.number().optional(),
        subtotal: z.number(),
        taxRate: z.number().default(0),
        taxAmount: z.number().default(0),
        total: z.number(),
        dueDate: z.date(),
        terms: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await createInvoice({
          ...input,
          createdBy: ctx.user.id,
        });
      } catch (err) {
        console.error("[invoicing.create] Error:", err);
        throw err;
      }
    }),

  /**
   * Get invoice by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getInvoiceById(input.id);
      } catch (err) {
        console.error("[invoicing.getById] Error:", err);
        return null;
      }
    }),

  /**
   * Get all invoices
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        brokerName: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await getAllInvoices(input);
        return result || [];
      } catch (err) {
        console.error("[invoicing.getAll] Error:", err);
        return [];
      }
    }),

  /**
   * Record payment
   */
  recordPayment: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        amount: z.number(),
        paymentDate: z.date(),
        paymentMethod: z.string(),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await recordInvoicePayment({
          ...input,
          recordedBy: ctx.user.id,
        });
      } catch (err) {
        console.error("[invoicing.recordPayment] Error:", err);
        throw err;
      }
    }),

  /**
   * Get aging report
   */
  getAgingReport: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await getReceivablesAgingReport();
      return result || {
        totalOverdue: 0,
        total30Days: 0,
        total60Days: 0,
        total90Days: 0,
        totalOutstanding: 0,
        invoices: [],
      };
    } catch (err) {
      console.error("[invoicing.getAgingReport] Error:", err);
      return {
        totalOverdue: 0,
        total30Days: 0,
        total60Days: 0,
        total90Days: 0,
        totalOutstanding: 0,
        invoices: [],
      };
    }
  }),

  /**
   * Get receivables by broker
   */
  getReceivablesByBroker: protectedProcedure
    .input(z.object({ brokerName: z.string() }))
    .query(async ({ input }) => {
      try {
        const result = await getReceivablesByBroker(input.brokerName);
        return result || [];
      } catch (err) {
        console.error("[invoicing.getReceivablesByBroker] Error:", err);
        return [];
      }
    }),

  /**
   * Issue invoice
   */
  issue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await issueInvoice(input.id);
      } catch (err) {
        console.error("[invoicing.issue] Error:", err);
        throw err;
      }
    }),

  /**
   * Cancel invoice
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await cancelInvoice(input.id);
      } catch (err) {
        console.error("[invoicing.cancel] Error:", err);
        throw err;
      }
    }),

  /**
   * Get invoice with payments
   */
  getWithPayments: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getInvoiceWithPayments(input.id);
      } catch (err) {
        console.error("[invoicing.getWithPayments] Error:", err);
        return null;
      }
    }),
});
