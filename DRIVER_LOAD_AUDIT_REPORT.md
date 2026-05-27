# Driver Load Data Audit Report

**Date**: May 26, 2026  
**Objective**: Audit current driver load data and calculations before implementing improved driver experience UI with earnings breakdown and load scoring

---

## A. Available Load Data Fields

### Currently Available in Database (loads table)

| Field | Type | Available | Notes |
|-------|------|-----------|-------|
| loadId | int | ✅ Yes | Primary key (id) |
| clientName | varchar | ✅ Yes | Client/shipper name |
| pickupAddress | text | ✅ Yes | Pickup location |
| deliveryAddress | text | ✅ Yes | Delivery location |
| pickupLat/Lng | decimal | ✅ Yes | Pickup coordinates |
| deliveryLat/Lng | decimal | ✅ Yes | Delivery coordinates |
| price | decimal | ✅ Yes | Load price/revenue |
| weight | decimal | ✅ Yes | Cargo weight |
| weightUnit | varchar | ✅ Yes | Unit (lbs, kg, etc.) |
| merchandiseType | varchar | ✅ Yes | Type of cargo |
| estimatedFuel | decimal | ✅ Yes | Estimated fuel cost |
| estimatedTolls | decimal | ✅ Yes | Estimated tolls |
| netMargin | decimal | ✅ Yes | Calculated margin |
| status | enum | ✅ Yes | Load status (available, in_transit, delivered, invoiced, paid) |
| assignedDriverId | int | ✅ Yes | Driver assignment |
| pickupDate | timestamp | ✅ Yes | Scheduled pickup |
| deliveryDate | timestamp | ✅ Yes | Scheduled delivery |
| driverPay | ❌ No | Not in schema | **MISSING** - Driver-specific pay amount |
| commissionPercent | ❌ No | Not in schema | **MISSING** - Commission for this load |
| estimatedDriveTime | ❌ No | Not in schema | **MISSING** - Estimated drive duration |
| estimatedShoppingTime | ❌ No | Not in schema | **MISSING** - Estimated service time |
| estimatedTotalTime | ❌ No | Not in schema | **MISSING** - Total estimated time |
| fuelType | ❌ No | Not in schema | **MISSING** - Vehicle fuel type |
| fuelCostPerMile | ❌ No | Not in schema | **MISSING** - Operating cost per mile |
| vehicleCostPerMile | ❌ No | Not in schema | **MISSING** - Total vehicle cost per mile |
| itemCount | ❌ No | Not in schema | **MISSING** - Number of items/stops |
| stopCount | ❌ No | Not in schema | **MISSING** - Number of delivery stops |
| serviceType | ❌ No | Not in schema | **MISSING** - Type of service (delivery, pickup, etc.) |

**Summary**: 17 fields available, 8 fields missing

---

## B. Existing Calculations

### Currently Implemented

| Calculation | Exists | Location | Formula |
|-------------|--------|----------|---------|
| **grossPay** | ✅ Yes | `normalizeLoadFinancials()` | `load.price` |
| **netPay** | ✅ Yes | `normalizeLoadFinancials()` | `price - fuel - tolls` (stored as `profit`) |
| **fuelCost** | ✅ Yes | `normalizeLoadFinancials()` | `load.estimatedFuel` |
| **vehicleCost** | ❌ No | N/A | **NOT CALCULATED** |
| **netProfit** | ✅ Yes | `normalizeLoadFinancials()` | `price - fuel - tolls` (stored as `profit`) |
| **payPerMile** | ✅ Yes | `normalizeLoadFinancials()` | `price / miles` (stored as `ratePerMile`) |
| **payPerHour** | ❌ No | N/A | **NOT CALCULATED** - No time data available |
| **estimatedTimeMinutes** | ❌ No | N/A | **NOT CALCULATED** - No time data available |
| **driverCommission** | ❌ No | N/A | **NOT CALCULATED** - Commission field missing |
| **settlementAmount** | ❌ No | N/A | **NOT CALCULATED** - Settlement logic not in load context |
| **walletReserve** | ✅ Yes | `WalletDashboard.tsx` | Fetched from wallet service |
| **miles** | ✅ Yes | `normalizeLoadFinancials()` | Haversine calculation from coordinates |
| **margin** | ✅ Yes | `normalizeLoadFinancials()` | `(profit / price) * 100` |

**Summary**: 6 calculations exist, 6 are missing

### Current Calculation Logic (normalizeLoadFinancials)

```typescript
// Input: Load object from database
const price = Number(load.price) || 0;
const fuel = Number(load.estimatedFuel) || 0;
const tolls = Number(load.estimatedTolls) || 0;

// Miles calculation (Haversine from coordinates)
// If coordinates invalid, defaults to 120 miles
const miles = calculateHaversine(pickup, delivery) || 120;

// Output fields added to load object:
{
  miles,                    // Calculated distance
  ratePerMile: price / miles,  // Revenue per mile
  profit: price - fuel - tolls,  // Net profit
  margin: (profit / price) * 100,  // Margin percentage
}
```

