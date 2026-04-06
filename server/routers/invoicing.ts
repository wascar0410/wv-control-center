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
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createInvoice({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * Get invoice by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getInvoiceById(input.id);
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
      return getAllInvoices(input);
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
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return recordInvoicePayment({
        ...input,
        recordedBy: ctx.user.id,
      });
    }),

  /**
   * Get aging report
   */
  getAgingReport: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getReceivablesAgingReport();
  }),

  /**
   * Get receivables by broker
   */
  getReceivablesByBroker: protectedProcedure
    .input(z.object({ brokerName: z.string() }))
    .query(async ({ input }) => {
      return getReceivablesByBroker(input.brokerName);
    }),

  /**
   * Issue invoice
   */
  issue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return issueInvoice(input.id);
    }),

  /**
   * Cancel invoice
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return cancelInvoice(input.id);
    }),

  /**
   * Get invoice with payments
   */
  getWithPayments: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getInvoiceWithPayments(input.id);
    }),
});
