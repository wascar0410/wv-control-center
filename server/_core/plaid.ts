import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import { ENV } from "./env";

let _plaidClient: PlaidApi | null = null;

/** Returns true only if Plaid credentials are configured */
export function isPlaidConfigured(): boolean {
  return !!(ENV.PLAID_CLIENT_ID && ENV.PLAID_SECRET);
}

function getPlaidBasePath() {
  switch (ENV.PLAID_ENV) {
    case "production":
      return PlaidEnvironments.Production;
    case "development":
      return PlaidEnvironments.Development;
    case "sandbox":
    default:
      return PlaidEnvironments.Sandbox;
  }
}

export function getPlaidClient(): PlaidApi {
  if (!isPlaidConfigured()) {
    throw new Error(
      "Plaid no está configurado. Agrega PLAID_CLIENT_ID y PLAID_SECRET en las variables de entorno de Railway (Settings → Variables)."
    );
  }

  if (_plaidClient) return _plaidClient;

  const configuration = new Configuration({
    basePath: getPlaidBasePath(),
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": ENV.PLAID_CLIENT_ID,
        "PLAID-SECRET": ENV.PLAID_SECRET,
      },
    },
  });

  _plaidClient = new PlaidApi(configuration);
  return _plaidClient;
}

export async function createLinkToken(userId: number, redirectUri?: string) {
  const client = getPlaidClient();

  const params: any = {
    user: { client_user_id: `wv-user-${userId}` },
    client_name: "WV Control Center",
    language: "es",
    products: [Products.Auth, Products.Transactions],
    country_codes: [CountryCode.Us],
    webhook: ENV.isProduction
      ? "https://wv-control-center-production.up.railway.app/api/plaid/webhook"
      : undefined,
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  };

  try {
    const response = await client.linkTokenCreate(params);
    return response.data.link_token;
  } catch (err: any) {
    const plaidMsg =
      err?.response?.data?.error_message ||
      err?.response?.data?.display_message ||
      err?.message ||
      "Error desconocido de Plaid";
    throw new Error(`Plaid createLinkToken falló: ${plaidMsg}`);
  }
}

export async function exchangePublicToken(publicToken: string) {
  const client = getPlaidClient();

  try {
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  } catch (err: any) {
    const plaidMsg =
      err?.response?.data?.error_message ||
      err?.response?.data?.display_message ||
      err?.message ||
      "Error desconocido";
    throw new Error(`Plaid exchangeToken falló: ${plaidMsg}`);
  }
}

export async function getTransactions(
  accessToken: string,
  startDate: Date,
  endDate: Date
) {
  const client = getPlaidClient();

  const response = await client.transactionsGet({
    access_token: accessToken,
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    options: { count: 500, offset: 0 },
  });

  return response.data.transactions;
}

/**
 * Incremental sync via /transactions/sync (recommended by Plaid).
 */
export async function syncTransactions(
  accessToken: string,
  cursor?: string,
  count: number = 100
) {
  const client = getPlaidClient();

  const response = await client.transactionsSync({
    access_token: accessToken,
    cursor: cursor ?? undefined,
    count,
  });

  const { added, modified, removed, next_cursor, has_more } = response.data;

  return {
    added: added ?? [],
    modified: modified ?? [],
    removed: removed ?? [],
    nextCursor: next_cursor,
    hasMore: !!has_more,
  };
}

/**
 * Map a Plaid transaction to our financial_transactions schema.
 * Plaid convention:
 * - positive amount = debit / expense
 * - negative amount = credit / income
 */
export function mapPlaidTransaction(tx: any) {
  const rawAmount = Number(tx?.amount ?? 0);
  const isExpense = rawAmount > 0;

  return {
    date: tx.date,
    name: tx.merchant_name || tx.name,
    merchantName: tx.merchant_name ?? undefined,
    amount: Math.abs(rawAmount),
    type: isExpense ? ("expense" as const) : ("income" as const),
    category: mapPlaidCategory(
      tx.personal_finance_category?.primary ?? tx.category?.[0]
    ),
    plaidTransactionId: tx.transaction_id,
    isTaxDeductible: isBusinessExpense(
      tx.personal_finance_category?.primary ?? tx.category?.[0]
    ),
    source: "plaid" as const,
  };
}

function mapPlaidCategory(plaidCategory?: string): string {
  if (!plaidCategory) return "other";

  const cat = plaidCategory.toLowerCase();

  if (cat.includes("fuel") || cat.includes("gas")) return "fuel";
  if (cat.includes("toll")) return "tolls";
  if (cat.includes("insurance")) return "insurance";
  if (
    cat.includes("repair") ||
    cat.includes("maintenance") ||
    cat.includes("auto")
  ) {
    return "maintenance";
  }
  if (cat.includes("phone") || cat.includes("telecom")) return "phone";
  if (cat.includes("payroll") || cat.includes("wages")) return "payroll";
  if (cat.includes("subscription") || cat.includes("software")) {
    return "subscriptions";
  }
  if (
    cat.includes("income") ||
    cat.includes("deposit") ||
    cat.includes("transfer_in")
  ) {
    return "load_payment";
  }

  return "other";
}

function isBusinessExpense(plaidCategory?: string): boolean {
  if (!plaidCategory) return false;

  const cat = plaidCategory.toLowerCase();
  const deductibleKeywords = [
    "fuel",
    "gas",
    "toll",
    "insurance",
    "repair",
    "maintenance",
    "phone",
    "telecom",
    "payroll",
    "subscription",
    "software",
  ];

  return deductibleKeywords.some((keyword) => cat.includes(keyword));
}

export async function getAccounts(accessToken: string) {
  const client = getPlaidClient();

  const response = await client.accountsGet({
    access_token: accessToken,
  });

  return response.data.accounts ?? [];
}

export async function removeItem(accessToken: string) {
  const client = getPlaidClient();

  await client.itemRemove({
    access_token: accessToken,
  });
}
