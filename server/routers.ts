import { TRPCError } from "@trpc/server";
import { z } from "zod";
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
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { getMonthlyProjections } from "./db-projections";
import { getHistoricalComparison } from "./db-historical-comparison";
import { getQuarterlyComparison } from "./db-quarterly-comparison";
import { getAnnualComparison } from "./db-annual-comparison";
import {
  createLoad, createOwnerDraw, createPartner, createTransaction, createFuelLog,
  deleteLoad, getDashboardKPIs, getFinancialSummary, getFuelLogs, getLoadById,
  getLoads, getMonthlyCashFlow, getOwnerDraws, getPartners, getTransactions,
  updateLoad, updateLoadStatus, updatePartner, getDrawsByPeriod, getAllDrivers,
  createLoadAssignment, getLoadAssignments, getAssignmentById, updateAssignmentStatus, getAvailableLoads, getPendingAssignmentsForDriver,
  uploadPOD, getPODsByLoadId, getPODsByDriverId, getPODById, deletePOD,
  getDriverStats, getDriverMonthlyTrends, getDriverRecentDeliveries,
  createBankAccount, getBankAccountsByUserId, getBankAccountById, updateBankAccount, deactivateBankAccount,
  createTransactionImport, getTransactionImportsByBankAccount, getUnmatchedTransactionImports, matchTransactionImport, deleteTransactionImport, getTransactionImportById,
} from "./db";

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
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), driverId: z.number().optional() }).optional())
    .query(({ input }) => getLoads(input)),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getLoadById(input.id)),

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

  summary: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(({ input }) => getFinancialSummary(input.year, input.month)),

  cashFlow: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(({ input }) => getMonthlyCashFlow(input.year)),
});

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
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────

const dashboardRouter = router({
  kpis: protectedProcedure.query(() => getDashboardKPIs()),
  recentLoads: protectedProcedure.query(() => getLoads()),
  monthlyProjections: protectedProcedure.query(({ ctx }) => getMonthlyProjections(ctx.user.id)),
  historicalComparison: protectedProcedure.query(({ ctx }) => getHistoricalComparison(ctx.user.id)),
  quarterlyComparison: protectedProcedure.query(({ ctx }) => getQuarterlyComparison(ctx.user.id)),
  annualComparison: protectedProcedure.query(({ ctx }) => getAnnualComparison(ctx.user.id)),
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
  }),
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
});

export type AppRouter = typeof appRouter;
