import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

async function seedData() {
  let connection;
  try {
    // Parse connection string
    const url = new URL(DATABASE_URL);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.hostname.includes("tidbcloud") || url.hostname.includes("rds") ? { rejectUnauthorized: false } : undefined,
    };

    connection = await mysql.createConnection(config);
    console.log("✅ Connected to database");

    // 1. Create test companies
    console.log("\n📦 Creating companies...");
    const companies = [
      {
        name: "WV Transport LLC",
        dotNumber: "1234567",
        mcNumber: "123456",
        phone: "(555) 123-4567",
        email: "info@wvtransport.com",
        website: "https://wvtransport.com",
        address: "123 Main St",
        city: "Charleston",
        state: "WV",
        zipCode: "25301",
        description: "Main carrier company",
        insuranceProvider: "Progressive",
        insurancePolicyNumber: "POL-123456",
        complianceStatus: "active",
      },
      {
        name: "Eastern Logistics Inc",
        dotNumber: "7654321",
        mcNumber: "654321",
        phone: "(555) 987-6543",
        email: "contact@easternlogistics.com",
        website: "https://easternlogistics.com",
        address: "456 Oak Ave",
        city: "Richmond",
        state: "VA",
        zipCode: "23219",
        description: "Partner carrier",
        insuranceProvider: "State Farm",
        insurancePolicyNumber: "POL-654321",
        complianceStatus: "active",
      },
      {
        name: "Midwest Freight Co",
        dotNumber: "5555555",
        mcNumber: "555555",
        phone: "(555) 555-5555",
        email: "dispatch@midwestfreight.com",
        website: "https://midwestfreight.com",
        address: "789 Pine Rd",
        city: "Columbus",
        state: "OH",
        zipCode: "43085",
        description: "Regional carrier",
        insuranceProvider: "Allstate",
        insurancePolicyNumber: "POL-555555",
        complianceStatus: "active",
      },
    ];

    const companyIds = [];
    for (const company of companies) {
      const [result] = await connection.execute(
        `INSERT INTO companies (name, dotNumber, mcNumber, phone, email, website, address, city, state, zipCode, description, insuranceProvider, insurancePolicyNumber, complianceStatus) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company.name,
          company.dotNumber,
          company.mcNumber,
          company.phone,
          company.email,
          company.website,
          company.address,
          company.city,
          company.state,
          company.zipCode,
          company.description,
          company.insuranceProvider,
          company.insurancePolicyNumber,
          company.complianceStatus,
        ]
      );
      companyIds.push(result.insertId);
      console.log(`  ✓ Created company: ${company.name}`);
    }

    // 2. Create test users
    console.log("\n👥 Creating users...");
    const users = [
      {
        name: "Admin User",
        email: "admin@wvtransport.com",
        role: "admin",
        companyId: companyIds[0],
      },
      {
        name: "Owner Partner",
        email: "owner@wvtransport.com",
        role: "owner",
        companyId: companyIds[0],
      },
      {
        name: "Dispatcher",
        email: "dispatch@wvtransport.com",
        role: "dispatcher",
        companyId: companyIds[0],
      },
      {
        name: "Driver 1",
        email: "driver1@wvtransport.com",
        role: "driver",
        companyId: companyIds[0],
      },
      {
        name: "Driver 2",
        email: "driver2@wvtransport.com",
        role: "driver",
        companyId: companyIds[0],
      },
      {
        name: "Driver 3",
        email: "driver3@wvtransport.com",
        role: "driver",
        companyId: companyIds[0],
      },
    ];

    const userIds = [];
    for (const user of users) {
      const [result] = await connection.execute(
        `INSERT INTO users (name, email, role, companyId) VALUES (?, ?, ?, ?)`,
        [user.name, user.email, user.role, user.companyId]
      );
      userIds.push(result.insertId);
      console.log(`  ✓ Created user: ${user.name} (${user.role})`);
    }

    // 3. Create test loads
    console.log("\n📦 Creating loads...");
    const loads = [
      {
        clientName: "ABC Manufacturing",
        pickupLocation: "123 Industrial Blvd, Pittsburgh, PA",
        deliveryLocation: "456 Commerce Dr, Columbus, OH",
        weight: 5000,
        description: "Auto parts shipment",
        status: "available",
        companyId: companyIds[0],
      },
      {
        clientName: "XYZ Distribution",
        pickupLocation: "789 Warehouse Ave, Cleveland, OH",
        deliveryLocation: "321 Retail Plaza, Cincinnati, OH",
        weight: 3500,
        description: "Electronics shipment",
        status: "quoted",
        companyId: companyIds[0],
      },
      {
        clientName: "DEF Logistics",
        pickupLocation: "555 Port Terminal, Baltimore, MD",
        deliveryLocation: "777 Distribution Center, Philadelphia, PA",
        weight: 8000,
        description: "Heavy machinery",
        status: "assigned",
        companyId: companyIds[0],
      },
      {
        clientName: "GHI Supply Chain",
        pickupLocation: "999 Factory Rd, Detroit, MI",
        deliveryLocation: "111 Customer Site, Chicago, IL",
        weight: 4200,
        description: "Industrial equipment",
        status: "in_transit",
        companyId: companyIds[0],
      },
      {
        clientName: "JKL Transport",
        pickupLocation: "222 Depot, Milwaukee, WI",
        deliveryLocation: "333 Destination, Minneapolis, MN",
        weight: 6000,
        description: "Retail goods",
        status: "delivered",
        companyId: companyIds[0],
      },
      {
        clientName: "MNO Freight",
        pickupLocation: "444 Origin, St Louis, MO",
        deliveryLocation: "555 Final, Kansas City, MO",
        weight: 7500,
        description: "Construction materials",
        status: "invoiced",
        companyId: companyIds[0],
      },
      {
        clientName: "PQR Shipping",
        pickupLocation: "666 Start Point, Memphis, TN",
        deliveryLocation: "777 End Point, Nashville, TN",
        weight: 5500,
        description: "Furniture shipment",
        status: "paid",
        companyId: companyIds[0],
      },
    ];

    const loadIds = [];
    for (const load of loads) {
      const [result] = await connection.execute(
        `INSERT INTO loads (clientName, pickupLocation, deliveryLocation, weight, description, status, companyId, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          load.clientName,
          load.pickupLocation,
          load.deliveryLocation,
          load.weight,
          load.description,
          load.status,
          load.companyId,
        ]
      );
      loadIds.push(result.insertId);
      console.log(`  ✓ Created load: ${load.clientName} (${load.status})`);
    }

    // 4. Create test invoices
    console.log("\n📄 Creating invoices...");
    const invoices = [
      {
        invoiceNumber: "INV-001",
        loadId: loadIds[5],
        brokerName: "ABC Manufacturing",
        amount: 1500,
        status: "paid",
        companyId: companyIds[0],
      },
      {
        invoiceNumber: "INV-002",
        loadId: loadIds[4],
        brokerName: "XYZ Distribution",
        amount: 1200,
        status: "paid",
        companyId: companyIds[0],
      },
      {
        invoiceNumber: "INV-003",
        loadId: loadIds[3],
        brokerName: "DEF Logistics",
        amount: 2000,
        status: "partially_paid",
        companyId: companyIds[0],
      },
      {
        invoiceNumber: "INV-004",
        loadId: loadIds[2],
        brokerName: "GHI Supply Chain",
        amount: 1800,
        status: "pending",
        companyId: companyIds[0],
      },
      {
        invoiceNumber: "INV-005",
        loadId: loadIds[1],
        brokerName: "JKL Transport",
        amount: 1600,
        status: "pending",
        companyId: companyIds[0],
      },
    ];

    const invoiceIds = [];
    for (const invoice of invoices) {
      const [result] = await connection.execute(
        `INSERT INTO invoices (invoiceNumber, loadId, brokerName, amount, status, companyId, issuedAt, dueAt) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [
          invoice.invoiceNumber,
          invoice.loadId,
          invoice.brokerName,
          invoice.amount,
          invoice.status,
          invoice.companyId,
        ]
      );
      invoiceIds.push(result.insertId);
      console.log(`  ✓ Created invoice: ${invoice.invoiceNumber} (${invoice.status})`);
    }

    // 5. Create test wallets
    console.log("\n💰 Creating wallets...");
    const wallets = [
      {
        driverId: userIds[3],
        balance: 5000,
        companyId: companyIds[0],
      },
      {
        driverId: userIds[4],
        balance: 3500,
        companyId: companyIds[0],
      },
      {
        driverId: userIds[5],
        balance: 7200,
        companyId: companyIds[0],
      },
    ];

    const walletIds = [];
    for (const wallet of wallets) {
      const [result] = await connection.execute(
        `INSERT INTO wallets (driverId, balance, companyId) VALUES (?, ?, ?)`,
        [wallet.driverId, wallet.balance, wallet.companyId]
      );
      walletIds.push(result.insertId);
      console.log(`  ✓ Created wallet for driver ${wallet.driverId}`);
    }

    // 6. Create test transactions
    console.log("\n📊 Creating transactions...");
    const transactions = [
      {
        walletId: walletIds[0],
        type: "deposit",
        amount: 1500,
        description: "Load delivery payment",
        companyId: companyIds[0],
      },
      {
        walletId: walletIds[0],
        type: "withdrawal",
        amount: 500,
        description: "Driver withdrawal",
        companyId: companyIds[0],
      },
      {
        walletId: walletIds[1],
        type: "deposit",
        amount: 1200,
        description: "Load delivery payment",
        companyId: companyIds[0],
      },
      {
        walletId: walletIds[2],
        type: "deposit",
        amount: 2000,
        description: "Load delivery payment",
        companyId: companyIds[0],
      },
      {
        walletId: walletIds[2],
        type: "withdrawal",
        amount: 1000,
        description: "Driver withdrawal",
        companyId: companyIds[0],
      },
    ];

    for (const transaction of transactions) {
      await connection.execute(
        `INSERT INTO wallet_transactions (walletId, type, amount, description, companyId, createdAt) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          transaction.walletId,
          transaction.type,
          transaction.amount,
          transaction.description,
          transaction.companyId,
        ]
      );
      console.log(`  ✓ Created transaction: ${transaction.type} $${transaction.amount}`);
    }

    // 7. Create test quote analysis
    console.log("\n📈 Creating quote analysis...");
    const quoteAnalyses = [
      {
        loadId: loadIds[0],
        brokerName: "ABC Manufacturing",
        estimatedMiles: 250,
        estimatedCost: 1200,
        estimatedProfit: 300,
        estimatedMargin: 0.2,
        actualMiles: 250,
        actualCost: 1200,
        actualProfit: 300,
        actualMargin: 0.2,
        status: "completed",
        companyId: companyIds[0],
      },
      {
        loadId: loadIds[1],
        brokerName: "XYZ Distribution",
        estimatedMiles: 180,
        estimatedCost: 900,
        estimatedProfit: 300,
        estimatedMargin: 0.25,
        actualMiles: 180,
        actualCost: 950,
        actualProfit: 250,
        actualMargin: 0.21,
        status: "completed",
        companyId: companyIds[0],
      },
      {
        loadId: loadIds[2],
        brokerName: "DEF Logistics",
        estimatedMiles: 320,
        estimatedCost: 1600,
        estimatedProfit: 400,
        estimatedMargin: 0.2,
        actualMiles: null,
        actualCost: null,
        actualProfit: null,
        actualMargin: null,
        status: "pending",
        companyId: companyIds[0],
      },
    ];

    for (const qa of quoteAnalyses) {
      await connection.execute(
        `INSERT INTO quote_analysis (loadId, brokerName, estimatedMiles, estimatedCost, estimatedProfit, estimatedMargin, actualMiles, actualCost, actualProfit, actualMargin, status, companyId, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          qa.loadId,
          qa.brokerName,
          qa.estimatedMiles,
          qa.estimatedCost,
          qa.estimatedProfit,
          qa.estimatedMargin,
          qa.actualMiles,
          qa.actualCost,
          qa.actualProfit,
          qa.actualMargin,
          qa.status,
          qa.companyId,
        ]
      );
      console.log(`  ✓ Created quote analysis for load ${qa.loadId}`);
    }

    console.log("\n✅ Seed data created successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`  • Companies: ${companies.length}`);
    console.log(`  • Users: ${users.length}`);
    console.log(`  • Loads: ${loads.length}`);
    console.log(`  • Invoices: ${invoices.length}`);
    console.log(`  • Wallets: ${wallets.length}`);
    console.log(`  • Transactions: ${transactions.length}`);
    console.log(`  • Quote Analyses: ${quoteAnalyses.length}`);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedData();
