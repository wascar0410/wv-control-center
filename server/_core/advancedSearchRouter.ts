import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import { searchLoads, getSearchSuggestions, getLoadStatistics } from "../db-advanced-search";

export const advancedSearchRouter = router({
  /**
   * Search loads with advanced filters
   */
  search: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        clientName: z.string().optional(),
        brokerName: z.string().optional(),
        minMiles: z.number().optional(),
        maxMiles: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        pickupCity: z.string().optional(),
        deliveryCity: z.string().optional(),
        pickupState: z.string().optional(),
        deliveryState: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        sortBy: z.enum(["price", "miles", "date", "status"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await searchLoads(input);
    }),

  /**
   * Get search suggestions for autocomplete
   */
  suggestions: protectedProcedure
    .input(
      z.object({
        field: z.enum(["clientName", "brokerName", "pickupCity", "deliveryCity"]),
        query: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await getSearchSuggestions(input.field, input.query);
    }),

  /**
   * Get load statistics
   */
  statistics: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getLoadStatistics(input);
    }),
});
