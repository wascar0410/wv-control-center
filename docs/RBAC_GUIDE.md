# Role-Based Access Control (RBAC) Guide

## Overview

WV Control Center implements a comprehensive Role-Based Access Control (RBAC) system to manage user permissions across different modules and features. This guide explains the role structure, permissions matrix, and how to implement role-based access in your code.

## Roles

The system defines five distinct roles:

### 1. **Admin** (Full System Access)
- **Description**: System administrator with complete access to all features
- **Use Case**: Internal IT staff, system administrators
- **Permissions**: All modules (100% access)
- **Responsibilities**:
  - User management and role assignment
  - System configuration and settings
  - Financial oversight
  - Operational management
  - Alerts and task management

### 2. **Owner** (Business Owner)
- **Description**: Business owner with access to financial and operational management
- **Use Case**: Company owner, business manager
- **Permissions**: Command Center, Operations, Finance, Team Management, Chat, Alerts
- **Restrictions**: Cannot directly manage driver operations
- **Responsibilities**:
  - Financial management and reporting
  - Operational oversight
  - Team management
  - Settlement and payment processing
  - Strategic decision making

### 3. **Dispatcher** (Operations Coordinator)
- **Description**: Operations coordinator managing loads and fleet
- **Use Case**: Dispatch manager, operations coordinator
- **Permissions**: Loads & Dispatch, Quote Analyzer, Fleet Tracking, Driver Ops, Chat, Alerts
- **Restrictions**: No access to finance, user management, or company settings
- **Responsibilities**:
  - Load assignment and dispatch
  - Fleet tracking and monitoring
  - Driver coordination
  - Operational alerts and tasks

### 4. **Driver** (Driver)
- **Description**: Driver with access to personal loads and wallet
- **Use Case**: Company driver, independent contractor
- **Permissions**: Driver Ops (own loads), Wallet (own balance), Chat, Alerts (own tasks), Profile
- **Restrictions**: No access to other drivers' data, finance, or operational management
- **Responsibilities**:
  - Accepting/rejecting load assignments
  - Tracking personal earnings
  - Managing wallet and withdrawals
  - Communicating with dispatcher

### 5. **User** (Basic User)
- **Description**: Basic user with minimal access
- **Use Case**: New users, temporary access
- **Permissions**: Chat, Profile only
- **Restrictions**: No access to operational or financial modules
- **Responsibilities**: Basic communication and profile management

## Permissions Matrix

| Module | Admin | Owner | Dispatcher | Driver | User |
|--------|-------|-------|-----------|--------|------|
| Command Center | ✅ | ✅ | ❌ | ❌ | ❌ |
| Loads & Dispatch | ✅ | ✅ | ✅ | ❌ | ❌ |
| Quote Analyzer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Finance Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| Wallet | ✅ | ✅ | ❌ | ✅ | ❌ |
| Settlements | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invoicing | ✅ | ✅ | ❌ | ❌ | ❌ |
| Fleet Tracking | ✅ | ✅ | ✅ | ❌ | ❌ |
| Driver Ops | ✅ | ❌ | ✅ | ✅ | ❌ |
| User Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Team | ✅ | ✅ | ❌ | ❌ | ❌ |
| Company | ✅ | ✅ | ❌ | ❌ | ❌ |
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alerts & Tasks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ |

## Implementation Guide

### 1. Frontend Route Protection

Use the `ProtectedRoute` component to protect routes based on role:

```tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";
import FinanceDashboard from "@/pages/FinanceDashboard";

// In your router
<Route 
  path="/finance-dashboard" 
  component={ProtectedRoute({
    component: FinanceDashboard,
    requiredModule: "finance-dashboard"
  })} 
/>
```

### 2. Checking Module Access

Use the `hasModuleAccess` function to check if a user can access a module:

```tsx
import { hasModuleAccess } from "@shared/rbac";

const canAccessFinance = hasModuleAccess(user.role, "finance-dashboard");

if (canAccessFinance) {
  // Show finance module
}
```

### 3. Filtering Menu Items

Use `getAccessibleModules` to get all accessible modules for a role:

```tsx
import { getAccessibleModules } from "@shared/rbac";

const modules = getAccessibleModules(user.role);
// Returns: ["command-center", "loads-dispatch", "chat", "profile", ...]
```

### 4. Backend Data Filtering

In tRPC procedures, validate user access:

```ts
// In server/routers/finance.ts
export const financeRouter = router({
  getDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user has access
      if (ctx.user.role !== "admin" && ctx.user.role !== "owner") {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Access denied" 
        });
      }
      
      // Return finance data
      return getFinancialData();
    }),
});
```

### 5. UI Element Visibility

Hide/show UI elements based on role:

```tsx
import { useAuth } from "@/_core/hooks/useAuth";

export function FinanceButton() {
  const { user } = useAuth();
  
  if (user?.role !== "admin" && user?.role !== "owner") {
    return null; // Hidden for other roles
  }
  
  return <Button>View Finance</Button>;
}
```

## Best Practices

### 1. **Principle of Least Privilege**
- Grant users only the minimum permissions they need
- Default to denying access, explicitly grant permissions
- Review permissions regularly

### 2. **Data Filtering**
- Always filter data on the backend based on user role
- Don't rely solely on frontend hiding
- Validate permissions in every API call

### 3. **Audit Logging**
- Log all role changes and permission grants
- Track who changed what and when
- Maintain audit trail for compliance

### 4. **Role Separation**
- Keep roles focused on specific responsibilities
- Avoid role overlap when possible
- Document role responsibilities clearly

### 5. **Testing**
- Test each role's access to all modules
- Verify data filtering works correctly
- Test edge cases (role changes, permission updates)

## Adding New Roles

To add a new role:

1. **Update the UserRole type** in `shared/rbac.ts`:
```ts
export type UserRole = "admin" | "owner" | "driver" | "dispatcher" | "user" | "new_role";
```

2. **Add permissions** in `ROLE_PERMISSIONS`:
```ts
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  // ... existing roles
  new_role: {
    "module-1": true,
    "module-2": false,
    // ... other modules
  },
};
```

3. **Add role description**:
```ts
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  // ... existing descriptions
  new_role: "Description of the new role",
};
```

4. **Update database schema** if needed
5. **Test all permissions** for the new role

## Adding New Modules

To add a new module to the RBAC system:

1. **Add module name** to `ROLE_PERMISSIONS`:
```ts
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // ... existing modules
    "new-module": true,
  },
  owner: {
    "new-module": true,
  },
  // ... other roles
};
```

2. **Create ProtectedRoute** for the new module:
```tsx
<Route 
  path="/new-module" 
  component={ProtectedRoute({
    component: NewModule,
    requiredModule: "new-module"
  })} 
/>
```

3. **Add backend validation** in tRPC procedures
4. **Test access** for all roles

## Troubleshooting

### User can't access a module
1. Check user's role in database
2. Verify module is in `ROLE_PERMISSIONS`
3. Check `ProtectedRoute` is correctly configured
4. Verify backend validation in tRPC procedures

### Menu items not showing
1. Verify `getAccessibleModules` is called
2. Check `DashboardLayout` is filtering menu correctly
3. Verify user role is loaded correctly

### Data visible to wrong role
1. Check backend filtering in tRPC procedures
2. Verify `ctx.user.role` is correct
3. Add explicit permission checks in queries

## Support

For questions or issues with RBAC:
1. Review this guide
2. Check `shared/rbac.ts` for permission definitions
3. Review `ProtectedRoute.tsx` implementation
4. Check backend validation in relevant tRPC routers
