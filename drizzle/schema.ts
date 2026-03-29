import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
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
  role: mysqlEnum("role", ["user", "admin", "driver", "owner"]).default("user").notNull(),
  // Authentication
  passwordHash: text("passwordHash"),
  // Contact information
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 10 }),
  // Profile info
  profileImageUrl: text("profileImageUrl"),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Password Reset Tokens - For password recovery flow
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * User Preferences - Notification and system preferences
 */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // Notification preferences
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  smsNotifications: boolean("smsNotifications").default(true).notNull(),
  pushNotifications: boolean("pushNotifications").default(true).notNull(),
  // Notification types
  notifyOnLoadAssignment: boolean("notifyOnLoadAssignment").default(true).notNull(),
  notifyOnLoadStatus: boolean("notifyOnLoadStatus").default(true).notNull(),
  notifyOnPayment: boolean("notifyOnPayment").default(true).notNull(),
  notifyOnMessage: boolean("notifyOnMessage").default(true).notNull(),
  notifyOnBonus: boolean("notifyOnBonus").default(true).notNull(),
  // System preferences
  theme: mysqlEnum("theme", ["dark", "light", "auto"]).default("dark").notNull(),
  language: varchar("language", { length: 10 }).default("es").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York").notNull(),
  // Privacy
  showOnlineStatus: boolean("showOnlineStatus").default(true).notNull(),
  allowLocationTracking: boolean("allowLocationTracking").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

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

/**
 * Bank Accounts - Connected bank accounts for automatic sync
 */
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountType: mysqlEnum("accountType", ["checking", "savings", "credit_card", "other"]).notNull(),
  accountLast4: varchar("accountLast4", { length: 4 }).notNull(),
  plaidAccountId: varchar("plaidAccountId", { length: 255 }),
  plaidAccessToken: text("plaidAccessToken"),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/**
 * Transaction Imports - Transactions imported from bank accounts
 */
