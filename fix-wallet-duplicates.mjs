import mysql from "mysql2/promise";

async function fixWalletDuplicates() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  try {
    const pool = mysql.createPool({
      uri: dbUrl,
      ssl: {
        rejectUnauthorized: true,
      },
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    const connection = await pool.getConnection();

    console.log("🔧 Fixing wallet duplicates...\n");

    // 1. Check for duplicates
    console.log("[1/5] Checking for duplicate wallets by driverId...");
    const [duplicates] = await connection.execute(`
      SELECT driverId, COUNT(*) as count
      FROM wallets
      GROUP BY driverId
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (duplicates.length === 0) {
      console.log("✅ No duplicate wallets found\n");
    } else {
      console.log(`⚠️ Found ${duplicates.length} drivers with duplicate wallets:`);
      duplicates.forEach((d) => {
        console.log(`   - driverId ${d.driverId}: ${d.count} wallets`);
      });
      console.log();

      // 2. Show wallets for first duplicate driver
      if (duplicates.length > 0) {
        const firstDriver = duplicates[0].driverId;
        console.log(`[2/5] Wallets for driverId ${firstDriver}:`);
        const [wallets] = await connection.execute(
          "SELECT id, driverId, totalEarnings, availableBalance, reservedBalance FROM wallets WHERE driverId = ? ORDER BY id ASC",
          [firstDriver]
        );
        wallets.forEach((w) => {
          console.log(
            `   - id=${w.id}, earnings=${w.totalEarnings}, available=${w.availableBalance}, reserved=${w.reservedBalance}`
          );
        });
        console.log();
      }

      // 3. Delete duplicate wallets (keep oldest)
      console.log("[3/5] Deleting duplicate wallets (keeping oldest by id)...");
      const [result] = await connection.execute(`
        DELETE w1 FROM wallets w1
        JOIN wallets w2 
        ON w1.driverId = w2.driverId
        AND w1.id > w2.id
      `);
      console.log(`✅ Deleted ${result.affectedRows} duplicate wallet rows\n`);
    }

    // 4. Add UNIQUE constraint
    console.log("[4/5] Adding UNIQUE constraint on driverId...");
    try {
      await connection.execute(
        "ALTER TABLE wallets ADD UNIQUE KEY unique_driver_wallet (driverId)"
      );
      console.log("✅ UNIQUE constraint added\n");
    } catch (err) {
      if (err.message.includes("Duplicate entry")) {
        console.log("⚠️ Cannot add UNIQUE constraint - duplicate entries still exist");
        console.log("   Please check and manually resolve\n");
      } else if (err.message.includes("already exists")) {
        console.log("⚠️ UNIQUE constraint already exists\n");
      } else {
        throw err;
      }
    }

    // 5. Verify wallet for driverId=1
    console.log("[5/5] Verifying wallet for driverId=1...");
    const [wallet1] = await connection.execute(
      "SELECT id, totalEarnings, availableBalance, reservedBalance, pendingBalance, blockedBalance FROM wallets WHERE driverId = 1 ORDER BY id ASC LIMIT 1"
    );

    if (wallet1.length > 0) {
      const w = wallet1[0];
      console.log("✅ Wallet for driverId=1:");
      console.log(`   - id: ${w.id}`);
      console.log(`   - totalEarnings: ${w.totalEarnings}`);
      console.log(`   - availableBalance: ${w.availableBalance}`);
      console.log(`   - reservedBalance: ${w.reservedBalance}`);
      console.log(`   - pendingBalance: ${w.pendingBalance}`);
      console.log(`   - blockedBalance: ${w.blockedBalance}`);
      console.log();
    } else {
      console.log("⚠️ No wallet found for driverId=1\n");
    }

    await connection.release();
    await pool.end();

    console.log("✅ Wallet deduplication completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Wallet deduplication failed:", err.message);
    process.exit(1);
  }
}

fixWalletDuplicates();
