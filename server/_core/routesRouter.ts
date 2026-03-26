import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { calculateRoute, calculateMultipleRoutes } from "./routes";

export const routesRouter = router({
  calculateRoute: publicProcedure
    .input(
      z.object({
        originLat: z.number().min(-90).max(90),
        originLng: z.number().min(-180).max(180),
        destinationLat: z.number().min(-90).max(90),
        destinationLng: z.number().min(-180).max(180),
      })
    )
    .query(async ({ input }) => {
      const result = await calculateRoute(input);

      if (!result) {
        throw new Error("No se pudo calcular la ruta. Verifica las coordenadas e intenta de nuevo.");
      }

      return result;
    }),

  calculateMultipleRoutes: publicProcedure
    .input(
      z.object({
        vanLat: z.number().min(-90).max(90),
        vanLng: z.number().min(-180).max(180),
        pickupLat: z.number().min(-90).max(90),
        pickupLng: z.number().min(-180).max(180),
        deliveryLat: z.number().min(-90).max(90),
        deliveryLng: z.number().min(-180).max(180),
        includeReturnEmpty: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const result = await calculateMultipleRoutes(
        input.vanLat,
        input.vanLng,
        input.pickupLat,
        input.pickupLng,
        input.deliveryLat,
        input.deliveryLng,
        input.includeReturnEmpty
      );

      if (!result) {
        throw new Error("No se pudieron calcular las rutas. Verifica las coordenadas e intenta de nuevo.");
      }

      return result;
    }),
});
