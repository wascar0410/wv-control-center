import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
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
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users as usersTable } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
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
    return getBankAccountsByUserId(ctx.user.id);
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
      const account = await getBankAccountById(input.bankAccountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Cuenta no encontrada");
      }
      return getTransactionImportsByBankAccount(input.bankAccountId, input.limit);
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
        throw new Error("No tienes permiso");
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
        throw new Error("No tienes permiso");
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
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver estas estadísticas");
      }
      return getDriverStats(input.driverId);
    }),

  getMonthlyTrends: protectedProcedure
    .input(z.object({ driverId: z.number(), months: z.number().min(1).max(24).default(6) }))
    .query(async ({ input, ctx }) => {
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver estas estadísticas");
      }
      return getDriverMonthlyTrends(input.driverId, input.months);
    }),

  getRecentDeliveries: protectedProcedure
    .input(z.object({ driverId: z.number(), limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input, ctx }) => {
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver estas entregas");
      }
      return getDriverRecentDeliveries(input.driverId, input.limit);
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
        return await getLoads(input);
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
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createLoad({
        ...input,
        price: String(input.price) as any,
        weight: String(input.weight) as any,
        estimatedFuel: String(input.estimatedFuel) as any,
        estimatedTolls: String(input.estimatedTolls) as any,
        pickupLat: input.pickupLat ? String(input.pickupLat) as any : undefined,
        pickupLng: input.pickupLng ? String(input.pickupLng) as any : undefined,
        deliveryLat: input.deliveryLat ? String(input.deliveryLat) as any : undefined,
        deliveryLng: input.deliveryLng ? String(input.deliveryLng) as any : undefined,
        pickupDate: input.pickupDate ? new Date(input.pickupDate) : undefined,
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : undefined,
        createdBy: ctx.user.id,
      });
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
      if (load.assignedDriverId !== ctx.user.id) {
        throw new Error("No tienes permiso para aceptar esta carga");
      }
      
      await updateLoad(input.loadId, {
        driverAcceptedAt: new Date(),
        status: "in_transit",
      });
      
      await notifyOwner({
        title: "✅ Chofer Aceptó Carga",
        content: `${ctx.user.email} aceptó la carga #${input.loadId} de ${load.clientName}. Estado: En Tránsito`,
      });
      
      return { success: true };
    }),

  rejectLoad: protectedProcedure
    .input(z.object({ 
      loadId: z.number(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const load = await getLoadById(input.loadId);
      if (!load) throw new Error("Carga no encontrada");
      if (load.assignedDriverId !== ctx.user.id) {
        throw new Error("No tienes permiso para rechazar esta carga");
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

// ─── Finance Router ───────────────────────────────────────────────────────────

const financeRouter = router({
  transactions: protectedProcedure
    .input(z.object({
      type: z.enum(["income", "expense"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(({ input }) =>
      getTransactions({
        type: input?.type,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
      })
    ),

  addExpense: protectedProcedure
    .input(z.object({
      category: z.enum(["fuel", "maintenance", "insurance", "subscriptions", "phone", "payroll", "tolls", "other"]),
      amount: z.number().positive(),
      description: z.string().optional(),
      receiptBase64: z.string().optional(),
      receiptFileName: z.string().optional(),
      transactionDate: z.string().optional(),
    }))
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
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
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

summary: publicProcedure
  .input(z.object({ year: z.number(), month: z.number() }))
  .query(async ({ input }) => {
    try {
      return await getFinancialSummary(input.year, input.month);
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

cashFlow: publicProcedure
  .input(z.object({ year: z.number() }))
  .query(async ({ input }) => {
    try {
      return await getMonthlyCashFlow(input.year);
    } catch (error) {
      console.error("[finance.cashFlow] error:", error);
      return [];
    }
  }),

// ─── Partnership Router ───────────────────────────────────────────────────────

const partnershipRouter = router({
  list: protectedProcedure.query(() => getPartners()),

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
      if (data.participationPercent !== undefined) updateData.participationPercent = String(data.participationPercent);
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

  distribution: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ input }) => {
      const [partners, summary] = await Promise.all([
        getPartners(),
        getFinancialSummary(input.year, input.month),
      ]);
      const payroll = summary.byCategory.find((c) => c.category === "payroll")?.total ?? 0;
      const netAfterPayroll = summary.netProfit - payroll;
      return {
        grossIncome: summary.income,
        totalExpenses: summary.expenses,
        payroll,
        netProfit: summary.netProfit,
        netAfterPayroll,
        partners: partners.map((p) => ({
          ...p,
          distribution: (netAfterPayroll * parseFloat(String(p.participationPercent))) / 100,
        })),
      };
    }),
});

// ─── Driver Router ────────────────────────────────────────────────────────────

const driverRouter = router({
  myLoads: protectedProcedure.query(({ ctx }) => {
    // Admins see all loads, drivers see only their assigned loads
    if (ctx.user.role === 'admin') {
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
            content: `La carga #${load.id} de ${load.clientName} ha sido entregada. Dirección: ${load.deliveryAddress}`,
          });
        }
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
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver estas estadísticas");
      }
      return await getDriverStatsForView(input.driverId);
    }),

  getLoads: protectedProcedure
    .input(z.object({
      driverId: z.number(),
      status: z.enum(["available", "in_transit", "delivered"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver estas cargas");
      }
      return await getDriverLoads(input.driverId, input.status);
    }),

  getLoadDetails: protectedProcedure
    .input(z.object({ loadId: z.number(), driverId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver este detalle");
      }
      return await getLoadDetailsForDriver(input.loadId, input.driverId);
    }),

  getNextPriority: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso");
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
      if (!load && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver esto");
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
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver estas ganancias");
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
        throw new Error("No tienes permiso para actualizar ubicación");
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
      if (driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver esta ubicación");
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
      if (!load && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver esta ubicación");
      }

      try {
        const { getLatestLocationForLoad } = await import("./db-location-tracking");
        return await getLatestLocationForLoad(input.loadId);
      } catch (error) {
        console.error("[Get Load Location] Error:", error);
        return null;
      }
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
      if (assignment.driverId !== ctx.user.id) throw new Error("No tienes permiso para aceptar esta carga");
      
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
      if (assignment.driverId !== ctx.user.id) throw new Error("No tienes permiso para rechazar esta carga");
      
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
        throw new Error("No tienes permiso para verificar emails");
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
    }))
    .mutation(async ({ input, ctx }) => {
      // Only owner and admin can create drivers
      if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para crear choferes");
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
      const openId = `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newDriver = await db.insert(usersTable).values({
        openId,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "driver",
        loginMethod: "manual",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }).$returningId();

      await notifyOwner({
        title: "Nuevo Chofer Agregado",
        content: `Se agregó un nuevo chofer: ${input.name} (${input.email})`,
      });

      return {
        success: true,
        driver: {
          id: newDriver[0].id,
          name: input.name,
          email: input.email,
          role: "driver",
        },
        message: `Chofer ${input.name} creado exitosamente`,
      };
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
      if (load.assignedDriverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para subir POD de esta carga");
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
      if (input.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para ver estos PODs");
      }
      return getPODsByDriverId(input.driverId);
    }),

  delete: protectedProcedure
    .input(z.object({ podId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const pod = await getPODById(input.podId);
      if (!pod) throw new Error("POD no encontrado");
      if (pod.driverId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permiso para eliminar este POD");
      }

      await deletePOD(input.podId);
      return { success: true };
    }),
});

// ─── Profile Router ──────────────────────────────────────────────────────────

const profileRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { getUserProfile, getUserPreferences, getOrCreateUserPreferences } = await import("./db");
    const profile = await getUserProfile(ctx.user.id);
    const preferences = await getOrCreateUserPreferences(ctx.user.id);
    return { profile, preferences };
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
      throw new Error("No tienes permiso para acceder a estas estadísticas");
    }
    return getRateLimitStats();
  }),

  // Reset rate limit for a host (admin only)
  resetRateLimitForHost: protectedProcedure
    .input(z.object({ host: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new Error("No tienes permiso para realizar esta acción");
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
        throw new Error("No tienes permiso para realizar esta acción");
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
        throw new Error("No tienes permiso para acceder a estas estadísticas");
      }
      return getHostRejectionStats(input.host);
    }),

  // Get all rejection statistics (admin only)
  getAllRejectionStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
      throw new Error("No tienes permiso para acceder a estas estadísticas");
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
        throw new Error("No tienes permiso para acceder a estos datos");
      }
      return getRejectionHistory(input);
    }),

  // Get top rejected hosts (admin only)
  getTopRejectedHosts: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new Error("No tienes permiso para acceder a estas estadísticas");
      }
      return getTopRejectedHosts(input.limit);
    }),

  // Clear host stats (admin only)
  clearHostStats: protectedProcedure
    .input(z.object({ host: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "owner" && ctx.user?.role !== "admin") {
        throw new Error("No tienes permiso para realizar esta acción");
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
        throw new Error("No tienes permiso para ver estas solicitudes");
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
        throw new Error("No tienes permiso para actualizar solicitudes");
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
      throw new Error("No tienes permiso para ver estadísticas");
    }
    return getContactStatistics();
  }),

  getTrends: protectedProcedure
    .input(z.object({ days: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "owner") {
        throw new Error("No tienes permiso para ver tendencias");
      }
      return getContactTrends(input.days || 30);
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
        return await driverLogin({ email: input.email, password: input.password, ipAddress: ctx.req.ip, userAgent: ctx.req.headers["user-agent"] as string });
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
  admin: adminRouter,
  profile: profileRouter,
  securityMonitoring: securityMonitoringRouter,
});

export type AppRouter = typeof appRouter;
