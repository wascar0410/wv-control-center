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

export const businessConfigRouter = router({
  getConfig: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) {
        return {
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
        };
      }

      const config = await getBusinessConfig(ctx.user.id);
      return (
        config || {
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
        }
      );
    } catch (error) {
      console.error("[businessConfig.getConfig] error:", error);
      return {
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
      };
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
    .input(z.any())
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

