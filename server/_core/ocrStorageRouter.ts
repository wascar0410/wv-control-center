import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import {
  saveOcrDocumentToS3,
  getOcrDocument,
  getUserOcrDocuments,
  searchOcrDocuments,
  getOcrAuditTrail,
  generateTaxAuditReport,
} from "../db-ocr-storage";

export const ocrStorageRouter = router({
  /**
   * Save OCR document to S3 and database
   */
  saveDocument: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string().describe("Base64 encoded image data"),
        originalFileName: z.string().describe("Original file name"),
        vendor: z.string().nullable().optional().describe("Vendor/supplier name"),
        invoiceDate: z.string().nullable().optional().describe("Invoice date"),
        amount: z.number().nullable().optional().describe("Invoice amount"),
        category: z.enum([
          "fuel",
          "maintenance",
          "tolls",
          "insurance",
          "parking",
          "meals",
          "supplies",
          "utilities",
          "equipment",
          "other",
        ]).describe("Expense category"),
        description: z.string().nullable().optional().describe("Description"),
        ocrConfidence: z.number().describe("OCR confidence score (0-1)"),
        rawOcrText: z.string().describe("Raw OCR extracted text"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await saveOcrDocumentToS3({
        userId: ctx.user.id,
        imageBase64: input.imageBase64,
        originalFileName: input.originalFileName,
        vendor: input.vendor || null,
        invoiceDate: input.invoiceDate || null,
        amount: input.amount || null,
        category: input.category,
        description: input.description || null,
        ocrConfidence: input.ocrConfidence,
        rawOcrText: input.rawOcrText,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to save document");
      }

      return {
        success: true,
        documentId: result.documentId,
        s3Url: result.s3Url,
      };
    }),

  /**
   * Get specific OCR document
   */
  getDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const doc = await getOcrDocument(input.documentId);

      if (!doc) {
        throw new Error("Document not found");
      }

      // Verify ownership
      if (doc.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      return doc;
    }),

  /**
   * Get all OCR documents for current user with pagination
   */
  getUserDocuments: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await getUserOcrDocuments(ctx.user.id, input.limit, input.offset);
      return result;
    }),

  /**
   * Search OCR documents with filters
   */
  searchDocuments: protectedProcedure
    .input(
      z.object({
        category: z.string().optional().describe("Filter by category"),
        minAmount: z.number().optional().describe("Minimum amount"),
        maxAmount: z.number().optional().describe("Maximum amount"),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await searchOcrDocuments(ctx.user.id, {
        category: input.category,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount,
      });

      return results;
    }),

  /**
   * Get audit trail for a document
   */
  getAuditTrail: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership first
      const doc = await getOcrDocument(input.documentId);
      if (!doc || doc.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      const trail = await getOcrAuditTrail(input.documentId);
      return trail;
    }),

  /**
   * Generate tax audit report for date range
   */
  generateTaxReport: protectedProcedure
    .input(
      z.object({
        startDate: z.date().describe("Report start date"),
        endDate: z.date().describe("Report end date"),
      })
    )
    .query(async ({ ctx, input }) => {
      const report = await generateTaxAuditReport(
        ctx.user.id,
        input.startDate,
        input.endDate
      );

      return {
        totalDocuments: report.totalDocuments,
        totalAmount: report.totalAmount,
        byCategory: report.byCategory,
        documentCount: report.documents.length,
        dateRange: {
          start: input.startDate.toISOString(),
          end: input.endDate.toISOString(),
        },
      };
    }),

  /**
   * Get summary statistics for OCR documents
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    // Get all documents for the current year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const endOfYear = new Date(new Date().getFullYear(), 11, 31);

    const report = await generateTaxAuditReport(ctx.user.id, startOfYear, endOfYear);

    const categoryStats = Object.entries(report.byCategory).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      average: data.count > 0 ? data.amount / data.count : 0,
    }));

    return {
      totalDocuments: report.totalDocuments,
      totalAmount: report.totalAmount,
      averageAmount: report.totalDocuments > 0 ? report.totalAmount / report.totalDocuments : 0,
      categoryStats,
      yearToDate: {
        start: startOfYear.toISOString(),
        end: endOfYear.toISOString(),
      },
    };
  }),

  /**
   * Get documents by category
   */
  getByCategory: protectedProcedure
    .input(
      z.object({
        category: z.enum([
          "fuel",
          "maintenance",
          "tolls",
          "insurance",
          "parking",
          "meals",
          "supplies",
          "utilities",
          "equipment",
          "other",
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await searchOcrDocuments(ctx.user.id, {
        category: input.category,
      });

      return {
        category: input.category,
        documents: results,
        count: results.length,
        totalAmount: results.reduce((sum: number, doc: any) => {
          return sum + (doc.amount ? parseFloat(doc.amount.toString()) : 0);
        }, 0),
      };
    }),

  /**
   * Get high-confidence documents (OCR confidence > 0.8)
   */
  getHighConfidenceDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { documents } = await getUserOcrDocuments(ctx.user.id, 1000, 0);

    const highConfidence = documents.filter((doc: any) => {
      const confidence = doc.ocrConfidence ? parseFloat(doc.ocrConfidence.toString()) : 0;
      return confidence > 0.8;
    });

    return {
      totalDocuments: documents.length,
      highConfidenceCount: highConfidence.length,
      highConfidencePercentage:
        documents.length > 0 ? (highConfidence.length / documents.length) * 100 : 0,
      documents: highConfidence,
    };
  }),

  /**
   * Get low-confidence documents that need review (OCR confidence < 0.7)
   */
  getLowConfidenceDocuments: protectedProcedure.query(async ({ ctx }) => {
    const { documents } = await getUserOcrDocuments(ctx.user.id, 1000, 0);

    const lowConfidence = documents.filter((doc: any) => {
      const confidence = doc.ocrConfidence ? parseFloat(doc.ocrConfidence.toString()) : 0;
      return confidence < 0.7;
    });

    return {
      totalDocuments: documents.length,
      lowConfidenceCount: lowConfidence.length,
      needsReviewPercentage:
        documents.length > 0 ? (lowConfidence.length / documents.length) * 100 : 0,
      documents: lowConfidence,
    };
  }),
});
