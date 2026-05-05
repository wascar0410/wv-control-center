import { getDb } from "./server/db.ts";

console.log("\n📊 CHECKING LOADS ADDRESS DATA...\n");

const db = await getDb();

// 1. Count loads with both addresses
const withBothAddresses = await db.query.loads.findMany({
  where: (loads, { and, isNotNull }) => and(
    isNotNull(loads.pickupAddress),
    isNotNull(loads.deliveryAddress)
  ),
  columns: { id: true },
});

console.log(`✅ Loads WITH both addresses: ${withBothAddresses.length}`);

// 2. Count loads with missing addresses
const missingPickup = await db.query.loads.findMany({
  where: (loads, { isNull }) => isNull(loads.pickupAddress),
  columns: { id: true },
});

const missingDelivery = await db.query.loads.findMany({
  where: (loads, { isNull }) => isNull(loads.deliveryAddress),
  columns: { id: true },
});

console.log(`❌ Loads WITHOUT pickupAddress: ${missingPickup.length}`);
console.log(`❌ Loads WITHOUT deliveryAddress: ${missingDelivery.length}`);

// 3. Sample of 10 loads WITH addresses
console.log("\n📍 SAMPLE: 10 Loads WITH Addresses\n");
const withAddresses = await db.query.loads.findMany({
  where: (loads, { and, isNotNull }) => and(
    isNotNull(loads.pickupAddress),
    isNotNull(loads.deliveryAddress)
  ),
  limit: 10,
  columns: {
    id: true,
    pickupAddress: true,
    deliveryAddress: true,
    pickupLat: true,
    pickupLng: true,
    deliveryLat: true,
    deliveryLng: true,
  },
});

withAddresses.forEach((load, i) => {
  console.log(`${i + 1}. Load #${load.id}`);
  console.log(`   Pickup: ${load.pickupAddress}`);
  console.log(`   Coords: (${load.pickupLat}, ${load.pickupLng})`);
  console.log(`   Delivery: ${load.deliveryAddress}`);
  console.log(`   Coords: (${load.deliveryLat}, ${load.deliveryLng})`);
  console.log();
});

// 4. Sample of 10 loads WITHOUT addresses
console.log("\n⚠️  SAMPLE: 10 Loads WITHOUT Addresses\n");
const withoutAddresses = await db.query.loads.findMany({
  where: (loads, { or, isNull }) => or(
    isNull(loads.pickupAddress),
    isNull(loads.deliveryAddress)
  ),
  limit: 10,
  columns: {
    id: true,
    pickupAddress: true,
    deliveryAddress: true,
    pickupLat: true,
    pickupLng: true,
    deliveryLat: true,
    deliveryLng: true,
  },
});

withoutAddresses.forEach((load, i) => {
  console.log(`${i + 1}. Load #${load.id}`);
  console.log(`   Pickup: ${load.pickupAddress || "NULL"}`);
  console.log(`   Coords: (${load.pickupLat}, ${load.pickupLng})`);
  console.log(`   Delivery: ${load.deliveryAddress || "NULL"}`);
  console.log(`   Coords: (${load.deliveryLat}, ${load.deliveryLng})`);
  console.log();
});

console.log("✅ Analysis complete");
process.exit(0);
