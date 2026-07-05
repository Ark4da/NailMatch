import { NextResponse } from "next/server";
import { findVisualMatchesForImage } from "@/features/image-search/client";
import { saveProfilePhoto } from "@/features/matching/repository";
import {
  canUseProfileSearchPipeline,
  getMissingProfileSearchEnv
} from "@/lib/server-env";
import { getErrorMessage, PipelineError } from "@/lib/pipeline-error";
import { validateImageUpload } from "@/lib/upload-validation";
import type {
  ExternalImageReference,
  ProfilePhoto,
  ProfileReferenceResponse
} from "@/types/nail-design";

const maxProfileUploadCount = 12;
const maxSearchPhotoCount = 8;

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const candidates = formData.getAll("images");
  const parsedFiles = candidates.map(validateImageUpload);
  const invalidFile = parsedFiles.find((result) => !result.success);

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one manicure photo." },
      { status: 400 }
    );
  }

  if (invalidFile && !invalidFile.success) {
    return NextResponse.json(
      {
        error: invalidFile.error.issues[0]?.message ?? "Invalid manicure photo."
      },
      { status: 400 }
    );
  }

  const files = parsedFiles
    .filter((result): result is { success: true; data: File } => result.success)
    .map((result) => result.data)
    .slice(0, maxProfileUploadCount);

  if (!canUseProfileSearchPipeline()) {
    const response: ProfileReferenceResponse = {
      mode: "mock",
      uploadedPhotos: [],
      references: [],
      searchedPhotoCount: 0,
      message: `Mock mode: missing ${getMissingProfileSearchEnv().join(", ")}. Add Supabase and SerpAPI variables to enable internet references.`
    };

    return NextResponse.json(response);
  }

  try {
    const uploadedPhotos: ProfilePhoto[] = [];

    for (const file of files) {
      uploadedPhotos.push(await saveProfilePhoto(file));
    }

    const references = dedupeReferences(
      (
        await Promise.all(
          uploadedPhotos
            .slice(0, maxSearchPhotoCount)
            .map((photo) =>
              findVisualMatchesForImage({ imageUrl: photo.imageUrl })
            )
        )
      ).flat()
    );

    const response: ProfileReferenceResponse = {
      mode: "live",
      uploadedPhotos,
      references,
      searchedPhotoCount: Math.min(uploadedPhotos.length, maxSearchPhotoCount)
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof PipelineError) {
      console.error("Profile reference search failed", {
        stage: error.stage,
        message: error.message,
        cause: getErrorMessage(error.cause)
      });
    } else {
      console.error("Profile reference search failed", {
        stage: "unknown",
        message: getErrorMessage(error)
      });
    }

    return NextResponse.json(
      { error: "Could not find internet references for these photos." },
      { status: 502 }
    );
  }
}

function dedupeReferences(
  references: ExternalImageReference[]
): ExternalImageReference[] {
  const referencesById = new Map<string, ExternalImageReference>();

  for (const reference of references) {
    if (!referencesById.has(reference.id)) {
      referencesById.set(reference.id, reference);
    }
  }

  return [...referencesById.values()].slice(0, 24);
}
