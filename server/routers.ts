import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, inArray, and, desc, sql } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { plaidRouter } from "./_core/plaidRouter";
import { quotationRouter } from "./_core/quotationRouter";
import { geocodingRouter } from "./_core/geocodingRouter";
import { routesRouter } from "./_core/routesRouter";
import { multiStopRouter } from "./_core/multiStopRouter";
import { locationRouter } from "./_core/locationRouter";
import { paymentRouter } from "./_core/paymentRouter";
import { batchPaymentRouter } from "./_core/batchPaymentRouter";
import { exportRouter } from "./_core/exportRouter";
import { businessConfigRouter } from "./_core/businessConfigRouter";
import { priceAlertsRouter } from "./_core/priceAlertsRouter";
import { brokerLoadsRouter } from "./_core/brokerLoadsRouter";
import { loadEvaluatorRouter } from "./_core/loadEvaluatorRouter";
import { taxComplianceRouter } from "./_core/taxComplianceRouter";
import { ocrRouter } from "./_core/ocrRouter";
import { ocrStorageRouter } from "./_core/ocrStorageRouter";
import { irsComplianceRouter } from "./_core/irsComplianceRouter";
import { advancedSearchRouter } from "./_core/advancedSearchRouter";
import { chatRouter } from "./_core/chatRouter";
import { analyticsRouter } from "./_core/analyticsRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users as usersTable, loads as loadsTable } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { wsManager } from "./_core/websocket";
import { storagePut } from "./storage";
import { aiRouter } from "./_core/aiRouter";
import { attachFinancialSnapshots } from "./db-dispatch-helpers";
import { walletRouter } from "./routers/wallet";
import { settlementRouter } from "./routers/settlement";
import { quoteAnalysisRouter } from "./routers/quoteAnalysis";
import { invoicingRouter } from "./routers/invoicing";
import { alertsAndTasksRouter } from "./routers/alertsAndTasks";
import { companyRouter } from "./routers/company";
import { financialRouter } from "./routers/financial";
import { financialExtendedRouter } from "./routers/financialExtended";
import {
  getRateLimitStats,
  resetRateLimitForHost,
  unblockHost,
} from "./_core/rateLimiter";
import { sendEmail, getAdminEmail } from "./_core/emailService";
import {
  generateResetToken,
  sendPasswordResetEmail,
  getTokenExpirationTime,
  isTokenExpired,
} from "./_core/passwordReset";
import {
  driverLogin,
  logPasswordChange,
  logPasswordReset,
  getPasswordAuditHistory,
} from "./_core/driverAuth";
import {
  getHostRejectionStats,
  getAllRejectionStats,
  getRejectionHistory,
  clearHostStats,
  getTopRejectedHosts,
} from "./_core/hostMonitoring";
import { getMonthlyProjections } from "./db-projections";
import { getHistoricalComparison } from "./db-historical-comparison";
import { getQuarterlyComparison } from "./db-quarterly-comparison";
import { getAnnualComparison } from "./db-annual-comparison";
import {
  createContactSubmission,
  getContactSubmissions,
  updateContactSubmissionStatus,
  getContactStatistics,
  getContactTrends,
  createOwnerDraw, createPartner, createTransaction, createFuelLog,
  createLoad, deleteLoad, getDashboardKPIs, getFinancialSummary, getFuelLogs, getLoadById,
  getLoads, getMonthlyCashFlow, getOwnerDraws, getPartners, getTransactions,
  updateLoad, updateLoadStatus, updatePartner, getDrawsByPeriod, getAllDrivers,
  createLoadAssignment, getLoadAssignments, getAssignmentById, updateAssignmentStatus, getAvailableLoads, getPendingAssignmentsForDriver,
  uploadPOD, getPODsByLoadId, getPODsByDriverId, getPODById, deletePOD,
  getDriverStats, getDriverMonthlyTrends, getDriverRecentDeliveries,
  createBankAccount, getBankAccountsByUserId, getBankAccountById, updateBankAccount, deactivateBankAccount,
  createTransactionImport, getTransactionImportsByBankAccount, getUnmatchedTransactionImports, matchTransactionImport, deleteTransactionImport, getTransactionImportById,
  createLoadEvidence, getLoadEvidenceByLoadId, getLoadEvidenceByDriver,
  getFleetStats, getFleetRecentDeliveries,
  getBrokerStats, getDispatcherKPIs, submitDriverFeedback, getDriverFeedbackByLoad,
  getFinancialTransactions, createFinancialTransaction, updateFinancialTransaction, deleteFinancialTransaction,
  getFinancial, getAllocationSettings, updateAllocationSettings, getFinancialTrend, autoCategorize,
} from "./db";
import {
  getDriverLoads,
  getLoadDetailsForDriver,
  getNextPriorityLoad,
  getDriverStatsForView,
  confirmDelivery,
  getProofOfDeliveryForLoad,
  saveProofOfDelivery,
  getDriverEarnings,
  hasProofOfDelivery,
} from "./db-driver-view";

// ─── Bank & Transaction Router ─────────────────────────────────────────────────

const bankTransactionRouter = router({
  // Bank Accounts
  linkBankAccount: protectedProcedure
    .input(z.object({
      bankName: z.string(),
      accountType: z.enum(["checking", "savings", "credit_card", "other"]),
      accountLast4: z.string().length(4),
      plaidAccountId: z.string().optional(),
      plaidAccessToken: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const account = await createBankAccount({
        userId: ctx.user.id,
        bankName: input.bankName,
        accountType: input.accountType,
        accountLast4: input.accountLast4,
        plaidAccountId: input.plaidAccountId,
        plaidAccessToken: input.plaidAccessToken,
      });
      return { success: true, accountId: typeof account === 'object' && 'insertId' in account ? (account as any).insertId : 0 };
    }),

  getBankAccounts: protectedProcedure.query(async ({ ctx }) => {
  try {
    return await getBankAccountsByUserId(ctx.user.id);
  } catch (error) {
    console.error("[bankTransaction.getBankAccounts] error:", error);
    return [];
  }
}),

  unlinkBankAccount: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const account = await getBankAccountById(input.accountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Cuenta no encontrada");
      }
      await deactivateBankAccount(input.accountId);
      return { success: true };
    }),

  // Manual Transactions
  addManualTransaction: protectedProcedure
    .input(z.object({
      type: z.enum(["income", "expense"]),
      category: z.string(),
      amount: z.number().positive(),
      description: z.string(),
      transactionDate: z.date(),
      referenceLoadId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const transaction = await createTransaction({
        type: input.type,
        category: input.category as any,
        amount: String(input.amount),
        description: input.description,
        transactionDate: input.transactionDate,
        referenceLoadId: input.referenceLoadId,
        createdBy: ctx.user.id,
      });
      return { success: true, transactionId: typeof transaction === 'object' && 'insertId' in transaction ? (transaction as any).insertId : 0 };
    }),

  // Imported Transactions
  getImportedTransactions: protectedProcedure
  .input(z.object({ bankAccountId: z.number(), limit: z.number().default(50) }))
  .query(async ({ input, ctx }) => {
    try {
      const account = await getBankAccountById(input.bankAccountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      return await getTransactionImportsByBankAccount(input.bankAccountId, input.limit);
    } catch (error) {
      console.error("[bankTransaction.getImportedTransactions] error:", error);
      return [];
    }
  }),

  getUnmatchedImports: protectedProcedure
    .input(z.object({ bankAccountId: z.number() }))
    .query(async ({ input, ctx }) => {
      const account = await getBankAccountById(input.bankAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Cuenta no encontrada");
      }
      return getUnmatchedTransactionImports(input.bankAccountId);
    }),

  matchImportToTransaction: protectedProcedure
    .input(z.object({ importId: z.number(), transactionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const importRecord = await getTransactionImportById(input.importId);
      if (!importRecord) throw new Error("Importación no encontrada");
      
      const account = await getBankAccountById(importRecord.bankAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }
      
      await matchTransactionImport(input.importId, input.transactionId);
      return { success: true };
    }),

  deleteImportedTransaction: protectedProcedure
    .input(z.object({ importId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const importRecord = await getTransactionImportById(input.importId);
      if (!importRecord) throw new Error("Importación no encontrada");
      
      const account = await getBankAccountById(importRecord.bankAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }
      
      await deleteTransactionImport(input.importId);
      return { success: true };
    }),
});

// ─── Driver Stats Router ─────────────────────────────────────────────────────────

const driverStatsRouter = router({
  getStats: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estas estadísticas" });
      }
      return getDriverStats(input.driverId);
    }),

  getMonthlyTrends: protectedProcedure
    .input(z.object({ driverId: z.number(), months: z.number().min(1).max(24).default(6) }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estas estadísticas" });
      }
      return getDriverMonthlyTrends(input.driverId, input.months);
    }),

  getRecentDeliveries: protectedProcedure
    .input(z.object({ driverId: z.number(), limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estas entregas" });
      }
      return getDriverRecentDeliveries(input.driverId, input.limit);
    }),

  getFleetStats: protectedProcedure
    .query(async ({ ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver las estadísticas de la flota" });
      }
      return getFleetStats();
    }),

  getFleetRecentDeliveries: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver las entregas de la flota" });
      }
      return getFleetRecentDeliveries(input?.limit ?? 10);
    }),
});

