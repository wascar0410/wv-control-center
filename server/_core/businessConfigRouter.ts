import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import {
  getBusinessConfig,
  createOrUpdateBusinessConfig,
  getDistanceSurcharges,
  createDistanceSurcharge,
  updateDistanceSurcharge,
  deleteDistanceSurcharge,
  getWeightSurcharges,
  createWeightSurcharge,
  updateWeightSurcharge,
  deleteWeightSurcharge,
} from "../db-business-config";

export const businessConfigRouter = router({
  // Get business configuration
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const config = await getBusinessConfig(ctx.user.id);
    return config || {
      fuelPricePerGallon: 3.60,
      vanMpg: 18.0,
      maintenancePerMile: 0.12,
      tiresPerMile: 0.03,
      insuranceMonthly: 450.00,
      phoneInternetMonthly: 70.00,
      loadBoardAppsMonthly: 45.00,
      accountingSoftwareMonthly: 30.00,
      otherFixedMonthly: 80.00,
      targetMilesPerMonth: 4000,
      minimumProfitPerMile: 1.50,
    };
  }),

  // Update business configuration
  updateConfig: protectedProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updated = await createOrUpdateBusinessConfig(ctx.user.id, input as any);
      return updated;
    }),

  // Get distance surcharges
  getDistanceSurcharges: protectedProcedure.query(async ({ ctx }) => {
    return getDistanceSurcharges(ctx.user.id);
  }),

  // Create distance surcharge
  createDistanceSurcharge: protectedProcedure
    .input(
      z.object({
        fromMiles: z.number().int().min(0),
        surchargePerMile: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createDistanceSurcharge(ctx.user.id, input as any);
    }),

  // Update distance surcharge
  updateDistanceSurcharge: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fromMiles: z.number().int().min(0).optional(),
        surchargePerMile: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateDistanceSurcharge(id, data as any);
      return getDistanceSurcharges(ctx.user.id);
    }),

  // Delete distance surcharge
  deleteDistanceSurcharge: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteDistanceSurcharge(input.id);
      return getDistanceSurcharges(ctx.user.id);
    }),

  // Get weight surcharges
  getWeightSurcharges: protectedProcedure.query(async ({ ctx }) => {
    return getWeightSurcharges(ctx.user.id);
  }),

  // Create weight surcharge
  createWeightSurcharge: protectedProcedure
    .input(
      z.object({
        fromLbs: z.number().int().min(0),
        surchargePerMile: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return createWeightSurcharge(ctx.user.id, input as any);
    }),

  // Update weight surcharge
  updateWeightSurcharge: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        fromLbs: z.number().int().min(0).optional(),
        surchargePerMile: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await updateWeightSurcharge(id, data as any);
      return getWeightSurcharges(ctx.user.id);
    }),

  // Delete weight surcharge
  deleteWeightSurcharge: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteWeightSurcharge(input.id);
      return getWeightSurcharges(ctx.user.id);
    }),
});
