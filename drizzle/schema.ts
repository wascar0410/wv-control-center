import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "driver"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Loads (Cargas) - Core shipment records
 */
export const loads = mysqlTable("loads", {
  id: int("id").autoincrement().primaryKey(),
  // Client info
  clientName: varchar("clientName", { length: 255 }).notNull(),
  // Route
  pickupAddress: text("pickupAddress").notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  deliveryLat: decimal("deliveryLat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("deliveryLng", { precision: 10, scale: 7 }),
  // Cargo details
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  weightUnit: varchar("weightUnit", { length: 10 }).default("lbs").notNull(),
  merchandiseType: varchar("merchandiseType", { length: 255 }).notNull(),
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  estimatedFuel: decimal("estimatedFuel", { precision: 10, scale: 2 }).default("0"),
  estimatedTolls: decimal("estimatedTolls", { precision: 10, scale: 2 }).default("0"),
  netMargin: decimal("netMargin", { precision: 10, scale: 2 }),
  // Status
  status: mysqlEnum("status", ["available", "in_transit", "delivered", "invoiced", "paid"]).default("available").notNull(),
  // Assignment
  assignedDriverId: int("assignedDriverId"),
  // Notes
  notes: text("notes"),
  bolImageUrl: text("bolImageUrl"),
  // Timestamps
  pickupDate: timestamp("pickupDate"),
  deliveryDate: timestamp("deliveryDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy"),
});

export type Load = typeof loads.$inferSelect;
export type InsertLoad = typeof loads.$inferInsert;

/**
 * Transactions - Income and expense records
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  category: mysqlEnum("category", [
    "load_payment",
    "fuel",
    "maintenance",
    "insurance",
    "subscriptions",
    "phone",
    "payroll",
    "tolls",
    "other",
  ]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  referenceLoadId: int("referenceLoadId"),
  receiptUrl: text("receiptUrl"),
  transactionDate: timestamp("transactionDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Partnership - Partner configuration and draws
 */
export const partnership = mysqlTable("partnership", {
  id: int("id").autoincrement().primaryKey(),
  partnerName: varchar("partnerName", { length: 255 }).notNull(),
  partnerRole: varchar("partnerRole", { length: 100 }).notNull(),
  participationPercent: decimal("participationPercent", { precision: 5, scale: 2 }).notNull(),
  userId: int("userId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Partner = typeof partnership.$inferSelect;
export type InsertPartner = typeof partnership.$inferInsert;

/**
 * Owner Draws - Partner withdrawal records
 */
export const ownerDraws = mysqlTable("owner_draws", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
  notes: text("notes"),
  drawDate: timestamp("drawDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdBy: int("createdBy"),
});

export type OwnerDraw = typeof ownerDraws.$inferSelect;
export type InsertOwnerDraw = typeof ownerDraws.$inferInsert;

/**
 * Fuel Logs - Driver fuel expense tracking
 */
export const fuelLogs = mysqlTable("fuel_logs", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  loadId: int("loadId"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  gallons: decimal("gallons", { precision: 8, scale: 3 }),
  pricePerGallon: decimal("pricePerGallon", { precision: 6, scale: 3 }),
  location: text("location"),
  receiptUrl: text("receiptUrl"),
  logDate: timestamp("logDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FuelLog = typeof fuelLogs.$inferSelect;
export type InsertFuelLog = typeof fuelLogs.$inferInsert;

/**
 * Load Assignments - Track which driver is assigned to which load
 */
export const loadAssignments = mysqlTable("load_assignments", {
  id: int("id").autoincrement().primaryKey(),
  loadId: int("loadId").notNull(),
  driverId: int("driverId").notNull(),
  assignedBy: int("assignedBy").notNull(), // Manager/Admin who assigned
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "completed"]).default("pending").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoadAssignment = typeof loadAssignments.$inferSelect;
export type InsertLoadAssignment = typeof loadAssignments.$inferInsert;

/**
 * POD Documents - Proof of Delivery documents
 */
export const podDocuments = mysqlTable("pod_documents", {
  id: int("id").autoincrement().primaryKey(),
  loadId: int("loadId").notNull(),
  driverId: int("driverId").notNull(),
  assignmentId: int("assignmentId"),
  documentUrl: text("documentUrl").notNull(),
  documentKey: varchar("documentKey", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 50 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PODDocument = typeof podDocuments.$inferSelect;
export type InsertPODDocument = typeof podDocuments.$inferInsert;
