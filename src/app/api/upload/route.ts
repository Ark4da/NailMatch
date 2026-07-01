import { NextResponse } from "next/server";
import {
  analyzeManicureImage,
  createSearchEmbedding
} from "@/features/matching/ai";
import { saveDesignAndFindMatches } from "@/features/matching/repository";
import {
  canUseLivePipeline,
  getMissingLivePipelineEnv
} from "@/lib/server-env";
import { mockMatches } from "@/lib/mock-matches";
import { getErrorMessage, PipelineError } from "@/lib/pipeline-error";
import { validateImageUpload } from "@/lib/upload-validation";

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const parsedFile = validateImageUpload(formData.get("image"));

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

      return NextResponse.json({
        uploadId: savedDesign.uploadId,
        fileName: file.name,
        description: analysis.description,
        mode: "live",
        matches: savedDesign.matches
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
    mode: "mock",
    matches: mockMatches
  });
}
