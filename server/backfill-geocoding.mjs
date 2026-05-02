/**
 * BACKFILL GEOCODING SCRIPT
 * Enriquece TODOS los loads existentes con coordenadas geocodificadas
 * 
 * Uso: node backfill-geocoding.mjs
 */

import mysql from "mysql2/promise";
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg, data = {}) {
  console.log(`[GEOCODE_BACKFILL] ${msg}`, data);
}

// ─── MAIN SCRIPT ──────────────────────────────────────────────────────────────

async function backfillLoadCoordinates() {
  let connection;
  let processed = 0;
  let updated = 0;
  let failed = 0;

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
      processed++;

      try {
        let updateData = {};
        let geocoded = false;

        // Geocodificar pickup si falta
        if (!load.pickupLat && load.pickupAddress) {
          try {
            const pickupGeocode = await geocodeAddress(load.pickupAddress);
            if (pickupGeocode) {
              updateData.pickupLat = pickupGeocode.latitude;
              updateData.pickupLng = pickupGeocode.longitude;
              geocoded = true;
              log(`Pickup geocoded for load ${load.id}`, {
                address: load.pickupAddress,
                lat: pickupGeocode.latitude,
                lng: pickupGeocode.longitude,
              });
            }
          } catch (err) {
            log(`Pickup geocoding failed for load ${load.id}`, { error: err.message });
          }
        }

        // Geocodificar delivery si falta
        if (!load.deliveryLat && load.deliveryAddress) {
          try {
            const deliveryGeocode = await geocodeAddress(load.deliveryAddress);
            if (deliveryGeocode) {
              updateData.deliveryLat = deliveryGeocode.latitude;
              updateData.deliveryLng = deliveryGeocode.longitude;
              geocoded = true;
              log(`Delivery geocoded for load ${load.id}`, {
                address: load.deliveryAddress,
                lat: deliveryGeocode.latitude,
                lng: deliveryGeocode.longitude,
              });
            }
          } catch (err) {
            log(`Delivery geocoding failed for load ${load.id}`, { error: err.message });
          }
        }

        // Guardar en DB si se geocodificó algo
        if (geocoded && Object.keys(updateData).length > 0) {
          const setClause = Object.keys(updateData)
            .map((key) => `${key} = ?`)
            .join(", ");
          const values = Object.values(updateData);

          await connection.query(
            `UPDATE loads SET ${setClause} WHERE id = ?`,
            [...values, load.id]
          );

          updated++;
          log(`Load ${load.id} updated`, updateData);
        }

        // Rate limiting
        if ((i + 1) % RATE_LIMIT === 0) {
          log(`Processed ${i + 1}/${loads.length} loads. Rate limiting...`);
          await delay(DELAY_MS * RATE_LIMIT);
        } else {
          await delay(DELAY_MS);
        }
      } catch (err) {
        failed++;
        log(`Error processing load ${load.id}`, { error: err.message });
      }
    }

    // Resumen final
    log("BACKFILL COMPLETE", {
      processed,
      updated,
      failed,
      success_rate: `${((updated / processed) * 100).toFixed(2)}%`,
    });
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