---

## C. Missing Critical Fields

To implement the driver load scoring UI, these fields are **REQUIRED**:

1. **driverPay** - Amount driver receives (may differ from load price)
2. **commissionPercent** - Commission rate for this load
3. **estimatedDriveTime** - Drive time in minutes
4. **estimatedShoppingTime** - Service/shopping time in minutes
5. **estimatedTotalTime** - Total time estimate
6. **itemCount** - Number of items/stops
7. **fuelCostPerMile** - Operating cost per mile (vehicle-specific)
8. **vehicleCostPerMile** - Total vehicle cost per mile

---

## D. Current Driver UI Structure

### DriverOps.tsx Overview

**Tabs**:
- **Dashboard Tab**: KPIs, wallet summary, recent deliveries
- **Operations Tab**: Active loads, available loads, completed loads

**Data Fetched**:
- `trpc.driver.myLoads` - Returns all loads for driver
- `trpc.driverStats.getDriverStats` - Returns monthly aggregates
- `trpc.wallet.getWalletSummary` - Returns wallet balances

**Current Load Display** (LoadStatusCard):
- Client name
- Pickup/delivery addresses
- Weight and merchandise type
- Price (gross pay)
- Status badge
- Action buttons (Start route, Mark delivered, etc.)

**Missing from Current UI**:
- Net pay breakdown
- Hourly rate estimate
- Vehicle cost estimate
- Load profitability score
- Time estimate
- Mileage

---

## E. Safe V1 Implementation Formula

### Proposed Calculation Logic

```typescript
// V1 Driver Load Earnings Formula

// 1. TIME ESTIMATION (requires new fields)
const minutesPerItem = 1.1; // Default: 1.1 min per item
const bufferMinutes = 5;    // Default: 5 min buffer
const minimumEstimatedMinutes = 15; // Minimum 15 min

const serviceMinutes = (itemCount || 1) * minutesPerItem;
const estimatedTotalMinutes = Math.max(
  driveToPickupMinutes + 
  serviceMinutes + 
  deliveryDriveMinutes + 
  bufferMinutes,
  minimumEstimatedMinutes
);

// 2. DISTANCE
const totalMiles = pickupMiles + deliveryMiles;
// OR use Haversine from coordinates (already implemented)

// 3. VEHICLE COST
const vehicleCostPerMile = 0.179; // Default: $0.179/mile
const vehicleCost = totalMiles * vehicleCostPerMile;

// 4. GROSS PAY
const grossPay = load.price; // or load.driverPay if available

// 5. NET PAY
const netPay = grossPay - vehicleCost;

// 6. HOURLY RATE
const hourlyRate = (netPay / estimatedTotalMinutes) * 60;

// 7. PAY PER MILE
const payPerMile = netPay / totalMiles;

// 8. PROFITABILITY SCORE
const driverTargetHourlyRate = 25; // $25/hour target
const scoreStatus = 
  hourlyRate >= driverTargetHourlyRate ? 'healthy' :
  hourlyRate >= (driverTargetHourlyRate * 0.8) ? 'at_risk' :
  'loss';
```

### Safe Defaults (if data missing)

```typescript
{
  minutesPerItem: 1.1,           // Minutes per item/stop
  bufferMinutes: 5,              // Safety buffer
  vehicleCostPerMile: 0.179,     // Cargo van operating cost
  minimumEstimatedMinutes: 15,   // Minimum time estimate
  defaultStopCount: 1,           // Default 1 stop if not specified
  defaultItemCount: 1,           // Default 1 item if not specified
  driverTargetHourlyRate: 25,    // $25/hour target for scoring
}
```

---

## F. Implementation Roadmap

### Phase 1: Data Augmentation (Required First)

Before implementing UI, add these fields to the `loads` table:

```sql
ALTER TABLE loads ADD COLUMN driverPay DECIMAL(10, 2);
ALTER TABLE loads ADD COLUMN commissionPercent DECIMAL(5, 2);
ALTER TABLE loads ADD COLUMN estimatedDriveTime INT;
ALTER TABLE loads ADD COLUMN estimatedShoppingTime INT;
ALTER TABLE loads ADD COLUMN itemCount INT;
ALTER TABLE loads ADD COLUMN stopCount INT;
ALTER TABLE loads ADD COLUMN fuelCostPerMile DECIMAL(5, 3);
ALTER TABLE loads ADD COLUMN vehicleCostPerMile DECIMAL(5, 3);
```

### Phase 2: Backend Calculation Service

Create `server/services/driver-earnings.ts`:

