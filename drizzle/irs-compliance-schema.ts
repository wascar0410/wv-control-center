import { mysqlTable, varchar, int, decimal, datetime, text, enum as mysqlEnum, boolean, index } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/**
 * Compliance Audit Trail - Complete record of all compliance-related events
 * Used to prove to IRS that proper controls were in place
 */
export const complianceAuditLog = mysqlTable(
  "compliance_audit_log",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    eventType: mysqlEnum("event_type", [
      "mileage_recorded",
      "expense_recorded",
      "income_recorded",
      "document_uploaded",
      "validation_passed",
      "validation_failed",
      "alert_generated",
      "report_generated",
      "correction_made",
      "audit_review",
    ]).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // "load", "transaction", "receipt", etc.
    entityId: int("entity_id").notNull(),
    description: text("description"),
    metadata: text("metadata"), // JSON with additional details
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("compliance_audit_user_id_idx").on(table.userId),
    eventTypeIdx: index("compliance_audit_event_type_idx").on(table.eventType),
    createdAtIdx: index("compliance_audit_created_at_idx").on(table.createdAt),
  })
);

/**
 * Mileage Records - IRS requires detailed mileage documentation
 * Tracks business vs personal miles for deduction purposes
 */
export const mileageRecords = mysqlTable(
  "mileage_records",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    date: datetime("date").notNull(),
    startMileage: decimal("start_mileage", { precision: 10, scale: 1 }).notNull(),
    endMileage: decimal("end_mileage", { precision: 10, scale: 1 }).notNull(),
    businessMiles: decimal("business_miles", { precision: 10, scale: 1 }).notNull(),
    personalMiles: decimal("personal_miles", { precision: 10, scale: 1 }).notNull(),
    purpose: varchar("purpose", { length: 255 }).notNull(), // "load delivery", "personal", etc.
    loadId: int("load_id"), // Reference to load if business-related
    notes: text("notes"),
    documentedBy: varchar("documented_by", { length: 100 }), // "driver", "gps", "manual", etc.
    verifiedBy: int("verified_by").references(() => users.id), // Admin who verified
    verifiedAt: datetime("verified_at"),
    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("mileage_user_id_idx").on(table.userId),
    dateIdx: index("mileage_date_idx").on(table.date),
  })
);

/**
 * Expense Receipts - IRS requires receipts for all deductible expenses
 * Tracks which expenses have documentation for audit purposes
 */
export const expenseReceipts = mysqlTable(
  "expense_receipts",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    transactionId: int("transaction_id"), // Reference to transaction
    date: datetime("date").notNull(),
    vendor: varchar("vendor", { length: 255 }).notNull(),
    category: mysqlEnum("category", [
      "fuel",
      "maintenance",
      "tolls",
      "insurance",
      "parking",
      "meals",
      "supplies",
      "utilities",
      "equipment",
      "depreciation",
      "other",
    ]).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    receiptUrl: varchar("receipt_url", { length: 512 }), // S3 URL to receipt image
    receiptFileName: varchar("receipt_file_name", { length: 255 }),
    ocrExtractedData: text("ocr_extracted_data"), // JSON with OCR results
    ocrConfidence: decimal("ocr_confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
    isDeductible: boolean("is_deductible").notNull().default(true),
    deductionReason: varchar("deduction_reason", { length: 255 }), // Why it's deductible
    verifiedBy: int("verified_by").references(() => users.id),
    verifiedAt: datetime("verified_at"),
    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("receipt_user_id_idx").on(table.userId),
    dateIdx: index("receipt_date_idx").on(table.date),
    categoryIdx: index("receipt_category_idx").on(table.category),
  })
);

/**
 * Income Verification - IRS requires proof of all business income
 * Tracks which income has been properly documented
 */
