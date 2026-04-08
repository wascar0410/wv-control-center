import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "gateway05.us-east-1.prod.aws.tidbcloud.co",
  port: 4000,
  user: "manus_user",
  password: process.env.TIDB_PASSWORD,
  database: "wv_control_center",
  ssl: "Amazon RDS",
});

const sql = `
ALTER TABLE business_config ADD ownerDrawPercent decimal(5,2) DEFAULT '40.00';
ALTER TABLE business_config ADD reserveFundPercent decimal(5,2) DEFAULT '20.00';
ALTER TABLE business_config ADD reinvestmentPercent decimal(5,2) DEFAULT '20.00';
ALTER TABLE business_config ADD operatingCashPercent decimal(5,2) DEFAULT '20.00';
ALTER TABLE business_config ADD marginAlertThreshold decimal(5,2) DEFAULT '10.00';
ALTER TABLE business_config ADD quoteVarianceThreshold decimal(5,2) DEFAULT '20.00';
ALTER TABLE business_config ADD overdueDaysThreshold int DEFAULT 30;
`;

const statements = sql.split(";").filter((s) => s.trim());

for (const statement of statements) {
  try {
    await connection.execute(statement);
    console.log("✓", statement.trim().substring(0, 50) + "...");
  } catch (err) {
    console.error("✗", statement.trim().substring(0, 50) + "...", err.message);
  }
}

await connection.end();
console.log("Migration 0037 completed");
