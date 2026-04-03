import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyDriverToken } from "./driverAuth";
import { getDb } from "../db";
import { users as usersTable } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: Request;
  res: Response;
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {

  // ─── DEV MODE (local development only) ────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    return {
      req: opts.req,
      res: opts.res,
      user: {
        id: 1,
        name: "WV Admin (Dev)",
        email: "wascar.ortiz0410@gmail.com",
        role: "owner",
      } as any,
    };
  }

  // ─── PRODUCTION AUTH ───────────────────────────────────────────────────────
  let user: User | null = null;

  // 1. Try the Manus OAuth session cookie (app_session_id)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // 2. Try the email/password JWT (stored as wv_session cookie)
  if (!user) {
    try {
      const cookies = parseCookies(opts.req.headers.cookie);
      const wvSession = cookies.get("wv_session");
      if (wvSession) {
        const payload = verifyDriverToken(wvSession);
        if (payload) {
          const db = await getDb();
          if (db) {
            const rows = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.id, payload.userId))
              .limit(1);
            if (rows[0]) user = rows[0] as User;
          }
        }
      }
    } catch {
      user = null;
    }
  }

  // 3. Try Authorization: Bearer <token> header (for API clients)
  if (!user) {
    try {
      const authHeader = opts.req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const payload = verifyDriverToken(token);
        if (payload) {
          const db = await getDb();
          if (db) {
            const rows = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.id, payload.userId))
              .limit(1);
            if (rows[0]) user = rows[0] as User;
          }
        }
      }
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const map = new Map<string, string>();
  cookieHeader.split(";").forEach((part) => {
    const [key, ...vals] = part.trim().split("=");
    if (key) map.set(key.trim(), decodeURIComponent(vals.join("=").trim()));
  });
  return map;
}
