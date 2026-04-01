import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
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
  const R = 3959; // Earth's radius in miles
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

// Calculate profitability metrics using business config
async function calculateProfitability(
  userId: number,
  totalPrice: number,
  totalMiles: number,
  loadedMiles: number,
  weight: number
) {
  const config = await getBusinessConfig(userId);

  // Calculate fuel cost per mile
  const fuelCostPerMile =
    Number(config?.fuelPricePerGallon || 3.6) / Number(config?.vanMpg || 18.0);

  // Calculate operating costs per mile
  const maintenancePerMile = Number(config?.maintenancePerMile || 0.12);
  const tiresPerMile = Number(config?.tiresPerMile || 0.03);
  const operatingCostPerMile =
    fuelCostPerMile + maintenancePerMile + tiresPerMile;

  // Calculate fixed costs per mile
  const totalFixedMonthly =
    Number(config?.insuranceMonthly || 450) +
    Number(config?.phoneInternetMonthly || 70) +
    Number(config?.loadBoardAppsMonthly || 45) +
    Number(config?.accountingSoftwareMonthly || 30) +
    Number(config?.otherFixedMonthly || 80);

  const fixedCostPerMile =
    totalFixedMonthly / Number(config?.targetMilesPerMonth || 4000);

  // Get applicable surcharges
  const distanceSurcharge = await getApplicableDistanceSurcharge(
    userId,
    loadedMiles
  );
  const weightSurcharge = await getApplicableWeightSurcharge(userId, weight);

  // Calculate costs
  const estimatedFuelCost = totalMiles * fuelCostPerMile;
  const estimatedOperatingCost =
    totalMiles * (operatingCostPerMile + fixedCostPerMile);
  const totalCost = estimatedFuelCost + estimatedOperatingCost;
  const estimatedProfit = totalPrice - totalCost;
  const profitMarginPercent =
    totalPrice > 0 ? (estimatedProfit / totalPrice) * 100 : 0;

  // Calculate rate per loaded mile
  const ratePerLoadedMile = loadedMiles > 0 ? totalPrice / loadedMiles : 0;
  const minimumProfitPerMile = Number(config?.minimumProfitPerMile || 1.5);
  const minimumIncome = loadedMiles * minimumProfitPerMile;
  const differenceVsMinimum = totalPrice - minimumIncome;

  // Determine verdict based on minimum profit per mile
  let verdict = "ACEPTAR";
  if (ratePerLoadedMile < minimumProfitPerMile + 0.5) {
    verdict = "NEGOCIAR";
  }
  if (ratePerLoadedMile < minimumProfitPerMile) {
    verdict = "RECHAZAR";
  }

  return {
    estimatedFuelCost: Math.round(estimatedFuelCost * 100) / 100,
    estimatedOperatingCost: Math.round(estimatedOperatingCost * 100) / 100,
    totalOperatingCost:
      Math.round((estimatedFuelCost + estimatedOperatingCost) * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    profitMarginPercent: Math.round(profitMarginPercent * 100) / 100,
    minimumIncome: Math.round(minimumIncome * 100) / 100,
    ratePerLoadedMile: Math.round(ratePerLoadedMile * 100) / 100,
    minimumRatePerMile: minimumProfitPerMile,
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
        ratePerMile: z.number().positive(),
        ratePerPound: z.number().optional(),
        fuelSurcharge: z.number().default(0),
        offeredPrice: z.number().positive(),
        includeReturnEmpty: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const routesData = await calculateMultipleRoutes(
        input.vanLat,
        input.vanLng,
        input.pickupLat,
        input.pickupLng,
        input.deliveryLat,
        input.deliveryLng,
        input.includeReturnEmpty
      );

      if (!routesData) {
        throw new Error(
          "No se pudo calcular la ruta. Verifica las coordenadas e intenta de nuevo."
        );
      }

      const emptyMiles = routesData.emptyRoute?.distanceMiles || 0;
      const loadedMiles = routesData.loadedRoute?.distanceMiles || 0;
      const returnEmptyMiles = routesData.returnRoute?.distanceMiles || 0;
      const totalMiles = routesData.totalDistanceMiles;
      const totalDurationHours = routesData.totalDurationHours;

      const totalPrice = input.offeredPrice;

      const profitability = await calculateProfitability(
        ctx.user.id,
        totalPrice,
        totalMiles,
        loadedMiles,
        input.weight
      );

      const result = await createLoadQuotation({
        userId: ctx.user.id,
        vanLat: input.vanLat as any,
        vanLng: input.vanLng as any,
        vanAddress: input.vanAddress,
        pickupLat: input.pickupLat as any,
        pickupLng: input.pickupLng as any,
        pickupAddress: input.pickupAddress,
        deliveryLat: input.deliveryLat as any,
        deliveryLng: input.deliveryLng as any,
        deliveryAddress: input.deliveryAddress,
        weight: input.weight as any,
        weightUnit: input.weightUnit,
        cargoDescription: input.cargoDescription,
        emptyMiles: emptyMiles as any,
        loadedMiles: loadedMiles as any,
        returnEmptyMiles: returnEmptyMiles as any,
        totalMiles: totalMiles as any,
        ratePerMile: input.ratePerMile as any,
        ratePerPound: (input.ratePerPound || 0) as any,
        fuelSurcharge: input.fuelSurcharge as any,
        totalPrice: totalPrice as any,
        estimatedFuelCost: profitability.estimatedFuelCost as any,
        estimatedOperatingCost: profitability.estimatedOperatingCost as any,
        estimatedProfit: profitability.estimatedProfit as any,
        profitMarginPercent: profitability.profitMarginPercent as any,
        status: "draft",
      });

      const quotationId = (result as any).insertId || null;
      const minimumProfitPerMile = profitability.minimumRatePerMile;
      const ratePerLoadedMile = profitability.ratePerLoadedMile;

      if (ratePerLoadedMile < minimumProfitPerMile) {
        const severity =
          ratePerLoadedMile < minimumProfitPerMile - 0.5
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
          minimumProfitPerMile: minimumProfitPerMile as any,
          differenceFromMinimum: (ratePerLoadedMile - minimumProfitPerMile) as any,
          severity: severity as any,
        });
      }

      return {
        quotationId,
        emptyMiles: Math.round(emptyMiles * 100) / 100,
        loadedMiles: Math.round(loadedMiles * 100) / 100,
        returnEmptyMiles: Math.round(returnEmptyMiles * 100) / 100,
        totalMiles: Math.round(totalMiles * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        totalDurationHours: Math.round(totalDurationHours * 100) / 100,
        ...profitability,
      };
    }),

  getQuotation: protectedProcedure
    .input(z.object({ quotationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const quotation = await getLoadQuotationById(input.quotationId);
      if (!quotation || quotation.userId !== ctx.user.id) {
        throw new Error("Cotización no encontrada");
      }
      return quotation;
    }),

  getMyQuotations: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      return getLoadQuotationsByUserId(ctx.user.id, input.limit);
    }),

  updateQuotation: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
        status: z
          .enum(["draft", "quoted", "accepted", "rejected", "expired"])
          .optional(),
        ratePerMile: z.number().optional(),
        fuelSurcharge: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const quotation = await getLoadQuotationById(input.quotationId);
      if (!quotation || quotation.userId !== ctx.user.id) {
        throw new Error("Cotización no encontrada");
      }

      const updateData: any = {};
      if (input.status) updateData.status = input.status;
      if (input.ratePerMile !== undefined) updateData.ratePerMile = input.ratePerMile;
      if (input.fuelSurcharge !== undefined) {
        updateData.fuelSurcharge = input.fuelSurcharge;
      }

      await updateLoadQuotation(input.quotationId, updateData);
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
    .mutation(async ({ input, ctx }) => {
      const quotation = await getLoadQuotationById(input.quotationId);
      if (!quotation || quotation.userId !== ctx.user.id) {
        throw new Error("Cotización no encontrada");
      }

      await updateLoadQuotation(input.quotationId, {
        manualVerdict: input.manualVerdict,
        verdictNotes: input.verdictNotes || null,
        verdictOverriddenBy: ctx.user.id,
        verdictOverriddenAt: new Date(),
      });

      return { success: true };
    }),

  deleteQuotation: protectedProcedure
    .input(z.object({ quotationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const quotation = await getLoadQuotationById(input.quotationId);
      if (!quotation || quotation.userId !== ctx.user.id) {
        throw new Error("Cotización no encontrada");
      }

      await deleteLoadQuotation(input.quotationId);
      return { success: true };
    }),

  getQuotationsByStatus: protectedProcedure
    .input(z.object({ status: z.string() }))
    .query(async ({ input, ctx }) => {
      return getQuotationsByStatus(ctx.user.id, input.status);
    }),

  getQuotationHistory: publicProcedure
    .input(
      z.object({
        status: z
          .enum(["draft", "quoted", "accepted", "rejected", "expired"])
          .optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        return {
          quotations: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[quotation.getQuotationHistory] error:", error);
        return {
          quotations: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        };
      }
    }),
});
