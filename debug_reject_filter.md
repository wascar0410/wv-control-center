# Reject Filter Debug Analysis

## Current Status
- All filter: 56 loads ✅ CORRECT
- Accept filter: 15 loads ✅ CORRECT
- Reject filter: 0 loads ❌ BROKEN (should be ~41)
- Blocked filter: 0 loads ✅ CORRECT (no blocked loads in dataset)

## Filter Logic (DispatchBoard.tsx lines 170-171)
```typescript
case "reject":
  return routeBlocked === false && economicRecommendation === "reject";
```

## Analysis
The Reject filter returns loads where:
1. `routeBlocked === false` (route data is valid)
2. `economicRecommendation === "reject"` (backend returned recommendation="reject")

## Possible Issues
1. The backend is returning recommendation="blocked" for low-margin loads instead of "reject"
2. The `getEconomicRecommendation()` function is not properly extracting "reject" from the advice
3. The advice data is not being fetched correctly for the Reject filter

## Backend Changes Made
- Updated LoadAdvice type to include "blocked" recommendation
- Changed analyzeLoad() to return recommendation="blocked" for missing route coordinates
- This should NOT affect loads with valid coordinates

## Frontend Changes Made
- Updated LoadAdviceData interface to include "blocked" recommendation
- Simplified isRouteBlocked() to only check for "blocked" recommendation or missing coordinates
- Filter logic remains unchanged

## Next Steps
Need to verify:
1. What recommendation is being returned by the backend for low-margin loads
2. Whether the advice data is being fetched correctly
3. Whether the filter logic is correctly comparing the recommendation values
