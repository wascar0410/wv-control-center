# WV Control Center - Codebase Inspection Map
## Phase 0: Financial Logic Mapping

### 📍 Files Involved in Cost/Fuel/Profit Calculations

#### Frontend Utils
- `client/src/utils/load-advisor.ts` - AI advisor logic with profit-based recommendations
- `client/src/utils/vehicle-costs.ts` - Vehicle cost profiles (cargo_van, sprinter, box_truck, semi_truck)
- `client/src/utils/dispatchHelpers.ts` - Dispatch board helpers

#### Frontend Components
- `client/src/components/FinancialPanel.tsx` - Financial display (revenue, expenses, profit)
- `client/src/components/LoadAdvisorCard.tsx` - AI recommendation card (GOOD/NEGOTIATE/REJECT)
- `client/src/components/LoadStatusCard.tsx` - Load status display
- `client/src/components/QuotationForm.tsx` - Quotation form with vehicle type selector
- `client/src/components/QuotationResults.tsx` - Quotation results table
- `client/src/components/dispatch/DispatchLoadCard.tsx` - Load card in dispatch board
- `client/src/components/dispatch/DispatchDetailDrawer.tsx` - Load detail drawer
- `client/src/components/dispatch/DispatchTableView.tsx` - Dispatch table view
- `client/src/components/dispatch/LoadAdviceBadge.tsx` - Compact advisor badge
- `client/src/components/CreateLoadModal.tsx` - Create load modal

#### Frontend Pages
- `client/src/pages/Quotation.tsx` - Quotation analysis page
- `client/src/pages/LoadDetailPage.tsx` - Load detail page
- `client/src/pages/LoadDetail.tsx` - Alternative load detail
- `client/src/pages/DispatchBoard.tsx` - Main dispatch board
- `client/src/pages/DriverLoadDetail.tsx` - Driver load detail
- `client/src/pages/NewLoad.tsx` - New load creation
- `client/src/pages/BrokerLoadsManagement.tsx` - Broker loads management

#### Frontend Hooks
- `client/src/hooks/useLoadAdvice.ts` - Load advice hook

#### Backend Utils
- `server/vehicle-costs.ts` - Backend vehicle cost engine (NEW - unified)
- `server/db-dispatch-helpers.ts` - Dispatch helpers with buildLoadFinancialSnapshot()
- `server/db-load-evaluator.ts` - Load evaluation logic
- `server/db-driver-view.ts` - Driver view calculations

#### Backend Routers
- `server/_core/quotationRouter.ts` - Quotation calculation logic
- `server/routers/financial.ts` - Financial router
- `server/routers/financialExtended.ts` - Extended financial router
- `server/routers/quoteAnalysis.ts` - Quote analysis router
- `server/routers.ts` - Main routers

#### Backend Database
- `server/db.ts` - Database helpers
- `drizzle/schema.ts` - Database schema

#### Tests
- `server/financial.test.ts` - Financial tests
- `server/financial.integration.test.ts` - Financial integration tests
- `server/quotation.test.ts` - Quotation tests
- `server/loads-serialization.test.ts` - Loads serialization tests
- `server/db-annual-comparison.test.ts` - Annual comparison tests
- `server/db-quarterly-comparison.test.ts` - Quarterly comparison tests
- `server/db-projections.test.ts` - Projections tests
- `server/db-historical-comparison.test.ts` - Historical comparison tests
- `server/routes.test.ts` - Routes tests
- `server/wv.test.ts` - WV tests

---

## 🔍 DUPLICATE/CONFLICTING FORMULAS IDENTIFIED

### 1. **Operating Cost Calculation** (CONFLICT)
**Location 1: Backend - quotationRouter.ts**
- Old formula: `fuelCostPerMile + maintenancePerMile + tiresPerMile + fixedCostPerMile`
- Uses business config values
- Includes fixed monthly costs amortized per mile

**Location 2: Frontend - vehicle-costs.ts**
- New formula: `miles * vehicleProfile.costPerMile`
- Uses hardcoded vehicle profiles
- Cargo van: $0.56/mile (fuel $0.28, maintenance $0.08, tires $0.03, depreciation $0.12, risk $0.05)

**Location 3: Backend - vehicle-costs.ts (NEW)**
- Same as Location 2 but server-side
- calculateVehicleOperatingCost(vehicleType, miles)

**CONFLICT RESULT:** Header shows $958, Table shows $692 for same load

### 2. **Fuel Cost Calculation** (DUPLICATE)
**Location 1: quotationRouter.ts**
- `estimatedFuelCost = totalMiles * fuelCostPerMile`
- fuelCostPerMile = fuelPricePerGallon / vanMpg

**Location 2: vehicle-costs.ts (frontend)**
- Hardcoded: fuel = 0.28/mile for cargo van

