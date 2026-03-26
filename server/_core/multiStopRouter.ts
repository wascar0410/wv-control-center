import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import {
  createMultipleRouteStops,
  getRouteStopsByQuotationId,
  deleteRouteStopsByQuotationId,
  updateRouteStopsOrder,
} from "../db";
import { optimizeRoute, optimizeRouteWithGroups, Stop } from "./routeOptimizer";

export const multiStopRouter = router({
  optimizeMultiStopRoute: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
        vanLat: z.number().min(-90).max(90),
        vanLng: z.number().min(-180).max(180),
        stops: z.array(
          z.object({
            type: z.enum(["pickup", "delivery"]),
            address: z.string(),
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            weight: z.number().optional(),
            description: z.string().optional(),
          })
        ),
        groupByType: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.stops.length === 0) {
        throw new Error("Debe proporcionar al menos una parada");
      }

      try {
        // Delete existing stops for this quotation
        await deleteRouteStopsByQuotationId(input.quotationId);

        // Optimize route
        const stopsData: Stop[] = input.stops.map((s) => ({
          type: s.type,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          weight: s.weight,
          description: s.description,
        }));

        const optimizedRoute = input.groupByType
          ? await optimizeRouteWithGroups(input.vanLat, input.vanLng, stopsData)
          : await optimizeRoute(input.vanLat, input.vanLng, stopsData);

        if (!optimizedRoute) {
          throw new Error("No se pudo optimizar la ruta");
        }

        // Save optimized stops to database
        const stopsToInsert = optimizedRoute.stops.map((stop) => ({
          quotationId: input.quotationId,
          stopOrder: stop.stopOrder,
          stopType: stop.type as "pickup" | "delivery",
          address: stop.address,
          latitude: stop.latitude as any,
          longitude: stop.longitude as any,
          weight: (stop.weight || 0) as any,
          weightUnit: "lbs",
          description: stop.description,
          distanceFromPrevious: stop.distanceFromPrevious as any,
          durationFromPrevious: stop.durationFromPrevious as any,
        }));

        await createMultipleRouteStops(stopsToInsert);

        return {
          success: true,
          totalDistance: optimizedRoute.totalDistance,
          totalDuration: optimizedRoute.totalDuration,
          totalWeight: optimizedRoute.totalWeight,
          stops: optimizedRoute.stops.map((s) => ({
            stopOrder: s.stopOrder,
            type: s.type,
            address: s.address,
            distance: s.distanceFromPrevious,
            duration: s.durationFromPrevious,
          })),
        };
      } catch (error) {
        console.error("[MultiStop] Error optimizing route:", error);
        throw new Error("Error al optimizar la ruta");
      }
    }),

  getOptimizedStops: protectedProcedure
    .input(z.object({ quotationId: z.number() }))
    .query(async ({ input }) => {
      const stops = await getRouteStopsByQuotationId(input.quotationId);

      if (stops.length === 0) {
        return {
          stops: [],
          totalDistance: 0,
          totalDuration: 0,
          totalWeight: 0,
        };
      }

      const totalDistance = stops.reduce((sum, s) => sum + (Number(s.distanceFromPrevious) || 0), 0);
      const totalDuration = stops.reduce((sum, s) => sum + (Number(s.durationFromPrevious) || 0), 0);
      const totalWeight = stops.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

      return {
        stops: stops.map((s) => ({
          id: s.id,
          stopOrder: s.stopOrder,
          type: s.stopType,
          address: s.address,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          weight: Number(s.weight),
          description: s.description,
          distanceFromPrevious: Number(s.distanceFromPrevious),
          durationFromPrevious: Number(s.durationFromPrevious),
        })),
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDuration: Math.round(totalDuration * 100) / 100,
        totalWeight: Math.round(totalWeight * 100) / 100,
      };
    }),

  reorderStops: protectedProcedure
    .input(
      z.object({
        quotationId: z.number(),
        stops: z.array(
          z.object({
            id: z.number(),
            stopOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await updateRouteStopsOrder(input.quotationId, input.stops);
        return { success: true };
      } catch (error) {
        console.error("[MultiStop] Error reordering stops:", error);
        throw new Error("Error al reordenar las paradas");
      }
    }),
});
