import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import {
  createExportLog,
  getExportLogs,
  updateExportLog,
  getTransactionsForExport,
  getLoadsForExport,
  getPaymentsForExport,
} from "../db";
import { storagePut } from "../storage";

export const exportRouter = router({
  /**
   * Export transactions to Excel/CSV/PDF
   */
  exportTransactions: protectedProcedure
    .input(
      z.object({
        format: z.enum(["excel", "csv", "pdf", "json"]),
        startDate: z.date(),
        endDate: z.date(),
        category: z.string().optional(),
        type: z.enum(["income", "expense"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        // Get transactions
        const transactions = await getTransactionsForExport({
          startDate: input.startDate,
          endDate: input.endDate,
          category: input.category,
          type: input.type,
        });

        if (transactions.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No transactions found for the selected date range",
          });
        }

        // Create export log
        const exportLog = await createExportLog({
          exportType: "transactions",
          format: input.format,
          startDate: input.startDate.toISOString().split("T")[0],
          endDate: input.endDate.toISOString().split("T")[0],
          recordCount: transactions.length,
          exportedBy: ctx.user.id,
          filters: JSON.stringify({
            category: input.category,
            type: input.type,
          }),
          status: "pending",
        });

        const exportId = typeof exportLog === "object" && "insertId" in exportLog 
          ? (exportLog as any).insertId 
          : 0;

        // Format data based on format type
        let fileContent = "";
        let contentType = "text/plain";
        let fileName = `transactions-${new Date().toISOString().split("T")[0]}`;

        if (input.format === "csv") {
          contentType = "text/csv";
          fileName += ".csv";
          fileContent = formatTransactionsCSV(transactions);
        } else if (input.format === "json") {
          contentType = "application/json";
          fileName += ".json";
          fileContent = JSON.stringify(transactions, null, 2);
        } else if (input.format === "excel") {
          contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          fileName += ".xlsx";
          // For Excel, we would use a library like xlsx
          fileContent = formatTransactionsCSV(transactions);
        }

        // Upload to S3
        const { url } = await storagePut(
          `exports/${ctx.user.id}/transactions-${exportId}`,
          fileContent,
          contentType
        );

        // Update export log with file URL
        await updateExportLog(exportId, {
          fileUrl: url,
          fileSize: fileContent.length,
          status: "completed",
          completedAt: new Date(),
        });

        return {
          success: true,
          exportId,
          fileUrl: url,
          fileName,
          recordCount: transactions.length,
        };
      } catch (error) {
        console.error("[Export] Error exporting transactions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export transactions",
        });
      }
    }),

  /**
   * Export loads to Excel/CSV/PDF
   */
  exportLoads: protectedProcedure
    .input(
      z.object({
        format: z.enum(["excel", "csv", "pdf", "json"]),
        startDate: z.date(),
        endDate: z.date(),
        status: z.string().optional(),
        driverId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        const loads = await getLoadsForExport({
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
          driverId: input.driverId,
        });

        if (loads.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No loads found for the selected date range",
          });
        }

        const exportLog = await createExportLog({
          exportType: "loads",
          format: input.format,
          startDate: input.startDate.toISOString().split("T")[0],
          endDate: input.endDate.toISOString().split("T")[0],
          recordCount: loads.length,
          exportedBy: ctx.user.id,
          filters: JSON.stringify({
            status: input.status,
            driverId: input.driverId,
          }),
          status: "pending",
        });

        const exportId = typeof exportLog === "object" && "insertId" in exportLog 
          ? (exportLog as any).insertId 
          : 0;

        let fileContent = "";
        let contentType = "text/plain";
        let fileName = `loads-${new Date().toISOString().split("T")[0]}`;

        if (input.format === "csv") {
          contentType = "text/csv";
          fileName += ".csv";
          fileContent = formatLoadsCSV(loads);
        } else if (input.format === "json") {
          contentType = "application/json";
          fileName += ".json";
          fileContent = JSON.stringify(loads, null, 2);
        }

        const { url } = await storagePut(
          `exports/${ctx.user.id}/loads-${exportId}`,
          fileContent,
          contentType
        );

        await updateExportLog(exportId, {
          fileUrl: url,
          fileSize: fileContent.length,
          status: "completed",
          completedAt: new Date(),
        });

        return {
          success: true,
          exportId,
          fileUrl: url,
          fileName,
          recordCount: loads.length,
        };
      } catch (error) {
        console.error("[Export] Error exporting loads:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export loads",
        });
      }
    }),

  /**
   * Export payments to Excel/CSV/PDF
   */
  exportPayments: protectedProcedure
    .input(
      z.object({
        format: z.enum(["excel", "csv", "pdf", "json"]),
        startDate: z.date(),
        endDate: z.date(),
        status: z.string().optional(),
        driverId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        const payments = await getPaymentsForExport({
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
          driverId: input.driverId,
        });

        if (payments.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No payments found for the selected date range",
          });
        }

        const exportLog = await createExportLog({
          exportType: "payments",
          format: input.format,
          startDate: input.startDate.toISOString().split("T")[0],
          endDate: input.endDate.toISOString().split("T")[0],
          recordCount: payments.length,
          exportedBy: ctx.user.id,
          filters: JSON.stringify({
            status: input.status,
            driverId: input.driverId,
          }),
          status: "pending",
        });

        const exportId = typeof exportLog === "object" && "insertId" in exportLog 
          ? (exportLog as any).insertId 
          : 0;

        let fileContent = "";
        let contentType = "text/plain";
        let fileName = `payments-${new Date().toISOString().split("T")[0]}`;

        if (input.format === "csv") {
          contentType = "text/csv";
          fileName += ".csv";
          fileContent = formatPaymentsCSV(payments);
        } else if (input.format === "json") {
          contentType = "application/json";
          fileName += ".json";
          fileContent = JSON.stringify(payments, null, 2);
        }

        const { url } = await storagePut(
          `exports/${ctx.user.id}/payments-${exportId}`,
          fileContent,
          contentType
        );

        await updateExportLog(exportId, {
          fileUrl: url,
          fileSize: fileContent.length,
          status: "completed",
          completedAt: new Date(),
        });

        return {
          success: true,
          exportId,
          fileUrl: url,
          fileName,
          recordCount: payments.length,
        };
      } catch (error) {
        console.error("[Export] Error exporting payments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export payments",
        });
      }
    }),

  /**
   * Get export history
   */
  getExportHistory: protectedProcedure
    .input(
      z.object({
        exportType: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const exports = await getExportLogs({
        exportType: input.exportType,
        status: input.status,
        limit: input.limit,
      });

      return exports.map((exp) => ({
        id: exp.id,
        exportType: exp.exportType,
        format: exp.format,
        recordCount: exp.recordCount,
        fileUrl: exp.fileUrl,
        status: exp.status,
        createdAt: exp.createdAt,
        completedAt: exp.completedAt,
      }));
    }),
});