export const incomeVerification = mysqlTable(
  "income_verification",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    loadId: int("load_id"), // Reference to load
    date: datetime("date").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    source: varchar("source", { length: 100 }).notNull(), // "broker", "direct", "other"
    brokerName: varchar("broker_name", { length: 255 }),
    invoiceNumber: varchar("invoice_number", { length: 100 }),
    invoiceUrl: varchar("invoice_url", { length: 512 }), // S3 URL
    paymentMethod: mysqlEnum("payment_method", [
      "check",
      "ach",
      "wire",
      "cash",
      "credit_card",
      "other",
    ]).notNull(),
    paymentDate: datetime("payment_date"),
    reconciled: boolean("reconciled").notNull().default(false),
    reconciledWith: varchar("reconciled_with", { length: 100 }), // "bank_statement", "broker_report", etc.
    verifiedBy: int("verified_by").references(() => users.id),
    verifiedAt: datetime("verified_at"),
    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("income_user_id_idx").on(table.userId),
    dateIdx: index("income_date_idx").on(table.date),
  })
);

/**
 * Compliance Alerts - System-generated alerts for compliance issues
 * Helps identify problems before IRS audit
 */
export const complianceAlerts = mysqlTable(
  "compliance_alerts",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    alertType: mysqlEnum("alert_type", [
      "missing_documentation",
      "mileage_discrepancy",
      "expense_without_receipt",
      "income_not_reconciled",
      "unusual_expense",
      "missing_mileage_record",
      "deduction_limit_exceeded",
      "suspicious_pattern",
      "audit_flag",
    ]).notNull(),
    severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    relatedEntityType: varchar("related_entity_type", { length: 50 }),
    relatedEntityId: int("related_entity_id"),
    recommendedAction: text("recommended_action"),
    resolved: boolean("resolved").notNull().default(false),
    resolvedAt: datetime("resolved_at"),
    resolvedBy: int("resolved_by").references(() => users.id),
    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("alert_user_id_idx").on(table.userId),
    alertTypeIdx: index("alert_type_idx").on(table.alertType),
    severityIdx: index("alert_severity_idx").on(table.severity),
    createdAtIdx: index("alert_created_at_idx").on(table.createdAt),
  })
);

/**
 * Compliance Rules - Configurable IRS rules and limits
 * Allows customization of compliance checks per user/jurisdiction
 */
export const complianceRules = mysqlTable(
  "compliance_rules",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    ruleType: mysqlEnum("rule_type", [
      "deduction_limit",
      "mileage_rate",
      "meal_percentage",
      "home_office_limit",
      "vehicle_depreciation",
      "expense_category_limit",
    ]).notNull(),
    category: varchar("category", { length: 100 }),
    limitAmount: decimal("limit_amount", { precision: 12, scale: 2 }),
    percentage: decimal("percentage", { precision: 5, scale: 2 }),
    active: boolean("active").notNull().default(true),
    year: int("year").notNull(), // Tax year
    notes: text("notes"),
    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("rule_user_id_idx").on(table.userId),
    ruleTypeIdx: index("rule_type_idx").on(table.ruleType),
    yearIdx: index("rule_year_idx").on(table.year),
  })
);

/**
 * Audit Reports - Generated reports for IRS compliance
 * Snapshots of compliance status at specific points in time
 */
export const auditReports = mysqlTable(
  "audit_reports",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull().references(() => users.id),
    reportType: mysqlEnum("report_type", [
      "monthly_summary",
      "quarterly_summary",
      "annual_summary",
      "audit_preparation",
      "irs_form_1040",
      "schedule_c",
    ]).notNull(),
    year: int("year").notNull(),
    month: int("month"), // 1-12, null for annual
    totalIncome: decimal("total_income", { precision: 12, scale: 2 }).notNull(),
    totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }).notNull(),
    totalMileage: decimal("total_mileage", { precision: 10, scale: 1 }).notNull(),
    mileageDeduction: decimal("mileage_deduction", { precision: 12, scale: 2 }).notNull(),
    documentedExpenses: int("documented_expenses").notNull(), // Count of expenses with receipts
    undocumentedExpenses: int("undocumented_expenses").notNull(), // Count without receipts
    complianceScore: decimal("compliance_score", { precision: 5, scale: 2 }).notNull(), // 0-100
    alerts: int("alerts").notNull(), // Number of unresolved alerts
    reportUrl: varchar("report_url", { length: 512 }), // S3 URL to PDF report
    generatedAt: datetime("generated_at").notNull().defaultNow(),
    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("report_user_id_idx").on(table.userId),
    reportTypeIdx: index("report_type_idx").on(table.reportType),
    yearIdx: index("report_year_idx").on(table.year),
  })
);