// ─── Loads Router ─────────────────────────────────────────────────────────────

const loadsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          driverId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const loads = await getLoads(input);
        
        // Fetch financial snapshots for all loads in parallel
        const loads = await getLoads(input);
return attachFinancialSnapshots(loads);
        
        // Attach financial snapshot to each load
        return loads.map(load => ({
          ...load,
          financialSnapshot: snapshotMap.get(load.id) || {
            margin: 0,
            profit: 0,
            ratePerMile: 0,
            status: 'loss' as const,
          },
        }));
      } catch (error) {
        console.error("[loads.list] error:", error);
        return [];
      }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        return await getLoadById(input.id);
      } catch (error) {
        console.error("[loads.byId] error:", error);
        return null;
      }
    }),

  create: protectedProcedure
    .input(z.object({
      clientName: z.string().min(1),
      pickupAddress: z.string().min(1),
      deliveryAddress: z.string().min(1),
      pickupLat: z.number().optional(),
      pickupLng: z.number().optional(),
      deliveryLat: z.number().optional(),
      deliveryLng: z.number().optional(),
      weight: z.number().positive(),
      weightUnit: z.string().default("lbs"),
      merchandiseType: z.string().min(1),
      price: z.number().positive(),
      estimatedFuel: z.number().min(0).default(0),
      estimatedTolls: z.number().min(0).default(0),
      assignedDriverId: z.number().optional(),
      notes: z.string().optional(),
      pickupDate: z.string().optional(),
      deliveryDate: z.string().optional(),
      rateConfirmationNumber: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log("[loads.create] Starting load creation for:", input.clientName);
      let id: number;
      try {
        id = await createLoad({
          clientName: input.clientName,
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          weight: String(input.weight) as any,
          weightUnit: input.weightUnit,
          merchandiseType: input.merchandiseType,
          price: String(input.price) as any,
          estimatedFuel: String(input.estimatedFuel) as any,
          estimatedTolls: String(input.estimatedTolls) as any,
          assignedDriverId: input.assignedDriverId,
          notes: input.notes,
          rateConfirmationNumber: input.rateConfirmationNumber,
          pickupLat: input.pickupLat ? String(input.pickupLat) as any : undefined,
          pickupLng: input.pickupLng ? String(input.pickupLng) as any : undefined,
          deliveryLat: input.deliveryLat ? String(input.deliveryLat) as any : undefined,
          deliveryLng: input.deliveryLng ? String(input.deliveryLng) as any : undefined,
          pickupDate: input.pickupDate ? new Date(input.pickupDate) : undefined,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : undefined,
          createdBy: ctx.user.id,
        });
        console.log("[loads.create] Load created with id:", id);
      } catch (dbError: any) {
        console.error("[loads.create] DB error:", dbError?.message, dbError?.code, dbError?.sqlMessage);
        throw new Error(`Failed to create load: ${dbError?.sqlMessage || dbError?.message || String(dbError)}`);
      }

      // Notify driver via WebSocket if assigned at creation
      if (input.assignedDriverId) {
        wsManager.sendToUser(input.assignedDriverId, {
          type: "load_assigned",
          loadId: id,
          message: `Nueva carga asignada: ${input.clientName} — ${input.pickupAddress} → ${input.deliveryAddress}`,
        });
        await notifyOwner({
          title: "🚚 Carga Creada y Asignada",
          content: `Carga #${id} de ${input.clientName} creada y asignada al conductor ID ${input.assignedDriverId}.`,
        });
      }

      return { id };
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().optional(),
      pickupAddress: z.string().optional(),
      deliveryAddress: z.string().optional(),
      pickupLat: z.number().optional(),
      pickupLng: z.number().optional(),
      deliveryLat: z.number().optional(),
      deliveryLng: z.number().optional(),
      weight: z.number().optional(),
      merchandiseType: z.string().optional(),
      price: z.number().optional(),
      estimatedFuel: z.number().optional(),
      estimatedTolls: z.number().optional(),
      assignedDriverId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.price !== undefined) updateData.price = String(data.price);
      if (data.weight !== undefined) updateData.weight = String(data.weight);
      if (data.estimatedFuel !== undefined) updateData.estimatedFuel = String(data.estimatedFuel);
      if (data.estimatedTolls !== undefined) updateData.estimatedTolls = String(data.estimatedTolls);
      await updateLoad(id, updateData);
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["available", "in_transit", "delivered", "invoiced", "paid"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateLoadStatus(input.id, input.status);

      // Auto-create income transaction when load is paid
      if (input.status === "paid") {
        const load = await getLoadById(input.id);
        if (load) {
          await createTransaction({
            type: "income",
            category: "load_payment",
            amount: load.price,
            description: `Pago de carga #${load.id} - ${load.clientName}`,
            referenceLoadId: load.id,
            transactionDate: new Date(),
            createdBy: ctx.user.id,
          });
          await notifyOwner({
            title: "💰 Carga Pagada",
            content: `La carga #${load.id} de ${load.clientName} por $${load.price} ha sido marcada como pagada. Ingreso registrado automáticamente.`,
          });
        }
      }

      if (input.status === "delivered") {
        const load = await getLoadById(input.id);
        if (load) {
          await notifyOwner({
            title: "✅ Carga Entregada",
            content: `La carga #${load.id} de ${load.clientName} (${load.pickupAddress} → ${load.deliveryAddress}) ha sido entregada exitosamente.`,
          });
        }
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteLoad(input.id);
      return { success: true };
    }),

 uploadBOL: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `bol/${input.loadId}-${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await updateLoad(input.loadId, { bolImageUrl: url });
      return { url };
    }),

   acceptLoad: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const load = await getLoadById(input.loadId);
      if (!load) throw new Error("Carga no encontrada");
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (!isPrivileged && load.assignedDriverId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para aceptar esta carga" });
      }
      await updateLoad(input.loadId, {
        driverAcceptedAt: new Date(),
        status: "in_transit",
      });
      if (!isPrivileged) {
        await notifyOwner({
          title: "✅ Chofer Aceptó Carga",
          content: `${ctx.user.email} aceptó la carga #${input.loadId} de ${load.clientName}. Estado: En Tránsito`,
        });
      }
      return { success: true };
    }),

  rejectLoad: protectedProcedure
    .input(
      z.object({
        loadId: z.number(),
        reason: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const load = await getLoadById(input.loadId);
      if (!load) throw new Error("Carga no encontrada");
      if (load.assignedDriverId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para rechazar esta carga" });
      }

      await updateLoad(input.loadId, {
        driverRejectedAt: new Date(),
        driverRejectionReason: input.reason,
        status: "available",
        assignedDriverId: null,
      });

      await notifyOwner({
        title: "❌ Chofer Rechazó Carga",
        content: `${ctx.user.email} rechazó la carga #${input.loadId} de ${load.clientName}. Razón: ${input.reason}`,
      });

      return { success: true };
    }),
});

