import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getDb } from "../db";
import { users as usersTable } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getFallbackUser(): Promise<User | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    // intenta primero por email principal
    const byEmail = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, "wascardely@gmail.com"))
      .limit(1)
      .then((rows) => rows[0]);

    if (byEmail) return byEmail as User;

    // si no existe, toma el primer usuario disponible
    const firstUser = await db
      .select()
      .from(usersTable)
      .limit(1)
      .then((rows) => rows[0]);

    return (firstUser as User) ?? null;
  } catch (error) {
    console.error("[context.getFallbackUser] error:", error);
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // fallback temporal para Railway / modo recuperación
  if (!user) {
    user = await getFallbackUser();
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
