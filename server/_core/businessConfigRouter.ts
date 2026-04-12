import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import {
  getBusinessConfig,
  updateBusinessConfig,
  getDistanceSurcharges,
  createDistanceSurcharge,
  updateDistanceSurcharge,
  deleteDistanceSurcharge,
  getWeightSurcharges,
  createWeightSurcharge,
  updateWeightSurcharge,
  deleteWeightSurcharge,
} from "../db-business-config";

const DEFAULT_BUSINESS_CONFIG = {
  fuelPricePerGallon: 3.6,
  vanMpg: 18,
  maintenancePerMile: 0.12,
  tiresPerMile: 0.03,
  insuranceMonthly: 450,
  phoneInternetMonthly: 70,
  loadBoardAppsMonthly: 45,
  accountingSoftwareMonthly: 30,
  otherFixedMonthly: 80,
  targetMilesPerMonth: 4000,
  minimumProfitPerMile: 1.5,

  // 5-bucket allocation model
  operatingExpensesPercent: 35,
  vanFundPercent: 30,
  emergencyReservePercent: 10,
  wascarDrawPercent: 12.5,
  yisvelDrawPercent: 12.5,

  // Tax + goals settings
  estimatedTaxPercent: 25,
  quarterlyTaxEnabled: true,
  taxReserveMode: "profit_based" as "profit_based" | "revenue_based" | "manual",
  vanFundGoal: 15000,
  emergencyReserveGoal: 5000,
};

const businessConfigSchema = z
  .object({
    fuelPricePerGallon: z.number().optional(),
    vanMpg: z.number().optional(),
    maintenancePerMile: z.number().optional(),
    tiresPerMile: z.number().optional(),
    insuranceMonthly: z.number().optional(),
    phoneInternetMonthly: z.number().optional(),
    loadBoardAppsMonthly: z.number().optional(),
    accountingSoftwareMonthly: z.number().optional(),
    otherFixedMonthly: z.number().optional(),
    targetMilesPerMonth: z.number().optional(),
    minimumProfitPerMile: z.number().optional(),

    operatingExpensesPercent: z.number().min(0).max(100).optional(),
    vanFundPercent: z.number().min(0).max(100).optional(),
    emergencyReservePercent: z.number().min(0).max(100).optional(),
    wascarDrawPercent: z.number().min(0).max(100).optional(),
    yisvelDrawPercent: z.number().min(0).max(100).optional(),

    estimatedTaxPercent: z.number().min(0).max(100).optional(),
    quarterlyTaxEnabled: z.boolean().optional(),
    taxReserveMode: z.enum(["profit_based", "revenue_based", "manual"]).optional(),
    vanFundGoal: z.number().min(0).optional(),
    emergencyReserveGoal: z.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const allocationFields = [
      data.operatingExpensesPercent,
      data.vanFundPercent,
      data.emergencyReservePercent,
      data.wascarDrawPercent,
      data.yisvelDrawPercent,
    ];

    const provided = allocationFields.filter((v) => typeof v === "number");

    if (provided.length === 5) {
      const total =
        (data.operatingExpensesPercent || 0) +
        (data.vanFundPercent || 0) +
        (data.emergencyReservePercent || 0) +
        (data.wascarDrawPercent || 0) +
        (data.yisvelDrawPercent || 0);

      if (Math.abs(total - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Allocation percentages must sum to 100%. Current total: ${total.toFixed(2)}%`,
        });
      }
    }
  });

export const businessConfigRouter = router({
  getConfig: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        return DEFAULT_BUSINESS_CONFIG;
      }

      const config = await getBusinessConfig(ctx.user.id);

      return {
        ...DEFAULT_BUSINESS_CONFIG,
        ...(config || {}),
      };
    } catch (error) {
      console.error("[businessConfig.getConfig] error:", error);
      return DEFAULT_BUSINESS_CONFIG;
    }
  }),

  getDistanceSurcharges: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) return [];
      return await getDistanceSurcharges(ctx.user.id);
    } catch (error) {
      console.error("[businessConfig.getDistanceSurcharges] error:", error);
      return [];
    }
  }),

  getWeightSurcharges: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) return [];
      return await getWeightSurcharges(ctx.user.id);
    } catch (error) {
      console.error("[businessConfig.getWeightSurcharges] error:", error);
      return [];
    }
  }),

  updateConfig: protectedProcedure
    .input(businessConfigSchema)
    .mutation(async ({ ctx, input }) => {
      await updateBusinessConfig(ctx.user.id, input);
      return { success: true };
    }),

  createDistanceSurcharge: protectedProcedure
    .input(
      z.object({
        fromMiles: z.number(),
        surchargePerMile: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createDistanceSurcharge({
        userId: ctx.user.id,
        fromMiles: input.fromMiles,
        surchargePerMile: input.surchargePerMile,
      });
      return { success: true };
    }),

  updateDistanceSurcharge: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fromMiles: z.number(),
        surchargePerMile: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await updateDistanceSurcharge(input.id, {
        fromMiles: input.fromMiles,
        surchargePerMile: input.surchargePerMile,
      });
      return { success: true };
    }),

  deleteDistanceSurcharge: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDistanceSurcharge(input.id);
      return { success: true };
    }),

  createWeightSurcharge: protectedProcedure
    .input(
      z.object({
        fromLbs: z.number(),
        surchargePerMile: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createWeightSurcharge({
        userId: ctx.user.id,
        fromLbs: input.fromLbs,
        surchargePerMile: input.surchargePerMile,
      });
      return { success: true };
    }),

  updateWeightSurcharge: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fromLbs: z.number(),
        surchargePerMile: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await updateWeightSurcharge(input.id, {
        fromLbs: input.fromLbs,
        surchargePerMile: input.surchargePerMile,
      });
      return { success: true };
    }),

  deleteWeightSurcharge: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteWeightSurcharge(input.id);
      return { success: true };
    }),
});
