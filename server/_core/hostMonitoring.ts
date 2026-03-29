import { notifyOwner } from "./notification";

interface RejectionRecord {
  host: string;
  timestamp: number;
  reason: string;
  ip?: string;
  userAgent?: string;
}

interface HostRejectionStats {
  [host: string]: {
    count: number;
    lastRejection: number;
    reasons: Record<string, number>;
    ips: Set<string>;
    userAgents: Set<string>;
  };
}

// Configuration from environment variables
export const hostMonitoringConfig = {
  enabled: process.env.HOST_REJECTION_MONITORING_ENABLED !== "false",
  alertThreshold: parseInt(process.env.HOST_REJECTION_ALERT_THRESHOLD || "10"),
  alertWindowMs: parseInt(process.env.HOST_REJECTION_ALERT_WINDOW_MS || "3600000"), // 1 hour default
  notificationsEnabled: process.env.SECURITY_NOTIFICATIONS_ENABLED !== "false",
  notificationLevel: (process.env.SECURITY_NOTIFICATION_LEVEL || "warning") as "critical" | "warning" | "info",
};

// In-memory store for rejection statistics
const rejectionStats: HostRejectionStats = {};
const rejectionHistory: RejectionRecord[] = [];

// Track when alerts were last sent to avoid spam
const lastAlertTime: Record<string, number> = {};
const ALERT_COOLDOWN_MS = 3600000; // 1 hour between alerts for same host

/**
 * Record a host rejection
 */
export async function recordHostRejection(
  host: string,
  reason: string,
  req?: any
): Promise<void> {
  if (!hostMonitoringConfig.enabled) return;

  const now = Date.now();
  const ip = req?.ip || "unknown";
  const userAgent = req?.get("user-agent") || "unknown";

  // Initialize stats for this host if not exists
  if (!rejectionStats[host]) {
    rejectionStats[host] = {
      count: 0,
      lastRejection: now,
      reasons: {},
      ips: new Set(),
      userAgents: new Set(),
    };
  }

  const stats = rejectionStats[host];
  stats.count++;
  stats.lastRejection = now;
  stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
  stats.ips.add(ip);
  stats.userAgents.add(userAgent);

  // Add to history
  rejectionHistory.push({
    host,
    timestamp: now,
    reason,
    ip,
    userAgent,
  });

  // Keep history size manageable (last 10000 records)
  if (rejectionHistory.length > 10000) {
    rejectionHistory.shift();
  }

  // Check if alert threshold is reached
  await checkAndSendAlert(host, stats, now);

  console.log(`[Host Monitoring] Rejection recorded for host: ${host} (Reason: ${reason})`);
}

/**
 * Check if alert should be sent for a host
 */
async function checkAndSendAlert(
  host: string,
  stats: HostRejectionStats[string],
  now: number
): Promise<void> {
  if (!hostMonitoringConfig.notificationsEnabled) return;

  // Check if threshold is reached
  if (stats.count < hostMonitoringConfig.alertThreshold) return;

  // Check if alert was already sent recently (cooldown)
  if (lastAlertTime[host] && now - lastAlertTime[host] < ALERT_COOLDOWN_MS) {
    return;
  }

  // Count rejections in the alert window
  const windowStart = now - hostMonitoringConfig.alertWindowMs;
  const recentRejections = rejectionHistory.filter(
    (r) => r.host === host && r.timestamp > windowStart
  );

  if (recentRejections.length < hostMonitoringConfig.alertThreshold) return;

  // Send alert
  lastAlertTime[host] = now;

  const topReason = Object.entries(stats.reasons).sort(([, a], [, b]) => b - a)[0];
  const topReasonText = topReason ? `${topReason[0]} (${topReason[1]} times)` : "Unknown";

  const alertMessage = `
🚨 **Alerta de Seguridad: Rechazos de Host Detectados**

**Host:** ${host}
**Total de Rechazos:** ${stats.count}
**Rechazos en la última hora:** ${recentRejections.length}
**Razón Principal:** ${topReasonText}
**IPs Detectadas:** ${Array.from(stats.ips).join(", ")}
**Último Rechazo:** ${new Date(stats.lastRejection).toISOString()}

Este host ha excedido el umbral de rechazos. Revisa los logs para más detalles.
  `.trim();

  try {
    await notifyOwner({
      title: `Alerta de Seguridad: Rechazos de Host - ${host}`,
      content: alertMessage,
    });
    console.log(`[Host Monitoring] Alert sent for host: ${host}`);
  } catch (error) {
    console.error(`[Host Monitoring] Failed to send alert for host ${host}:`, error);
  }
}

/**
 * Get rejection statistics for a specific host
 */
export function getHostRejectionStats(host: string) {
  const stats = rejectionStats[host];
  if (!stats) return null;

  return {
    host,
    totalRejections: stats.count,
    lastRejection: new Date(stats.lastRejection).toISOString(),
    reasons: stats.reasons,
    uniqueIps: Array.from(stats.ips),
    uniqueUserAgents: Array.from(stats.userAgents),
    recentRejections: rejectionHistory
      .filter((r) => r.host === host)
      .slice(-10)
      .reverse(),
  };
}

/**
 * Get all rejection statistics
 */
export function getAllRejectionStats() {
  const stats: Record<string, any> = {};

  for (const host in rejectionStats) {
    const hostStats = rejectionStats[host];
    stats[host] = {
      totalRejections: hostStats.count,
      lastRejection: new Date(hostStats.lastRejection).toISOString(),
      reasons: hostStats.reasons,
      uniqueIps: Array.from(hostStats.ips),
      uniqueUserAgents: Array.from(hostStats.userAgents),
    };
  }

  return {
    totalHostsRejected: Object.keys(stats).length,
    totalRejections: rejectionHistory.length,
    hosts: stats,
  };
}

/**
 * Get rejection history with optional filtering
 */
export function getRejectionHistory(options?: {
  host?: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}) {
  let filtered = rejectionHistory;

  if (options?.host) {
    filtered = filtered.filter((r) => r.host === options.host);
  }

  if (options?.startTime) {
    filtered = filtered.filter((r) => r.timestamp >= options.startTime!);
  }

  if (options?.endTime) {
    filtered = filtered.filter((r) => r.timestamp <= options.endTime!);
  }

  const limit = options?.limit || 100;
  return filtered.slice(-limit).reverse();
}

/**
 * Clear rejection stats for a host
 */
export function clearHostStats(host: string): boolean {
  if (rejectionStats[host]) {
    delete rejectionStats[host];
    delete lastAlertTime[host];
    console.log(`[Host Monitoring] Cleared stats for host: ${host}`);
    return true;
  }
  return false;
}

/**
 * Clear all rejection stats
 */
export function clearAllStats(): void {
  Object.keys(rejectionStats).forEach((host) => {
    delete rejectionStats[host];
    delete lastAlertTime[host];
  });
  rejectionHistory.length = 0;
  console.log("[Host Monitoring] Cleared all rejection stats");
}

/**
 * Get top rejected hosts
 */
export function getTopRejectedHosts(limit: number = 10) {
  const sorted = Object.entries(rejectionStats)
    .map(([host, stats]) => ({
      host,
      count: stats.count,
      lastRejection: new Date(stats.lastRejection).toISOString(),
      topReason: Object.entries(stats.reasons).sort(([, a], [, b]) => b - a)[0]?.[0] || "Unknown",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return sorted;
}
