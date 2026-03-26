import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import { geocodeAddress, reverseGeocodeCoordinates, validateCoordinates } from "./geocoding";

export const geocodingRouter = router({
  geocodeAddress: publicProcedure
    .input(
      z.object({
        address: z.string().min(5, "La dirección debe tener al menos 5 caracteres"),
      })
    )
    .query(async ({ input }) => {
      const result = await geocodeAddress(input.address);
      
      if (!result) {
        throw new Error("No se encontraron coordenadas para esta dirección. Intenta con una dirección más específica.");
      }

      return result;
    }),

  reverseGeocodeCoordinates: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
    )
    .query(async ({ input }) => {
      if (!validateCoordinates(input.latitude, input.longitude)) {
        throw new Error("Coordenadas inválidas");
      }

      const address = await reverseGeocodeCoordinates(input.latitude, input.longitude);
      
      if (!address) {
        throw new Error("No se encontró dirección para estas coordenadas");
      }

      return { address };
    }),

  validateCoordinates: publicProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .query(({ input }) => {
      const isValid = validateCoordinates(input.latitude, input.longitude);
      return { isValid };
    }),
});
