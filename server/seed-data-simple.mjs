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

    // Check if companies table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'companies'");
    if (tables.length === 0) {
      console.log("⚠️  Table 'companies' does not exist yet. Creating it from migration...");
      // Read and execute migration
      const fs = await import("fs");
      const migrationSQL = fs.readFileSync("/home/ubuntu/wv-control-center/drizzle/0036_watery_shard.sql", "utf-8");
      const statements = migrationSQL.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s);
      for (const statement of statements) {
        if (statement) {
          await connection.execute(statement);
        }
      }
      console.log("✅ Migration 0036 executed");
    }

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
        ownerId: 1, // Will be set after creating users
      },
    ];

    // First, get or create owner user
    const [existingUsers] = await connection.execute("SELECT id FROM users WHERE email = ?", ["owner@wvtransport.com"]);
    let ownerId = 1;
    if (existingUsers.length === 0) {
      const [userResult] = await connection.execute(
        "INSERT INTO users (name, email, role, openId) VALUES (?, ?, ?, ?)",
        ["Owner Partner", "owner@wvtransport.com", "owner", "seed-owner-" + Date.now()]
      );
      ownerId = userResult.insertId;
    } else {
      ownerId = existingUsers[0].id;
    }

    companies[0].ownerId = ownerId;

    const companyIds = [];
    for (const company of companies) {
      try {
        const [result] = await connection.execute(
          `INSERT INTO companies (name, dotNumber, mcNumber, phone, email, website, address, city, state, zipCode, description, insuranceProvider, insurancePolicyNumber, complianceStatus, ownerId) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            company.ownerId,
          ]
        );
        companyIds.push(result.insertId);
        console.log(`  ✓ Created company: ${company.name}`);
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          console.log(`  ⚠️  Company ${company.name} already exists, skipping...`);
          // Get existing company ID
          const [existing] = await connection.execute("SELECT id FROM companies WHERE name = ?", [company.name]);
          if (existing.length > 0) {
            companyIds.push(existing[0].id);
          }
        } else {
          throw err;
        }
      }
    }

    console.log("\n✅ Seed data created successfully!");
    console.log(`\n📊 Summary:`);
    console.log(`  • Companies: ${companyIds.length}`);
    console.log(`  • Owner User ID: ${ownerId}`);
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
