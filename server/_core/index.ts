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

  // Initialize WebSocket server
  wsManager.initialize(server);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
