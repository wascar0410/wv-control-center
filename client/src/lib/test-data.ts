/**
 * Test data generators for dashboard components
 * Used for unit tests and storybook stories
 */

export interface ProjectionsData {
  completedMiles: number;
  quotedMiles: number;
  totalMilesActual: number;
  projectedTotalMiles: number;
  milesPercentage: number;
  willReachGoal: boolean;

  completedProfit: number;
  quotedProfit: number;
  totalProfitActual: number;
  projectedTotalProfit: number;

  dailyAverageMiles: number;
  dailyAverageProfit: number;
  daysPassed: number;
  daysRemaining: number;
  daysInMonth: number;
}

/**
 * Generate mock projections data for testing
 * Simulates realistic monthly projections
 */
export function generateMockProjections(
  overrides?: Partial<ProjectionsData>
): ProjectionsData {
  const daysPassed = 15;
  const daysInMonth = 30;
  const daysRemaining = daysInMonth - daysPassed;

  const completedMiles = 1500;
  const quotedMiles = 800;
  const dailyAverageMiles = completedMiles / daysPassed;
  const projectedTotalMiles = completedMiles + dailyAverageMiles * daysRemaining;

  const completedProfit = 3500;
  const quotedProfit = 1200;
  const dailyAverageProfit = completedProfit / daysPassed;
  const projectedTotalProfit = completedProfit + dailyAverageProfit * daysRemaining;

  const milesPercentage = (projectedTotalMiles / 4000) * 100;

  return {
    completedMiles,
    quotedMiles,
    totalMilesActual: completedMiles + quotedMiles,
    projectedTotalMiles: Math.round(projectedTotalMiles),
    milesPercentage: Math.round(milesPercentage),
    willReachGoal: projectedTotalMiles >= 4000,

    completedProfit,
    quotedProfit,
    totalProfitActual: completedProfit + quotedProfit,
    projectedTotalProfit: Math.round(projectedTotalProfit),

    dailyAverageMiles: Math.round(dailyAverageMiles),
    dailyAverageProfit: Math.round(dailyAverageProfit),
    daysPassed,
    daysRemaining,
    daysInMonth,

    ...overrides,
  };
}

/**
 * Generate mock projections data for edge cases
 */
export const MOCK_PROJECTIONS_SCENARIOS = {
  // On track to reach goal
  onTrack: generateMockProjections({
    completedMiles: 2000,
    quotedMiles: 500,
    daysPassed: 20,
    daysRemaining: 10,
  }),

  // Behind on goal
  behind: generateMockProjections({
    completedMiles: 800,
    quotedMiles: 200,
    daysPassed: 20,
    daysRemaining: 10,
  }),

  // Ahead of goal
  ahead: generateMockProjections({
    completedMiles: 3000,
    quotedMiles: 1000,
    daysPassed: 15,
    daysRemaining: 15,
  }),

  // Beginning of month
  beginning: generateMockProjections({
    completedMiles: 200,
    quotedMiles: 100,
    daysPassed: 1,
    daysRemaining: 29,
  }),

  // End of month
  end: generateMockProjections({
    completedMiles: 3500,
    quotedMiles: 500,
    daysPassed: 29,
    daysRemaining: 1,
  }),

  // No data
  empty: generateMockProjections({
    completedMiles: 0,
    quotedMiles: 0,
    totalMilesActual: 0,
    projectedTotalMiles: 0,
    milesPercentage: 0,
    completedProfit: 0,
    quotedProfit: 0,
    totalProfitActual: 0,
    projectedTotalProfit: 0,
    dailyAverageMiles: 0,
    dailyAverageProfit: 0,
  }),

  // High profit scenario
  highProfit: generateMockProjections({
    completedMiles: 2000,
    quotedMiles: 800,
    completedProfit: 8000,
    quotedProfit: 3000,
    daysPassed: 15,
    daysRemaining: 15,
  }),

  // Low profit scenario
  lowProfit: generateMockProjections({
    completedMiles: 2000,
    quotedMiles: 800,
    completedProfit: 1500,
    quotedProfit: 500,
    daysPassed: 15,
    daysRemaining: 15,
  }),
};

/**
 * Generate multiple projections for trend analysis
 */
export function generateMockProjectionsTrend(
  months: number = 6
): ProjectionsData[] {
  const trends: ProjectionsData[] = [];

  for (let i = months; i > 0; i--) {
    const baseProfit = 5000;
    const variance = Math.sin(i) * 2000;

    trends.push(
      generateMockProjections({
        completedMiles: 3000 + Math.random() * 1000,
        quotedMiles: 500 + Math.random() * 500,
        completedProfit: baseProfit + variance + Math.random() * 1000,
        quotedProfit: 1000 + Math.random() * 500,
        daysPassed: 30,
        daysRemaining: 0,
      })
    );
  }

  return trends;
}

/**
 * Generate mock KPI data for dashboard
 */
export interface KPIData {
  activeLoads: number;
  monthIncome: number;
  monthExpenses: number;
  monthProfit: number;
}

export function generateMockKPIs(overrides?: Partial<KPIData>): KPIData {
  return {
    activeLoads: 5,
    monthIncome: 12500,
    monthExpenses: 3200,
    monthProfit: 9300,
    ...overrides,
  };
}

/**
 * Generate mock recent loads data
 */
export interface LoadData {
  id: number;
  clientName: string;
  origin: string;
  destination: string;
  price: number;
  status: "available" | "in_transit" | "delivered" | "cancelled";
  miles: number;
  createdAt: Date;
}

export function generateMockLoads(count: number = 5): LoadData[] {
  const statuses: LoadData["status"][] = [
    "available",
    "in_transit",
    "delivered",
    "cancelled",
  ];
  const clients = [
    "ABC Logistics",
    "XYZ Shipping",
    "Global Transport",
    "FastFreight",
    "QuickMove",
  ];
  const cities = [
    "Los Angeles",
    "Chicago",
    "New York",
    "Dallas",
    "Denver",
    "Atlanta",
  ];

  const loads: LoadData[] = [];

  for (let i = 0; i < count; i++) {
    const origin = cities[Math.floor(Math.random() * cities.length)];
    const destination = cities[Math.floor(Math.random() * cities.length)];

    loads.push({
      id: i + 1,
      clientName: clients[Math.floor(Math.random() * clients.length)],
      origin,
      destination,
      price: 500 + Math.random() * 3000,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      miles: 100 + Math.random() * 2000,
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ),
    });
  }

  return loads;
}

/**
 * Generate mock comparison data for analytics
 */
export interface ComparisonData {
  month: string;
  miles: number;
  income: number;
  profit: number;
}

export function generateMockComparison(months: number = 6): ComparisonData[] {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const data: ComparisonData[] = [];

  for (let i = months; i > 0; i--) {
    const monthIndex = (new Date().getMonth() - i + 12) % 12;
    data.push({
      month: monthNames[monthIndex],
      miles: 3000 + Math.random() * 1500,
      income: 10000 + Math.random() * 5000,
      profit: 5000 + Math.random() * 3000,
    });
  }

  return data;
}
