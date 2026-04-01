import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./trpc";
import {
  createBrokerLoad,
  getBrokerLoadsByUserId,
  getBrokerLoadById,
  updateBrokerLoad,
  getBrokerLoadsByStatus,
  createSyncLog,
  checkDuplicateBrokerLoad,
  deleteBrokerLoad,
} from "../db-broker-loads";
import { geocodeAddresses, calculateDistanceFromCoordinates } from "../geocoding";

export const brokerLoadsRouter = router({
  // Import a single broker load manually
  importLoad: protectedProcedure
    .input(
      z.object({
        brokerName: z.enum(["coyote", "dat", "manual", "other"]),
        brokerId: z.string().optional(),
        pickupAddress: z.string(),
        deliveryAddress: z.string(),
        pickupLat: z.number().optional(),
        pickupLng: z.number().optional(),
        deliveryLat: z.number().optional(),
        deliveryLng: z.number().optional(),
        weight: z.number(),
        weightUnit: z.string().optional().default("lbs"),
        commodity: z.string().optional(),
        offeredRate: z.number(),
        pickupDate: z.date().optional(),
        deliveryDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      const brokerId = input.brokerId || `${input.brokerName}-${Date.now()}`;

      const isDuplicate = await checkDuplicateBrokerLoad(ctx.user.id, brokerId);
      if (isDuplicate) {
        throw new Error("This load already exists in the system");
      }

      let calculatedDistance: number | undefined;
      let finalPickupLat = input.pickupLat;
      let finalPickupLng = input.pickupLng;
      let finalDeliveryLat = input.deliveryLat;
      let finalDeliveryLng = input.deliveryLng;

      if (!finalPickupLat || !finalPickupLng || !finalDeliveryLat || !finalDeliveryLng) {
        const geocodeResult = await geocodeAddresses(
          input.pickupAddress,
          input.deliveryAddress
        );

        if (geocodeResult) {
          finalPickupLat = geocodeResult.originLat;
          finalPickupLng = geocodeResult.originLng;
          finalDeliveryLat = geocodeResult.destinationLat;
          finalDeliveryLng = geocodeResult.destinationLng;
          calculatedDistance = geocodeResult.distance;
        }
      } else {
        calculatedDistance = calculateDistanceFromCoordinates(
          finalPickupLat || 0,
          finalPickupLng || 0,
          finalDeliveryLat || 0,
          finalDeliveryLng || 0
        );
      }

      const result = await createBrokerLoad({
        userId: ctx.user.id,
        brokerId,
        brokerName: input.brokerName,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        pickupLat: finalPickupLat || 0,
        pickupLng: finalPickupLng || 0,
        deliveryLat: finalDeliveryLat || 0,
        deliveryLng: finalDeliveryLng || 0,
        weight: input.weight,
        weightUnit: input.weightUnit,
        commodity: input.commodity,
        offeredRate: input.offeredRate,
        calculatedDistance,
        pickupDate: input.pickupDate,
        deliveryDate: input.deliveryDate,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await createSyncLog({
        userId: ctx.user.id,
        brokerName: input.brokerName,
        loadsFound: 1,
        loadsImported: 1,
        loadsSkipped: 0,
        status: "success",
      });

      return { success: true, id: result[0]?.insertId || Date.now() };
    }),

  // Import multiple loads from CSV
  importLoadsFromCSV: protectedProcedure
    .input(
      z.object({
        brokerName: z.enum(["coyote", "dat", "manual", "other"]),
        loads: z.array(
          z.object({
            brokerId: z.string().optional(),
            pickupAddress: z.string(),
            deliveryAddress: z.string(),
            pickupLat: z.number().optional(),
            pickupLng: z.number().optional(),
            deliveryLat: z.number().optional(),
            deliveryLng: z.number().optional(),
            weight: z.number(),
            weightUnit: z.string().optional().default("lbs"),
            commodity: z.string().optional(),
            offeredRate: z.number(),
            pickupDate: z.date().optional(),
            deliveryDate: z.date().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const load of input.loads) {
        try {
          const brokerId =
            load.brokerId || `${input.brokerName}-${Date.now()}-${Math.random()}`;

          const isDuplicate = await checkDuplicateBrokerLoad(ctx.user.id, brokerId);
          if (isDuplicate) {
            skipped++;
            continue;
          }

          let calculatedDistance: number | undefined;
          if (
            load.pickupLat &&
            load.pickupLng &&
            load.deliveryLat &&
            load.deliveryLng
          ) {
            calculatedDistance = calculateDistanceFromCoordinates(
              load.pickupLat,
              load.pickupLng,
              load.deliveryLat,
              load.deliveryLng
            );
          }

          await createBrokerLoad({
            userId: ctx.user.id,
            brokerId,
            brokerName: input.brokerName,
            pickupAddress: load.pickupAddress,
            deliveryAddress: load.deliveryAddress,
            pickupLat: load.pickupLat,
            pickupLng: load.pickupLng,
            deliveryLat: load.deliveryLat,
            deliveryLng: load.deliveryLng,
            weight: load.weight,
            weightUnit: load.weightUnit,
            commodity: load.commodity,
            offeredRate: load.offeredRate,
            calculatedDistance,
            pickupDate: load.pickupDate,
            deliveryDate: load.deliveryDate,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });

          imported++;
        } catch (error: any) {
          errors.push(`Error importing load: ${error.message}`);
          skipped++;
        }
      }

      await createSyncLog({
        userId: ctx.user.id,
        brokerName: input.brokerName,
        loadsFound: input.loads.length,
        loadsImported: imported,
        loadsSkipped: skipped,
        status: imported > 0 ? (skipped > 0 ? "partial" : "success") : "failed",
        errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      });

      return {
        success: imported > 0,
        imported,
        skipped,
        errors,
      };
    }),

  // Get all broker loads for user
  getLoads: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user) return [];
      return await getBrokerLoadsByUserId(ctx.user.id);
    } catch (error) {
      console.error("[brokerLoads.getLoads] error:", error);
      return [];
    }
  }),

  // Get broker loads by status
  getLoadsByStatus: publicProcedure
    .input(z.object({ status: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user) return [];
        return await getBrokerLoadsByStatus(ctx.user.id, input.status);
      } catch (error) {
        console.error("[brokerLoads.getLoadsByStatus] error:", error);
        return [];
      }
    }),

  // Get single broker load
  getLoad: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user) return null;
        const load = await getBrokerLoadById(input.id);
        if (!load || load.userId !== ctx.user.id) {
          return null;
        }
        return load;
      } catch (error) {
        console.error("[brokerLoads.getLoad] error:", error);
        return null;
      }
    }),

  // Update broker load status and verdict
  updateLoad: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z
          .enum(["new", "reviewed", "accepted", "rejected", "expired", "converted"])
          .optional(),
        verdict: z.enum(["ACEPTAR", "NEGOCIAR", "RECHAZAR"]).optional(),
        convertedQuotationId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      const load = await getBrokerLoadById(input.id);
      if (!load || load.userId !== ctx.user.id) {
        throw new Error("Load not found");
      }

      await updateBrokerLoad(input.id, {
        status: input.status,
        verdict: input.verdict,
        convertedQuotationId: input.convertedQuotationId,
      });

      return { success: true };
    }),

  // Delete broker load
  deleteLoad: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      const load = await getBrokerLoadById(input.id);
      if (!load || load.userId !== ctx.user.id) {
        throw new Error("Load not found");
      }

      await deleteBrokerLoad(input.id);
      return { success: true };
    }),

  // Get sync logs
  getSyncLogs: publicProcedure.query(async () => {
    try {
      return [];
    } catch (error) {
      console.error("[brokerLoads.getSyncLogs] error:", error);
      return [];
    }
  }),
});
