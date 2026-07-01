import { NextResponse } from "next/server";
import {
  analyzeManicureImage,
  createSearchEmbedding,
  generateManicureConceptImage
} from "@/features/matching/ai";
import {
  saveDesignAndFindMatches,
  saveGeneratedImage
} from "@/features/matching/repository";
import {
  canUseLivePipeline,
  getMissingLivePipelineEnv
} from "@/lib/server-env";
import { mockMatches } from "@/lib/mock-matches";
import { getErrorMessage, PipelineError } from "@/lib/pipeline-error";
import { validateImageUpload } from "@/lib/upload-validation";
import { findPinterestReferences } from "@/features/pinterest/client";

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const parsedFile = validateImageUpload(formData.get("image"));
  const promptHint = parsePromptHint(formData.get("promptHint"));

  if (!parsedFile.success) {
    return NextResponse.json(
      { error: parsedFile.error.issues[0]?.message ?? "Invalid image upload." },
      { status: 400 }
    );
  }

  const file = parsedFile.data;

  if (canUseLivePipeline()) {
    try {
      const analysis = await analyzeManicureImage(file);
      const embedding = await createSearchEmbedding(analysis.searchText);
      const savedDesign = await saveDesignAndFindMatches({
        file,
        analysis,
        embedding
      });
      const pinterestReferences = await getPinterestReferencesSafely({
        analysis,
        promptHint
      });
      const generatedImage = await generateManicureConceptImage({
        analysis,
        matches: savedDesign.matches,
        pinterestReferences,
        promptHint
      });
      const storedGeneratedImage = await saveGeneratedImage({
        b64Json: generatedImage.b64Json
      });

      return NextResponse.json({
        uploadId: savedDesign.uploadId,
        fileName: file.name,
        description: analysis.description,
        generatedImageUrl: storedGeneratedImage.imageUrl,
        generatedPrompt: generatedImage.prompt,
        promptHint,
        mode: "live",
        matches: savedDesign.matches,
        pinterestReferences
      });
    } catch (error) {
      if (error instanceof PipelineError) {
        console.error("Live upload pipeline failed", {
          stage: error.stage,
          message: error.message,
          cause: getErrorMessage(error.cause)
        });
      } else {
        console.error("Live upload pipeline failed", {
          stage: "unknown",
          message: getErrorMessage(error)
        });
      }

      return NextResponse.json(
        {
          error:
            "Could not process this manicure photo. Please try another image."
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    uploadId: crypto.randomUUID(),
    fileName: file.name,
    description: `Mock mode: missing ${getMissingLivePipelineEnv().join(", ")}. Soft neutral manicure with a clean glossy finish.`,
    generatedImageUrl: undefined,
    promptHint,
    mode: "mock",
    matches: mockMatches,
    pinterestReferences: []
  });
}

async function getPinterestReferencesSafely(input: {
  analysis: Awaited<ReturnType<typeof analyzeManicureImage>>;
  promptHint: string;
}) {
  try {
    return await findPinterestReferences(input);
  } catch (error) {
    if (error instanceof PipelineError) {
      console.warn("Pinterest references skipped", {
        stage: error.stage,
        message: error.message,
        cause: getErrorMessage(error.cause)
      });
    } else {
      console.warn("Pinterest references skipped", {
        stage: "unknown",
        message: getErrorMessage(error)
      });
    }

    return [];
  }
}

function parsePromptHint(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 800);
}