// ─── Finance Router ───────────────────────────────────────────────────────────────────

const financeRouter = router({
  transactions: protectedProcedure
  .input(
    z
      .object({
        type: z.enum(["income", "expense"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .optional()
  )
  .query(async ({ input, ctx }) => {
    const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
    if (!isPrivileged) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
    }

    try {
      return await getTransactions({
        type: input?.type,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
      });
    } catch (error) {
      console.error("[finance.transactions] error:", error);
      return [];
    }
  }),

  addExpense: protectedProcedure
    .input(
      z.object({
        category: z.enum([
          "fuel",
          "maintenance",
          "insurance",
          "subscriptions",
          "phone",
          "payroll",
          "tolls",
          "other",
        ]),
        amount: z.number().positive(),
        description: z.string().optional(),
        receiptBase64: z.string().optional(),
        receiptFileName: z.string().optional(),
        transactionDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let receiptUrl: string | undefined;

      if (input.receiptBase64 && input.receiptFileName) {
        const buffer = Buffer.from(input.receiptBase64, "base64");
        const key = `receipts/${Date.now()}-${input.receiptFileName}`;
        const { url } = await storagePut(key, buffer, "image/jpeg");
        receiptUrl = url;
      }

      const id = await createTransaction({
        type: "expense",
        category: input.category,
        amount: String(input.amount) as any,
        description: input.description,
        receiptUrl,
        transactionDate: input.transactionDate
          ? new Date(input.transactionDate)
          : new Date(),
        createdBy: ctx.user.id,
      });

      if (input.amount >= 500) {
        await notifyOwner({
          title: "⚠️ Gasto Importante Registrado",
          content: `Se registró un gasto de $${input.amount} en la categoría "${input.category}". ${input.description ?? ""}`,
        });
      }

      return { id };
    }),

  summary: protectedProcedure
  .input(z.object({ year: z.number(), month: z.number() }))
  .query(async ({ input, ctx }) => {
    const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
    if (!isPrivileged) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
    }

    try {
      const result = await getFinancialSummary(input.year, input.month);
      return {
        income: result?.income ?? 0,
        expenses: result?.expenses ?? 0,
        netProfit: result?.netProfit ?? 0,
        byCategory: result?.byCategory ?? [],
      };
    } catch (error) {
      console.error("[finance.summary] error:", error);
      return {
        income: 0,
        expenses: 0,
        netProfit: 0,
        byCategory: [],
      };
    }
  }),

  cashFlow: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await getMonthlyCashFlow(input.year);
      } catch (error) {
        console.error("[finance.cashFlow] error:", error);
        return [];
      }
    }),

  // ── Advanced Finance Module ─────────────────────────────────────────────────────
  pnl: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await getFinancialPnL(input.year, input.month);
      } catch (error) {
        console.error("[finance.pnl] error:", error);
        return null;
      }
    }),

  trend: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await getFinancialTrend(input.year);
      } catch (error) {
        console.error("[finance.trend] error:", error);
        return [];
      }
    }),

  manualTransactions: protectedProcedure
    .input(
      z.object({
        type: z.enum(["income", "expense"]).optional(),
        category: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await getFinancialTransactions(input ?? undefined);
      } catch (error) {
        console.error("[finance.manualTransactions] error:", error);
        return [];
      }
    }),

  addManualTransaction: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        name: z.string().min(1),
        merchantName: z.string().optional(),
        amount: z.number().positive(),
        category: z.string(),
        type: z.enum(["income", "expense"]),
        isReviewed: z.boolean().optional(),
        isTaxDeductible: z.boolean().optional(),
        linkedLoadId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { category, isTaxDeductible } = autoCategorize(input.name);
      const id = await createFinancialTransaction({
        ...input,
        category: input.category || category,
        isTaxDeductible: input.isTaxDeductible ?? isTaxDeductible,
        createdBy: ctx.user.id,
      });

      if (input.amount >= 500 && input.type === "expense") {
        await notifyOwner({
          title: "\u26a0\ufe0f Gasto Importante Registrado",
          content: `Gasto de $${input.amount} en "${input.name}" (${input.category || category}).`,
        });
      }

      return { id };
    }),

  updateManualTransaction: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        amount: z.number().positive().optional(),
        category: z.string().optional(),
        type: z.enum(["income", "expense"]).optional(),
        isReviewed: z.boolean().optional(),
        isTaxDeductible: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateFinancialTransaction(id, data);
      return { success: true };
    }),

  deleteManualTransaction: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteFinancialTransaction(input.id);
      return { success: true };
    }),

  allocationSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
      if (!isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }

      try {
        return await getAllocationSettings();
      } catch (error) {
        return {
          operatingPct: 50,
          ownerPayPct: 20,
          reservePct: 20,
          growthPct: 10,
        };
      }
    }),
  updateAllocationSettings: protectedProcedure
    .input(z.object({
      operatingPct: z.number().min(0).max(100),
      ownerPayPct: z.number().min(0).max(100),
      reservePct: z.number().min(0).max(100),
      growthPct: z.number().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const total = input.operatingPct + input.ownerPayPct + input.reservePct + input.growthPct;
      if (Math.abs(total - 100) > 0.01) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Los porcentajes deben sumar 100%" });
      }
      await updateAllocationSettings(input);
      return { success: true };
    }),
  autoCategorize: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => autoCategorize(input.name)),
});
// ─── Partnership Routerr ───────────────────────────────────────────────────────

