import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./trpc";
import {
  geocodeAddress,
  reverseGeocodeCoordinates,
  validateCoordinates,
} from "./geocoding";

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
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No se encontraron coordenadas para esta dirección. Verifica la dirección o la configuración de Google Maps.",
        });
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
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Coordenadas inválidas",
        });
      }

      const address = await reverseGeocodeCoordinates(
        input.latitude,
        input.longitude
      );

      if (!address) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No se encontró dirección para estas coordenadas",
        });
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
      return {
        isValid: validateCoordinates(input.latitude, input.longitude),
      };
    }),
});
