/**
 * Full Seed Data Script - Corrected for actual schema
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = new URL(process.env.DATABASE_URL || "mysql://root@localhost/wv_control");
const DB_CONFIG = {
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1).split("?")[0],
  ssl: dbUrl.hostname.includes("tidbcloud") ? { rejectUnauthorized: false } : false,
};

async function seedData() {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log("✅ Connected to database\n");

    // 1. Create Company
    console.log("📦 Creating company...");
    const companyResult = await connection.execute(
      `INSERT INTO companies (name, dotNumber, mcNumber, email, phone, website, address, city, state, zipCode, complianceStatus, ownerId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ["WV Logistics", String(Math.floor(Math.random() * 9000000 + 1000000)), `MC-${Math.floor(Math.random() * 900000 + 100000)}`, "info@wvlogistics.com", "555-0100", "https://wvlogistics.com", "123 Main St", "Charleston", "WV", "25301", "active", 1]
    );
    const companyId = companyResult[0].insertId;
    console.log(`✅ Company created: ID ${companyId}\n`);

    // 2. Create Users (without companyId - not in schema)
    console.log("👥 Creating users...");
    const adminResult = await connection.execute(
      `INSERT INTO users (name, email, role, openId, loginMethod, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      ["Admin User", "admin@wvlogistics.com", "admin", `admin-${Date.now()}`, "oauth"]
    );
    const adminId = adminResult[0].insertId;

    const dispatcherResult = await connection.execute(
      `INSERT INTO users (name, email, role, openId, loginMethod, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      ["Dispatcher User", "dispatcher@wvlogistics.com", "admin", `dispatcher-${Date.now()}`, "oauth"]
    );
    const dispatcherId = dispatcherResult[0].insertId;
    console.log(`✅ Users created: Admin ID ${adminId}, Dispatcher ID ${dispatcherId}\n`);

    // 3. Create Driver
    console.log("🚗 Creating driver...");
    const driverResult = await connection.execute(
      `INSERT INTO users (name, email, role, openId, loginMethod, fleetType, commissionPercent, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      ["John Driver", "john@wvlogistics.com", "driver", `driver-${Date.now()}`, "oauth", "internal", "0.00"]
    );
    const driverId = driverResult[0].insertId;
    console.log(`✅ Driver created: ID ${driverId}\n`);

    // 4. Create Wallet
    console.log("💰 Creating wallet...");
    const walletResult = await connection.execute(
      `INSERT INTO wallets (driverId, totalEarnings, availableBalance, pendingBalance, blockedBalance, minimumWithdrawalAmount, withdrawalFeePercent, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [driverId, 5000, 3000, 1500, 500, 100, 2.5]
    );
    const walletId = walletResult[0].insertId;
    console.log(`✅ Wallet created: ID ${walletId}\n`);

    // 5. Create Wallet Transactions
    console.log("📊 Creating wallet transactions...");
    await connection.execute(
      `INSERT INTO wallet_transactions (walletId, driverId, type, amount, description, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [walletId, driverId, "load_payment", 1500, "Load #001 payment", "completed"]
    );
    await connection.execute(
      `INSERT INTO wallet_transactions (walletId, driverId, type, amount, description, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [walletId, driverId, "load_payment", 1200, "Load #002 payment", "completed"]
    );
    await connection.execute(
      `INSERT INTO wallet_transactions (walletId, driverId, type, amount, description, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [walletId, driverId, "adjustment", -200, "Fuel surcharge adjustment", "completed"]
    );
    console.log(`✅ Wallet transactions created\n`);

    // 6. Create Loads
    console.log("📦 Creating loads...");
    const load1Result = await connection.execute(
      `INSERT INTO loads (companyId, brokerId, brokerName, pickupLocation, deliveryLocation, pickupDate, deliveryDate, status, totalMiles, loadedMiles, weight, ratePerMile, totalRate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [companyId, 1, "Broker A", "Atlanta, GA", "Charlotte, NC", new Date(), new Date(Date.now() + 86400000), "dispatched", 250, 200, 10000, 2.5, 625]
    );
    const loadId1 = load1Result[0].insertId;

    const load2Result = await connection.execute(
      `INSERT INTO loads (companyId, brokerId, brokerName, pickupLocation, deliveryLocation, pickupDate, deliveryDate, status, totalMiles, loadedMiles, weight, ratePerMile, totalRate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [companyId, 2, "Broker B", "Nashville, TN", "Memphis, TN", new Date(), new Date(Date.now() + 86400000), "approved", 180, 150, 8000, 2.0, 360]
    );
    const loadId2 = load2Result[0].insertId;

    const load3Result = await connection.execute(
      `INSERT INTO loads (companyId, brokerId, brokerName, pickupLocation, deliveryLocation, pickupDate, deliveryDate, status, totalMiles, loadedMiles, weight, ratePerMile, totalRate, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [companyId, 3, "Broker C", "Louisville, KY", "Indianapolis, IN", new Date(), new Date(Date.now() + 86400000), "pending", 120, 100, 6000, 2.2, 264]
    );
    const loadId3 = load3Result[0].insertId;
    console.log(`✅ Loads created: ${loadId1}, ${loadId2}, ${loadId3}\n`);

    // 7. Create Quote Analyses
    console.log("📈 Creating quote analyses...");
    await connection.execute(
      `INSERT INTO quote_analysis (loadId, brokerName, totalMiles, loadedMiles, baseRate, totalIncome, estimatedFuel, totalEstimatedCost, estimatedProfit, estimatedMargin, ratePerLoadedMile, recommendedMinimumRate, verdict, analyzedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [loadId1, "Broker A", 250, 200, 625, 625, 150, 400, 225, 36, 3.125, 2.5, "accept", adminId]
    );

    await connection.execute(
      `INSERT INTO quote_analysis (loadId, brokerName, totalMiles, loadedMiles, baseRate, totalIncome, estimatedFuel, totalEstimatedCost, estimatedProfit, estimatedMargin, ratePerLoadedMile, recommendedMinimumRate, verdict, analyzedBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [loadId2, "Broker B", 180, 150, 360, 360, 120, 300, 60, 16.67, 2.4, 2.8, "reject", adminId]
    );
    console.log(`✅ Quote analyses created\n`);

    // 8. Create Settlement
    console.log("🏦 Creating settlement...");
    const settlementResult = await connection.execute(
      `INSERT INTO settlements (settlementPeriod, startDate, endDate, partner1Id, partner2Id, partner1Share, partner2Share, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ["2026-04", new Date("2026-04-01"), new Date("2026-04-30"), adminId, dispatcherId, 50, 50, "pending"]
    );
    const settlementId = settlementResult[0].insertId;
    console.log(`✅ Settlement created: ID ${settlementId}\n`);

    // 9. Create Invoice
    console.log("📄 Creating invoice...");
    const invoiceResult = await connection.execute(
      `INSERT INTO invoices (loadId, brokerName, brokerId, subtotal, taxRate, taxAmount, total, dueDate, status, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [loadId1, "Broker A", 1, 625, 0.08, 50, 675, new Date(Date.now() + 30 * 86400000), "issued", adminId]
    );
    const invoiceId = invoiceResult[0].insertId;
    console.log(`✅ Invoice created: ID ${invoiceId}\n`);

    // 10. Create Alerts
    console.log("🚨 Creating alerts...");
    await connection.execute(
      `INSERT INTO alerts (type, title, message, severity, recipientUserId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ["load_assigned", "New Load Assigned", `Load #${loadId1} has been assigned to your account`, "info", driverId, "unread"]
    );

    await connection.execute(
      `INSERT INTO alerts (type, title, message, severity, recipientUserId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ["payment_processed", "Payment Processed", "Your wallet has been credited with $1,500", "info", driverId, "read"]
    );
    console.log(`✅ Alerts created\n`);

    console.log("=".repeat(60));
    console.log("✅ SEED DATA COMPLETE!");
    console.log("=".repeat(60));
    console.log(`
Summary:
- Company: WV Logistics (ID ${companyId})
- Users: Admin (${adminId}), Dispatcher (${dispatcherId})
- Driver: John Driver (${driverId})
- Wallet: ID ${walletId} with $3,000 available
- Loads: 3 loads created (IDs: ${loadId1}, ${loadId2}, ${loadId3})
- Quote Analyses: 2 created (accept + reject)
- Settlement: ID ${settlementId}
- Invoice: ID ${invoiceId}
- Alerts: 2 created

Ready for end-to-end testing!
    `);

    await connection.end();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedData();
