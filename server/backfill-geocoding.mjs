/**
 * BACKFILL GEOCODING SCRIPT - ENTERPRISE GRADE
 * Enriquece TODOS los loads existentes con coordenadas geocodificadas
 * 
 * Características CRÍTICAS:
 * - Cache persistente (JSON) - evita re-pagar por requests
 * - Retry inteligente con exponential backoff (429 handling)
 * - Control de concurrencia (máximo 5 simultáneos)
 * - Costo estimado de API
 * - Métricas detalladas
 * - Rate limiting (5 req/seg)
 * 
 * Uso: node backfill-geocoding.mjs
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { geocodeAddress } from "./_core/geocoding.js";

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "wv_control_center",
};

const RATE_LIMIT = 5; // máximo 5 requests/segundo
const DELAY_MS = Math.ceil(1000 / RATE_LIMIT); // 200ms entre requests
const COST_PER_REQUEST = 0.005; // $0.005 por request (Google Maps)
const CACHE_FILE = "geocode-cache.json";

// ─── CACHE PERSISTENTE ────────────────────────────────────────────────────────

function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      const entries = JSON.parse(data);
      return new Map(entries);
    }
  } catch (err) {
    console.warn(`[CACHE] Failed to load cache: ${err.message}`);
  }
  return new Map();
}

function saveCacheToDisk(cache) {
  try {
    const entries = Array.from(cache.entries());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2));
    console.log(`[CACHE] Saved ${entries.length} entries to ${CACHE_FILE}`);
  } catch (err) {
    console.error(`[CACHE] Failed to save cache: ${err.message}`);
  }
}

const geoCache = loadCacheFromDisk();

function getCacheKey(address) {
  return address.trim().toLowerCase();
}

function getCachedResult(address) {
  const key = getCacheKey(address);
  return geoCache.get(key);
}

function setCachedResult(address, result) {
  const key = getCacheKey(address);
  geoCache.set(key, result);
}

// ─── VALIDACIÓN DE DIRECCIONES ────────────────────────────────────────────────

function isValidAddress(address) {
  if (!address) return false;
  if (typeof address !== "string") return false;

  const trimmed = address.trim();

  // Mínimo 5 caracteres
  if (trimmed.length < 5) return false;

  // Excluir direcciones basura comunes
  const basura = [
    "tbd",
    "same as pickup",
    "same as delivery",
    "unknown",
    "n/a",
    "none",
    "pending",
    "warehouse near",
    "exit",
    "rest area",
  ];

  const lower = trimmed.toLowerCase();
  if (basura.some((word) => lower.includes(word))) return false;

  return true;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg, data = {}) {
  console.log(`[GEOCODE_BACKFILL] ${msg}`, JSON.stringify(data));
}

// ─── RETRY INTELIGENTE CON EXPONENTIAL BACKOFF ────────────────────────────────

async function safeGeocode(address, retries = 3) {
  if (!isValidAddress(address)) {
    return null;
  }

  // Verificar cache
  const cached = getCachedResult(address);
  if (cached !== undefined) {
    return cached;
  }

  let delay_ms = 500;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await geocodeAddress(address);

      // Guardar en cache (incluso si es null)
      setCachedResult(address, result);

      return result;
    } catch (err) {
      const isRateLimit = err.response?.status === 429 || err.message?.includes("429");

      if (isRateLimit && attempt < retries - 1) {
        // Exponential backoff para rate limits
        log(`Rate limit detected (attempt ${attempt + 1}/${retries})`, {
          address: address.substring(0, 30),
          delay_ms,
        });
        await delay(delay_ms);
        delay_ms *= 2; // Exponential backoff: 500 → 1000 → 2000
      } else if (attempt < retries - 1) {
        // Retry simple para otros errores
        await delay(500);
      } else {
        // Último intento fallido
        log(`Geocoding failed after ${retries} attempts`, {
          address: address.substring(0, 30),
          error: err.message,
        });
        setCachedResult(address, null);
        return null;
      }
    }
  }

  return null;
}

// ─── MAIN SCRIPT ──────────────────────────────────────────────────────────────

async function backfillLoadCoordinates() {
  let connection;

  // Métricas
  const metrics = {
    processed: 0,
    updated: 0,
    failed: 0,
    pickupGeocoded: 0,
    deliveryGeocoded: 0,
    pickupFailed: 0,
    deliveryFailed: 0,
    invalidAddresses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
  };

  try {
    // Conectar a DB
    log("Connecting to database...");
    connection = await mysql.createConnection(DB_CONFIG);
    log("Connected!");

    // Buscar loads con coordenadas faltantes
    log("Querying loads with missing coordinates...");
    const [loads] = await connection.query(
      `SELECT id, pickupAddress, pickupLat, pickupLng, deliveryAddress, deliveryLat, deliveryLng
       FROM loads
       WHERE pickupLat IS NULL OR deliveryLat IS NULL
       ORDER BY id ASC`
    );

    log(`Found ${loads.length} loads to process`);

    if (loads.length === 0) {
      log("No loads to process. Exiting.");
      return;
    }

    // Procesar cada load
    for (let i = 0; i < loads.length; i++) {
      const load = loads[i];
      metrics.processed++;

      try {
        let updateData = {};
        let geocoded = false;

        // 🧭 Geocodificar pickup si falta
        if (!load.pickupLat && load.pickupAddress) {
          if (!isValidAddress(load.pickupAddress)) {
            metrics.invalidAddresses++;
            log(`Invalid pickup address for load ${load.id}`, {
              address: load.pickupAddress,
            });
          } else {
            // Verificar si está en cache
            const cached = getCachedResult(load.pickupAddress);
            if (cached !== undefined) {
              metrics.cacheHits++;
            } else {
              metrics.cacheMisses++;
              metrics.apiCalls++;
            }

            try {
              const pickupGeocode = await safeGeocode(load.pickupAddress);

              if (pickupGeocode) {
                updateData.pickupLat = pickupGeocode.latitude;
                updateData.pickupLng = pickupGeocode.longitude;
                geocoded = true;
                metrics.pickupGeocoded++;

                log(`Pickup geocoded for load ${load.id}`, {
                  address: load.pickupAddress,
                  lat: pickupGeocode.latitude,
                  lng: pickupGeocode.longitude,
                });
              } else {
                metrics.pickupFailed++;
              }
            } catch (err) {
              metrics.pickupFailed++;
              log(`Pickup geocoding failed for load ${load.id}`, {
                error: err.message,
              });
            }
          }
        }

        // 🧭 Geocodificar delivery si falta
        if (!load.deliveryLat && load.deliveryAddress) {
          if (!isValidAddress(load.deliveryAddress)) {
            metrics.invalidAddresses++;
            log(`Invalid delivery address for load ${load.id}`, {
              address: load.deliveryAddress,
            });
          } else {
            // Verificar si está en cache
            const cached = getCachedResult(load.deliveryAddress);
            if (cached !== undefined) {
              metrics.cacheHits++;
            } else {
              metrics.cacheMisses++;
              metrics.apiCalls++;
            }

            try {
              const deliveryGeocode = await safeGeocode(load.deliveryAddress);

              if (deliveryGeocode) {
                updateData.deliveryLat = deliveryGeocode.latitude;
                updateData.deliveryLng = deliveryGeocode.longitude;
                geocoded = true;
                metrics.deliveryGeocoded++;

                log(`Delivery geocoded for load ${load.id}`, {
                  address: load.deliveryAddress,
                  lat: deliveryGeocode.latitude,
                  lng: deliveryGeocode.longitude,
                });
              } else {
                metrics.deliveryFailed++;
              }
            } catch (err) {
              metrics.deliveryFailed++;
              log(`Delivery geocoding failed for load ${load.id}`, {
                error: err.message,
              });
            }
          }
        }

        // 💾 Guardar en DB si se geocodificó algo
        if (geocoded && Object.keys(updateData).length > 0) {
          const setClause = Object.keys(updateData)
            .map((key) => `${key} = ?`)
            .join(", ");
          const values = Object.values(updateData);

          await connection.query(
            `UPDATE loads SET ${setClause} WHERE id = ?`,
            [...values, load.id]
          );

          metrics.updated++;
          log(`Load ${load.id} updated`, updateData);
        }

        // Rate limiting
        if ((i + 1) % RATE_LIMIT === 0) {
          log(`Processed ${i + 1}/${loads.length}. Rate limiting...`);
          await delay(DELAY_MS * RATE_LIMIT);
        } else {
          await delay(DELAY_MS);
        }
      } catch (err) {
        metrics.failed++;
        log(`Error processing load ${load.id}`, { error: err.message });
      }
    }

    // 💾 GUARDAR CACHE PERSISTENTE
    saveCacheToDisk(geoCache);

    // 📊 RESUMEN FINAL
    const successRate = ((metrics.updated / metrics.processed) * 100).toFixed(2);
    const cacheHitRate = (
      (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses || 1)) *
      100
    ).toFixed(2);
    const estimatedCost = (metrics.apiCalls * COST_PER_REQUEST).toFixed(2);

    log("[GEOCODE_BACKFILL_SUMMARY]", {
      totalLoads: loads.length,
      processed: metrics.processed,
      updated: metrics.updated,
      failed: metrics.failed,
      successRate: `${successRate}%`,
      pickupGeocoded: metrics.pickupGeocoded,
      deliveryGeocoded: metrics.deliveryGeocoded,
      pickupFailed: metrics.pickupFailed,
      deliveryFailed: metrics.deliveryFailed,
      invalidAddresses: metrics.invalidAddresses,
      apiCalls: metrics.apiCalls,
      cacheSize: geoCache.size,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      cacheHitRate: `${cacheHitRate}%`,
      estimatedCost: `$${estimatedCost}`,
    });

    console.log("\n✅ BACKFILL COMPLETE\n");
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Loads Updated: ${metrics.updated}/${metrics.processed}`);
    console.log(`Cache Size: ${geoCache.size} unique addresses`);
    console.log(`Estimated API Cost: $${estimatedCost}`);
    console.log(`Cache Hit Rate: ${cacheHitRate}%`);
  } catch (err) {
    log("FATAL ERROR", { error: err.message });
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log("Database connection closed");
    }
  }
}

// ─── EJECUTAR ─────────────────────────────────────────────────────────────────

backfillLoadCoordinates().catch((err) => {
  log("Script failed", { error: err.message });
  process.exit(1);
});
