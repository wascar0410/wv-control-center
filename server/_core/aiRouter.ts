import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { openai } from "./openai";

export const aiRouter = router({
  suggestPricing: publicProcedure
    .input(
      z.object({
        miles: z.number(),
        weight: z.number().optional(),
        fuelCostPerMile: z.number(),
        targetProfitPerMile: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { miles, weight, fuelCostPerMile, targetProfitPerMile } = input;

      const prompt = `
You are a logistics pricing expert.

Given:
- Miles: ${miles}
- Weight: ${weight ?? 0}
- Fuel cost per mile: ${fuelCostPerMile}
- Target profit per mile: ${targetProfitPerMile}

Return JSON with:
- minimumRate
- recommendedRate
- stretchRate
- explanation
`;

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
      });

      const text = response.output[0]?.content[0]?.text || "{}";

      try {
        return JSON.parse(text);
      } catch {
        return {
          minimumRate: miles * fuelCostPerMile,
          recommendedRate: miles * (fuelCostPerMile + targetProfitPerMile),
          stretchRate: miles * (fuelCostPerMile + targetProfitPerMile * 1.5),
          explanation: "Fallback calculation used",
        };
      }
    }),
});
