import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import { 
  createLoadQuotation, 
  getLoadQuotationById, 
  getLoadQuotationsByUserId,
  updateLoadQuotation,
  deleteLoadQuotation,
  getQuotationsByStatus
} from "../db";
import { calculateMultipleRoutes } from "./routes";

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

// Calculate profitability metrics
function calculateProfitability(
  totalPrice: number,
  totalMiles: number,
  weight: number,
  fuelCostPerMile: number = 0.35, // Average diesel cost per mile
  operatingCostPerMile: number = 0.65 // Maintenance, insurance, depreciation
) {
  const estimatedFuelCost = totalMiles * fuelCostPerMile;
  const estimatedOperatingCost = totalMiles * operatingCostPerMile;
  const totalCost = estimatedFuelCost + estimatedOperatingCost;
  const estimatedProfit = totalPrice - totalCost;
  const profitMarginPercent = totalPrice > 0 ? (estimatedProfit / totalPrice) * 100 : 0;

  return {
    estimatedFuelCost: Math.round(estimatedFuelCost * 100) / 100,
    estimatedOperatingCost: Math.round(estimatedOperatingCost * 100) / 100,
    estimatedProfit: Math.round(estimatedProfit * 100) / 100,
    profitMarginPercent: Math.round(profitMarginPercent * 100) / 100,
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
        includeReturnEmpty: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Calculate distances and durations using Google Routes API
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
        throw new Error("No se pudo calcular la ruta. Verifica las coordenadas e intenta de nuevo.");
      }

      const emptyMiles = routesData.emptyRoute?.distanceMiles || 0;
      const loadedMiles = routesData.loadedRoute?.distanceMiles || 0;
      const returnEmptyMiles = routesData.returnRoute?.distanceMiles || 0;
      const totalMiles = routesData.totalDistanceMiles;
      const totalDurationHours = routesData.totalDurationHours;

      // Calculate base price
      let totalPrice = totalMiles * input.ratePerMile;
      
      // Add per-pound charge if applicable
      if (input.ratePerPound && input.ratePerPound > 0) {
        totalPrice += input.weight * input.ratePerPound;
      }

      // Add fuel surcharge
      totalPrice += input.fuelSurcharge;

      // Calculate profitability
      const profitability = calculateProfitability(totalPrice, totalMiles, input.weight);

      // Create quotation record
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

      return {
        quotationId: (result as any).insertId || 0,
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
        status: z.enum(["draft", "quoted", "accepted", "rejected", "expired"]).optional(),
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
      if (input.fuelSurcharge !== undefined) updateData.fuelSurcharge = input.fuelSurcharge;
      
      await updateLoadQuotation(input.quotationId, updateData);

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
});
