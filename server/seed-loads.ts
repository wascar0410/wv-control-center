/**
 * Seed script: inserts realistic test loads for WV Transport & Logistics, LLC
 * Run: npx tsx server/seed-loads.ts
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection({
  uri: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Get admin user id
const [users] = await conn.execute<any[]>("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
const adminId = (users as any[])[0]?.id ?? 1;

// Get driver user id if exists
const [drivers] = await conn.execute<any[]>("SELECT id FROM users WHERE role = 'driver' LIMIT 1");
const driverId = (drivers as any[])[0]?.id ?? null;

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
const daysAhead = (d: number) => new Date(now.getTime() + d * 86400000);

const loads = [
  // 1. AVAILABLE
  {
    clientName: "Coyote Logistics",
    pickupAddress: "1234 Industrial Blvd, Philadelphia, PA 19103",
    deliveryAddress: "890 Commerce Dr, Newark, NJ 07102",
    pickupLat: "39.9526", pickupLng: "-75.1652",
    deliveryLat: "40.7357", deliveryLng: "-74.1724",
    weight: "1850.00", weightUnit: "lbs",
    merchandiseType: "Auto Parts",
    price: "485.00", estimatedFuel: "42.00", estimatedTolls: "18.50", netMargin: "424.50",
    status: "available", assignedDriverId: null,
    notes: "Fragile — handle with care. BOL required at pickup.",
    pickupDate: daysAhead(1), deliveryDate: daysAhead(1),
  },
  // 2. AVAILABLE
  {
    clientName: "Echo Global Logistics",
    pickupAddress: "500 Keystone Ave, Bensalem, PA 19020",
    deliveryAddress: "200 Park Ave, New York, NY 10166",
    pickupLat: "40.1065", pickupLng: "-74.9418",
    deliveryLat: "40.7549", deliveryLng: "-73.9840",
    weight: "2200.00", weightUnit: "lbs",
    merchandiseType: "Medical Supplies",
    price: "620.00", estimatedFuel: "55.00", estimatedTolls: "28.00", netMargin: "537.00",
    status: "available", assignedDriverId: null,
    notes: "Temperature sensitive. Deliver to loading dock B.",
    pickupDate: daysAhead(2), deliveryDate: daysAhead(2),
  },
  // 3. IN_TRANSIT
  {
    clientName: "XPO Logistics",
    pickupAddress: "750 Bethlehem Pike, Montgomeryville, PA 18936",
    deliveryAddress: "1100 Raymond Blvd, Newark, NJ 07102",
    pickupLat: "40.2454", pickupLng: "-75.2380",
    deliveryLat: "40.7357", deliveryLng: "-74.1724",
    weight: "3100.00", weightUnit: "lbs",
    merchandiseType: "Electronics — Laptops",
    price: "780.00", estimatedFuel: "68.00", estimatedTolls: "32.00", netMargin: "680.00",
    status: "in_transit", assignedDriverId: driverId,
    notes: "High value cargo. Signature required at delivery. Ref# XPO-2026-4471.",
    pickupDate: daysAgo(0), deliveryDate: daysAhead(0),
  },
  // 4. IN_TRANSIT
  {
    clientName: "Total Quality Logistics (TQL)",
    pickupAddress: "300 Commerce Blvd, Fairless Hills, PA 19030",
    deliveryAddress: "450 Raritan Center Pkwy, Edison, NJ 08837",
    pickupLat: "40.1776", pickupLng: "-74.8527",
    deliveryLat: "40.5187", deliveryLng: "-74.3718",
    weight: "2750.00", weightUnit: "lbs",
    merchandiseType: "Retail Merchandise — Clothing",
    price: "540.00", estimatedFuel: "48.00", estimatedTolls: "22.00", netMargin: "470.00",
    status: "in_transit", assignedDriverId: driverId,
    notes: "Deliver to receiving department. Call 30 min before arrival.",
    pickupDate: daysAgo(0), deliveryDate: daysAhead(0),
  },
  // 5. DELIVERED
  {
    clientName: "Transplace",
    pickupAddress: "1800 JFK Blvd, Philadelphia, PA 19103",
    deliveryAddress: "100 Overlook Center, Princeton, NJ 08540",
    pickupLat: "39.9526", pickupLng: "-75.1652",
    deliveryLat: "40.3573", deliveryLng: "-74.6672",
    weight: "1500.00", weightUnit: "lbs",
    merchandiseType: "Office Furniture",
    price: "395.00", estimatedFuel: "35.00", estimatedTolls: "15.00", netMargin: "345.00",
    status: "delivered", assignedDriverId: driverId,
    notes: "POD uploaded. Awaiting invoice submission.",
    pickupDate: daysAgo(2), deliveryDate: daysAgo(1),
  },
  // 6. DELIVERED
  {
    clientName: "Worldwide Express",
    pickupAddress: "2200 W Hunting Park Ave, Philadelphia, PA 19140",
    deliveryAddress: "600 Meadowlands Pkwy, Secaucus, NJ 07094",
    pickupLat: "40.0079", pickupLng: "-75.1635",
    deliveryLat: "40.7891", deliveryLng: "-74.0565",
    weight: "980.00", weightUnit: "lbs",
    merchandiseType: "Pharmaceutical Samples",
    price: "510.00", estimatedFuel: "46.00", estimatedTolls: "24.00", netMargin: "440.00",
    status: "delivered", assignedDriverId: driverId,
    notes: "Cold chain maintained. POD signed by John Martinez.",
    pickupDate: daysAgo(4), deliveryDate: daysAgo(3),
  },
  // 7. INVOICED
  {
    clientName: "Coyote Logistics",
    pickupAddress: "4500 Rising Sun Ave, Philadelphia, PA 19140",
    deliveryAddress: "300 Lighting Way, Secaucus, NJ 07094",
    pickupLat: "40.0300", pickupLng: "-75.1200",
    deliveryLat: "40.7891", deliveryLng: "-74.0565",
    weight: "2050.00", weightUnit: "lbs",
    merchandiseType: "Industrial Equipment",
    price: "695.00", estimatedFuel: "62.00", estimatedTolls: "28.00", netMargin: "605.00",
    status: "invoiced", assignedDriverId: driverId,
    notes: "Invoice #WV-2026-0031 sent 03/28/2026. Net-30 terms. Expected payment 04/27/2026.",
    pickupDate: daysAgo(8), deliveryDate: daysAgo(7),
  },
  // 8. PAID
  {
    clientName: "Echo Global Logistics",
    pickupAddress: "1 Commerce Square, Philadelphia, PA 19103",
    deliveryAddress: "100 Avenue of the Arts, Newark, NJ 07102",
    pickupLat: "39.9526", pickupLng: "-75.1652",
    deliveryLat: "40.7357", deliveryLng: "-74.1724",
    weight: "1200.00", weightUnit: "lbs",
    merchandiseType: "Retail Goods — Electronics",
    price: "425.00", estimatedFuel: "38.00", estimatedTolls: "17.00", netMargin: "370.00",
    status: "paid", assignedDriverId: driverId,
    notes: "Payment received via ACH 04/01/2026. Transaction ref #ACH-88421.",
    pickupDate: daysAgo(15), deliveryDate: daysAgo(14),
  },
  // 9. PAID
  {
    clientName: "Total Quality Logistics (TQL)",
    pickupAddress: "3600 Market St, Philadelphia, PA 19104",
    deliveryAddress: "250 Pehle Ave, Saddle Brook, NJ 07663",
    pickupLat: "39.9566", pickupLng: "-75.1933",
    deliveryLat: "40.8987", deliveryLng: "-74.0965",
    weight: "1650.00", weightUnit: "lbs",
    merchandiseType: "Food & Beverage — Dry Goods",
    price: "360.00", estimatedFuel: "32.00", estimatedTolls: "14.00", netMargin: "314.00",
    status: "paid", assignedDriverId: driverId,
    notes: "Payment received via check 03/25/2026. Check #4892.",
    pickupDate: daysAgo(20), deliveryDate: daysAgo(19),
  },
];

console.log(`\nInserting ${loads.length} test loads into database...\n`);

for (const load of loads) {
  await conn.execute(
    `INSERT INTO loads 
      (clientName, pickupAddress, deliveryAddress, pickupLat, pickupLng, deliveryLat, deliveryLng,
       weight, weightUnit, merchandiseType, price, estimatedFuel, estimatedTolls, netMargin,
       status, assignedDriverId, notes, pickupDate, deliveryDate, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      load.clientName, load.pickupAddress, load.deliveryAddress,
      load.pickupLat, load.pickupLng, load.deliveryLat, load.deliveryLng,
      load.weight, load.weightUnit, load.merchandiseType, load.price,
      load.estimatedFuel, load.estimatedTolls, load.netMargin,
      load.status, load.assignedDriverId, load.notes,
      load.pickupDate, load.deliveryDate, adminId,
    ]
  );
  console.log(`  ✓ [${load.status.toUpperCase().padEnd(10)}] ${load.clientName} — $${load.price}`);
}

await conn.end();
console.log("\n✅ Seed complete. 9 loads inserted successfully.\n");
