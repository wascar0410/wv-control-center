import { z } from "zod";
import { protectedProcedure, router } from "./trpc";
import { evaluateLoadWithUserConfig, saveEvaluatedLoad, EvaluationForm } from "../db-load-evaluator";

export const loadEvaluatorRouter = router({
  // Evaluate a load based on user's configuration
  evaluate: protectedProcedure
    .input(
      z.object({
        brokerName: z.string().optional().default(""),
        clientName: z.string().optional().default(""),
        origin: z.string(),
        destination: z.string(),
        offeredPrice: z.number().min(0),
        loadedMiles: z.number().min(0),
        deadheadMiles: z.number().min(0).optional().default(0),
        weightLbs: z.number().min(0).optional().default(0),
        pickupDate: z.string().optional(),
        deliveryDate: z.string().optional(),
        notes: z.string().optional().default(""),
      })
    )
    .query(async ({ input, ctx }) => {
      const form: EvaluationForm = {
        brokerName: input.brokerName,
        clientName: input.clientName,
        origin: input.origin,
        destination: input.destination,
        offeredPrice: input.offeredPrice,
        loadedMiles: input.loadedMiles,
        deadheadMiles: input.deadheadMiles,
        weightLbs: input.weightLbs,
        pickupDate: input.pickupDate,
        deliveryDate: input.deliveryDate,
        notes: input.notes,
      };

      return evaluateLoadWithUserConfig(ctx.user.id, form);
    }),

  // Save an evaluated load
  save: protectedProcedure
    .input(
      z.object({
        brokerName: z.string().optional().default(""),
        clientName: z.string().optional().default(""),
        origin: z.string(),
        destination: z.string(),
        offeredPrice: z.number().min(0),
        loadedMiles: z.number().min(0),
        deadheadMiles: z.number().min(0).optional().default(0),
        weightLbs: z.number().min(0).optional().default(0),
        pickupDate: z.string().optional(),
        deliveryDate: z.string().optional(),
        notes: z.string().optional().default(""),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const form: EvaluationForm = {
        brokerName: input.brokerName,
        clientName: input.clientName,
        origin: input.origin,
        destination: input.destination,
        offeredPrice: input.offeredPrice,
        loadedMiles: input.loadedMiles,
        deadheadMiles: input.deadheadMiles,
        weightLbs: input.weightLbs,
        pickupDate: input.pickupDate,
        deliveryDate: input.deliveryDate,
        notes: input.notes,
      };

      const evaluation = await evaluateLoadWithUserConfig(ctx.user.id, form);
      await saveEvaluatedLoad(ctx.user.id, form, evaluation);

      return {
        success: true,
        evaluation,
      };
    }),
});
