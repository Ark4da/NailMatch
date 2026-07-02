import { z } from "zod";
import { createOpenAIClient } from "@/lib/openai-client";
import { env } from "@/lib/env";
import { getErrorMessage, PipelineError } from "@/lib/pipeline-error";
import type { ExternalImageReference, NailMatch } from "@/types/nail-design";

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

export async function generateManicureConceptImage(input: {
  analysis: ManicureAnalysis;
  matches: NailMatch[];
  externalReferences: ExternalImageReference[];
  promptHint: string;
  profileContext: string;
}): Promise<{ b64Json: string; prompt: string }> {
  const openai = createOpenAIClient();
  const prompt = buildGenerationPrompt(input);

  try {
    const image = await openai.images.generate({
      model: env.OPENAI_IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
      output_format: "webp"
    });

    const b64Json = image.data?.[0]?.b64_json;

    if (!b64Json) {
      throw new Error("OpenAI returned an empty generated image.");
    }

    return { b64Json, prompt };
  } catch (error) {
    throw new PipelineError(
      "openai_image_generation",
      `OpenAI image generation failed: ${getErrorMessage(error)}`,
      error
    );
  }
}

function buildGenerationPrompt(input: {
  analysis: ManicureAnalysis;
  matches: NailMatch[];
  externalReferences: ExternalImageReference[];
  promptHint: string;
  profileContext: string;
}): string {
  const matchContext =
    input.matches.length > 0
      ? input.matches
          .slice(0, 4)
          .map(
            (match, index) =>
              `${index + 1}. ${match.title}: ${match.tone}. ${match.reason}`
          )
          .join("\n")
      : "No close matches are available yet; use only the uploaded manicure analysis.";
  const userDirection = input.promptHint
    ? `User generation preferences: ${input.promptHint}`
    : "User extra direction: none.";
  const profileDirection = input.profileContext
    ? `User profile context from previous uploaded/generated manicures:\n${input.profileContext}`
    : "User profile context: no previous manicures are available.";
  const externalContext =
    input.externalReferences.length > 0
      ? input.externalReferences
          .slice(0, 4)
          .map((reference, index) => {
            const description = reference.description
              ? ` ${reference.description}`
              : "";
            const source = reference.source
              ? ` Source: ${reference.source}.`
              : "";
            return `${index + 1}. ${reference.title}.${description}${source}`;
          })
          .join("\n")
      : "No external image references are available.";

  return [
    "Generate one realistic square salon photo concept for a new manicure design.",
    "Priority order: 1) realistic hand anatomy and clean manicure photo, 2) uploaded manicure analysis, 3) closest saved references, 4) user generation preferences.",
    "User generation preferences are soft style hints, not strict commands. Apply them only when they fit naturally; never let them make the image busy, distorted, artificial, or inconsistent.",
    "Keep the composition simple: one natural hand, five visible fingers when appropriate, realistic nail lengths, realistic skin, salon lighting, polished nails, no text, no watermark.",
    "Avoid warped hands, extra fingers, melted nails, impossible nail shapes, overloaded decoration, excessive chrome glare, cluttered backgrounds, and plastic-looking skin.",
    "",
    `Uploaded manicure analysis: ${input.analysis.description}`,
    `Uploaded tone/style summary: ${input.analysis.tone}`,
    userDirection,
    profileDirection,
    "",
    "Closest saved manicure references:",
    matchContext,
    "",
    "External image search references. Use only broad style inspiration; do not copy exact designs:",
    externalContext,
    "",
    "Create one polished, wearable variation. Prefer fewer, cleaner design choices over combining every requested detail."
  ].join("\n");
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
