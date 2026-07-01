import OpenAI from "openai";
import { env } from "@/lib/env";

export function createOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY
  });
}