const partnershipRouter = router({
  list: publicProcedure.query(async () => {
    try {
      return await getPartners();
    } catch (error) {
      console.error("[partnership.list] error:", error);
      return [];
    }
  }),

  create: protectedProcedure
    .input(z.object({
      partnerName: z.string().min(1),
      partnerRole: z.string().min(1),
      participationPercent: z.number().min(0).max(100),
      userId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createPartner({
        ...input,
        participationPercent: String(input.participationPercent) as any,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      partnerName: z.string().optional(),
      partnerRole: z.string().optional(),
      participationPercent: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.participationPercent !== undefined) {
        updateData.participationPercent = String(data.participationPercent);
      }
      await updatePartner(id, updateData);
      return { success: true };
    }),

  draws: protectedProcedure
    .input(z.object({ partnerId: z.number().optional() }).optional())
    .query(({ input }) => getOwnerDraws(input?.partnerId)),

  drawsByPeriod: protectedProcedure
    .input(z.object({ period: z.string() }))
    .query(({ input }) => getDrawsByPeriod(input.period)),

  createDraw: protectedProcedure
    .input(z.object({
      partnerId: z.number(),
      amount: z.number().positive(),
      period: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createOwnerDraw({
        ...input,
        amount: String(input.amount) as any,
        createdBy: ctx.user.id,
      });
      const partners = await getPartners();
      const partner = partners.find((p) => p.id === input.partnerId);
      await notifyOwner({
        title: "💸 Retiro de Socio Registrado",
        content: `${partner?.partnerName ?? "Socio"} realizó un retiro (Owner's Draw) de $${input.amount} para el período ${input.period}.`,
      });
      return { id };
    }),

  distribution: publicProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      try {
        const [partners, summary] = await Promise.all([
          getPartners(),
          getFinancialSummary(input.year, input.month),
        ]);

        const payroll =
          summary?.byCategory?.find((c: any) => c.category === "payroll")?.total ?? 0;

        const netAfterPayroll = (summary?.netProfit ?? 0) - payroll;

        return {
          grossIncome: summary?.income ?? 0,
          totalExpenses: summary?.expenses ?? 0,
          payroll,
          netProfit: summary?.netProfit ?? 0,
          netAfterPayroll,
          partners: (partners ?? []).map((p: any) => ({
            ...p,
            distribution:
              (netAfterPayroll * parseFloat(String(p.participationPercent))) / 100,
          })),
        };
      } catch (error) {
        console.error("[partnership.distribution] error:", error);
        return {
          grossIncome: 0,
          totalExpenses: 0,
          payroll: 0,
          netProfit: 0,
          netAfterPayroll: 0,
          partners: [],
        };
      }
    }),
});
// ─── Driver Router ────────────────────────────────────────────────────────────

const driverRouter = router({
  myLoads: protectedProcedure.query(({ ctx }) => {
    // Admins and owners see all loads, drivers see only their assigned loads
    if (ctx.user.role === 'admin' || ctx.user.role === 'owner') {
      return getLoads({ includeUnassigned: true });
    }
    return getLoads({ driverId: ctx.user.id, includeUnassigned: true });
  }),

  allDrivers: protectedProcedure.query(() => getAllDrivers()),

  logFuel: protectedProcedure
    .input(z.object({
      loadId: z.number().optional(),
      amount: z.number().positive().max(10000),
      gallons: z.number().positive().max(500).optional(),
      pricePerGallon: z.number().positive().max(100).optional(),
      location: z.string().max(255).optional(),
      receiptBase64: z.string().optional(),
      receiptFileName: z.string().max(255).optional(),
      receiptMimeType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate fuel amount is reasonable
      if (input.amount < 5) throw new Error("El monto debe ser al menos $5");
      if (input.amount > 5000) throw new Error("Monto sospechosamente alto (>$5000). Verifica el valor.");

      // Validate consistency between gallons and price
      if (input.gallons && input.pricePerGallon) {
        const calculated = parseFloat((input.gallons * input.pricePerGallon).toFixed(2));
        const difference = Math.abs(calculated - input.amount);
        if (difference > 1) {
          console.warn(`[Fuel] Discrepancia: ${input.gallons}gal x $${input.pricePerGallon}/gal = $${calculated}, pero se reporto $${input.amount}`);
        }
      }

      let receiptUrl: string | undefined;
      if (input.receiptBase64 && input.receiptFileName) {
        const buffer = Buffer.from(input.receiptBase64, "base64");
        if (buffer.length > 5 * 1024 * 1024) throw new Error("Archivo demasiado grande (max 5MB)");

        const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        const mimeType = input.receiptMimeType || "image/jpeg";
        if (!allowedMimes.includes(mimeType)) throw new Error(`Tipo no permitido. Usa: ${allowedMimes.join(", ")}`);

        try {
          const key = `fuel-receipts/${ctx.user.id}/${Date.now()}-${input.receiptFileName}`;
          const { url } = await storagePut(key, buffer, mimeType);
          receiptUrl = url;
        } catch (error) {
          console.error("[Fuel] Upload error:", error);
          throw new Error("No se pudo subir el recibo. Intenta de nuevo.");
        }
      }

      const id = await createFuelLog({
        driverId: ctx.user.id,
        loadId: input.loadId,
        amount: String(input.amount) as any,
        gallons: input.gallons ? String(input.gallons) as any : undefined,
        pricePerGallon: input.pricePerGallon ? String(input.pricePerGallon) as any : undefined,
        location: input.location,
        receiptUrl,
      });

      await createTransaction({
        type: "expense",
        category: "fuel",
        amount: String(input.amount) as any,
        description: `Gasolina - ${ctx.user.name}${input.location ? ` en ${input.location}` : ""}`,
        referenceLoadId: input.loadId,
        receiptUrl,
        transactionDate: new Date(),
        createdBy: ctx.user.id,
      });

      // Notify owner if expense is significant (>= $100)
      if (input.amount >= 100) {
        await notifyOwner({
          title: "⛽ Gasto de Combustible",
          content: `${ctx.user.name} registro $${input.amount.toFixed(2)} en combustible${input.location ? ` en ${input.location}` : ""}`,
        });
      }

      return { id, receiptUrl };
    }),

  fuelLogs: protectedProcedure
    .input(z.object({ loadId: z.number().optional() }).optional())
    .query(({ ctx, input }) => getFuelLogs(ctx.user.id, input?.loadId)),

  uploadBOL: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      fileBase64: z.string(),
      fileName: z.string().max(255),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      
      if (buffer.length > 10 * 1024 * 1024) {
        throw new Error("Archivo BOL demasiado grande (max 10MB)");
      }

      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedMimes.includes(input.mimeType)) {
        throw new Error(`Tipo no permitido. Usa: ${allowedMimes.join(", ")}`);
      }

      try {
        const key = `bol/${input.loadId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateLoad(input.loadId, { bolImageUrl: url });
        
        await notifyOwner({
          title: "📄 BOL Subido",
          content: `${ctx.user.name} subio el comprobante de entrega (BOL) para la carga #${input.loadId}.`,
        });
        
        return { url };
      } catch (error) {
        console.error("[BOL Upload] Error:", error);
        throw new Error("No se pudo subir el BOL. Intenta de nuevo.");
      }
    }),

  updateLoadStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["in_transit", "delivered"]),
    }))
    .mutation(async ({ input }) => {
      await updateLoadStatus(input.id, input.status);
      if (input.status === "delivered") {
        const load = await getLoadById(input.id);
        if (load) {
          await notifyOwner({
            title: "✅ Carga Entregada",
            content: `La carga #${load.id} de ${load.clientName} (${load.pickupAddress} → ${load.deliveryAddress}) ha sido entregada exitosamente.`,
          });
        }
      }
      // Notify assigned driver via WebSocket when status changes
      const updatedLoad = await getLoadById(input.id);
      if (updatedLoad?.assignedDriverId) {
        const statusLabels: Record<string, string> = {
          available: "Disponible",
          in_transit: "En Tránsito",
          delivered: "Entregada",
          invoiced: "Facturada",
          paid: "Pagada",
        };
        wsManager.notifyUser(updatedLoad.assignedDriverId, {
          type: "loadUpdated",
          data: {
            loadId: updatedLoad.id,
            clientName: updatedLoad.clientName,
            status: input.status,
            statusLabel: statusLabels[input.status] ?? input.status,
            pickupAddress: updatedLoad.pickupAddress,
            deliveryAddress: updatedLoad.deliveryAddress,
          },
        });
      }
      return { success: true };
    }),

  uploadPOD: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      fileKey: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      documentUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const pod = await uploadPOD({
        loadId: input.loadId,
        driverId: ctx.user.id,
        documentUrl: input.documentUrl,
        documentKey: input.fileKey,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      });
      return pod;
    }),

  // ─── Driver View Production Endpoints ──────────────────────────────────────

  getStats: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estas estadísticas" });
      }
      return await getDriverStatsForView(input.driverId);
    }),

  getLoads: protectedProcedure
    .input(z.object({
      driverId: z.number(),
      status: z.enum(["available", "in_transit", "delivered"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estas cargas" });
      }
      return await getDriverLoads(input.driverId, input.status);
    }),

  getLoadDetails: protectedProcedure
    .input(z.object({ loadId: z.number(), driverId: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver este detalle" });
      }
      return await getLoadDetailsForDriver(input.loadId, input.driverId);
    }),

  getNextPriority: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }
      return await getNextPriorityLoad(input.driverId);
    }),

  confirmDelivery: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify load belongs to this driver
      const load = await getLoadDetailsForDriver(input.loadId, ctx.user.id);
      if (!load) {
        throw new Error("Carga no encontrada o no te pertenece");
      }

      // Prevent duplicate confirmations
      if (load.status === "delivered") {
        throw new Error("Esta carga ya ha sido marcada como entregada");
      }

      const result = await confirmDelivery(input.loadId, ctx.user.id, input.notes);

      // Notify owner
      await notifyOwner({
        title: "✅ Carga Entregada",
        content: `${ctx.user.name} confirmó la entrega de carga #${input.loadId}${input.notes ? ` con notas: ${input.notes}` : ""}.`,
      });

      return result;
    }),

  uploadProofOfDelivery: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      fileBase64: z.string(),
      fileName: z.string().max(255),
      mimeType: z.string(),
      fileSize: z.number(),
      deliveryNotes: z.string().max(1000).optional(),
      signatureUrl: z.string().optional(),
      signatureKey: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify load belongs to this driver
      const load = await getLoadDetailsForDriver(input.loadId, ctx.user.id);
      if (!load) {
        throw new Error("Carga no encontrada o no te pertenece");
      }

      // Validate file size (max 10MB)
      if (input.fileSize > 10 * 1024 * 1024) {
        throw new Error("Archivo demasiado grande (máx 10MB)");
      }

      // Validate MIME type
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedMimes.includes(input.mimeType)) {
        throw new Error(`Tipo no permitido. Usa: ${allowedMimes.join(", ")}`);
      }

      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileBase64, "base64");

        // Upload to S3
        const key = `proof-of-delivery/${ctx.user.id}/${input.loadId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.mimeType);

        // Save POD to database
        await saveProofOfDelivery(
          input.loadId,
          ctx.user.id,
          url,
          key,
          input.fileName,
          input.fileSize,
          input.mimeType,
          input.deliveryNotes,
          input.signatureUrl,
          input.signatureKey
        );

        // Notify owner
        await notifyOwner({
          title: "📸 Prueba de Entrega Subida",
          content: `${ctx.user.name} subió prueba de entrega para carga #${input.loadId}.`,
        });

        return { success: true, url };
      } catch (error) {
        console.error("[POD Upload] Error:", error);
        throw new Error("No se pudo subir la prueba de entrega. Intenta de nuevo.");
      }
    }),

  getProofOfDelivery: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verify load belongs to this driver or user is admin
      const load = await getLoadDetailsForDriver(input.loadId, ctx.user.id);
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (!load && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver esto" });
      }

      return await getProofOfDeliveryForLoad(input.loadId);
    }),

  getEarnings: protectedProcedure
    .input(z.object({
      driverId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estas ganancias" });
      }
      return await getDriverEarnings(input.driverId, input.startDate, input.endDate);
    }),

  hasProof: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ input }) => {
      return await hasProofOfDelivery(input.loadId);
    }),

  updateLocation: protectedProcedure
    .input(z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
      speed: z.number().optional(),
      heading: z.number().optional(),
      altitude: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "driver" && ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para actualizar ubicación" });
      }

      try {
        const { saveDriverLocation } = await import("./db-location-tracking");
        await saveDriverLocation(
          ctx.user.id,
          input.latitude,
          input.longitude,
          input.accuracy,
          input.speed,
          input.heading,
          input.altitude
        );
        return { success: true };
      } catch (error) {
        console.error("[Location Update] Error:", error);
        throw new Error("Error al actualizar ubicación");
      }
    }),

  getLatestLocation: protectedProcedure
    .input(z.object({ driverId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const driverId = input.driverId || ctx.user.id;
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver esta ubicación" });
      }

      try {
        const { getLatestDriverLocation } = await import("./db-location-tracking");
        return await getLatestDriverLocation(driverId);
      } catch (error) {
        console.error("[Get Location] Error:", error);
        return null;
      }
    }),

  getLoadLocation: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ input, ctx }) => {
      const load = await getLoadDetailsForDriver(input.loadId, ctx.user.id);
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (!load && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver esta ubicación" });
      }
      try {
        const { getLatestLocationForLoad } = await import("./db-location-tracking");
        return await getLatestLocationForLoad(input.loadId);
      } catch (error) {
        console.error("[Get Load Location] Error:", error);
        return null;
      }
    }),

  // ─── Evidence Collection ─────────────────────────────────────────────────
  uploadEvidence: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      evidenceType: z.enum(["pickup_photo", "delivery_photo", "bol_scan", "damage_report", "signature", "receipt", "other"]),
      fileBase64: z.string(),
      fileName: z.string().max(255),
      mimeType: z.string(),
      fileSize: z.number(),
      caption: z.string().max(500).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate file size (max 10MB)
      if (input.fileSize > 10 * 1024 * 1024) {
        throw new Error("Archivo demasiado grande (máx 10MB)");
      }
      const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedMimes.includes(input.mimeType)) {
        throw new Error(`Tipo no permitido. Usa: ${allowedMimes.join(", ")}`);
      }
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `evidence/${input.loadId}/${ctx.user.id}/${input.evidenceType}/${Date.now()}-${input.fileName}`;
      let fileUrl: string;
      try {
        const { url } = await storagePut(key, buffer, input.mimeType);
        fileUrl = url;
      } catch (error) {
        console.error("[Evidence Upload] Storage error:", error);
        throw new Error("No se pudo subir el archivo. Intenta de nuevo.");
      }
      const id = await createLoadEvidence({
        loadId: input.loadId,
        driverId: ctx.user.id,
        evidenceType: input.evidenceType,
        fileUrl,
        fileKey: key,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        caption: input.caption,
        latitude: input.latitude ? String(input.latitude) as any : undefined,
        longitude: input.longitude ? String(input.longitude) as any : undefined,
        capturedAt: new Date(),
      });
      // Notify owner for key evidence types
      if (input.evidenceType === "pickup_photo" || input.evidenceType === "delivery_photo") {
        const typeLabel = input.evidenceType === "pickup_photo" ? "Pickup" : "Entrega";
        await notifyOwner({
          title: `📸 Evidencia de ${typeLabel}`,
          content: `${ctx.user.name} subió foto de ${typeLabel.toLowerCase()} para carga #${input.loadId}.`,
        });
      }
      return { id, fileUrl };
    }),

  getEvidence: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Drivers can only see evidence for their own loads
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        const load = await getLoadById(input.loadId);
        if (load?.assignedDriverId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver esta evidencia" });
        }
      }
      return getLoadEvidenceByLoadId(input.loadId);
    }),

  getMyEvidence: protectedProcedure
    .input(z.object({ loadId: z.number().optional() }))
    .query(({ ctx, input }) => {
      return getLoadEvidenceByDriver(ctx.user.id, input?.loadId);
    }),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────

