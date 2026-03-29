import { getDb } from "./db";
import { ocrDocuments, ocrAuditLog } from "../drizzle/schema";
import { storagePut } from "./storage";
import { eq, desc, gte, lte, and } from "drizzle-orm";

interface SaveOcrDocumentInput {
  userId: number;
  imageBase64: string;
  originalFileName: string;
  vendor: string | null;
  invoiceDate: string | null;
  amount: number | null;
  category: string;
  description: string | null;
  ocrConfidence: number;
  rawOcrText: string;
}

/**
 * Save OCR document to S3 and database with audit trail
 */
export async function saveOcrDocumentToS3(input: SaveOcrDocumentInput): Promise<{
  success: boolean;
  documentId?: number;
  s3Url?: string;
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    // Convert base64 to buffer
    const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique S3 key with timestamp and user ID
    const timestamp = Date.now();
    const sanitizedFileName = input.originalFileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 100);
    const s3Key = `ocr-documents/${input.userId}/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    const { url: s3Url } = await storagePut(s3Key, buffer, "image/jpeg");

    // Save to database
    const result = await db.insert(ocrDocuments).values({
      userId: input.userId,
      s3Key,
      s3Url,
      originalFileName: input.originalFileName,
      fileSize: buffer.length,
      mimeType: "image/jpeg",
      vendor: input.vendor,
      invoiceDate: input.invoiceDate,
      amount: input.amount ? parseFloat(input.amount.toString()) : null,
      category: input.category as any,
      description: input.description,
      ocrConfidence: input.ocrConfidence ? parseFloat(input.ocrConfidence.toString()) : null,
      rawOcrText: input.rawOcrText,
      processingStatus: "completed" as any,
      processedAt: new Date(),
    } as any);

    // Create audit log entry
    await db.insert(ocrAuditLog).values({
      userId: input.userId,
      ocrDocumentId: (result as any).insertId || 0,
      action: "uploaded" as any,
      actionDetails: JSON.stringify({
        fileName: input.originalFileName,
        fileSize: buffer.length,
        vendor: input.vendor,
        amount: input.amount,
        category: input.category,
        confidence: input.ocrConfidence,
      }),
      performedBy: input.userId,
    } as any);

    return {
      success: true,
      documentId: (result as any).insertId,
      s3Url,
    };
  } catch (error) {
    console.error("Error saving OCR document to S3:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get OCR document with S3 URL
 */
export async function getOcrDocument(documentId: number): Promise<any> {
  try {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(ocrDocuments)
      .where(eq(ocrDocuments.id, documentId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Error getting OCR document:", error);
    return null;
  }
}

/**
 * Get all OCR documents for a user with pagination
 */
export async function getUserOcrDocuments(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{
  documents: any[];
  total: number;
}> {
  try {
    const db = await getDb();
    if (!db) return { documents: [], total: 0 };

    const documents = await db
      .select()
      .from(ocrDocuments)
      .where(eq(ocrDocuments.userId, userId))
      .orderBy(desc(ocrDocuments.uploadedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select()
      .from(ocrDocuments)
      .where(eq(ocrDocuments.userId, userId));

    return {
      documents,
      total: countResult.length,
    };
  } catch (error) {
    console.error("Error getting user OCR documents:", error);
    return { documents: [], total: 0 };
  }
}

/**
 * Search OCR documents by category or amount range
 */
export async function searchOcrDocuments(
  userId: number,
  filters: {
    category?: string;
    minAmount?: number;
    maxAmount?: number;
  }
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const whereConditions = [eq(ocrDocuments.userId, userId)];
    if (filters.category) {
      whereConditions.push(eq(ocrDocuments.category, filters.category as any));
    }

    const results = await db
      .select()
      .from(ocrDocuments)
      .where(and(...whereConditions))
      .orderBy(desc(ocrDocuments.uploadedAt));

    // Filter by amount range in memory if needed
    if (filters.minAmount || filters.maxAmount) {
      return results.filter((doc: any) => {
        if (!doc.amount) return false;
        if (filters.minAmount && doc.amount < filters.minAmount) return false;
        if (filters.maxAmount && doc.amount > filters.maxAmount) return false;
        return true;
      });
    }

    return results;
  } catch (error) {
    console.error("Error searching OCR documents:", error);
    return [];
  }
}

/**
 * Get audit trail for a document
 */
export async function getOcrAuditTrail(documentId: number): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const auditLog = await db
      .select()
      .from(ocrAuditLog)
      .where(eq(ocrAuditLog.ocrDocumentId, documentId))
      .orderBy(desc(ocrAuditLog.timestamp));

    return auditLog;
  } catch (error) {
    console.error("Error getting OCR audit trail:", error);
    return [];
  }
}

/**
 * Generate tax audit report for a date range
 */
export async function generateTaxAuditReport(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<{
  totalDocuments: number;
  totalAmount: number;
  byCategory: Record<string, { count: number; amount: number }>;
  documents: any[];
}> {
  try {
    const db = await getDb();
    if (!db) return { totalDocuments: 0, totalAmount: 0, byCategory: {}, documents: [] };

    const documents = await db
      .select()
      .from(ocrDocuments)
      .where(
        and(
          eq(ocrDocuments.userId, userId),
          gte(ocrDocuments.uploadedAt, startDate),
          lte(ocrDocuments.uploadedAt, endDate)
        )
      );

    // Calculate statistics
    const byCategory: Record<string, { count: number; amount: number }> = {};
    let totalAmount = 0;

    for (const doc of documents as any[]) {
      if (doc.category) {
        if (!byCategory[doc.category]) {
          byCategory[doc.category] = { count: 0, amount: 0 };
        }
        byCategory[doc.category].count++;
        if (doc.amount) {
          const amount = parseFloat(doc.amount.toString());
          byCategory[doc.category].amount += amount;
          totalAmount += amount;
        }
      }
    }

    return {
      totalDocuments: documents.length,
      totalAmount,
      byCategory,
      documents,
    };
  } catch (error) {
    console.error("Error generating tax audit report:", error);
    return { totalDocuments: 0, totalAmount: 0, byCategory: {}, documents: [] };
  }
}
