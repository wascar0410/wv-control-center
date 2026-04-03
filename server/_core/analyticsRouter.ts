/**
 * Analytics Router - Business Plan event tracking
 * Tracks page views, PDF downloads, section views, and contact interactions
 * on the /business-plan page for investor/bank engagement insights.
 */
import { z } from "zod";
import { desc } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "./trpc";
import { getDb } from "../db";
import { businessPlanEvents } from "../../drizzle/schema";

export const analyticsRouter = router({
  /**
   * Track a business plan event (public — no auth required so external visitors are tracked)
   */
  trackEvent: publicProcedure
    .input(
      z.object({
        eventType: z.enum([
          "page_view",
          "pdf_download",
          "contact_click",
          "section_view",
          "form_submit",
        ]),
        sectionId: z.string().max(100).optional(),
        sessionId: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      const referrer = (ctx.req.headers["referer"] as string) || null;
      const userAgent = (ctx.req.headers["user-agent"] as string)?.slice(0, 500) || null;
      const ipAddress = (ctx.req.ip || ctx.req.headers["x-forwarded-for"] as string || "").slice(0, 64);

      await db.insert(businessPlanEvents).values({
        eventType: input.eventType,
        sectionId: input.sectionId || null,
        referrer: referrer?.slice(0, 500) || null,
        userAgent,
        ipAddress,
        sessionId: input.sessionId || null,
      });

      return { success: true };
    }),

  /**
   * Get analytics summary for the business plan page (admin only)
   */
  getSummary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { events: [], totals: {} };

    const events = await db
      .select()
      .from(businessPlanEvents)
      .orderBy(desc(businessPlanEvents.createdAt))
      .limit(200);

    // Aggregate totals
    const totals: Record<string, number> = {};
    for (const event of events) {
      totals[event.eventType] = (totals[event.eventType] || 0) + 1;
    }

    // Unique sessions (approximate unique visitors)
    const uniqueSessions = new Set(events.map((e) => e.sessionId).filter(Boolean)).size;

    return {
      events,
      totals,
      uniqueSessions,
      totalEvents: events.length,
    };
  }),
});