const dashboardRouter = router({
  kpis: publicProcedure.query(async () => {
    try {
      return await getDashboardKPIs();
    } catch (error) {
      console.error("[dashboard.kpis] error:", error);
      return {
        activeLoads: 0,
        monthIncome: 0,
        monthExpenses: 0,
        monthProfit: 0,
      };
    }
  }),

  recentLoads: publicProcedure.query(async () => {
    try {
      return await getLoads();
    } catch (error) {
      console.error("[dashboard.recentLoads] error:", error);
      return [];
    }
  }),

  monthlyProjections: publicProcedure.query(() => null),
  historicalComparison: publicProcedure.query(() => null),
  quarterlyComparison: publicProcedure.query(() => null),
  annualComparison: publicProcedure.query(() => null),
});

// ─── Assignment Router ────────────────────────────────────────────────────────

const assignmentRouter = router({
  availableLoads: protectedProcedure.query(() => getAvailableLoads()),
  
  drivers: protectedProcedure.query(() => getAllDrivers()),
  
  assign: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      driverId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createLoadAssignment({
        loadId: input.loadId,
        driverId: input.driverId,
        assignedBy: ctx.user.id,
        notes: input.notes,
      });
      
      const load = await getLoadById(input.loadId);
      await notifyOwner({
        title: "📦 Carga Asignada",
        content: `Carga #${input.loadId} (${load?.clientName}) asignada al chofer`,
      });
      
      return { id };
    }),
  
  list: protectedProcedure
    .input(z.object({ driverId: z.number().optional(), status: z.string().optional() }).optional())
    .query(({ input }) => getLoadAssignments(input?.driverId, input?.status)),
  
  updateStatus: protectedProcedure
    .input(z.object({
      assignmentId: z.number(),
      status: z.enum(["pending", "accepted", "rejected", "completed"]),
    }))
    .mutation(async ({ input }) => {
      await updateAssignmentStatus(input.assignmentId, input.status);
      return { success: true };
    }),
  
  pendingForDriver: protectedProcedure.query(({ ctx }) => {
    if (ctx.user.role !== "driver") return [];
    return getPendingAssignmentsForDriver(ctx.user.id);
  }),
  
  accept: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new Error("Asignacion no encontrada");
      if (assignment.driverId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para aceptar esta carga" });
      
      await updateAssignmentStatus(input.assignmentId, "accepted");
      
      const load = await getLoadById(assignment.loadId);
      await notifyOwner({
        title: "Carga Aceptada",
        content: `${ctx.user.name} acepto la carga #${assignment.loadId} (${load?.clientName})`,
      });
      
      return { success: true };
    }),
  
  reject: protectedProcedure
    .input(z.object({ assignmentId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new Error("Asignacion no encontrada");
      if (assignment.driverId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para rechazar esta carga" });
      
      await updateAssignmentStatus(input.assignmentId, "rejected");
      
      const load = await getLoadById(assignment.loadId);
      await notifyOwner({
        title: "Carga Rechazada",
        content: `${ctx.user.name} rechazo la carga #${assignment.loadId} (${load?.clientName}). Razon: ${input.reason || "No especificada"}`,
      });
      
      return { success: true };
    }),
});

