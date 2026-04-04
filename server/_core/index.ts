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
import { rateLimitMiddleware } from "./rateLimiter";
import { recordHostRejection } from "./hostMonitoring";
import { requestLoggerMiddleware, getAbuseReport } from "./requestLogger";
import { adaptiveRateLimiter, getSystemStatus } from "./adaptiveRateLimiter";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
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

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Allowed hosts configuration - can be overridden via environment variable
  const defaultAllowedHosts = [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "app.wvtransports.com",
    "api.wvtransports.com",
    "3000-iop08n4oqcm170ethc0yz-164a9fa2.us2.manus.computer",
  ];
  
  const envHosts = process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(",").map((h: string) => h.trim()) : [];
  const allowedHosts = [...defaultAllowedHosts, ...envHosts];
  
  console.log("[Host Validation] Allowed hosts:", allowedHosts);

  // Host validation middleware with monitoring
  app.use((req, res, next) => {
    const host = req.get("host")?.split(":")[0]; // Get hostname without port
    const fullHost = req.get("host"); // Get full host with port
    
    // Allow if host matches or is in allowed list
    const isAllowed = allowedHosts.some(
      (allowed) => allowed === host || allowed === fullHost || allowed.includes(host || "")
    );
    
    if (!isAllowed && process.env.NODE_ENV === "production") {
      console.warn(`[Host Validation] Rejected request from host: ${fullHost}`);
      // Record rejection for monitoring
      recordHostRejection(fullHost || "unknown", "Invalid host header", req).catch(console.error);
      return res.status(400).json({ error: "Invalid host" });
    }
    
    next();
  });

  // CORS middleware - can be overridden via environment variable
  const defaultCorsOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://app.wvtransports.com",
    "https://api.wvtransports.com",
    "https://3000-iop08n4oqcm170ethc0yz-164a9fa2.us2.manus.computer",
  ];
  
  const envOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map((o: string) => o.trim()) : [];
  const corsOrigins = [...defaultCorsOrigins, ...envOrigins];
  
  console.log("[CORS] Allowed origins:", corsOrigins);

  app.use((req, res, next) => {
    const origin = req.get("origin");
    
    // Allow CORS for matching origins
    if (origin && corsOrigins.some((allowed) => origin.includes(allowed) || allowed.includes(origin))) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    }
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    
    next();
  });
  
  // Add request logging middleware
  app.use(requestLoggerMiddleware);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Bypass dev/static resources FIRST - before any rate limiting
  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });
  
  app.use((req, res, next) => {
    const path = req.path;
    const isDevAsset =
      path === "/client" ||
      path === "/favicon.ico" ||
      path.startsWith("/@react-refresh") ||
      path.startsWith("/src/") ||
      path.startsWith("/assets/") ||
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.endsWith(".map") ||
      path.endsWith(".tsx");
    
    // In development, bypass all dev assets
    if (process.env.NODE_ENV !== "production" && isDevAsset) {
      return next();
    }
    
    return next();
  });
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // WebSocket token endpoint
  app.use(wsTokenRouter);

  // Public config endpoint - serves non-sensitive frontend config from server env
  app.get("/api/config", (_req, res) => {
    res.json({
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "",
    });
  });
  
  // Apply adaptive rate limiting ONLY to API routes in production
  if (process.env.NODE_ENV === "production") {
    app.use("/api", adaptiveRateLimiter);
  }
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  // Serve static files BEFORE rate limiting to ensure they're not affected
  if (process.env.NODE_ENV === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);

  // 🔥 SPA fallback FIX
  app.get("*", (_req, res) => {
    res.sendFile("index.html", { root: "dist/public" });
  });
}

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Ensure business_plan_events table exists (CREATE TABLE IF NOT EXISTS — safe to run every startup)
  if (process.env.DATABASE_URL) {
    try {
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.default.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
      });
      // Drop old snake_case table if it exists (wrong column names), then create correct one
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
      console.warn("[Startup] Table creation warning (non-fatal):", (err as Error).message);
    }
  }

  // Safe column migrations — idempotent, run every startup to ensure DB is in sync
  if (process.env.DATABASE_URL) {
    try {
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.default.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
      });

      // Migration 0025: driverAcceptedAt, driverRejectedAt, driverRejectionReason
      const [driverAcceptedCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'driverAcceptedAt'
      `) as any;
      if (driverAcceptedCols.length === 0) {
        await conn.execute("ALTER TABLE `loads` ADD `driverAcceptedAt` timestamp NULL");
        await conn.execute("ALTER TABLE `loads` ADD `driverRejectedAt` timestamp NULL");
        await conn.execute("ALTER TABLE `loads` ADD `driverRejectionReason` varchar(500) NULL");
        console.log("[Startup] Applied: driver accept/reject columns added to loads");
      }
      // Migration 0026: notes column on pod_documents
      const [podNotesCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pod_documents' AND COLUMN_NAME = 'notes'
      `) as any;
      if (podNotesCols.length === 0) {
        await conn.execute("ALTER TABLE `pod_documents` ADD `notes` text NULL");
        console.log("[Startup] Applied: notes column added to pod_documents");
      }
      // Migration 0027: signatureUrl, signatureKey on pod_documents
      const [podSigCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pod_documents' AND COLUMN_NAME = 'signatureUrl'
      `) as any;
      if (podSigCols.length === 0) {
        await conn.execute("ALTER TABLE `pod_documents` ADD `signatureUrl` text NULL");
        await conn.execute("ALTER TABLE `pod_documents` ADD `signatureKey` varchar(512) NULL");
        console.log("[Startup] Applied: signature columns added to pod_documents");
      }
      // Migration 0029: Add rateConfirmationNumber to loads table
      const [rateConfCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'rateConfirmationNumber'
      `) as any;
      if (rateConfCols.length === 0) {
        await conn.execute("ALTER TABLE `loads` ADD `rateConfirmationNumber` varchar(100) NULL");
        console.log("[Startup] Applied: rateConfirmationNumber column added to loads");
      }

      // Migration 0030: Create load_evidence table
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

      // Migration 0031: Driver fleet classification fields on users
      const [fleetTypeCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'fleetType'
      `) as any;
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

      // Migration 0007 (safe): Create driver_locations table if not exists
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

      // Migration 0032: Driver settlement fields on driver_payments
      const [settlementCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driver_payments' AND COLUMN_NAME = 'settlementWeek'
      `) as any;
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

      // Migration 0021: Add passwordHash column to users table
      const [pwHashCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'passwordHash'
      `) as any;
      if (pwHashCols.length === 0) {
        await conn.execute("ALTER TABLE `users` ADD `passwordHash` TEXT NULL");
        console.log("[Startup] Applied: passwordHash column added to users");
      } else {
        console.log("[Startup] OK: passwordHash column already exists");
      }

      // Migration 0018: Ensure users.role enum includes 'owner' and 'driver'
      // We do this by checking if any user has role='owner' or if the column allows it
      // Safe approach: try to modify the enum; ignore error if already correct
      try {
        await conn.execute(
          "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user','admin','driver','owner') NOT NULL DEFAULT 'user'"
        );
        console.log("[Startup] Applied: users.role enum updated to include owner/driver");
      } catch (enumErr: any) {
        // Ignore if already correct
        if (!String(enumErr.message).includes("Duplicate")) {
          console.log("[Startup] OK: users.role enum already includes owner/driver");
        }
      }

      // Seed owner accounts (idempotent UPSERT - always ensures correct state)
      const bcrypt = await import("bcryptjs");
      const defaultPasswordHash = await bcrypt.default.hash("WVTransport2026!", 10);
      const ownerAccounts = [
        { email: "wascar.ortiz0410@gmail.com", name: "Wascar Ortiz", openId: "owner-wascar-001" },
        { email: "yisvel10@gmail.com", name: "Yisvel", openId: "owner-yisvel-002" },
      ];
      for (const owner of ownerAccounts) {
        const [existing] = await conn.execute(
          `SELECT id, passwordHash FROM users WHERE email = ? LIMIT 1`,
          [owner.email]
        ) as any;
        if (existing.length === 0) {
          // User doesn't exist - create with default password
          await conn.execute(
            `INSERT INTO users (openId, name, email, role, passwordHash, loginMethod, createdAt, updatedAt, lastSignedIn)
             VALUES (?, ?, ?, 'owner', ?, 'email', NOW(), NOW(), NOW())`,
            [owner.openId, owner.name, owner.email, defaultPasswordHash]
          );
          console.log(`[Startup] Created owner account: ${owner.email}`);
        } else {
          // User exists - always ensure role=owner and set password if missing
          const hasPassword = existing[0].passwordHash && existing[0].passwordHash.length > 10;
          if (!hasPassword) {
            await conn.execute(
              `UPDATE users SET role = 'owner', passwordHash = ?, loginMethod = 'email' WHERE email = ?`,
              [defaultPasswordHash, owner.email]
            );
            console.log(`[Startup] Updated owner account (set password): ${owner.email}`);
          } else {
            await conn.execute(
              `UPDATE users SET role = 'owner' WHERE email = ?`,
              [owner.email]
            );
            console.log(`[Startup] OK: owner account verified: ${owner.email}`);
          }
        }
      }

      // ── Migration: brokerName + brokerContact + loadScore on loads table ─────────
      const [brokerNameCols] = await conn.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'brokerName'
      `) as any;
      if (brokerNameCols.length === 0) {
        await conn.execute("ALTER TABLE `loads` ADD `brokerName` varchar(255) NULL");
        await conn.execute("ALTER TABLE `loads` ADD `brokerContact` varchar(255) NULL");
        await conn.execute("ALTER TABLE `loads` ADD `brokerPhone` varchar(50) NULL");
        await conn.execute("ALTER TABLE `loads` ADD `loadScore` int NULL");
        await conn.execute("ALTER TABLE `loads` ADD `estimatedMiles` decimal(10,2) NULL");
        console.log("[Startup] Applied: broker fields + loadScore + estimatedMiles added to loads");
      } else {
        // Ensure loadScore and estimatedMiles exist even if brokerName was added earlier
        const [loadScoreCols] = await conn.execute(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'loads' AND COLUMN_NAME = 'loadScore'
        `) as any;
        if (loadScoreCols.length === 0) {
          await conn.execute("ALTER TABLE `loads` ADD `loadScore` int NULL");
          await conn.execute("ALTER TABLE `loads` ADD `estimatedMiles` decimal(10,2) NULL");
          console.log("[Startup] Applied: loadScore + estimatedMiles added to loads");
        } else {
          console.log("[Startup] OK: broker fields already exist on loads");
        }
      }

      // ── Migration: driver_feedback table ──────────────────────────────────
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

      // ── Cleanup: remove test/duplicate accounts ──────────────────────────────────
      try {
        const testCondition = `email IN ('driver@example.com','test-annual@example.com','test-comparison@example.com','wascar.orti0410@gmail.com') OR (name = 'Test Driver' AND email LIKE '%example%')`;
        // Delete FK-dependent child records first to avoid constraint errors
        await conn.execute(`DELETE FROM load_quotations WHERE userId IN (SELECT id FROM users WHERE ${testCondition})`).catch(() => {});
        await conn.execute(`DELETE FROM driver_payments WHERE driverId IN (SELECT id FROM users WHERE ${testCondition})`).catch(() => {});
        await conn.execute(`DELETE FROM driver_locations WHERE driverId IN (SELECT id FROM users WHERE ${testCondition})`).catch(() => {});
        await conn.execute(`DELETE FROM driver_settlements WHERE driverId IN (SELECT id FROM users WHERE ${testCondition})`).catch(() => {});
        // Now delete the users
        const [cleaned] = await conn.execute(`DELETE FROM users WHERE ${testCondition}`) as any[];
        if (cleaned.affectedRows > 0) {
          console.log(`[Startup] Cleaned up ${cleaned.affectedRows} test/duplicate user(s)`);
        }
      } catch (cleanupErr) {
        console.warn("[Startup] Cleanup warning (non-fatal):", (cleanupErr as Error).message);
      }

      await conn.end();
    } catch (err) {
      console.warn("[Startup] Safe migration warning (non-fatal):", (err as Error).message);
    }
  }

  // Initialize WebSocket server
  wsManager.initialize(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
