import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "./trpc";
import { openai } from "./openai";

const pricingInputSchema = z.object({
  miles: z.number().positive("Miles debe ser mayor que 0"),
  weight: z.number().nonnegative().optional(),
  fuelCostPerMile: z.number().nonnegative(),
  targetProfitPerMile: z.number().nonnegative(),
});

const pricingOutputSchema = z.object({
  minimumRate: z.number(),
  recommendedRate: z.number(),
  stretchRate: z.number(),
  explanation: z.string(),
});

export const aiRouter = router({
  suggestPricing: publicProcedure
    .input(pricingInputSchema)
    .mutation(async ({ input }) => {
      const { miles, weight = 0, fuelCostPerMile, targetProfitPerMile } = input;

      const fallback = {
        minimumRate: Number((miles * fuelCostPerMile).toFixed(2)),
        recommendedRate: Number(
          (miles * (fuelCostPerMile + targetProfitPerMile)).toFixed(2)
        ),
        stretchRate: Number(
          (miles * (fuelCostPerMile + targetProfitPerMile * 1.5)).toFixed(2)
        ),
        explanation:
          "Fallback calculation used based on miles, fuel cost per mile, and target profit per mile.",
      };

      if (!openai) {
        return fallback;
      }

      try {
        const response = await openai.responses.create({
          model: "gpt-4.1-mini",
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text:
                    "You are a logistics pricing expert for a cargo van transportation company. " +
                    "Return only valid JSON matching the requested schema. " +
                    "All rates must be realistic USD numbers with 2 decimals max.",
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify({
                    task: "suggest_pricing",
                    miles,
                    weight,
                    fuelCostPerMile,
                    targetProfitPerMile,
                    instructions: {
                      minimumRate:
                        "Lowest viable rate that still covers core operating cost.",
                      recommendedRate:
                        "Best professional quote balancing competitiveness and profit.",
                      stretchRate:
                        "Higher quote for stronger margin if market allows.",
                      explanation:
                        "Short explanation in plain English, 1-3 sentences.",
                    },
                  }),
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "pricing_suggestion",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  minimumRate: { type: "number" },
                  recommendedRate: { type: "number" },
                  stretchRate: { type: "number" },
                  explanation: { type: "string" },
                },
                required: [
                  "minimumRate",
                  "recommendedRate",
                  "stretchRate",
                  "explanation",
                ],
              },
            },
          },
        });

        const raw = (response as any).output_text;
        if (!raw) return fallback;

        const parsed = JSON.parse(raw);
        const validated = pricingOutputSchema.parse(parsed);

        return {
          minimumRate: Number(validated.minimumRate.toFixed(2)),
          recommendedRate: Number(validated.recommendedRate.toFixed(2)),
          stretchRate: Number(validated.stretchRate.toFixed(2)),
          explanation: validated.explanation,
        };
      } catch (error) {
        console.error("[ai.suggestPricing] error:", error);
        return fallback;
      }
    }),
});