// ─── Admin Router ────────────────────────────────────────────────────────────

const adminRouter = router({
  checkEmailAvailability: protectedProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .query(async ({ input, ctx }) => {
      // Only owner and admin can check
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para verificar emails" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1).then(rows => rows[0]);
      
      return {
        available: !existingUser,
        email: input.email,
      };
    }),

  createDriver: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string(),
      password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
      phoneNumber: z.string().optional(),
      licenseNumber: z.string().optional(),
      dotNumber: z.string().optional(),
      fleetType: z.enum(["internal", "leased", "external"]).optional().default("internal"),
      commissionPercent: z.number().min(0).max(100).optional().default(0),
      vehicleInfo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only owner and admin can create drivers
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para crear choferes" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      // Check if user already exists
      const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1).then(rows => rows[0]);

      if (existingUser) {
        throw new Error("El correo ya está registrado en el sistema");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create new driver user with unique openId
      const openId = `driver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const insertPayload: Record<string, any> = {
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "driver",
        loginMethod: "manual",
        fleetType: input.fleetType ?? "internal",
        commissionPercent: String(input.commissionPercent ?? 0),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      if (input.dotNumber) insertPayload.dotNumber = input.dotNumber;
      if (input.vehicleInfo) insertPayload.vehicleInfo = input.vehicleInfo;
      if (input.phoneNumber) insertPayload.phone = input.phoneNumber;

      const newDriver = await db.insert(usersTable).values(insertPayload).$returningId();

      await notifyOwner({
        title: "Nuevo Chofer Agregado",
        content: `Se agregó un nuevo chofer: ${input.name} (${input.email})${input.dotNumber ? ` | DOT: ${input.dotNumber}` : ' | Sin DOT'} | Comisión: ${input.commissionPercent ?? 0}%`,
      });

      return {
        success: true,
        driver: {
          id: newDriver[0].id,
          name: input.name,
          email: input.email,
          role: "driver",
          dotNumber: input.dotNumber,
          fleetType: input.fleetType,
          commissionPercent: input.commissionPercent,
        },
        message: `Chofer ${input.name} creado exitosamente`,
      };
    }),

  // Update driver fleet classification and commission
  updateDriverFleet: protectedProcedure
    .input(z.object({
      driverId: z.number(),
      fleetType: z.enum(["internal", "leased", "external"]).optional(),
      commissionPercent: z.number().min(0).max(100).optional(),
      dotNumber: z.string().optional(),
      vehicleInfo: z.string().optional(),
      locationSharingEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para actualizar choferes" });
      }
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const { driverId, ...updateData } = input;
      const updatePayload: Record<string, any> = {};
      if (updateData.fleetType !== undefined) updatePayload.fleetType = updateData.fleetType;
      if (updateData.commissionPercent !== undefined) updatePayload.commissionPercent = String(updateData.commissionPercent);
      if (updateData.dotNumber !== undefined) updatePayload.dotNumber = updateData.dotNumber;
      if (updateData.vehicleInfo !== undefined) updatePayload.vehicleInfo = updateData.vehicleInfo;
      if (updateData.locationSharingEnabled !== undefined) updatePayload.locationSharingEnabled = updateData.locationSharingEnabled;
      await db.update(usersTable).set(updatePayload).where(eq(usersTable.id, driverId));
      return { success: true };
    }),

  // Delete a driver user
  deleteDriver: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para eliminar choferes" });
      }
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const target = await db.select().from(usersTable).where(eq(usersTable.id, input.driverId)).limit(1).then(r => r[0]);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      if (target.role === "owner") throw new TRPCError({ code: "FORBIDDEN", message: "No se puede eliminar una cuenta de dueño" });
      await db.delete(usersTable).where(eq(usersTable.id, input.driverId));
      return { success: true, message: `Usuario ${target.name} eliminado` };
    }),

  // Get all drivers with fleet info
  getDrivers: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver los choferes" });
      }
      const db = await getDb();
      if (!db) return [];
      // Use raw SQL to safely handle columns that may not exist yet in DB
      const [rows] = await db.execute(sql`
        SELECT
          id, name, email, role, phone,
          profileImageUrl,
          CASE WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='fleetType') > 0
            THEN fleetType ELSE 'internal' END as fleetType,
          CASE WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='commissionPercent') > 0
            THEN commissionPercent ELSE 0 END as commissionPercent,
          CASE WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='dotNumber') > 0
            THEN dotNumber ELSE NULL END as dotNumber,
          CASE WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='vehicleInfo') > 0
            THEN vehicleInfo ELSE NULL END as vehicleInfo,
          CASE WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='locationSharingEnabled') > 0
            THEN locationSharingEnabled ELSE 0 END as locationSharingEnabled,
          createdAt
        FROM users
        WHERE role IN ('driver', 'owner')
        ORDER BY name ASC
      `);
      return rows as any[];
    }),

  // Get driver wallet/settlement data
  getDriverWallet: protectedProcedure
    .input(z.object({
      driverId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
      const targetDriverId = input.driverId ?? ctx.user.id;
      if (!isPrivileged && targetDriverId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver esta billetera" });
      }
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const driver = await db.select().from(usersTable).where(eq(usersTable.id, targetDriverId)).limit(1).then(r => r[0]);
      if (!driver) throw new Error("Chofer no encontrado");
      const deliveredLoads = await db.select().from(loadsTable)
        .where(and(
          eq(loadsTable.assignedDriverId, targetDriverId),
          inArray(loadsTable.status, ["delivered", "invoiced", "paid"])
        ))
        .orderBy(desc(loadsTable.updatedAt))
        .limit(50);
      const commissionRate = Number(driver.commissionPercent ?? 0) / 100;
      const settlements = deliveredLoads.map(load => {
        const gross = Number(load.price);
        const tolls = Number(load.estimatedTolls ?? 0);
        const fuel = Number(load.estimatedFuel ?? 0);
        const commission = gross * commissionRate;
        const net = gross - commission - tolls - fuel;
        const bolUploaded = !!load.bolImageUrl;
        return {
          loadId: load.id,
          clientName: load.clientName,
          pickupAddress: load.pickupAddress,
          deliveryAddress: load.deliveryAddress,
          status: load.status,
          deliveryDate: load.deliveryDate ?? load.updatedAt,
          grossAmount: gross,
          commissionAmount: commission,
          commissionPercent: Number(driver.commissionPercent ?? 0),
          tollDeduction: tolls,
          fuelDeduction: fuel,
          netPayable: net,
          bolUploaded,
          paymentBlocked: !bolUploaded,
          blockReason: !bolUploaded ? "BOL no subido — pago bloqueado" : null,
        };
      });
      const totalGross = settlements.reduce((s, l) => s + l.grossAmount, 0);
      const totalCommission = settlements.reduce((s, l) => s + l.commissionAmount, 0);
      const totalTolls = settlements.reduce((s, l) => s + l.tollDeduction, 0);
      const totalFuel = settlements.reduce((s, l) => s + l.fuelDeduction, 0);
      const totalNet = settlements.reduce((s, l) => s + l.netPayable, 0);
      const blockedCount = settlements.filter(l => l.paymentBlocked).length;
      const readyCount = settlements.filter(l => !l.paymentBlocked).length;
      return {
        driver: {
          id: driver.id,
          name: driver.name,
          fleetType: (driver as any).fleetType ?? "internal",
          commissionPercent: Number((driver as any).commissionPercent ?? 0),
        },
        settlements,
        summary: {
          totalGross,
          totalCommission,
          totalTolls,
          totalFuel,
          totalNet,
          blockedCount,
          readyCount,
          totalLoads: settlements.length,
        },
      };
    }),

  // Get all active driver locations for GPS multi-track map
  getFleetLocations: protectedProcedure
    .query(async ({ ctx }) => {
      const isPrivileged = ctx.user.role === "owner" || ctx.user.role === "admin";
      if (!isPrivileged) return []; // Silently return empty for non-admin users
      const db = await getDb();
      if (!db) return []; // Silently return empty if no DB connection
      try {
        const locations = await db.execute(sql`
          SELECT dl.driverId, dl.latitude, dl.longitude, dl.speed, dl.heading, dl.timestamp,
                 u.name as driverName,
                 CASE WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='fleetType') > 0
                   THEN u.fleetType ELSE 'internal' END as fleetType,
                 u.profileImageUrl,
                 l.clientName as loadClientName, l.deliveryAddress as loadDestination, l.status as loadStatus
          FROM driver_locations dl
          INNER JOIN (
            SELECT driverId, MAX(timestamp) as maxTs
            FROM driver_locations
            WHERE timestamp > DATE_SUB(NOW(), INTERVAL 2 HOUR)
            GROUP BY driverId
          ) latest ON dl.driverId = latest.driverId AND dl.timestamp = latest.maxTs
          LEFT JOIN users u ON dl.driverId = u.id
          LEFT JOIN loads l ON dl.loadId = l.id
          ORDER BY dl.timestamp DESC
        `);
        return (locations[0] as any[]).map((row: any) => ({
          driverId: row.driverId,
          driverName: row.driverName,
          fleetType: row.fleetType ?? "internal",
          profileImageUrl: row.profileImageUrl,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          speed: row.speed ? Number(row.speed) : null,
          heading: row.heading ? Number(row.heading) : null,
          timestamp: row.timestamp,
          activeLoad: row.loadClientName ? {
            clientName: row.loadClientName,
            destination: row.loadDestination,
            status: row.loadStatus,
          } : null,
        }));
      } catch {
        return [];
      }
    }),
  // Update any user's role (owner-only)
  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["owner", "admin", "driver"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario puede cambiar roles" });
      }
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const target = await db.select().from(usersTable).where(eq(usersTable.id, input.userId)).limit(1).then(r => r[0]);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      await db.update(usersTable).set({ role: input.role }).where(eq(usersTable.id, input.userId));
      return { success: true, message: `Rol de ${target.name || target.email} actualizado a ${input.role}` };
    }),
  // List all users (owner/admin only)
  listAllUsers: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      }
      const db = await getDb();
      if (!db) return [];
      const allUsers = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        lastSignedIn: usersTable.lastSignedIn,
      }).from(usersTable);
      return allUsers;
    }),
});

// ─── POD Router ───────────────────────────────────────────────────────────────

const podRouter = router({
  upload: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      assignmentId: z.number().optional(),
      documentUrl: z.string().url().optional(),
      documentKey: z.string(),
      fileName: z.string(),
      fileSize: z.number().positive(),
      mimeType: z.string(),
      fileBase64: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validar que el chofer es el asignado a esta carga
      const load = await getLoadById(input.loadId);
      if (!load) throw new Error("Carga no encontrada");
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (load.assignedDriverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para subir POD de esta carga" });
      }

      let documentUrl = input.documentUrl || "";
      if (input.fileBase64) {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const result = await storagePut(input.documentKey, buffer, input.mimeType);
        documentUrl = result.url;
      }

      if (!documentUrl) {
        throw new Error("No se pudo generar URL del documento");
      }

      await uploadPOD({
        loadId: input.loadId,
        driverId: ctx.user.id,
        assignmentId: input.assignmentId,
        documentUrl,
        documentKey: input.documentKey,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      });

      // Notificar al gestor
      await notifyOwner({
        title: "Comprobante de Entrega Subido",
        content: `${ctx.user.name} subio POD para carga #${input.loadId} (${load.clientName})`,
      });

      return { success: true };
    }),

  getByLoad: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(({ input }) => getPODsByLoadId(input.loadId)),

  getByDriver: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (input.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estos PODs" });
      }
      return getPODsByDriverId(input.driverId);
    }),

  delete: protectedProcedure
    .input(z.object({ podId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const pod = await getPODById(input.podId);
      if (!pod) throw new Error("POD no encontrado");
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (pod.driverId !== ctx.user.id && !isPrivileged) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para eliminar este POD" });
      }

      await deletePOD(input.podId);
      return { success: true };
    }),
});

