import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import wsTokenRouter from "./wsTokenEndpoint";
import { wsManager } from "./websocket";
import { serveStatic, setupVite } from "./vite";
import { recordHostRejection } from "./hostMonitoring";
import { requestLoggerMiddleware } from "./requestLogger";
import { adaptiveRateLimiter } from "./adaptiveRateLimiter";
import { getDb } from "../db";
import { syncPlaidTransactionsForItem } from "./plaid-sync-service";
import { generateReserveSuggestionsFromTransactions } from "../plaid-cashflow";
import { bankAccounts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  verifyPlaidWebhookSignature,
  handlePlaidWebhook,
  PlaidWebhookEvent,
} from "./plaid-webhook";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function normalizeList(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function getHostWithoutPort(host?: string | null) {
  if (!host) return "";
  return host.split(":")[0].trim().toLowerCase();
}

function normalizeOrigin(origin?: string | null) {
  if (!origin) return "";
  return origin.trim().toLowerCase().replace(/\/+$/, "");
}

function isHostAllowed(hostHeader: string | undefined, allowedHosts: string[]) {
  const fullHost = (hostHeader || "").trim().toLowerCase();
  const hostOnly = getHostWithoutPort(fullHost);

  if (!fullHost || !hostOnly) return false;

  return allowedHosts.some((allowed) => {
    const allowedValue = allowed.trim().toLowerCase();
    const allowedHostOnly = getHostWithoutPort(allowedValue);

    return (
      fullHost === allowedValue ||
      hostOnly === allowedValue ||
      hostOnly === allowedHostOnly
    );
  });
}

function isOriginAllowed(originHeader: string | undefined, allowedOrigins: string[]) {
  const origin = normalizeOrigin(originHeader);
  if (!origin) return false;

  return allowedOrigins.some((allowed) => origin === normalizeOrigin(allowed));
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Importante detrás de Railway / proxies para cookies seguras y req.secure
  app.set("trust proxy", 1);

  // Debug endpoint solo en desarrollo
  if (process.env.NODE_ENV !== "production") {
    app.get("/debug/users-columns", async (_req, res) => {
      try {
        const db = await getDb();
        if (!db) {
          return res.status(500).json({ error: "Database not available" });
        }

        const result = await db.execute("SHOW COLUMNS FROM users;");
        return res.json(result);
      } catch (error) {
        console.error("DEBUG ERROR:", error);
        return res.status(500).json({ error: String(error) });
      }
    });
  }

  // Allowed hosts
  const defaultAllowedHosts = [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "app.wvtransports.com",
    "api.wvtransports.com",
    "3000-iop08n4oqcm170ethc0yz-164a9fa2.us2.manus.computer",
    "wv-control-center-production.up.railway.app",
  ];

  const envHosts = process.env.ALLOWED_HOSTS
    ? process.env.ALLOWED_HOSTS.split(",")
    : [];

  const allowedHosts = normalizeList([...defaultAllowedHosts, ...envHosts]);

  console.log("[Host Validation] Allowed hosts:", allowedHosts);

  app.use((req, res, next) => {
    const fullHost = req.get("host");

    if (
      process.env.NODE_ENV === "production" &&
      !isHostAllowed(fullHost, allowedHosts)
    ) {
      console.warn(`[Host Validation] Rejected request from host: ${fullHost}`);
      recordHostRejection(fullHost || "unknown", "Invalid host header", req).catch(
        console.error
      );
      return res.status(400).json({ error: "Invalid host" });
    }

    next();
  });

  // CORS
  const defaultCorsOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://app.wvtransports.com",
    "https://api.wvtransports.com",
    "https://3000-iop08n4oqcm170ethc0yz-164a9fa2.us2.manus.computer",
    "https://wv-control-center-production.up.railway.app",
  ];

  const envOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : [];

  const corsOrigins = normalizeList([...defaultCorsOrigins, ...envOrigins]);

  console.log("[CORS] Allowed origins:", corsOrigins);

  app.use((req, res, next) => {
    const origin = req.get("origin");

    if (origin && isOriginAllowed(origin, corsOrigins)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cookie, X-Requested-With"
      );
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  app.use(requestLoggerMiddleware);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  registerOAuthRoutes(app);
  app.use(wsTokenRouter);

  app.get("/api/config", (_req, res) => {
    res.json({
      googleMapsApiKey:
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.VITE_GOOGLE_MAPS_API_KEY ||
        "",
    });
  });

  if (process.env.NODE_ENV === "production") {
    app.use("/api", adaptiveRateLimiter);
  }

// New webhook endpoint section to replace lines 215-293
// This should be inserted in place of the old app.post("/api/plaid/webhook", ...) block

  // New webhook endpoint with signature verification and improved handler
  app.post(
    "/api/webhooks/plaid",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const timestamp = new Date().toISOString();
      console.log(`[Plaid Webhook] RECEIVED at ${timestamp}`);

      try {
        // Get raw body for signature verification
        const rawBody =
          typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        const signature = req.headers["x-plaid-verification-header"] as string;

        // Verify webhook signature if secret is configured
        const webhookSecret = process.env.PLAID_WEBHOOK_SECRET;
        if (webhookSecret) {
          const isValid = verifyPlaidWebhookSignature(
            rawBody,
            signature,
            webhookSecret
          );

          if (!isValid) {
            console.error("[Plaid Webhook] Signature verification failed");
            return res.status(401).json({ error: "Unauthorized" });
          }
        } else {
          console.warn(
            "[Plaid Webhook] PLAID_WEBHOOK_SECRET not configured - skipping signature verification"
          );
        }

        // Parse body
        let body: PlaidWebhookEvent;
        if (Buffer.isBuffer(req.body)) {
          body = JSON.parse(req.body.toString("utf8"));
        } else if (typeof req.body === "string") {
          body = JSON.parse(req.body);
        } else {
          body = req.body;
        }

        console.log(`[Plaid Webhook] Event: ${body.webhook_type}/${body.webhook_code}`);

        // Handle webhook event using new handler
        await handlePlaidWebhook(body);

        return res.json({ received: true });
      } catch (err) {
        console.error("[Plaid Webhook] Error:", err);
        // Always return 200 to acknowledge receipt
        return res.status(200).json({ received: false, error: String(err) });
      }
    }
  );

  // Legacy endpoint for backward compatibility
  app.post("/api/plaid/webhook", express.raw({ type: "*/*" }), async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[Plaid Webhook] RECEIVED (legacy) at ${timestamp}`);
    
    try {
      let body: any;

      if (Buffer.isBuffer(req.body)) {
        body = JSON.parse(req.body.toString("utf8"));
      } else if (typeof req.body === "string") {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }

      const { webhook_type, webhook_code, item_id } = body || {};

      console.log(
        `[Plaid Webhook] ${timestamp} | Type: ${webhook_type} | Code: ${webhook_code} | Item: ${item_id}`
      );

      if (
        webhook_type === "TRANSACTIONS" &&
        webhook_code === "SYNC_UPDATES_AVAILABLE"
      ) {
        console.log(
          `[Plaid Webhook] ${timestamp} | SYNC_UPDATES_AVAILABLE for item ${item_id} | Starting sync...`
        );

        try {
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          const accountRows = await db
            .select()
            .from(bankAccounts)
            .where(eq(bankAccounts.plaidItemId, item_id))
            .limit(1);

          const account = accountRows[0];

          if (!account) {
            console.log("[Plaid Webhook] No account found for item", item_id);
            return res.json({ received: true, skipped: true });
          }

          const userId = Number(account.userId);

          console.log(`[Plaid Webhook] ${timestamp} | Found account for item ${item_id} | userId: ${userId}`);
          
          const syncResult = await syncPlaidTransactionsForItem({
            userId,
            itemId: item_id,
          });

          const importedTransactions = syncResult.importedTransactions ?? [];
          console.log(`[Plaid Webhook] ${timestamp} | Sync complete | Imported: ${importedTransactions.length}`);

          const suggestionResult = await generateReserveSuggestionsFromTransactions({
            ownerId: userId,
            transactions: importedTransactions,
          });

          console.log(`[Plaid Webhook] ${timestamp} | COMPLETE | Imported: ${syncResult.imported ?? importedTransactions.length ?? 0} | Suggestions: ${suggestionResult.created} created, ${suggestionResult.skipped} skipped`, {
            itemId: item_id,
            userId,
          });
        } catch (error) {
          console.error(`[Plaid Webhook] ${timestamp} | ERROR during sync/suggestions:`, error);
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("[Plaid Webhook] Error:", err);
      return res.status(200).json({ received: false, error: String(err) });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);

    app.get("*", (_req, res) => {
      res.sendFile("index.html", { root: "dist/public" });
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Ensure business_plan_events table exists
  if (process.env.DATABASE_URL) {
    try {
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.default.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
      });

      await conn.execute(`DROP TABLE IF EXISTS business_plan_events`);
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS business_plan_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          eventType ENUM('page_view','pdf_download','contact_click','section_view','form_submit') NOT NULL,
          sectionId VARCHAR(100) DEFAULT NULL,
          sessionId VARCHAR(64) DEFAULT NULL,
          referrer VARCHAR(500) DEFAULT NULL,
          userAgent VARCHAR(500) DEFAULT NULL,
          ipAddress VARCHAR(64) DEFAULT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.end();
      console.log("[Startup] business_plan_events table ready");
    } catch (err) {
      console.warn(
        "[Startup] Table creation warning (non-fatal):",
        (err as Error).message
      );
    }
  }

  // Safe migrations
  if (process.env.DATABASE_URL) {
    try {
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.default.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
      });

      const [driverAcceptedCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'driverAcceptedAt'
      `)) as any;

      if (driverAcceptedCols.length === 0) {
        await conn.execute("ALTER TABLE `loads` ADD `driverAcceptedAt` timestamp NULL");
        await conn.execute("ALTER TABLE `loads` ADD `driverRejectedAt` timestamp NULL");
        await conn.execute("ALTER TABLE `loads` ADD `driverRejectionReason` varchar(500) NULL");
        console.log("[Startup] Applied: driver accept/reject columns added to loads");
      }

      const [podNotesCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pod_documents' AND COLUMN_NAME = 'notes'
      `)) as any;

      if (podNotesCols.length === 0) {
        await conn.execute("ALTER TABLE `pod_documents` ADD `notes` text NULL");
        console.log("[Startup] Applied: notes column added to pod_documents");
      }

      const [podSigCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pod_documents' AND COLUMN_NAME = 'signatureUrl'
      `)) as any;

      if (podSigCols.length === 0) {
        await conn.execute("ALTER TABLE `pod_documents` ADD `signatureUrl` text NULL");
        await conn.execute("ALTER TABLE `pod_documents` ADD `signatureKey` varchar(512) NULL");
        console.log("[Startup] Applied: signature columns added to pod_documents");
      }

      const [rateConfCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'rateConfirmationNumber'
      `)) as any;

      if (rateConfCols.length === 0) {
        await conn.execute("ALTER TABLE `loads` ADD `rateConfirmationNumber` varchar(100) NULL");
        console.log("[Startup] Applied: rateConfirmationNumber column added to loads");
      }

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`load_evidence\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`loadId\` int NOT NULL,
          \`driverId\` int NOT NULL,
          \`evidenceType\` enum('pickup_photo','delivery_photo','bol_scan','damage_report','signature','receipt','other') NOT NULL,
          \`fileUrl\` text NOT NULL,
          \`fileKey\` varchar(512) NOT NULL,
          \`fileName\` varchar(255) NOT NULL,
          \`fileSize\` int DEFAULT NULL,
          \`mimeType\` varchar(50) DEFAULT NULL,
          \`caption\` varchar(500) DEFAULT NULL,
          \`latitude\` decimal(10,7) DEFAULT NULL,
          \`longitude\` decimal(10,7) DEFAULT NULL,
          \`capturedAt\` timestamp NULL DEFAULT NULL,
          \`uploadedAt\` timestamp NOT NULL DEFAULT (now()),
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`load_evidence_id\` PRIMARY KEY(\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("[Startup] Applied: load_evidence table ready");

      const [fleetTypeCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'fleetType'
      `)) as any;

      if (fleetTypeCols.length === 0) {
        await conn.execute("ALTER TABLE `users` ADD `fleetType` ENUM('internal','leased','external') DEFAULT 'internal'");
        await conn.execute("ALTER TABLE `users` ADD `commissionPercent` DECIMAL(5,2) DEFAULT 0.00");
        await conn.execute("ALTER TABLE `users` ADD `dotNumber` VARCHAR(20) NULL");
        await conn.execute("ALTER TABLE `users` ADD `vehicleInfo` TEXT NULL");
        await conn.execute("ALTER TABLE `users` ADD `licenseUrl` TEXT NULL");
        await conn.execute("ALTER TABLE `users` ADD `insuranceUrl` TEXT NULL");
        await conn.execute("ALTER TABLE `users` ADD `leaseContractUrl` TEXT NULL");
        await conn.execute("ALTER TABLE `users` ADD `locationSharingEnabled` TINYINT(1) DEFAULT 0");
        console.log("[Startup] Applied: driver fleet classification fields added to users");
      } else {
        console.log("[Startup] OK: driver fleet fields already exist");
      }

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`driver_locations\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`driverId\` int NOT NULL,
          \`loadId\` int DEFAULT NULL,
          \`latitude\` decimal(10,7) NOT NULL,
          \`longitude\` decimal(10,7) NOT NULL,
          \`accuracy\` decimal(8,2) DEFAULT NULL,
          \`speed\` decimal(8,2) DEFAULT NULL,
          \`heading\` decimal(6,2) DEFAULT NULL,
          \`altitude\` decimal(10,2) DEFAULT NULL,
          \`timestamp\` timestamp NOT NULL DEFAULT (now()),
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`driver_locations_id\` PRIMARY KEY(\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("[Startup] Applied: driver_locations table ready");

      const [settlementCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driver_payments' AND COLUMN_NAME = 'settlementWeek'
      `)) as any;

      if (settlementCols.length === 0) {
        await conn.execute("ALTER TABLE `driver_payments` ADD `settlementWeek` VARCHAR(10) NULL");
        await conn.execute("ALTER TABLE `driver_payments` ADD `grossAmount` DECIMAL(12,2) NULL");
        await conn.execute("ALTER TABLE `driver_payments` ADD `commissionAmount` DECIMAL(12,2) NULL");
        await conn.execute("ALTER TABLE `driver_payments` ADD `tollDeduction` DECIMAL(12,2) DEFAULT 0.00");
        await conn.execute("ALTER TABLE `driver_payments` ADD `fuelDeduction` DECIMAL(12,2) DEFAULT 0.00");
        await conn.execute("ALTER TABLE `driver_payments` ADD `advanceDeduction` DECIMAL(12,2) DEFAULT 0.00");
        await conn.execute("ALTER TABLE `driver_payments` ADD `netPayable` DECIMAL(12,2) NULL");
        await conn.execute("ALTER TABLE `driver_payments` ADD `bolVerified` TINYINT(1) DEFAULT 0");
        await conn.execute("ALTER TABLE `driver_payments` ADD `podVerified` TINYINT(1) DEFAULT 0");
        await conn.execute("ALTER TABLE `driver_payments` ADD `paymentBlocked` TINYINT(1) DEFAULT 0");
        await conn.execute("ALTER TABLE `driver_payments` ADD `blockReason` TEXT NULL");
        console.log("[Startup] Applied: driver settlement fields added to driver_payments");
      } else {
        console.log("[Startup] OK: driver settlement fields already exist");
      }

      const [pwHashCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'passwordHash'
      `)) as any;

      if (pwHashCols.length === 0) {
        await conn.execute("ALTER TABLE `users` ADD `passwordHash` TEXT NULL");
        console.log("[Startup] Applied: passwordHash column added to users");
      } else {
        console.log("[Startup] OK: passwordHash column already exists");
      }

      try {
        await conn.execute(
          "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user','admin','driver','owner') NOT NULL DEFAULT 'user'"
        );
        console.log("[Startup] Applied: users.role enum updated to include owner/driver");
      } catch (enumErr: any) {
        if (!String(enumErr.message).includes("Duplicate")) {
          console.log("[Startup] OK: users.role enum already includes owner/driver");
        }
      }

      const bcrypt = await import("bcryptjs");
      const defaultPasswordHash = await bcrypt.default.hash("WVTransport2026!", 10);

      const ownerAccounts = [
        { email: "wascar.ortiz0410@gmail.com", name: "Wascar Ortiz", openId: "owner-wascar-001" },
        { email: "yisvel10@gmail.com", name: "Yisvel", openId: "owner-yisvel-002" },
      ];

      for (const owner of ownerAccounts) {
        const [existing] = (await conn.execute(
          `SELECT id, passwordHash FROM users WHERE email = ? LIMIT 1`,
          [owner.email]
        )) as any;

        if (existing.length === 0) {
          await conn.execute(
            `INSERT INTO users (openId, name, email, role, passwordHash, loginMethod, createdAt, updatedAt, lastSignedIn)
             VALUES (?, ?, ?, 'owner', ?, 'email', NOW(), NOW(), NOW())`,
            [owner.openId, owner.name, owner.email, defaultPasswordHash]
          );
          console.log(`[Startup] Created owner account: ${owner.email}`);
        } else {
          const hasPassword =
            existing[0].passwordHash && existing[0].passwordHash.length > 10;

          if (!hasPassword) {
            await conn.execute(
              `UPDATE users SET role = 'owner', passwordHash = ?, loginMethod = 'email' WHERE email = ?`,
              [defaultPasswordHash, owner.email]
            );
            console.log(`[Startup] Updated owner account (set password): ${owner.email}`);
          } else {
            await conn.execute(`UPDATE users SET role = 'owner' WHERE email = ?`, [
              owner.email,
            ]);
            console.log(`[Startup] OK: owner account verified: ${owner.email}`);
          }
        }
      }

      const [brokerNameCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'brokerName'
      `)) as any;

      if (brokerNameCols.length === 0) {
        await conn.execute("ALTER TABLE `loads` ADD `brokerName` varchar(255) NULL");
        await conn.execute("ALTER TABLE `loads` ADD `brokerContact` varchar(255) NULL");
        await conn.execute("ALTER TABLE `loads` ADD `brokerPhone` varchar(50) NULL");
        await conn.execute("ALTER TABLE `loads` ADD `loadScore` int NULL");
        await conn.execute("ALTER TABLE `loads` ADD `estimatedMiles` decimal(10,2) NULL");
        console.log("[Startup] Applied: broker fields + loadScore + estimatedMiles added to loads");
      } else {
        const [loadScoreCols] = (await conn.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'loadScore'
        `)) as any;

        if (loadScoreCols.length === 0) {
          await conn.execute("ALTER TABLE `loads` ADD `loadScore` int NULL");
          await conn.execute("ALTER TABLE `loads` ADD `estimatedMiles` decimal(10,2) NULL");
          console.log("[Startup] Applied: loadScore + estimatedMiles added to loads");
        } else {
          console.log("[Startup] OK: broker fields already exist on loads");
        }
      }

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`driver_feedback\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`loadId\` int NOT NULL,
          \`driverId\` int NOT NULL,
          \`trafficRating\` int NOT NULL DEFAULT 3,
          \`difficultyRating\` int NOT NULL DEFAULT 3,
          \`estimatedMinutes\` int NULL,
          \`actualMinutes\` int NULL,
          \`notes\` text NULL,
          \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("[Startup] driver_feedback table ready");

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`financial_transactions\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`date\` date NOT NULL,
          \`postedAt\` timestamp NULL,
          \`name\` varchar(255) NOT NULL,
          \`merchantName\` varchar(255) NULL,
          \`amount\` decimal(10,2) NOT NULL,
          \`category\` varchar(100) NOT NULL DEFAULT 'uncategorized',
          \`rawCategory\` varchar(255) NULL,
          \`type\` enum('income','expense') NOT NULL DEFAULT 'expense',
          \`isReviewed\` tinyint(1) NOT NULL DEFAULT 0,
          \`isTaxDeductible\` tinyint(1) NOT NULL DEFAULT 0,
          \`linkedLoadId\` int NULL,
          \`notes\` text NULL,
          \`plaidTransactionId\` varchar(255) NULL,
          \`accountId\` int NULL,
          \`source\` enum('plaid','manual','load') NOT NULL DEFAULT 'manual',
          \`createdBy\` int NULL,
          \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
          \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_ft_date\` (\`date\`),
          INDEX \`idx_ft_category\` (\`category\`),
          INDEX \`idx_ft_type\` (\`type\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("[Startup] financial_transactions table ready");

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS \`allocation_settings\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`operatingPct\` decimal(5,2) NOT NULL DEFAULT 50.00,
          \`ownerPayPct\` decimal(5,2) NOT NULL DEFAULT 20.00,
          \`reservePct\` decimal(5,2) NOT NULL DEFAULT 20.00,
          \`growthPct\` decimal(5,2) NOT NULL DEFAULT 10.00,
          \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.execute(`
        INSERT IGNORE INTO \`allocation_settings\` (id, operatingPct, ownerPayPct, reservePct, growthPct)
        VALUES (1, 50.00, 20.00, 20.00, 10.00)
      `);
      console.log("[Startup] allocation_settings table ready");

      const [cursorCols] = (await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bank_accounts' AND COLUMN_NAME = 'plaidSyncCursor'
      `)) as any;

      if (cursorCols.length === 0) {
        await conn.execute("ALTER TABLE `bank_accounts` ADD `plaidSyncCursor` text NULL");
        console.log("[Startup] Applied: plaidSyncCursor column added to bank_accounts");
      } else {
        console.log("[Startup] OK: plaidSyncCursor already exists");
      }

      try {
        const testCondition = `email IN ('driver@example.com','test-annual@example.com','test-comparison@example.com','wascar.orti0410@gmail.com') OR (name = 'Test Driver' AND email LIKE '%example%')`;

        await conn.execute(
          `DELETE FROM load_quotations WHERE userId IN (SELECT id FROM users WHERE ${testCondition})`
        ).catch(() => {});
        await conn.execute(
          `DELETE FROM driver_payments WHERE driverId IN (SELECT id FROM users WHERE ${testCondition})`
        ).catch(() => {});
        await conn.execute(
          `DELETE FROM driver_locations WHERE driverId IN (SELECT id FROM users WHERE ${testCondition})`
        ).catch(() => {});
        await conn.execute(
          `DELETE FROM driver_settlements WHERE driverId IN (SELECT id FROM users WHERE ${testCondition})`
        ).catch(() => {});

        const [cleaned] = (await conn.execute(
          `DELETE FROM users WHERE ${testCondition}`
        )) as any[];

        if (cleaned.affectedRows > 0) {
          console.log(`[Startup] Cleaned up ${cleaned.affectedRows} test/duplicate user(s)`);
        }
      } catch (cleanupErr) {
        console.warn(
          "[Startup] Cleanup warning (non-fatal):",
          (cleanupErr as Error).message
        );
      }

      await conn.end();
    } catch (err) {
      console.warn("[Startup] Safe migration warning (non-fatal):", (err as Error).message);
    }
  }

  wsManager.initialize(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);


