import fs from "fs";
import path from "path";

interface WhitelistEntry {
  ip: string;
  host?: string;
  reason: string;
  addedAt: string;
  addedBy?: string;
}

const whitelistFile = path.resolve(process.cwd(), ".config", "ip-whitelist.json");

// Ensure config directory exists
const configDir = path.dirname(whitelistFile);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Default whitelist entries
const DEFAULT_WHITELIST: WhitelistEntry[] = [
  {
    ip: "127.0.0.1",
    host: "localhost",
    reason: "Local development",
    addedAt: new Date().toISOString(),
  },
  {
    ip: "::1",
    host: "localhost (IPv6)",
    reason: "Local development IPv6",
    addedAt: new Date().toISOString(),
  },
];

/**
 * Load whitelist from file
 */
function loadWhitelist(): WhitelistEntry[] {
  try {
    if (fs.existsSync(whitelistFile)) {
      const data = fs.readFileSync(whitelistFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load whitelist:", err);
  }
  return DEFAULT_WHITELIST;
}

/**
 * Save whitelist to file
 */
function saveWhitelist(entries: WhitelistEntry[]): void {
  try {
    fs.writeFileSync(whitelistFile, JSON.stringify(entries, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save whitelist:", err);
  }
}

// In-memory whitelist cache
let whitelistCache: WhitelistEntry[] = loadWhitelist();

/**
 * Check if IP is whitelisted
 */
export function isIPWhitelisted(ip: string): boolean {
  return whitelistCache.some((entry) => entry.ip === ip);
}

/**
 * Add IP to whitelist
 */
export function addToWhitelist(
  ip: string,
  reason: string,
  host?: string,
  addedBy?: string
): void {
  if (!isIPWhitelisted(ip)) {
    const entry: WhitelistEntry = {
      ip,
      host,
      reason,
      addedAt: new Date().toISOString(),
      addedBy,
    };
    whitelistCache.push(entry);
    saveWhitelist(whitelistCache);
    console.log(`[Whitelist] Added IP ${ip} (${reason})`);
  }
}

/**
 * Remove IP from whitelist
 */
export function removeFromWhitelist(ip: string): boolean {
  const index = whitelistCache.findIndex((entry) => entry.ip === ip);
  if (index !== -1) {
    whitelistCache.splice(index, 1);
    saveWhitelist(whitelistCache);
    console.log(`[Whitelist] Removed IP ${ip}`);
    return true;
  }
  return false;
}

/**
 * Get all whitelisted IPs
 */
export function getWhitelist(): WhitelistEntry[] {
  return [...whitelistCache];
}

/**
 * Clear whitelist (except defaults)
 */
export function clearWhitelist(): void {
  whitelistCache = DEFAULT_WHITELIST;
  saveWhitelist(whitelistCache);
  console.log("[Whitelist] Cleared (defaults restored)");
}

/**
 * Reload whitelist from file
 */
export function reloadWhitelist(): void {
  whitelistCache = loadWhitelist();
  console.log(`[Whitelist] Reloaded (${whitelistCache.length} entries)`);
}
