

/**
 * AI Finance Advisor - Analyze financial health
 * Returns score, status, insights, and recommendations
 */
export async function analyzeFinancialHealth(userId: number): Promise<{
  score: number;
  status: "good" | "warning" | "risk";
  metrics: {
    availableBalance: number;
    reservedBalance: number;
    totalEarnings: number;
    liquidityRatio: number;
    reservePercentage: number;
  };
  insights: string[];
  recommendations: string[];
  alerts: string[];
}> {
  // Get wallet summary
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, userId),
  });

  if (!wallet) {
    return {
      score: 0,
      status: "risk",
      metrics: {
        availableBalance: 0,
        reservedBalance: 0,
        totalEarnings: 0,
        liquidityRatio: 0,
        reservePercentage: 0,
      },
      insights: ["No wallet found for user"],
      recommendations: ["Create a wallet to start tracking finances"],
      alerts: ["no_wallet"],
    };
  }

  const availableBalance = Number(wallet.availableBalance || 0);
  const reservedBalance = Number(wallet.reservedBalance || 0);
  const totalEarnings = Number(wallet.totalEarnings || 0);

  // Calculate metrics
  const liquidityRatio = totalEarnings > 0 ? availableBalance / totalEarnings : 0;
  const reservePercentage = totalEarnings > 0 ? (reservedBalance / totalEarnings) * 100 : 0;

  const insights: string[] = [];
  const recommendations: string[] = [];
  const alerts: string[] = [];

  let score = 10; // Start with perfect score and deduct

  // 1. LIQUIDITY ANALYSIS
  if (liquidityRatio < 0.1) {
    insights.push("Low liquidity: Less than 10% of earnings available");
    score -= 3;
    alerts.push("low_liquidity");
  } else if (liquidityRatio < 0.2) {
    insights.push("Moderate liquidity: 10-20% of earnings available");
    score -= 1;
  } else {
    insights.push(`Good liquidity: ${(liquidityRatio * 100).toFixed(1)}% of earnings available`);
  }

  // 2. RESERVE HEALTH
  const expectedReservePercentage = 30;
  if (reservePercentage < 10) {
    insights.push("Reserve is critically low");
    score -= 3;
    alerts.push("low_reserve");
    recommendations.push("Increase reserve transfers to build safety buffer");
  } else if (reservePercentage < expectedReservePercentage) {
    insights.push(`Reserve at ${reservePercentage.toFixed(1)}% (target: ${expectedReservePercentage}%)`);
    score -= 2;
    recommendations.push(`Build reserve to ${expectedReservePercentage}% for financial stability`);
  } else {
    insights.push(`Reserve healthy at ${reservePercentage.toFixed(1)}%`);
  }

  // 3. CASH FLOW ANALYSIS
  const recentTransactions = await db.query.walletLedger.findMany({
    where: and(
      eq(walletLedger.userId, userId),
      gte(walletLedger.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
    ),
    limit: 100,
  });

  let incomeSum = 0;
  let expenseSum = 0;

  for (const tx of recentTransactions) {
    const amount = Number(tx.amount || 0);
    if (tx.direction === "credit") {
      incomeSum += amount;
    } else {
      expenseSum += amount;
    }
  }

  const netCashFlow = incomeSum - expenseSum;
  if (netCashFlow > 0) {
    insights.push(`Positive cash flow: +$${netCashFlow.toFixed(2)} (last 30 days)`);
  } else if (netCashFlow < 0) {
    insights.push(`Negative cash flow: -$${Math.abs(netCashFlow).toFixed(2)} (last 30 days)`);
    score -= 2;
    alerts.push("negative_cashflow");
    recommendations.push("Review expenses and increase load acceptance");
  } else {
    insights.push("Neutral cash flow (last 30 days)");
  }

  // 4. OPERATING ACCOUNT CHECK
  const hasOperatingAccount = await db.query.bankAccounts.findFirst({
    where: eq(bankAccounts.userId, userId),
  });

  if (!hasOperatingAccount) {
    alerts.push("no_operating_account");
    recommendations.push("Connect a bank account for automatic transfers");
    score -= 1;
  } else {
    insights.push("Operating account connected");
  }

  // 5. EARNINGS THRESHOLD
  if (totalEarnings < 1000) {
    insights.push("Early stage: Building earnings history");
    score = Math.max(score - 1, 5); // Minimum score 5 for new users
  }

  // Clamp score to 0-10
  score = Math.max(0, Math.min(10, score));

  // Determine status
  let status: "good" | "warning" | "risk" = "warning";
  if (score > 8) {
    status = "good";
  } else if (score < 5) {
    status = "risk";
  }

  console.log(`[AI Finance Advisor] User ${userId}: score=${score}, status=${status}, liquidity=${(liquidityRatio * 100).toFixed(1)}%, reserve=${reservePercentage.toFixed(1)}%`);

  return {
    score,
    status,
    metrics: {
      availableBalance,
      reservedBalance,
      totalEarnings,
      liquidityRatio: Math.round(liquidityRatio * 1000) / 1000,
      reservePercentage: Math.round(reservePercentage * 10) / 10,
    },
    insights,
    recommendations,
    alerts,
  };
}
