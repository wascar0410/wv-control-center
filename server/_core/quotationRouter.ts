import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import {
  createLoadQuotation,
  getLoadQuotationById,
  getLoadQuotationsByUserId,
  updateLoadQuotation,
  deleteLoadQuotation,
  getQuotationsByStatus,
} from "../db";
import { calculateMultipleRoutes } from "./routes";
import {
  getBusinessConfig,
  getApplicableDistanceSurcharge,
  getApplicableWeightSurcharge,
} from "../db-business-config";
import { createPriceAlert } from "../db-price-alerts";

// Haversine formula to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function calculateProfitability(
  userId: number,
  totalPrice: number,
  totalMiles: number,
  loadedMiles: number,
  weight: number
) {
  const config = await getBusinessConfig(userId);

  const fuelCostPerMile =
    Number(config?.fuelPricePerGallon || 3.6) / Number(config?.vanMpg || 18);

  const maintenancePerMile = Number(config?.maintenancePerMile || 0.12);
  const tiresPerMile = Number(config?.tiresPerMile || 0.03);
  const operatingCostPerMile =
    fuelCostPerMile + maintenancePerMile + tiresPerMile;

  const totalFixedMonthly =
    Number(config?.insuranceMonthly || 450) +
    Number(config?.phoneInternetMonthly || 70) +
    Number(config?.loadBoardAppsMonthly || 45) +
    Number(config?.accountingSoftwareMonthly || 30) +
    Number(config?.otherFixedMonthly || 80);

  const fixedCostPerMile =
    totalFixedMonthly / Number(config?.targetMilesPerMonth || 4000);

  const distanceSurcharge = await getApplicableDistanceSurcharge(
    userId,
    loadedMiles
  );
  const weightSurcharge = await getApplicableWeightSurcharge(userId, weight);

  const estimatedFuelCost = totalMiles * fuelCostPerMile;
  const estimatedOperatingCost =
    totalMiles * (operatingCostPerMile + fixedCostPerMile);
  const totalOperatingCost = estimatedFuelCost + estimatedOperatingCost;

  const estimatedProfit = totalPrice - totalOperatingCost;
  const profitMarginPercent =
    totalPrice > 0 ? (estimatedProfit / totalPrice) * 100 : 0;

  const ratePerLoadedMile = loadedMiles > 0 ? totalPrice / loadedMiles : 0;
  const minimumRatePerMile = Number(config?.minimumProfitPerMile || 1.5);
  const minimumIncome = loadedMiles * minimumRatePerMile;
  const differenceVsMinimum = totalPrice - minimumIncome;

  let verdict = "ACEPTAR";
  if (ratePerLoadedMile < minimumRatePerMile + 0.5) {
    verdict = "NEGOCIAR";
  }
  if (ratePerLoadedMile < minimumRatePerMile) {
    verdict = "RECHAZAR";
  }

  return {
    estimatedFuelCost: Math.round(estimatedFuelCost * 100) / 100,
    estimatedOperatingCost: Math.round(estimatedOperatingCost * 100) / 100,
    totalOperatingCost: Math.round(totalOperatingCost * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    profitMarginPercent: Math.round(profitMarginPercent * 100) / 100,
    minimumIncome: Math.round(minimumIncome * 100) / 100,
    ratePerLoadedMile: Math.round(ratePerLoadedMile * 100) / 100,
    minimumRatePerMile,
    differenceVsMinimum: Math.round(differenceVsMinimum * 100) / 100,
    verdict,
    distanceSurcharge: Math.round(Number(distanceSurcharge) * 100) / 100,
    weightSurcharge: Math.round(Number(weightSurcharge) * 100) / 100,
  };
}

export const quotationRouter = router({
  calculateQuotation: protectedProcedure
    .input(
      z.object({
        vanLat: z.number(),
        vanLng: z.number(),
        vanAddress: z.string(),

        pickupLat: z.number(),
        pickupLng: z.number(),
        pickupAddress: z.string(),

        deliveryLat: z.number(),
        deliveryLng: z.number(),
        deliveryAddress: z.string(),

        weight: z.number().positive(),
        weightUnit: z.string().default("lbs"),
        cargoDescription: z.string().optional(),

        ratePerMile: z.number().optional(),
        ratePerPound: z.number().optional(),
        fuelSurcharge: z.number().default(0),
        offeredPrice: z.number().optional(),
        includeReturnEmpty: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("[quotation.calculateQuotation] input:", input);

      const routesData = await calculateMultipleRoutes({
        vanLat: input.vanLat,
        vanLng: input.vanLng,
        pickupLat: input.pickupLat,
        pickupLng: input.pickupLng,
        deliveryLat: input.deliveryLat,
        deliveryLng: input.deliveryLng,
        includeReturnEmpty: input.includeReturnEmpty,
      } as any);

      if (!routesData) {
        throw new Error("No se pudo calcular la ruta");
      }

      const totalMiles = Number(routesData.totalMiles ?? 0);
      const loadedMiles = Number(routesData.loadedMiles ?? 0);
      const emptyMiles = Number(routesData.emptyMiles ?? 0);
      const returnEmptyMiles = Number(routesData.returnEmptyMiles ?? 0);

      const config = await getBusinessConfig(ctx.user.id);
      const fuelCostPerMile =
        Number(config?.fuelPricePerGallon || 3.6) /
        Number(config?.vanMpg || 18);
      const minimumProfitPerMile = Number(
        config?.minimumProfitPerMile || 1.5
      );

      const baseRatePerMile =
        input.ratePerMile ?? fuelCostPerMile + minimumProfitPerMile;

      const totalPrice =
        input.offeredPrice ??
        Math.round(
          (loadedMiles * baseRatePerMile + (input.fuelSurcharge || 0)) * 100
        ) / 100;

      const profitability = await calculateProfitability(
        ctx.user.id,
        totalPrice,
        totalMiles,
        loadedMiles,
        input.weight
      );

      const quotationInsert: any = await createLoadQuotation({
        userId: ctx.user.id,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        totalMiles,
        loadedMiles,
        emptyMiles,
        totalPrice,
        weight: input.weight,
        status: "calculated",
      } as any);

      const quotationId = Number(
        quotationInsert?.insertId ?? quotationInsert?.[0]?.insertId ?? 0
      );

      const ratePerLoadedMile = profitability.ratePerLoadedMile;
      const minimumRatePerMile = profitability.minimumRatePerMile;

      if (ratePerLoadedMile < minimumRatePerMile) {
        const severity =
          ratePerLoadedMile < minimumRatePerMile - 0.5
            ? "critical"
            : "warning";

        await createPriceAlert({
          userId: ctx.user.id,
          quotationId: quotationId || undefined,
          clientName: "",
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          offeredPrice: totalPrice as any,
          ratePerLoadedMile: ratePerLoadedMile as any,
          minimumProfitPerMile: minimumRatePerMile as any,
          differenceFromMinimum:
            (ratePerLoadedMile - minimumRatePerMile) as any,
          severity: severity as any,
        } as any);
      }

      return {
        quotationId,
        emptyMiles,
        loadedMiles,
        returnEmptyMiles,
        totalMiles,
        totalPrice,
        estimatedFuelCost: profitability.estimatedFuelCost,
        estimatedOperatingCost: profitability.estimatedOperatingCost,
        totalOperatingCost: profitability.totalOperatingCost,
        estimatedProfit: profitability.estimatedProfit,
        profitMarginPercent: profitability.profitMarginPercent,
        minimumIncome: profitability.minimumIncome,
        ratePerLoadedMile: profitability.ratePerLoadedMile,
        minimumRatePerMile: profitability.minimumRatePerMile,
        differenceVsMinimum: profitability.differenceVsMinimum,
        verdict: profitability.verdict,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        weight: input.weight,
      };
    }),

  getQuotation: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await getLoadQuotationById(input.quotationId);
    }),

  getMyQuotations: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (input?.status) {
        return await getQuotationsByStatus(ctx.user.id, input.status);
      }
      return await getLoadQuotationsByUserId(ctx.user.id);
    }),

  updateQuotation: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
        status: z.string().optional(),
        manualVerdict: z.string().optional(),
        verdictNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateLoadQuotation(input.quotationId, {
        status: input.status as any,
        manualVerdict: input.manualVerdict as any,
        verdictNotes: input.verdictNotes as any,
      });
      return { success: true };
    }),

  saveVerdictOverride: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
        manualVerdict: z.enum(["ACEPTAR", "NEGOCIAR", "RECHAZAR"]),
        verdictNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateLoadQuotation(input.quotationId, {
        manualVerdict: input.manualVerdict as any,
        verdictNotes: input.verdictNotes as any,
      });
      return { success: true };
    }),

  deleteQuotation: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteLoadQuotation(input.quotationId);
      return { success: true };
    }),
});
