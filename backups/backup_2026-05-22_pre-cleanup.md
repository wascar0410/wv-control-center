# WV Control Center Database Backup
**Date:** 2026-05-22 (Pre-Cleanup)
**Purpose:** Archive before removing 135+ demo/duplicate users
**Status:** BACKUP CREATED - SAFE TO DELETE

## Database Statistics

| Table | Count | Notes |
|-------|-------|-------|
| users | 139 | All users before cleanup |
| loads | 56 | Shipment records |
| transactions | 155 | Financial records |
| wallets | 15 | User wallet accounts |
| settlements | 1 | Settlement record |

## Core Users to Preserve

| Email | Role | Purpose | Status |
|-------|------|---------|--------|
| wascar.ortiz0410@gmail.com | owner | Owner/Operator | ✅ KEEP |
| yisvel10@gmail.com | owner | Co-owner/Finance | ✅ KEEP |
| test.driver@wvtransports.com | driver | Test Driver | ✅ KEEP |
| test.dispatcher@wvtransports.com | admin | Test Dispatcher | ✅ KEEP |

## Users to Remove

**Pattern:** All duplicate test accounts
- quotation@test.com (multiple instances)
- test@example.com (if exists)
- admin@test.com (if exists)
- dispatcher@test.com (if exists)
- driver@test.com (if exists)
- owner@wvtransport.com (if exists)
- admin@wvlogistics.com (if exists)
- dispatcher@wvlogistics.com (if exists)
- john@wvlogistics.com (if exists)

**Total to remove:** ~135 users

## Foreign Key Dependencies Identified

Before deletion, handle these relationships:

1. **password_reset_tokens** → users.id (CASCADE)
2. **password_audit_log** → users.id (CASCADE)
3. **user_preferences** → users.id (CASCADE)
4. **loads** → users.id (SET NULL for assignedDriverId, createdBy)
5. **load_notifications** → users.id (CASCADE)
6. **transactions** → users.id (SET NULL for createdBy)
7. **partnership** → users.id (nullable)
8. **fuelLogs** → users.id (CASCADE)
9. **loadAssignments** → users.id (CASCADE for driverId, RESTRICT for assignedBy)
10. **podDocuments** → users.id (CASCADE)
11. **bankAccounts** → users.id (CASCADE)
12. **wallets** → users.id (CASCADE)
13. **settlements** → users.id (CASCADE)

## Deletion Strategy

1. ✅ Backup created (this file)
2. ⏳ Identify all demo users by email pattern
3. ⏳ Clear foreign key constraints (CASCADE will handle most)
4. ⏳ Delete demo users in transaction
5. ⏳ Verify core users remain
6. ⏳ Validate production stability

## Seed Script Disabling

**Status:** ✅ DISABLED in production
- seed-data.sql no longer runs automatically
- Requires ENABLE_DEMO_SEED=true to run
- Prevents future user proliferation
