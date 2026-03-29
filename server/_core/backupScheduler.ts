import * as schedule from "node-schedule";
import { createDatabaseBackup } from "./backup";

/**
 * Initialize automatic backup scheduler
 * Runs daily at 2:00 AM
 */
export function initializeBackupScheduler() {
  try {
    // Schedule backup for 2:00 AM every day
    const job = schedule.scheduleJob("0 2 * * *", async () => {
      try {
        console.log(`[${new Date().toISOString()}] Starting scheduled database backup...`);
        const result = await createDatabaseBackup();
        console.log(`[${new Date().toISOString()}] Backup completed successfully:`, result);
        
        // Log backup metadata for monitoring
        console.log({
          timestamp: new Date(),
          fileName: result.fileName,
          s3Url: result.s3Url,
          sizeBytes: result.size,
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Backup failed:`, error);
      }
    });

    console.log("✅ Database backup scheduler initialized - runs daily at 2:00 AM UTC");
    return job;
  } catch (error) {
    console.error("Failed to initialize backup scheduler:", error);
    throw error;
  }
}

/**
 * Get next scheduled backup time
 */
export function getNextBackupTime(): Date | null {
  try {
    const jobs = schedule.scheduledJobs;
    for (const jobName in jobs) {
      const job = jobs[jobName];
      if (job.nextInvocation) {
        return job.nextInvocation();
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting next backup time:", error);
    return null;
  }
}

/**
 * Manual backup trigger (for testing or on-demand)
 */
export async function triggerManualBackup() {
  try {
    console.log("Triggering manual backup...");
    const result = await createDatabaseBackup();
    console.log("Manual backup completed:", result);
    return result;
  } catch (error) {
    console.error("Manual backup failed:", error);
    throw error;
  }
}
