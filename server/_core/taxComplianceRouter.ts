import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import {
  generateIncomeReport,
  generateExpenseReport,
  generateTransactionReport,
  calculateQuarterlyEstimates,
  getTaxSummary,
} from "../db-tax-compliance";

export const taxComplianceRouter = router({
  /**
   * Get tax summary for a specific year
   */
  getSummary: protectedProcedure
    .input(z.object({ taxYear: z.number().int().min(2020).max(2100) }))
    .query(async ({ input }) => {
      return await getTaxSummary(input.taxYear);
    }),

  /**
   * Get income report for a tax year
   */
  getIncomeReport: protectedProcedure
    .input(z.object({ taxYear: z.number().int().min(2020).max(2100) }))
    .query(async ({ input }) => {
      return await generateIncomeReport(input.taxYear);
    }),

  /**
   * Get expense report for a tax year
   */
  getExpenseReport: protectedProcedure
    .input(z.object({ taxYear: z.number().int().min(2020).max(2100) }))
    .query(async ({ input }) => {
      return await generateExpenseReport(input.taxYear);
    }),

  /**
   * Get detailed transaction report
   */
  getTransactionReport: protectedProcedure
    .input(z.object({ taxYear: z.number().int().min(2020).max(2100) }))
    .query(async ({ input }) => {
      return await generateTransactionReport(input.taxYear);
    }),

  /**
   * Get quarterly tax estimates
   */
  getQuarterlyEstimates: protectedProcedure
    .input(z.object({ taxYear: z.number().int().min(2020).max(2100) }))
    .query(async ({ input }) => {
      return await calculateQuarterlyEstimates(input.taxYear);
    }),
});
