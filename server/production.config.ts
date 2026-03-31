/**
 * Production Configuration for Railway Deployment
 * 
 * This file contains production-specific settings for:
 * - Database connections
 * - CORS and security headers
 * - WebSocket configuration
 * - File upload settings
 * - Performance optimizations
 */

export const productionConfig = {
  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "production",

  // URLs
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || "http://localhost:3000",
  frontendPublicUrl: process.env.FRONTEND_PUBLIC_URL || "http://localhost:3000",

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(","),
  corsCredentials: process.env.CORS_CREDENTIALS === "true",

  // Authentication
  jwtSecret: process.env.JWT_SECRET,
  oauthServerUrl: process.env.OAUTH_SERVER_URL || "https://api.manus.im",

  // File Upload
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],

  // S3 Configuration
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_S3_BUCKET,
  },

  // Email Configuration
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },

  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  },

  // Plaid Configuration
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    env: process.env.PLAID_ENV || "production",
  },

  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,

  // Manus APIs
  manusForgeApi: {
    url: process.env.BUILT_IN_FORGE_API_URL || "https://api.manus.im",
    key: process.env.BUILT_IN_FORGE_API_KEY,
  },

  // Owner Information
  owner: {
    name: process.env.OWNER_NAME,
    openId: process.env.OWNER_OPEN_ID,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // WebSocket
  websocket: {
    // Disable HMR in production
    hmr: false,
    // Use secure WebSocket in production
    secure: true,
  },

  // Performance
  performance: {
    // Cache control headers
    cacheControl: {
      static: "public, max-age=31536000, immutable", // 1 year for static assets
      html: "public, max-age=3600, must-revalidate", // 1 hour for HTML
      api: "no-cache, no-store, must-revalidate", // No cache for API
    },
    // Compression
    compression: true,
    // Gzip level (1-9, higher = better compression but slower)
    gzipLevel: 6,
  },

  // Security Headers
  securityHeaders: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  },

  // Health Check
  healthCheck: {
    enabled: true,
    path: "/health",
    interval: 30000, // 30 seconds
  },
};

/**
 * Validation function to ensure all required variables are set
 */
export function validateProductionConfig(): string[] {
  const errors: string[] = [];

  // Required variables
  const required = [
    "databaseUrl",
    "jwtSecret",
    "backendPublicUrl",
    "frontendPublicUrl",
  ];

  for (const key of required) {
    const value = productionConfig[key as keyof typeof productionConfig];
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate URLs
  try {
    new URL(productionConfig.backendPublicUrl);
    new URL(productionConfig.frontendPublicUrl);
  } catch (error) {
    errors.push(`Invalid URL format in BACKEND_PUBLIC_URL or FRONTEND_PUBLIC_URL`);
  }

  // Validate JWT secret length
  if (productionConfig.jwtSecret && productionConfig.jwtSecret.length < 32) {
    errors.push(`JWT_SECRET must be at least 32 characters long`);
  }

  // Validate CORS origins
  if (!Array.isArray(productionConfig.allowedOrigins) || productionConfig.allowedOrigins.length === 0) {
    errors.push(`ALLOWED_ORIGINS must be a non-empty comma-separated list`);
  }

  return errors;
}

/**
 * Log configuration on startup (sanitized)
 */
export function logProductionConfig(): void {
  console.log("[Production Config] Loaded configuration:");
  console.log(`  - Node Environment: ${productionConfig.nodeEnv}`);
  console.log(`  - Port: ${productionConfig.port}`);
  console.log(`  - Backend URL: ${productionConfig.backendPublicUrl}`);
  console.log(`  - Frontend URL: ${productionConfig.frontendPublicUrl}`);
  console.log(`  - CORS Origins: ${productionConfig.allowedOrigins.join(", ")}`);
  console.log(`  - Database: ${productionConfig.databaseUrl ? "✓ Configured" : "✗ Missing"}`);
  console.log(`  - JWT Secret: ${productionConfig.jwtSecret ? "✓ Configured" : "✗ Missing"}`);
  console.log(`  - S3 Bucket: ${productionConfig.aws.bucket || "Not configured"}`);
  console.log(`  - SMTP: ${productionConfig.smtp.host ? "✓ Configured" : "✗ Not configured"}`);
  console.log(`  - Twilio: ${productionConfig.twilio.accountSid ? "✓ Configured" : "✗ Not configured"}`);
  console.log(`  - Plaid: ${productionConfig.plaid.clientId ? "✓ Configured" : "✗ Not configured"}`);
}

export default productionConfig;
