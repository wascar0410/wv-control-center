import OpenAI from "openai";
import { ENV } from "./env";

if (!ENV.OPENAI_API_KEY) {
  console.warn("[OpenAI] API key not configured");
}

export const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});
