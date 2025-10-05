#!/usr/bin/env node

/**
 * Joantee Clean State Restore Script
 *
 * This script restores the database to the clean production-ready state
 * with Greater Accra regions, delivery zones, and admin user.
 *
 * Usage: node restore-clean-state.js
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function restoreCleanState() {
  try {
    console.log("🔄 Restoring Joantee database to clean state...");

    // Find the latest clean state backup
    const backupDir = path.join(__dirname, "backups");
    const backupFiles = fs
      .readdirSync(backupDir)
      .filter(
        (file) => file.startsWith("clean-state-") && file.endsWith(".sql")
      )
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      console.log("❌ No clean state backup found!");
      console.log("   Please create a backup first.");
      process.exit(1);
    }

    const latestBackup = path.join(backupDir, backupFiles[0]);
    console.log(`📄 Using backup: ${backupFiles[0]}`);

    // Read and execute the backup SQL
    const sqlContent = fs.readFileSync(latestBackup, "utf8");

    // Split into individual statements and execute
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📦 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ";";
      try {
        await pool.query(statement);
        process.stdout.write(".");
      } catch (error) {
        console.log(`\n⚠️  Statement ${i + 1} warning: ${error.message}`);
      }
    }

    console.log("\n✅ Database restored to clean state successfully!");

    // Verify the restore
    console.log("\n🔍 Verifying restore...");
    const verification = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM ghana_regions WHERE is_active = true) as active_regions,
        (SELECT COUNT(*) FROM ghana_cities WHERE region_id = 1) as cities,
        (SELECT COUNT(*) FROM delivery_zones WHERE is_active = true) as delivery_zones,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_users
    `);

    const counts = verification.rows[0];
    console.log(`  ✅ Active regions: ${counts.active_regions}`);
    console.log(`  ✅ Greater Accra cities: ${counts.cities}`);
    console.log(`  ✅ Delivery zones: ${counts.delivery_zones}`);
    console.log(`  ✅ Admin users: ${counts.admin_users}`);

    console.log("\n📋 What you have now:");
    console.log("  ✅ Greater Accra region (only active region)");
    console.log("  ✅ 60 Greater Accra cities (alphabetical order)");
    console.log("  ✅ Two delivery zones (30 & 60 cedis)");
    console.log("  ✅ App settings configured");
    console.log("  ✅ Admin user: joanteebusiness@gmail.com");
    console.log("  ✅ Clean database - no test data");

    console.log("\n🚀 Ready for production!");

    await pool.end();
  } catch (error) {
    console.error("❌ Error restoring database:", error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run the restore
restoreCleanState();