// Helper functions for CSV formatting
function formatTransactionsCSV(transactions: any[]): string {
  const headers = ["ID", "Tipo", "Categoría", "Monto", "Descripción", "Fecha", "Creado"];
  const rows = transactions.map((t) => [
    t.id,
    t.type,
    t.category,
    t.amount,
    t.description || "",
    new Date(t.transactionDate).toLocaleDateString(),
    new Date(t.createdAt).toLocaleDateString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  return csv;
}

function formatLoadsCSV(loads: any[]): string {
  const headers = [
    "ID",
    "Cliente",
    "Origen",
    "Destino",
    "Peso",
    "Precio",
    "Margen Neto",
    "Estado",
    "Chofer",
    "Fecha Creación",
  ];
  const rows = loads.map((l) => [
    l.id,
    l.clientName,
    l.pickupAddress,
    l.deliveryAddress,
    l.weight,
    l.price,
    l.netMargin || 0,
    l.status,
    l.assignedDriverId || "",
    new Date(l.createdAt).toLocaleDateString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  return csv;
}

function formatPaymentsCSV(payments: any[]): string {
  const headers = ["ID", "Chofer", "Carga", "Monto", "Estado", "Método", "Procesado", "Creado"];
  const rows = payments.map((p) => [
    p.id,
    p.driverId,
    p.loadId,
    p.amount,
    p.status,
    p.paymentMethod,
    p.processedAt ? new Date(p.processedAt).toLocaleDateString() : "",
    new Date(p.createdAt).toLocaleDateString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  return csv;
}
