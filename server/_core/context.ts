import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {

  // 🔥 DEV MODE TOTAL (Railway / testing)
  if (process.env.NODE_ENV !== "production") {
    console.log("[Auth] DEV MODE - FORCE USER");

    return {
      req: opts.req,
      res: opts.res,
      user: {
        id: 1,
        name: "WV Admin",
        email: "info@wvtransports.com",
        role: "admin",
      } as any,
    };
  }

  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
