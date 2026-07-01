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
import { findExternalImageReferences } from "@/features/image-search/client";

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
      const externalReferences = await getExternalReferencesSafely({
        analysis,
        promptHint
      });
      const generatedImage = await generateManicureConceptImage({
        analysis,
        matches: savedDesign.matches,
        externalReferences,
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
        externalReferences
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
    externalReferences: []
  });
}

async function getExternalReferencesSafely(input: {
  analysis: Awaited<ReturnType<typeof analyzeManicureImage>>;
  promptHint: string;
}) {
  try {
    return await findExternalImageReferences(input);
  } catch (error) {
    if (error instanceof PipelineError) {
      console.warn("External image references skipped", {
        stage: error.stage,
        message: error.message,
        cause: getErrorMessage(error.cause)
      });
    } else {
      console.warn("External image references skipped", {
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