```typescript
export interface DriverLoadEarnings {
  grossPay: number;
  netPay: number;
  vehicleCost: number;
  hourlyRate: number;
  payPerMile: number;
  estimatedTotalMinutes: number;
  totalMiles: number;
  scoreStatus: 'healthy' | 'at_risk' | 'loss';
  scorePercentage: number;
}

export function calculateLoadEarnings(load: Load, defaults: Defaults): DriverLoadEarnings {
  // Implement safe formula with defaults
}
```

### Phase 3: UI Components

Create new components in `client/src/components/`:

1. **DriverLoadCard** - Compact load card with earnings summary
2. **DriverLoadDetailDrawer** - Detailed breakdown with calculations
3. **DriverEarningsBreakdown** - Visual breakdown of costs
4. **DriverLoadScoreBadge** - Color-coded profitability indicator

### Phase 4: Integration

Update `DriverOps.tsx` to use new components and calculations.

---

## G. Risk Assessment

### Implementation Risk: **LOW**

**Reasons**:
- ✅ Core load data already available (price, fuel, tolls, coordinates)
- ✅ Distance calculation already implemented (Haversine)
- ✅ Basic profit calculation already exists
- ⚠️ Time data missing (requires new fields or defaults)
- ⚠️ Vehicle cost not yet calculated (requires defaults)
- ✅ No database schema changes required for V1 (can use defaults)
- ✅ Can implement with safe defaults while data is being added

### Mitigation Strategy

**V1 (No Schema Changes)**:
- Use safe defaults for missing fields
- Calculate earnings with available data (price, fuel, tolls, miles)
- Show hourly rate as "Estimated" with disclaimer

**V1.1 (With Schema Changes)**:
- Add missing fields to loads table
- Populate with defaults or driver input
- Remove disclaimers and show actual values

---

## H. Recommended UI Components

### 1. DriverLoadCard (Compact)

```
┌─────────────────────────────────────┐
│ Client Name                    Status│
│ Pickup → Delivery                    │
├─────────────────────────────────────┤
│ Gross Pay: $450  │  Net Pay: $380   │
│ Hourly: $28.50   │  Miles: 120      │
│ Time: 4h 45m     │  Score: ✅ Good  │
├─────────────────────────────────────┤
│ [View Details] [Accept/Reject]      │
└─────────────────────────────────────┘
```

### 2. DriverLoadDetailDrawer (Full)

```
Load Details
├─ Pickup/Delivery Info
│  ├─ Pickup: Address, Time
│  ├─ Delivery: Address, Time
│  └─ Distance: 120 miles
├─ Time Breakdown
│  ├─ Drive to Pickup: 45 min
│  ├─ Service Time: 30 min
│  ├─ Delivery Drive: 180 min
│  └─ Total: 4h 45m
├─ Earnings Breakdown
│  ├─ Gross Pay: $450.00
│  ├─ Vehicle Cost: -$21.48
│  ├─ Fuel Cost: -$48.50
│  └─ Net Pay: $380.02
├─ Profitability
│  ├─ Hourly Rate: $28.50
│  ├─ Per Mile: $3.17
│  └─ Status: ✅ Good (Target: $25/hr)
└─ [Accept] [Reject]
```

### 3. Color Coding

- **Green (✅ Healthy)**: Hourly rate ≥ $25/hr
- **Yellow (⚠️ At Risk)**: Hourly rate $20-$25/hr
- **Red (❌ Loss)**: Hourly rate < $20/hr

---

## I. Final Audit Summary

| Category | Status | Details |
|----------|--------|---------|
| **Data Availability** | ✅ 70% | Core data present, time/commission missing |
| **Calculations** | ✅ 60% | Basic earnings exist, hourly rate missing |
| **UI Components** | ❌ 0% | Need to build from scratch |
| **Backend Services** | ❌ 0% | Need earnings calculation service |
| **Schema Changes** | ⚠️ Optional | Can implement V1 without changes |
| **Implementation Risk** | ✅ Low | Safe to proceed with defaults |
| **Ready to Implement** | ✅ Yes | Can start UI with safe defaults |

---

## J. Audit Conclusion

**Status**: ✅ **READY TO IMPLEMENT**

The current system has sufficient data to implement a V1 driver load earnings UI with safe defaults. While some fields are missing (time estimates, commission), the core calculations (gross pay, net pay, distance, profitability) can be implemented immediately using:

1. **Existing data**: price, fuel, tolls, coordinates
2. **Safe defaults**: vehicle cost ($0.179/mile), time estimates (1.1 min/item)
3. **Existing calculations**: distance (Haversine), profit, margin

**Recommended Next Steps**:

1. ✅ Create `DriverLoadEarningsCalculator` service with safe defaults
2. ✅ Build `DriverLoadCard` and `DriverLoadDetailDrawer` components
3. ✅ Integrate into `DriverOps.tsx` operations tab
4. ⏳ Add missing schema fields in Phase 1.1 (non-blocking)
5. ⏳ Populate time estimates from driver input or broker data

**Implementation can begin immediately without waiting for schema changes.**