// ─── Profile Router ──────────────────────────────────────────────────────────

const profileRouter = router({
  getProfile: publicProcedure.query(async () => {
    try {
      const { getUserProfile, getOrCreateUserPreferences } = await import("./db");

      const fallbackUserId = 1;
      const profile = await getUserProfile(fallbackUserId);
      const preferences = await getOrCreateUserPreferences(fallbackUserId);

      return { profile, preferences };
    } catch (error) {
      console.error("[profile.getProfile] error:", error);
      return {
        profile: {
          name: "WV Admin",
          phone: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          bio: "",
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
          notifyOnLoadAssignment: true,
          notifyOnLoadStatus: true,
          notifyOnPayment: true,
          notifyOnMessage: true,
          notifyOnBonus: true,
          theme: "dark",
          language: "es",
          timezone: "America/New_York",
          showOnlineStatus: true,
          allowLocationTracking: false,
        },
      };
    }
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      profileImageUrl: z.string().optional(),
      bio: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { updateUserProfile } = await import("./db");
      await updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),

  updatePreferences: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      notifyOnLoadAssignment: z.boolean().optional(),
      notifyOnLoadStatus: z.boolean().optional(),
      notifyOnPayment: z.boolean().optional(),
      notifyOnMessage: z.boolean().optional(),
      notifyOnBonus: z.boolean().optional(),
      theme: z.enum(["dark", "light", "auto"]).optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
      showOnlineStatus: z.boolean().optional(),
      allowLocationTracking: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { updateUserPreferences } = await import("./db");
      await updateUserPreferences(ctx.user.id, input);
      return { success: true };
    }),
});

// ─── Security Monitoring Router ──────────────────────────────────────────────

const securityMonitoringRouter = router({
  // Rate limiting statistics (admin only)
  getRateLimitStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para acceder a estas estadísticas" });
    }
    return getRateLimitStats();
  }),

  // Reset rate limit for a host (admin only)
  resetRateLimitForHost: protectedProcedure
    .input(z.object({ host: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para realizar esta acción" });
      }
      const key = `ratelimit:${input.host}`;
      const success = resetRateLimitForHost(key);
      return { success };
    }),

  // Unblock a host (admin only)
  unblockHost: protectedProcedure
    .input(z.object({ host: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para realizar esta acción" });
      }
      const key = `ratelimit:${input.host}`;
      const success = unblockHost(key);
      return { success };
    }),

  // Get host rejection statistics (admin only)
  getHostRejectionStats: protectedProcedure
    .input(z.object({ host: z.string() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para acceder a estas estadísticas" });
      }
      return getHostRejectionStats(input.host);
    }),

  // Get all rejection statistics (admin only)
  getAllRejectionStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para acceder a estas estadísticas" });
    }
    return getAllRejectionStats();
  }),

  // Get rejection history (admin only)
  getRejectionHistory: protectedProcedure
    .input(
      z.object({
        host: z.string().optional(),
        limit: z.number().optional(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para acceder a estos datos" });
      }
      return getRejectionHistory(input);
    }),

  // Get top rejected hosts (admin only)
  getTopRejectedHosts: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para acceder a estas estadísticas" });
      }
      return getTopRejectedHosts(input.limit);
    }),

  // Clear host stats (admin only)
  clearHostStats: protectedProcedure
    .input(z.object({ host: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para realizar esta acción" });
      }
      const success = clearHostStats(input.host);
      return { success };
    }),
});

// ─── Contact Router ──────────────────────────────────────────────────────────

const contactRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nombre requerido"),
        company: z.string().optional(),
        email: z.string().email("Email inválido"),
        message: z.string().min(10, "Mensaje debe tener al menos 10 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Save to database
        await createContactSubmission({
          name: input.name,
          company: input.company || null,
          email: input.email,
          message: input.message,
          status: "new",
        });

        // Send confirmation email to user
        const confirmationHtml = `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px; border-radius: 8px;"><h2 style="color: #0074D9;">Gracias por tu solicitud</h2><p>Hola ${input.name},</p><p>Hemos recibido tu solicitud de contacto. Nos pondremos en contacto contigo pronto.</p><p><strong>Tu mensaje:</strong><br/>${input.message}</p><p>Si tienes preguntas urgentes: wascardely@gmail.com | +1 (973) 955-8328</p><p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">WV Transport Control</p></div>`;

        await sendEmail(
          input.email,
          "Confirmación de tu solicitud - WV Transport",
          confirmationHtml,
          "Gracias por tu solicitud. Nos pondremos en contacto pronto."
        );

        // Send notification email to owner
        const primaryEmail = getAdminEmail();
        const ownerNotificationHtml = `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px; border-radius: 8px;"><h2 style="color: #001F3F;">Nueva Solicitud de Contacto</h2><p><strong>De:</strong> ${input.name}</p><p><strong>Email:</strong> ${input.email}</p><p><strong>Empresa:</strong> ${input.company || "No especificada"}</p><p><strong>Mensaje:</strong><br/>${input.message}</p><p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">Recibido el: ${new Date().toLocaleString("es-ES")}</p></div>`;

        await sendEmail(
          primaryEmail,
          `Nueva Solicitud de Contacto de ${input.name}`,
          ownerNotificationHtml,
          `Nueva solicitud de ${input.name} (${input.email})`
        );

        // Also send to notifyOwner for backup notification
        await notifyOwner({
          title: "Nueva Solicitud de Contacto",
          content: `De: ${input.name} (${input.email})\nEmpresa: ${input.company || "No especificada"}\n\nMensaje:\n${input.message}`,
        });

        return {
          success: true,
          message: "Solicitud enviada exitosamente. Nos pondremos en contacto pronto.",
        };
      } catch (error) {
        console.error("Error submitting contact form:", error);
        return {
          success: false,
          message: "Error al enviar la solicitud. Por favor intenta de nuevo.",
        };
      }
    }),

  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estas solicitudes" });
      }
      return getContactSubmissions(input.status);
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "read", "responded", "archived"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para actualizar solicitudes" });
      }
      await updateContactSubmissionStatus(
        input.id,
        input.status,
        ctx.user.id,
        input.notes
      );
      return { success: true };
    }),

  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin" && ctx.user?.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver estadísticas" });
    }
    return getContactStatistics();
  }),

  getTrends: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para ver tendencias" });
      }
      return getContactTrends(input.days || 30);
    }),
});

// ─── Broker Dashboard Router ────────────────────────────────────────────────
const brokerDashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
    if (!isPrivileged) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
    return getBrokerStats();
  }),

  getDispatcherKPIs: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input, ctx }) => {
      const isPrivileged = ctx.user.role === "admin" || ctx.user.role === "owner";
      if (!isPrivileged) throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso" });
      return getDispatcherKPIs(input.year, input.month);
    }),
});

// ─── Driver Feedback Router ───────────────────────────────────────────────────
const driverFeedbackRouter = router({
  submit: protectedProcedure
    .input(z.object({
      loadId: z.number(),
      trafficRating: z.number().min(1).max(5),
      difficultyRating: z.number().min(1).max(5),
      estimatedMinutes: z.number().optional(),
      actualMinutes: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return submitDriverFeedback({
        loadId: input.loadId,
        driverId: ctx.user.id,
        trafficRating: input.trafficRating,
        difficultyRating: input.difficultyRating,
        estimatedMinutes: input.estimatedMinutes,
        actualMinutes: input.actualMinutes,
        notes: input.notes,
      });
    }),

  getByLoad: protectedProcedure
    .input(z.object({ loadId: z.number() }))
    .query(async ({ input }) => {
      return getDriverFeedbackByLoad(input.loadId);
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  financial: financialRouter,
  financialExtended: financialExtendedRouter,
  system: systemRouter,
  ai: aiRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // Also clear the email/password session cookie
      ctx.res.clearCookie("wv_session", { path: "/", maxAge: -1 });
      return { success: true } as const;
    }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const user = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1).then(rows => rows[0]);
        if (!user) return { success: true, message: "Si el email existe, recibirás un enlace de recuperación" };
        const token = generateResetToken();
        const expiresAt = getTokenExpirationTime();
        const { passwordResetTokens } = await import("../drizzle/schema");
        await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });
        const resetLink = `${process.env.VITE_OAUTH_PORTAL_URL || "http://localhost:3000"}/reset-password?token=${token}`;
        await sendPasswordResetEmail(user.email || "", user.name || "Usuario", resetLink);
        return { success: true, message: "Si el email existe, recibirás un enlace de recuperación" };
      }),
    validateResetToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { passwordResetTokens } = await import("../drizzle/schema");
        const resetToken = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, input.token)).limit(1).then(rows => rows[0]);
        if (!resetToken) return { valid: false, error: "Token inválido o expirado" };
        if (isTokenExpired(resetToken.expiresAt)) return { valid: false, error: "El token ha expirado" };
        if (resetToken.usedAt) return { valid: false, error: "Este token ya fue utilizado" };
        return { valid: true, userId: resetToken.userId };
      }),
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { passwordResetTokens } = await import("../drizzle/schema");
        const resetToken = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, input.token)).limit(1).then(rows => rows[0]);
        if (!resetToken || isTokenExpired(resetToken.expiresAt) || resetToken.usedAt) throw new Error("Token inválido");
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, resetToken.userId));
        await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));
        await logPasswordReset(resetToken.userId, ctx.req.ip, ctx.req.headers["user-agent"] as string);
        return { success: true, message: "Contraseña actualizada" };
      }),
    driverLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const result = await driverLogin({ email: input.email, password: input.password, ipAddress: ctx.req.ip, userAgent: ctx.req.headers["user-agent"] as string });
        // Set wv_session cookie so subsequent tRPC requests are authenticated
        const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
        const isSecure = ctx.req.protocol === "https" || ctx.req.headers["x-forwarded-proto"] === "https";
        ctx.res.cookie("wv_session", result.token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? "none" : "lax",
          maxAge: ONE_YEAR_MS,
          path: "/",
        });
        return result;
      }),
    getPasswordAuditHistory: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "owner") throw new Error("No autorizado");
      return await getPasswordAuditHistory(ctx.user.id, 20);
    }),
  }),
  contact: contactRouter,
  loads: loadsRouter,
  finance: financeRouter,
  partnership: partnershipRouter,
  driver: driverRouter,
  driverStats: driverStatsRouter,
  dashboard: dashboardRouter,
  assignment: assignmentRouter,
  pod: podRouter,
  bankTransaction: bankTransactionRouter,
  plaid: plaidRouter,
  quotation: quotationRouter,
  geocoding: geocodingRouter,
  routes: routesRouter,
  multiStop: multiStopRouter,
  location: locationRouter,
  payment: paymentRouter,
  batchPayment: batchPaymentRouter,
  export: exportRouter,
  businessConfig: businessConfigRouter,
  priceAlerts: priceAlertsRouter,
  brokerLoads: brokerLoadsRouter,
  loadEvaluator: loadEvaluatorRouter,
  taxCompliance: taxComplianceRouter,
  ocr: ocrRouter,
  ocrStorage: ocrStorageRouter,
  irsCompliance: irsComplianceRouter,
  advancedSearch: advancedSearchRouter,
  chat: chatRouter,
  analytics: analyticsRouter,
  admin: adminRouter,
  profile: profileRouter,
  securityMonitoring: securityMonitoringRouter,
  brokerDashboard: brokerDashboardRouter,
  driverFeedback: driverFeedbackRouter,
  wallet: walletRouter,
  settlement: settlementRouter,
  quoteAnalysis: quoteAnalysisRouter,
  invoicing: invoicingRouter,
  alertsAndTasks: alertsAndTasksRouter,
  company: companyRouter,
});

export type AppRouter = typeof appRouter;
