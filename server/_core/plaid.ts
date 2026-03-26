import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { ENV } from "./env";

let _plaidClient: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (_plaidClient) return _plaidClient;

  const configuration = new Configuration({
    basePath: ENV.PLAID_ENV === "production" ? PlaidEnvironments.Production : PlaidEnvironments.Sandbox,
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
  
  const response = await client.linkTokenCreate({
    user: { client_user_id: `user-${userId}` },
    client_name: "WV Control Center",
    language: "es",
    products: ["auth" as any, "transactions" as any],
    country_codes: ["US" as any, "MX" as any],
    redirect_uri: redirectUri,
  });

  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const client = getPlaidClient();
  
  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

export async function getTransactions(accessToken: string, startDate: Date, endDate: Date) {
  const client = getPlaidClient();
  
  const response = await client.transactionsGet({
    access_token: accessToken,
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
  });

  return response.data.transactions;
}

export async function getAccounts(accessToken: string) {
  const client = getPlaidClient();
  
  const response = await client.accountsGet({
    access_token: accessToken,
  });

  return response.data.accounts;
}

export async function removeItem(accessToken: string) {
  const client = getPlaidClient();
  
  await client.itemRemove({
    access_token: accessToken,
  });
}
