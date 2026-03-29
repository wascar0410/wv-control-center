import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  saveOcrDocumentToS3,
  getOcrDocument,
  getUserOcrDocuments,
  searchOcrDocuments,
  getOcrAuditTrail,
  generateTaxAuditReport,
} from "./db-ocr-storage";

describe("OCR S3 Storage", () => {
  const testUserId = 1;
  const testImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";

  describe("saveOcrDocumentToS3", () => {
    it("should save OCR document to S3 and database", async () => {
      const result = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "invoice_001.jpg",
        vendor: "Shell Gas Station",
        invoiceDate: "2024-03-15",
        amount: 50.0,
        category: "fuel",
        description: "Fuel purchase",
        ocrConfidence: 0.95,
        rawOcrText: "Shell Gas Station Invoice Total: $50.00",
      });

      expect(result.success).toBe(true);
      expect(result.documentId).toBeDefined();
      expect(result.s3Url).toBeDefined();
      expect(result.s3Url).toContain("ocr-documents");
    });

    it("should handle invalid base64 gracefully", async () => {
      const result = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: "invalid-base64",
        originalFileName: "test.jpg",
        vendor: "Test Vendor",
        invoiceDate: "2024-03-15",
        amount: 100.0,
        category: "maintenance",
        description: "Test",
        ocrConfidence: 0.8,
        rawOcrText: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should sanitize file names for S3 key", async () => {
      const result = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "invoice@#$%^&*().jpg",
        vendor: "Test",
        invoiceDate: "2024-03-15",
        amount: 50.0,
        category: "fuel",
        description: "Test",
        ocrConfidence: 0.9,
        rawOcrText: "Test",
      });

      expect(result.success).toBe(true);
      expect(result.s3Url).toBeDefined();
      // S3 key should have sanitized filename
      expect(result.s3Url).not.toContain("@#$%^&*");
    });
  });

  describe("getOcrDocument", () => {
    it("should return null for non-existent document", async () => {
      const result = await getOcrDocument(999999);
      expect(result).toBeNull();
    });

    it("should return document details when it exists", async () => {
      // First save a document
      const saveResult = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "test_invoice.jpg",
        vendor: "Test Vendor",
        invoiceDate: "2024-03-15",
        amount: 75.0,
        category: "maintenance",
        description: "Test invoice",
        ocrConfidence: 0.85,
        rawOcrText: "Test invoice text",
      });

      if (saveResult.documentId) {
        const doc = await getOcrDocument(saveResult.documentId);
        expect(doc).not.toBeNull();
        expect(doc?.vendor).toBe("Test Vendor");
        expect(doc?.amount).toBe(75.0);
        expect(doc?.category).toBe("maintenance");
      }
    });
  });

  describe("getUserOcrDocuments", () => {
    it("should return empty list for user with no documents", async () => {
      const result = await getUserOcrDocuments(999999);
      expect(result.documents).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should return documents with pagination", async () => {
      const result = await getUserOcrDocuments(testUserId, 10, 0);
      expect(Array.isArray(result.documents)).toBe(true);
      expect(typeof result.total).toBe("number");
    });
  });

  describe("searchOcrDocuments", () => {
    it("should search documents by category", async () => {
      const result = await searchOcrDocuments(testUserId, {
        category: "fuel",
      });

      expect(Array.isArray(result)).toBe(true);
      // All results should be fuel category
      result.forEach((doc: any) => {
        if (doc.category) {
          expect(doc.category).toBe("fuel");
        }
      });
    });

    it("should search documents by amount range", async () => {
      const result = await searchOcrDocuments(testUserId, {
        minAmount: 40,
        maxAmount: 100,
      });

      expect(Array.isArray(result)).toBe(true);
      result.forEach((doc: any) => {
        if (doc.amount) {
          expect(doc.amount).toBeGreaterThanOrEqual(40);
          expect(doc.amount).toBeLessThanOrEqual(100);
        }
      });
    });

    it("should handle empty search results", async () => {
      const result = await searchOcrDocuments(testUserId, {
        category: "nonexistent_category",
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getOcrAuditTrail", () => {
    it("should return empty array for non-existent document", async () => {
      const result = await getOcrAuditTrail(999999);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should return audit trail for document", async () => {
      // Save a document first
      const saveResult = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "audit_test.jpg",
        vendor: "Audit Test",
        invoiceDate: "2024-03-15",
        amount: 100.0,
        category: "other",
        description: "Audit test",
        ocrConfidence: 0.9,
        rawOcrText: "Audit test text",
      });

      if (saveResult.documentId) {
        const trail = await getOcrAuditTrail(saveResult.documentId);
        expect(Array.isArray(trail)).toBe(true);
        // Should have at least the "uploaded" action
        expect(trail.length).toBeGreaterThanOrEqual(1);
        expect(trail[0].action).toBe("uploaded");
      }
    });
  });

  describe("generateTaxAuditReport", () => {
    it("should generate report for date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");

      const report = await generateTaxAuditReport(testUserId, startDate, endDate);

      expect(report.totalDocuments).toBeGreaterThanOrEqual(0);
      expect(report.totalAmount).toBeGreaterThanOrEqual(0);
      expect(typeof report.byCategory).toBe("object");
      expect(Array.isArray(report.documents)).toBe(true);
    });

    it("should categorize expenses correctly", async () => {
      // Save documents in different categories
      await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "fuel.jpg",
        vendor: "Shell",
        invoiceDate: "2024-03-15",
        amount: 50.0,
        category: "fuel",
        description: "Fuel",
        ocrConfidence: 0.9,
        rawOcrText: "Fuel",
      });

      await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "maintenance.jpg",
        vendor: "Auto Shop",
        invoiceDate: "2024-03-15",
        amount: 150.0,
        category: "maintenance",
        description: "Oil change",
        ocrConfidence: 0.9,
        rawOcrText: "Maintenance",
      });

      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const report = await generateTaxAuditReport(testUserId, startDate, endDate);

      expect(report.byCategory).toBeDefined();
      if (report.byCategory.fuel) {
        expect(report.byCategory.fuel.count).toBeGreaterThan(0);
        expect(report.byCategory.fuel.amount).toBeGreaterThan(0);
      }
      if (report.byCategory.maintenance) {
        expect(report.byCategory.maintenance.count).toBeGreaterThan(0);
        expect(report.byCategory.maintenance.amount).toBeGreaterThan(0);
      }
    });

    it("should handle empty date range", async () => {
      const startDate = new Date("2020-01-01");
      const endDate = new Date("2020-12-31");

      const report = await generateTaxAuditReport(testUserId, startDate, endDate);

      expect(report.totalDocuments).toBe(0);
      expect(report.totalAmount).toBe(0);
      expect(report.documents).toEqual([]);
    });
  });

  describe("Edge cases", () => {
    it("should handle null vendor and description", async () => {
      const result = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "no_vendor.jpg",
        vendor: null,
        invoiceDate: null,
        amount: 25.0,
        category: "other",
        description: null,
        ocrConfidence: 0.5,
        rawOcrText: "Minimal data",
      });

      expect(result.success).toBe(true);
    });

    it("should handle very large amounts", async () => {
      const result = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "large_amount.jpg",
        vendor: "Expensive Vendor",
        invoiceDate: "2024-03-15",
        amount: 999999.99,
        category: "equipment",
        description: "Large purchase",
        ocrConfidence: 0.95,
        rawOcrText: "Large amount",
      });

      expect(result.success).toBe(true);
    });

    it("should handle zero confidence", async () => {
      const result = await saveOcrDocumentToS3({
        userId: testUserId,
        imageBase64: testImageBase64,
        originalFileName: "low_confidence.jpg",
        vendor: "Test",
        invoiceDate: "2024-03-15",
        amount: 50.0,
        category: "other",
        description: "Low confidence",
        ocrConfidence: 0.0,
        rawOcrText: "Unclear text",
      });

      expect(result.success).toBe(true);
    });
  });
});