export const transactionImports = mysqlTable("transaction_imports", {
  id: int("id").autoincrement().primaryKey(),
  bankAccountId: int("bankAccountId").notNull(),
  transactionId: int("transactionId"),
  externalTransactionId: varchar("externalTransactionId", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  transactionType: mysqlEnum("transactionType", ["debit", "credit"]).notNull(),
  transactionDate: timestamp("transactionDate").notNull(),
  category: varchar("category", { length: 255 }),
  isMatched: boolean("isMatched").default(false).notNull(),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
});

export type TransactionImport = typeof transactionImports.$inferSelect;
export type InsertTransactionImport = typeof transactionImports.$inferInsert;

/**
 * Load Quotations - Pricing calculations for potential loads
 */
export const loadQuotations = mysqlTable("load_quotations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // Van location (starting point)
  vanLat: decimal("vanLat", { precision: 10, scale: 7 }).notNull(),
  vanLng: decimal("vanLng", { precision: 10, scale: 7 }).notNull(),
  vanAddress: text("vanAddress").notNull(),
  // Pickup location
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }).notNull(),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }).notNull(),
  pickupAddress: text("pickupAddress").notNull(),
  // Delivery location
  deliveryLat: decimal("deliveryLat", { precision: 10, scale: 7 }).notNull(),
  deliveryLng: decimal("deliveryLng", { precision: 10, scale: 7 }).notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  // Cargo details
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  weightUnit: varchar("weightUnit", { length: 10 }).default("lbs").notNull(),
  cargoDescription: text("cargoDescription"),
  // Distance calculations
  emptyMiles: decimal("emptyMiles", { precision: 10, scale: 2 }).notNull(), // Van to pickup
  loadedMiles: decimal("loadedMiles", { precision: 10, scale: 2 }).notNull(), // Pickup to delivery
  returnEmptyMiles: decimal("returnEmptyMiles", { precision: 10, scale: 2 }).default("0"), // Delivery back to origin
  totalMiles: decimal("totalMiles", { precision: 10, scale: 2 }).notNull(),
  // Pricing
  ratePerMile: decimal("ratePerMile", { precision: 10, scale: 2 }).notNull(), // Base rate $/mile
  ratePerPound: decimal("ratePerPound", { precision: 10, scale: 4 }).default("0"), // Optional: $/lb
  fuelSurcharge: decimal("fuelSurcharge", { precision: 10, scale: 2 }).default("0"),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  // Profitability analysis
  estimatedFuelCost: decimal("estimatedFuelCost", { precision: 10, scale: 2 }).default("0"),
  estimatedOperatingCost: decimal("estimatedOperatingCost", { precision: 10, scale: 2 }).default("0"),
  estimatedProfit: decimal("estimatedProfit", { precision: 10, scale: 2 }).default("0"),
  profitMarginPercent: decimal("profitMarginPercent", { precision: 5, scale: 2 }).default("0"),
  // Status
  status: mysqlEnum("status", ["draft", "quoted", "accepted", "rejected", "expired"]).default("draft").notNull(),
  // Manual verdict override
  manualVerdict: varchar("manualVerdict", { length: 50 }),
  verdictNotes: text("verdictNotes"),
  verdictOverriddenBy: int("verdictOverriddenBy"),
  verdictOverriddenAt: timestamp("verdictOverriddenAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoadQuotation = typeof loadQuotations.$inferSelect;
export type InsertLoadQuotation = typeof loadQuotations.$inferInsert;

/**
 * Business Configuration - Costs and pricing parameters
 */
export const businessConfig = mysqlTable("business_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // Fuel costs
  fuelPricePerGallon: decimal("fuelPricePerGallon", { precision: 6, scale: 2 }).default("3.60"),
  vanMpg: decimal("vanMpg", { precision: 5, scale: 1 }).default("18.0"),
  // Operating costs per mile
  maintenancePerMile: decimal("maintenancePerMile", { precision: 6, scale: 3 }).default("0.12"),
  tiresPerMile: decimal("tiresPerMile", { precision: 6, scale: 3 }).default("0.03"),
  // Fixed monthly costs
  insuranceMonthly: decimal("insuranceMonthly", { precision: 8, scale: 2 }).default("450.00"),
  phoneInternetMonthly: decimal("phoneInternetMonthly", { precision: 8, scale: 2 }).default("70.00"),
  loadBoardAppsMonthly: decimal("loadBoardAppsMonthly", { precision: 8, scale: 2 }).default("45.00"),
  accountingSoftwareMonthly: decimal("accountingSoftwareMonthly", { precision: 8, scale: 2 }).default("30.00"),
  otherFixedMonthly: decimal("otherFixedMonthly", { precision: 8, scale: 2 }).default("80.00"),
  // Goals and targets
  targetMilesPerMonth: int("targetMilesPerMonth").default(4000),
  minimumProfitPerMile: decimal("minimumProfitPerMile", { precision: 6, scale: 2 }).default("1.50"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessConfig = typeof businessConfig.$inferSelect;
export type InsertBusinessConfig = typeof businessConfig.$inferInsert;

/**
 * Distance Surcharge - Dynamic pricing based on loaded miles
 */
export const distanceSurcharge = mysqlTable("distance_surcharge", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  fromMiles: int("fromMiles").notNull(),
  surchargePerMile: decimal("surchargePerMile", { precision: 6, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DistanceSurcharge = typeof distanceSurcharge.$inferSelect;
export type InsertDistanceSurcharge = typeof distanceSurcharge.$inferInsert;

/**
 * Weight Surcharge - Dynamic pricing based on weight
 */
export const weightSurcharge = mysqlTable("weight_surcharge", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  fromLbs: int("fromLbs").notNull(),
  surchargePerMile: decimal("surchargePerMile", { precision: 6, scale: 3 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeightSurcharge = typeof weightSurcharge.$inferSelect;
export type InsertWeightSurcharge = typeof weightSurcharge.$inferInsert;

/**
 * Route Stops - Multiple pickup/delivery stops for optimized routes
 */
export const routeStops = mysqlTable("route_stops", {
  id: int("id").autoincrement().primaryKey(),
  quotationId: int("quotationId").references(() => loadQuotations.id, { onDelete: "cascade" }),
  stopOrder: int("stopOrder").notNull(), // Order in optimized route (1, 2, 3, etc.)
  stopType: mysqlEnum("stopType", ["pickup", "delivery"]).notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).default("0"),
  weightUnit: varchar("weightUnit", { length: 10 }).default("lbs"),
  description: text("description"),
  distanceFromPrevious: decimal("distanceFromPrevious", { precision: 10, scale: 2 }), // Miles from previous stop
  durationFromPrevious: decimal("durationFromPrevious", { precision: 10, scale: 2 }), // Hours from previous stop
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RouteStop = typeof routeStops.$inferSelect;
export type InsertRouteStop = typeof routeStops.$inferInsert;


/**
 * Driver Locations - Real-time GPS tracking for drivers
 */
export const driverLocations = mysqlTable("driver_locations", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().references(() => users.id, { onDelete: "cascade" }),
  loadId: int("loadId").references(() => loads.id, { onDelete: "set null" }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // Meters
  speed: decimal("speed", { precision: 8, scale: 2 }), // km/h
  heading: decimal("heading", { precision: 6, scale: 2 }), // Degrees 0-360
  altitude: decimal("altitude", { precision: 10, scale: 2 }), // Meters
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = typeof driverLocations.$inferInsert;


/**
 * Driver Payments - Automatic payment processing when load is delivered
 */
export const driverPayments = mysqlTable("driver_payments", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().references(() => users.id, { onDelete: "cascade" }),
  loadId: int("loadId").notNull().references(() => loads.id, { onDelete: "cascade" }),
  quotationId: int("quotationId").references(() => loadQuotations.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Payment amount in USD
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "refunded"]).default("pending"),
  paymentMethod: mysqlEnum("paymentMethod", ["bank_transfer", "stripe", "cash", "check"]).default("bank_transfer"),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }), // Stripe payment ID if applicable
  bankAccountId: int("bankAccountId").references(() => bankAccounts.id, { onDelete: "set null" }),
  notes: text("notes"),
  processedAt: timestamp("processedAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DriverPayment = typeof driverPayments.$inferSelect;
export type InsertDriverPayment = typeof driverPayments.$inferInsert;


/**
 * Payment Batches - Batch processing of driver payments
 */
export const paymentBatches = mysqlTable("payment_batches", {
  id: int("id").autoincrement().primaryKey(),
  batchNumber: varchar("batchNumber", { length: 50 }).unique().notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict" }),
  period: varchar("period", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "processing", "completed", "failed", "cancelled"]).default("draft"),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
  totalPayments: int("totalPayments").notNull(),
  successfulPayments: int("successfulPayments").default(0),
  failedPayments: int("failedPayments").default(0),
  paymentMethod: mysqlEnum("paymentMethod", ["bank_transfer", "stripe", "mixed"]).default("bank_transfer"),
  scheduledDate: timestamp("scheduledDate"),
  processedDate: timestamp("processedDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaymentBatch = typeof paymentBatches.$inferSelect;
export type InsertPaymentBatch = typeof paymentBatches.$inferInsert;

/**
 * Payment Audit - Audit trail for all payment transactions
 */
export const paymentAudit = mysqlTable("payment_audit", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: int("paymentId").notNull().references(() => driverPayments.id, { onDelete: "cascade" }),
  batchId: int("batchId").references(() => paymentBatches.id, { onDelete: "set null" }),
  action: mysqlEnum("action", ["created", "updated", "processed", "failed", "refunded", "cancelled"]).notNull(),
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }),
  performedBy: int("performedBy").notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: text("reason"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PaymentAudit = typeof paymentAudit.$inferSelect;
export type InsertPaymentAudit = typeof paymentAudit.$inferInsert;

/**
 * Export Logs - Track all data exports for accounting and compliance
 */
export const exportLogs = mysqlTable("export_logs", {
  id: int("id").autoincrement().primaryKey(),
  exportType: mysqlEnum("exportType", ["accounting", "payroll", "payments", "transactions", "loads", "custom"]).notNull(),
  format: mysqlEnum("format", ["excel", "pdf", "csv", "json"]).notNull(),
  startDate: varchar("startDate", { length: 10 }),
  endDate: varchar("endDate", { length: 10 }),
  recordCount: int("recordCount").notNull(),
  fileSize: int("fileSize"),
  fileUrl: varchar("fileUrl", { length: 500 }),
  exportedBy: int("exportedBy").notNull().references(() => users.id, { onDelete: "restrict" }),
  filters: json("filters"),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type ExportLog = typeof exportLogs.$inferSelect;
export type InsertExportLog = typeof exportLogs.$inferInsert;


/**
 * Price Alerts - Alerts for loads below minimum profit threshold
 */
/**
 * Price Alerts - Track quotations below minimum profit margin
 */
export const priceAlerts = mysqlTable("price_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  quotationId: int("quotationId").references(() => loadQuotations.id, { onDelete: "cascade" }),
  // Load details
  clientName: varchar("clientName", { length: 255 }),
  pickupAddress: text("pickupAddress").notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  // Pricing info
  offeredPrice: decimal("offeredPrice", { precision: 10, scale: 2 }).notNull(),
  ratePerLoadedMile: decimal("ratePerLoadedMile", { precision: 10, scale: 2 }).notNull(),
  minimumProfitPerMile: decimal("minimumProfitPerMile", { precision: 6, scale: 2 }).notNull(),
  differenceFromMinimum: decimal("differenceFromMinimum", { precision: 10, scale: 2 }).notNull(),
  // Alert status
  severity: mysqlEnum("severity", ["warning", "critical"]).notNull(), // warning: $0-0.50 below, critical: below minimum
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;


/**
 * Broker Credentials - API credentials for load board integrations
 */
export const brokerCredentials = mysqlTable("broker_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  brokerName: mysqlEnum("brokerName", ["coyote", "dat", "other"]).notNull(),
  encryptedApiKey: text("encryptedApiKey").notNull(),
  encryptedApiSecret: text("encryptedApiSecret").notNull(),
  syncIntervalMinutes: int("syncIntervalMinutes").default(15).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrokerCredential = typeof brokerCredentials.$inferSelect;
export type InsertBrokerCredential = typeof brokerCredentials.$inferInsert;

/**
 * Broker Loads - Loads imported from broker APIs
 */
export const brokerLoads = mysqlTable("broker_loads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  brokerId: varchar("brokerId", { length: 100 }).notNull(), // External ID from broker (e.g., "COYOTE-12345")
  brokerName: mysqlEnum("brokerName", ["coyote", "dat", "manual", "other"]).notNull(),
  // Route details
  pickupAddress: text("pickupAddress").notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  deliveryLat: decimal("deliveryLat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("deliveryLng", { precision: 10, scale: 7 }),
  // Cargo details
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  weightUnit: varchar("weightUnit", { length: 10 }).default("lbs").notNull(),
  commodity: varchar("commodity", { length: 255 }),
  // Pricing from broker
  offeredRate: decimal("offeredRate", { precision: 10, scale: 2 }).notNull(),
  // Calculated metrics
  calculatedDistance: decimal("calculatedDistance", { precision: 10, scale: 2 }),
  calculatedProfit: decimal("calculatedProfit", { precision: 10, scale: 2 }),
  marginPercent: decimal("marginPercent", { precision: 5, scale: 2 }),
  // Verdict
  verdict: mysqlEnum("verdict", ["ACEPTAR", "NEGOCIAR", "RECHAZAR"]).default("NEGOCIAR"),
  // Status
  status: mysqlEnum("status", ["new", "reviewed", "accepted", "rejected", "expired", "converted"]).default("new").notNull(),
  // Dates
  pickupDate: timestamp("pickupDate"),
  deliveryDate: timestamp("deliveryDate"),
  expiresAt: timestamp("expiresAt"),
  // Link to converted load quotation
  convertedQuotationId: int("convertedQuotationId").references(() => loadQuotations.id, { onDelete: "set null" }),
  // Metadata
  rawData: json("rawData"), // Store original broker response for reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrokerLoad = typeof brokerLoads.$inferSelect;
export type InsertBrokerLoad = typeof brokerLoads.$inferInsert;

/**
 * Sync Logs - Audit trail for broker synchronizations
 */
export const syncLogs = mysqlTable("sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  brokerName: mysqlEnum("brokerName", ["coyote", "dat", "manual", "other"]).notNull(),
  loadsFound: int("loadsFound").default(0),
  loadsImported: int("loadsImported").default(0),
  loadsSkipped: int("loadsSkipped").default(0),
  status: mysqlEnum("status", ["success", "failed", "partial"]).notNull(),
  errorMessage: text("errorMessage"),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

/**
 * OCR Documents - Scanned invoices and receipts with S3 storage
 */
export const ocrDocuments = mysqlTable("ocr_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // S3 Storage
  s3Key: varchar("s3Key", { length: 512 }).notNull(), // Path in S3 bucket
  s3Url: text("s3Url").notNull(), // Public URL to S3 object
  originalFileName: varchar("originalFileName", { length: 255 }).notNull(),
  fileSize: int("fileSize").notNull(), // In bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  
  // OCR Extracted Data
  vendor: varchar("vendor", { length: 255 }),
  invoiceDate: varchar("invoiceDate", { length: 50 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
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
    "other",
  ]).default("other"),
  description: text("description"),
  
  // OCR Quality
  ocrConfidence: decimal("ocrConfidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  rawOcrText: text("rawOcrText"), // Full OCR output for audit trail
  
  // Metadata for Audit
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "completed", "failed"]).default("pending"),
  processedAt: timestamp("processedAt"),
  processingError: text("processingError"),
  
  // Audit Trail
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OcrDocument = typeof ocrDocuments.$inferSelect;
export type InsertOcrDocument = typeof ocrDocuments.$inferInsert;

/**
 * OCR Audit Log - Complete audit trail for tax compliance
 */
export const ocrAuditLog = mysqlTable("ocr_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  ocrDocumentId: int("ocrDocumentId").notNull().references(() => ocrDocuments.id, { onDelete: "cascade" }),
  
  // Action Details
  action: mysqlEnum("action", ["uploaded", "processed", "verified", "rejected", "exported", "deleted"]).notNull(),
  actionDetails: json("actionDetails"), // JSON with action-specific details
  
  // User Info
  performedBy: int("performedBy").references(() => users.id, { onDelete: "set null" }),
  
  // Timestamp
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type OcrAuditLog = typeof ocrAuditLog.$inferSelect;
export type InsertOcrAuditLog = typeof ocrAuditLog.$inferInsert;

/**
 * OCR Verification - Manual verification records for audit compliance
 */
export const ocrVerification = mysqlTable("ocr_verification", {
  id: int("id").autoincrement().primaryKey(),
  ocrDocumentId: int("ocrDocumentId").notNull().references(() => ocrDocuments.id, { onDelete: "cascade" }),
  
  // Verification Data
  verifiedBy: int("verifiedBy").notNull().references(() => users.id, { onDelete: "restrict" }),
  verificationStatus: mysqlEnum("verificationStatus", ["approved", "rejected", "needs_review"]).notNull(),
  
  // Corrected Data (if needed)
  correctedVendor: varchar("correctedVendor", { length: 255 }),
  correctedAmount: decimal("correctedAmount", { precision: 12, scale: 2 }),
  correctedCategory: mysqlEnum("correctedCategory", [
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
  correctedDate: varchar("correctedDate", { length: 50 }),
  
  // Notes
  notes: text("notes"),
  
  // Timestamps
  verifiedAt: timestamp("verifiedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OcrVerification = typeof ocrVerification.$inferSelect;
export type InsertOcrVerification = typeof ocrVerification.$inferInsert;


// ─── IRS Compliance & Audit Trail ──────────────────────────────────────────────

/**
 * Compliance Audit Trail - Complete record of all compliance-related events
 */
export const complianceAuditLog = mysqlTable("compliance_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  eventType: mysqlEnum("eventType", [
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
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  description: text("description"),
  metadata: text("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ComplianceAuditLog = typeof complianceAuditLog.$inferSelect;
export type InsertComplianceAuditLog = typeof complianceAuditLog.$inferInsert;

/**
 * Mileage Records - IRS requires detailed mileage documentation
 */
export const mileageRecords = mysqlTable("mileage_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  startMileage: decimal("startMileage", { precision: 10, scale: 1 }).notNull(),
  endMileage: decimal("endMileage", { precision: 10, scale: 1 }).notNull(),
  businessMiles: decimal("businessMiles", { precision: 10, scale: 1 }).notNull(),
  personalMiles: decimal("personalMiles", { precision: 10, scale: 1 }).notNull(),
  purpose: varchar("purpose", { length: 255 }).notNull(),
  loadId: int("loadId"),
  notes: text("notes"),
  documentedBy: varchar("documentedBy", { length: 100 }),
  verifiedBy: int("verifiedBy").references(() => users.id),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MileageRecord = typeof mileageRecords.$inferSelect;
export type InsertMileageRecord = typeof mileageRecords.$inferInsert;

/**
 * Expense Receipts - IRS requires receipts for all deductible expenses
 */
export const expenseReceipts = mysqlTable("expense_receipts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  transactionId: int("transactionId"),
  date: timestamp("date").notNull(),
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
  receiptUrl: varchar("receiptUrl", { length: 512 }),
  receiptFileName: varchar("receiptFileName", { length: 255 }),
  ocrExtractedData: text("ocrExtractedData"),
  ocrConfidence: decimal("ocrConfidence", { precision: 3, scale: 2 }),
  isDeductible: boolean("isDeductible").notNull().default(true),
  deductionReason: varchar("deductionReason", { length: 255 }),
  verifiedBy: int("verifiedBy").references(() => users.id),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExpenseReceipt = typeof expenseReceipts.$inferSelect;
export type InsertExpenseReceipt = typeof expenseReceipts.$inferInsert;

/**
 * Income Verification - IRS requires proof of all business income
 */
export const incomeVerification = mysqlTable("income_verification", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  loadId: int("loadId"),
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  brokerName: varchar("brokerName", { length: 255 }),
  invoiceNumber: varchar("invoiceNumber", { length: 100 }),
  invoiceUrl: varchar("invoiceUrl", { length: 512 }),
  paymentMethod: mysqlEnum("paymentMethod", [
    "check",
    "ach",
    "wire",
    "cash",
    "credit_card",
    "other",
  ]).notNull(),
  paymentDate: timestamp("paymentDate"),
  reconciled: boolean("reconciled").notNull().default(false),
  reconciledWith: varchar("reconciledWith", { length: 100 }),
  verifiedBy: int("verifiedBy").references(() => users.id),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type IncomeVerification = typeof incomeVerification.$inferSelect;
export type InsertIncomeVerification = typeof incomeVerification.$inferInsert;

/**
 * Compliance Alerts - System-generated alerts for compliance issues
 */
export const complianceAlerts = mysqlTable("compliance_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  alertType: mysqlEnum("alertType", [
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
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  recommendedAction: text("recommendedAction"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ComplianceAlert = typeof complianceAlerts.$inferSelect;
export type InsertComplianceAlert = typeof complianceAlerts.$inferInsert;

/**
 * Compliance Rules - Configurable IRS rules and limits
 */
export const complianceRules = mysqlTable("compliance_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  ruleType: mysqlEnum("ruleType", [
    "deduction_limit",
    "mileage_rate",
    "meal_percentage",
    "home_office_limit",
    "vehicle_depreciation",
    "expense_category_limit",
  ]).notNull(),
  category: varchar("category", { length: 100 }),
  limitAmount: decimal("limitAmount", { precision: 12, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  active: boolean("active").notNull().default(true),
  year: int("year").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ComplianceRule = typeof complianceRules.$inferSelect;
export type InsertComplianceRule = typeof complianceRules.$inferInsert;

/**
 * Audit Reports - Generated reports for IRS compliance
 */
export const auditReports = mysqlTable("audit_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  reportType: mysqlEnum("reportType", [
    "monthly_summary",
    "quarterly_summary",
    "annual_summary",
    "audit_preparation",
    "irs_form_1040",
    "schedule_c",
  ]).notNull(),
  year: int("year").notNull(),
  month: int("month"),
  totalIncome: decimal("totalIncome", { precision: 12, scale: 2 }).notNull(),
  totalExpenses: decimal("totalExpenses", { precision: 12, scale: 2 }).notNull(),
  totalMileage: decimal("totalMileage", { precision: 10, scale: 1 }).notNull(),
  mileageDeduction: decimal("mileageDeduction", { precision: 12, scale: 2 }).notNull(),
  documentedExpenses: int("documentedExpenses").notNull(),
  undocumentedExpenses: int("undocumentedExpenses").notNull(),
  complianceScore: decimal("complianceScore", { precision: 5, scale: 2 }).notNull(),
  alerts: int("alerts").notNull(),
  reportUrl: varchar("reportUrl", { length: 512 }),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditReport = typeof auditReports.$inferSelect;
export type InsertAuditReport = typeof auditReports.$inferInsert;


/**
 * Chat Messages - Direct communication between dispatcher and drivers
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull().references(() => users.id),
  recipientId: int("recipientId").notNull().references(() => users.id),
  loadId: int("loadId").references(() => loads.id),
  message: text("message").notNull(),
  attachmentUrl: varchar("attachmentUrl", { length: 512 }),
  attachmentType: varchar("attachmentType", { length: 50 }), // "image", "document", "location"
  isRead: boolean("isRead").notNull().default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Chat Conversations - Group chats between dispatcher and multiple drivers
 */
export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  dispatcherId: int("dispatcherId").notNull().references(() => users.id),
  loadId: int("loadId").references(() => loads.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

/**
 * Chat Conversation Participants - Track who's in each conversation
 */
export const chatParticipants = mysqlTable("chat_participants", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => chatConversations.id),
  userId: int("userId").notNull().references(() => users.id),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastReadAt: timestamp("lastReadAt"),
});

export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type InsertChatParticipant = typeof chatParticipants.$inferInsert;

/**
 * Chat Notifications - Track unread messages and notifications
 */
export const chatNotifications = mysqlTable("chat_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  senderId: int("senderId").notNull().references(() => users.id),
  messageId: int("messageId").notNull().references(() => chatMessages.id),
  conversationId: int("conversationId").references(() => chatConversations.id),
  isRead: boolean("isRead").notNull().default(false),
  readAt: timestamp("readAt"),
  notificationType: mysqlEnum("notificationType", ["direct_message", "group_message", "assignment_update", "status_change"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatNotification = typeof chatNotifications.$inferSelect;
export type InsertChatNotification = typeof chatNotifications.$inferInsert;

/**
 * Contact Submissions - Form submissions from About page
 */
export const contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 320 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "responded", "archived"]).default("new").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
  respondedBy: int("respondedBy"),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;