**Location 3: FinancialPanel.tsx**
- Uses `load.estimatedFuel` directly from database

**CONFLICT:** Multiple sources, no single truth

### 3. **Profit Calculation** (DUPLICATE)
**Location 1: quotationRouter.ts**
- `estimatedProfit = totalPrice - totalOperatingCost`

**Location 2: load-advisor.ts**
- `profit = revenue - operatingCost - tolls`

**Location 3: FinancialPanel.tsx**
- `profit = revenue - expenses`

**Location 4: buildLoadFinancialSnapshot() in db-dispatch-helpers.ts**
- Custom snapshot calculation

### 4. **Rate Per Mile** (DUPLICATE)
**Location 1: quotationRouter.ts**
- `ratePerLoadedMile = totalPrice / loadedMiles`

**Location 2: load-advisor.ts**
- `rpm = revenue / miles`

**Location 3: Multiple components**
- Inline calculations

### 5. **Recommendation Logic** (DUPLICATE)
**Location 1: quotationRouter.ts**
- Verdict based on ratePerLoadedMile thresholds

**Location 2: load-advisor.ts**
- Verdict based on profit + rpm + risk flags

**Location 3: useLoadAdvice.ts**
- Hook-based recommendation

---

## 📊 FINANCIAL SURFACES

### Display Surfaces
1. **Quotation Results Page**
   - Header: Operating cost, profit, margin
   - Table: Price, operating cost, profit, margin, rate/mile
   - Decision: ACEPTAR / NEGOCIAR / RECHAZAR

2. **Load Detail Page**
   - FinancialPanel: Revenue, expenses breakdown, profit
   - LoadAdvisorCard: Recommendation, profit, rate/mile
   - LoadStatusCard: Status display

3. **Dispatch Board**
   - DispatchLoadCard: Quick profit/rate view
   - DispatchTableView: List of loads with financials
   - DispatchDetailDrawer: Detailed view

4. **Driver Dashboard**
   - DriverLoadDetail: Simplified financial view

5. **Broker Loads Management**
   - BrokerLoadsManagement: Broker load financials

---

## 🔧 CALCULATION PATHS

### Path 1: Quotation Analysis (Backend → Frontend)
1. User enters quotation details
2. Backend: quotationRouter.calculateProfitability()
3. Calculates: operatingCost, profit, margin, verdict
4. Frontend: QuotationResults displays results
5. User approves → Quotation.tsx creates load

### Path 2: Load Display (Backend → Frontend)
1. Load created with buildLoadFinancialSnapshot()
2. Backend: db-dispatch-helpers.ts calculates snapshot
3. Frontend: Components read snapshot
4. Display: FinancialPanel, LoadAdvisorCard, etc.

### Path 3: AI Advisor (Frontend)
1. Load data passed to load-advisor.ts
2. analyzeLoadAdvanced() calculates recommendation
3. Frontend: LoadAdvisorCard displays recommendation
4. Compact: LoadAdviceBadge shows compact view

---

## ⚠️ IDENTIFIED ISSUES

1. **No Single Source of Truth**
   - Operating cost calculated 3+ different ways
   - No unified vehicle cost engine used everywhere

2. **Inconsistent Defaults**
   - Backend uses business config (variable)
   - Frontend uses hardcoded profiles
   - Results in conflicting values

3. **Fuel Not Always Automatic**
   - Can be manually entered
   - Not always derived from route + profile

4. **Old Loads Still Using Fallback 120**
   - 41 loads without valid coordinates
   - Using 120-mile default
   - AI advisor blocks these (UNKNOWN state)

5. **Market Intelligence Missing**
   - No lane/region risk assessment
   - No reload probability
   - No deadhead risk calculation

6. **Compact Advisor Not in Dispatch Board**
   - LoadAdviceBadge exists but not integrated
   - Dispatch board doesn't show recommendations

7. **Command Center Highlight Incomplete**
   - useHighlightedLoad hook exists
   - LoadHighlightWrapper exists
   - But not fully integrated in CommandCenter

8. **Auth/Cookie Issue**
   - "Missing session cookie" warnings still appear
   - Needs audit of fetch/credentials/cookie config

---

## 📋 NEXT STEPS

**Phase 1:** Build unified vehicle cost engine at `/core/financial/vehicle-cost-engine.ts`
**Phase 2:** Rewire all consumers to use unified engine
**Phase 3:** Add vehicle profiles
**Phase 4:** Ensure fuel is always automatic
**Phase 5:** Add market intelligence MVP
**Phase 6:** Integrate market signals
**Phase 7:** Add compact advisor to dispatch board
**Phase 8:** Complete highlight integration
**Phase 9:** Auth/cookie audit
