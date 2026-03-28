import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  decimal,
  mysqlEnum,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Tax Documents - Stores scanned invoices, receipts, and tax documents
 */
export const taxDocuments = mysqlTable("tax_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Document metadata
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(), // bytes
  
  // Classification
  category: mysqlEnum("category", [
    "income",
    "fuel",
    "maintenance",
    "insurance",
    "tolls",
    "permits",
    "depreciation",
    "other_expense",
    "other_income",
  ]).notNull(),
  
  // Document details
  documentDate: timestamp("documentDate"), // When the document was created/issued
  vendor: varchar("vendor", { length: 255 }), // Who issued it (fuel station, repair shop, etc.)
  amount: decimal("amount", { precision: 12, scale: 2 }), // Document amount
  description: text("description"), // User notes
  
  // Tax year
  taxYear: int("taxYear").notNull(), // 2024, 2025, etc.
  
  // OCR/AI extracted data
  extractedData: json("extractedData"), // {vendor, date, amount, items: [...]}
  
  // Status
  verified: boolean("verified").default(false),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaxDocument = typeof taxDocuments.$inferSelect;
export type InsertTaxDocument = typeof taxDocuments.$inferInsert;

/**
 * Tax Categories - For organizing and categorizing expenses
 */
export const taxCategories = mysqlTable("tax_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Category info
  name: varchar("name", { length: 255 }).notNull(), // "Fuel", "Maintenance", etc.
  code: varchar("code", { length: 50 }).notNull(), // IRS category code
  description: text("description"),
  
  // IRS mapping
  irsCategory: varchar("irsCategory", { length: 100 }), // IRS Schedule C line
  
  // Status
  isActive: boolean("isActive").default(true),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaxCategory = typeof taxCategories.$inferSelect;
export type InsertTaxCategory = typeof taxCategories.$inferInsert;

/**
 * Tax Transactions - Links loads/transactions to tax documents
 */
export const taxTransactions = mysqlTable("tax_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Transaction details
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  
  // Source
  sourceType: mysqlEnum("sourceType", ["load", "manual", "document", "import"]).notNull(),
  sourceId: int("sourceId"), // loadId, transactionId, taxDocumentId, etc.
  
  // Date
  transactionDate: timestamp("transactionDate").notNull(),
  taxYear: int("taxYear").notNull(),
  
  // Document reference
  relatedDocumentId: int("relatedDocumentId"), // Link to tax document
  
  // Status
  verified: boolean("verified").default(false),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaxTransaction = typeof taxTransactions.$inferSelect;
export type InsertTaxTransaction = typeof taxTransactions.$inferInsert;

/**
 * Tax Reports - Generated reports for IRS
 */
export const taxReports = mysqlTable("tax_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Report info
  reportType: mysqlEnum("reportType", [
    "income_summary",
    "expense_summary",
    "transaction_detail",
    "schedule_c",
    "depreciation",
    "quarterly",
    "annual",
  ]).notNull(),
  
  // Period
  taxYear: int("taxYear").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  
  // Report data
  reportData: json("reportData"), // {totalIncome, totalExpenses, byCategory: {...}, etc.}
  
  // File
  pdfUrl: text("pdfUrl"), // S3 URL to generated PDF
  pdfKey: varchar("pdfKey", { length: 512 }), // S3 key
  
  // Status
  status: mysqlEnum("status", ["draft", "generated", "exported"]).default("draft"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  exportedAt: timestamp("exportedAt"),
});

export type TaxReport = typeof taxReports.$inferSelect;
export type InsertTaxReport = typeof taxReports.$inferInsert;

/**
 * Tax Deductions - Tracks deductions and depreciation
 */
export const taxDeductions = mysqlTable("tax_deductions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Deduction info
  name: varchar("name", { length: 255 }).notNull(), // "Vehicle", "Equipment", etc.
  type: mysqlEnum("type", ["depreciation", "mileage", "expense", "other"]).notNull(),
  
  // Amount
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  
  // Period
  taxYear: int("taxYear").notNull(),
  
  // Details
  description: text("description"),
  documentId: int("documentId"), // Link to supporting document
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaxDeduction = typeof taxDeductions.$inferSelect;
export type InsertTaxDeduction = typeof taxDeductions.$inferInsert;
