import { z } from "zod";
import { createOpenAIClient } from "@/lib/openai-client";
import { env } from "@/lib/env";
import { getErrorMessage, PipelineError } from "@/lib/pipeline-error";

const manicureAnalysisSchema = z.object({
  title: z.string().min(1),
  tone: z.string().min(1),
  description: z.string().min(1),
  searchText: z.string().min(1)
});

export type ManicureAnalysis = z.infer<typeof manicureAnalysisSchema>;

export async function analyzeManicureImage(
  file: File
): Promise<ManicureAnalysis> {
  const openai = createOpenAIClient();
  const imageDataUrl = await fileToDataUrl(file);

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_VISION_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You describe manicure photos for similarity search. Return compact JSON with title, tone, description, and searchText."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this manicure. Focus on nail shape, colors, finish, decorations, style, and visual mood."
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl
              }
            }
          ]
        }
      ]
    });

    const rawContent = completion.choices[0]?.message.content;

    if (!rawContent) {
      throw new Error("OpenAI returned an empty manicure analysis.");
    }

    return manicureAnalysisSchema.parse(JSON.parse(rawContent));
  } catch (error) {
    throw new PipelineError(
      "openai_vision",
      `OpenAI vision analysis failed: ${getErrorMessage(error)}`,
      error
    );
  }
}

export async function createSearchEmbedding(input: string): Promise<number[]> {
  const openai = createOpenAIClient();

  try {
    const embedding = await openai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input
    });

    const embeddingVector = embedding.data[0]?.embedding ?? [];

    if (embeddingVector.length === 0) {
      throw new Error("OpenAI returned an empty embedding.");
    }

    return embeddingVector;
  } catch (error) {
    throw new PipelineError(
      "openai_embedding",
      `OpenAI embedding failed: ${getErrorMessage(error)}`,
      error
    );
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
