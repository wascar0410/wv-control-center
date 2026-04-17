/**
 * RBAC - Role-Based Access Control
 * Define permissions for each role across the application
 */

export type UserRole = "admin" | "owner" | "driver" | "dispatcher" | "user";

export interface RolePermissions {
  [module: string]: boolean;
}

/**
 * Module access matrix by role
 * Defines which modules each role can access
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // Command Center
    "command-center": true,
    
    // Operations
    "loads-dispatch": true,
    "quote-analyzer": true,
    
    // Finance
    "finance-dashboard": true,
    "finance-wallet": true,
    "finance-settlements": true,
    "banking-cashflow": true,
    "invoicing": true,
    
    // Fleet & Drivers
    "fleet-tracking": true,
    "driver-ops": true,
    
    // Team & Company
    "user-management": true,
    "team": true,
    "company": true,
    "chat": true,
    
    // Coordination
    "alerts-tasks": true,
    
    // Settings
    "settings": true,
    "profile": true,
  },

  owner: {
    // Command Center
    "command-center": true,
    
    // Operations
    "loads-dispatch": true,
    "quote-analyzer": true,
    
    // Finance (full access)
    "finance-dashboard": true,
    "finance-wallet": true,
    "finance-settlements": true,
    "banking-cashflow": true,
    "invoicing": true,
    
    // Fleet & Drivers (view only)
    "fleet-tracking": true,
    "driver-ops": false,
    
    // Team & Company
    "user-management": true,
    "team": true,
    "company": true,
    "chat": true,
    
    // Coordination
    "alerts-tasks": true,
    
    // Settings
    "settings": true,
    "profile": true,
  },

  dispatcher: {
    // Command Center (limited)
    "command-center": false,
    
    // Operations (full access)
    "loads-dispatch": true,
    "quote-analyzer": true,
    
    // Finance (no access)
    "finance-dashboard": false,
    "finance-wallet": false,
    "finance-settlements": false,
    "invoicing": false,
    
    // Fleet & Drivers (full access)
    "fleet-tracking": true,
    "driver-ops": true,
    
    // Team & Company (limited)
    "user-management": false,
    "team": false,
    "company": false,
    "chat": true,
    
    // Coordination
    "alerts-tasks": true,
    
    // Settings
    "settings": false,
    "profile": true,
  },

  driver: {
    // Command Center (no access)
    "command-center": false,
    
    // Operations (limited - own loads only)
    "loads-dispatch": false,
    "quote-analyzer": false,
    
    // Finance (own wallet only)
    "finance-dashboard": false,
    "finance-wallet": true,
    "finance-settlements": false,
    "invoicing": false,
    
    // Fleet & Drivers (own data only)
    "fleet-tracking": false,
    "driver-ops": true,
    
    // Team & Company (no access)
    "user-management": false,
    "team": false,
    "company": false,
    "chat": true,
    
    // Coordination (own tasks only)
    "alerts-tasks": true,
    
    // Settings
    "settings": false,
    "profile": true,
  },

  user: {
    // Command Center (no access)
    "command-center": false,
    
    // Operations (no access)
    "loads-dispatch": false,
    "quote-analyzer": false,
    
    // Finance (no access)
    "finance-dashboard": false,
    "finance-wallet": false,
    "finance-settlements": false,
    "invoicing": false,
    
    // Fleet & Drivers (no access)
    "fleet-tracking": false,
    "driver-ops": false,
    
    // Team & Company (limited)
    "user-management": false,
    "team": false,
    "company": false,
    "chat": true,
    
    // Coordination (no access)
    "alerts-tasks": false,
    
    // Settings
    "settings": false,
    "profile": true,
  },
};

/**
 * Check if a role has access to a module
 */
export function hasModuleAccess(role: UserRole, module: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions[module] === true;
}

/**
 * Get all accessible modules for a role
 */
export function getAccessibleModules(role: UserRole): string[] {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return [];
  return Object.entries(permissions)
    .filter(([_, hasAccess]) => hasAccess)
    .map(([module, _]) => module);
}

/**
 * Filter menu items based on role
 */
export function filterMenuByRole(
  menuItems: Array<{ path: string; label: string }>,
  role: UserRole
): Array<{ path: string; label: string }> {
  return menuItems.filter((item) => {
    const module = item.path.replace("/", "");
    return hasModuleAccess(role, module);
  });
}

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full system access - manage all operations, finance, users, and settings",
  owner: "Business owner - access to finance, operations, and team management",
  dispatcher: "Operations coordinator - manage loads, dispatch, and fleet",
  driver: "Driver - access to own loads, wallet, and profile",
  user: "Basic user - chat and profile access only",
};
