import { env } from "@/lib/env";
import { getErrorMessage, PipelineError } from "@/lib/pipeline-error";
import type { ManicureAnalysis } from "@/features/matching/ai";
import type { ExternalImageReference } from "@/types/nail-design";

type SerpApiImageResult = {
  position?: number;
  title?: string;
  source?: string;
  link?: string;
  original?: string;
  thumbnail?: string;
};

type SerpApiImageResponse = {
  images_results?: SerpApiImageResult[];
};

type SerpApiLensResult = {
  position?: number;
  title?: string;
  link?: string;
  source?: string;
  thumbnail?: string;
  image?: string;
};

type SerpApiLensResponse = {
  visual_matches?: SerpApiLensResult[];
};

type BingImageResult = {
  name?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  hostPageUrl?: string;
  hostPageDisplayUrl?: string;
};

type BingImageResponse = {
  value?: BingImageResult[];
};

export function getExternalImageSearchStatus(): {
  provider: "serpapi" | "bing" | "none";
  hasSerpApiKey: boolean;
  hasBingImageSearchKey: boolean;
} {
  return {
    provider: env.SERPAPI_API_KEY
      ? "serpapi"
      : env.BING_IMAGE_SEARCH_KEY
        ? "bing"
        : "none",
    hasSerpApiKey: Boolean(env.SERPAPI_API_KEY),
    hasBingImageSearchKey: Boolean(env.BING_IMAGE_SEARCH_KEY)
  };
}

export async function findExternalImageReferences(input: {
  analysis: ManicureAnalysis;
  promptHint: string;
}): Promise<ExternalImageReference[]> {
  if (env.SERPAPI_API_KEY) {
    return findSerpApiReferences(input);
  }

  if (env.BING_IMAGE_SEARCH_KEY) {
    return findBingReferences(input);
  }

  return [];
}

export async function findVisualMatchesForImage(input: {
  imageUrl: string;
}): Promise<ExternalImageReference[]> {
  if (!env.SERPAPI_API_KEY) {
    return [];
  }

  const searchUrl = new URL("https://serpapi.com/search.json");
  searchUrl.searchParams.set("engine", "google_lens");
  searchUrl.searchParams.set("url", input.imageUrl);
  searchUrl.searchParams.set("type", "visual_matches");
  searchUrl.searchParams.set("q", "manicure nails");
  searchUrl.searchParams.set("safe", "active");
  searchUrl.searchParams.set("auto_crop", "true");
  searchUrl.searchParams.set("api_key", env.SERPAPI_API_KEY);

  try {
    const response = await fetch(searchUrl, {
      next: {
        revalidate: 60 * 60
      }
    });

    if (!response.ok) {
      throw new Error(
        `SerpAPI Lens returned ${response.status}: ${await readSafeErrorBody(response)}`
      );
    }

    const payload = (await response.json()) as SerpApiLensResponse;
    const references = (payload.visual_matches ?? [])
      .slice(0, 8)
      .map((item) => toSerpApiLensReference(item, input.imageUrl))
      .filter((reference): reference is ExternalImageReference =>
        Boolean(reference)
      );

    console.info("Visual image references loaded", {
      provider: "serpapi_google_lens",
      count: references.length
    });

    return references;
  } catch (error) {
    throw new PipelineError(
      "external_image_search",
      `SerpAPI Lens search failed: ${getErrorMessage(error)}`,
      error
    );
  }
}

async function findSerpApiReferences(input: {
  analysis: ManicureAnalysis;
  promptHint: string;
}): Promise<ExternalImageReference[]> {
  const searchUrl = new URL("https://serpapi.com/search.json");
  searchUrl.searchParams.set("engine", "google_images");
  searchUrl.searchParams.set("q", buildImageSearchQuery(input));
  searchUrl.searchParams.set("api_key", env.SERPAPI_API_KEY ?? "");
  searchUrl.searchParams.set("num", "6");
  searchUrl.searchParams.set("safe", "active");

  try {
    const response = await fetch(searchUrl, {
      next: {
        revalidate: 60 * 60
      }
    });

    if (!response.ok) {
      throw new Error(
        `SerpAPI returned ${response.status}: ${await readSafeErrorBody(response)}`
      );
    }

    const payload = (await response.json()) as SerpApiImageResponse;
    const references = (payload.images_results ?? [])
      .slice(0, 6)
      .map(toSerpApiReference)
      .filter((reference): reference is ExternalImageReference =>
        Boolean(reference)
      );

    console.info("External image references loaded", {
      provider: "serpapi",
      count: references.length
    });

    return references;
  } catch (error) {
    throw new PipelineError(
      "external_image_search",
      `SerpAPI image search failed: ${getErrorMessage(error)}`,
      error
    );
  }
}

async function findBingReferences(input: {
  analysis: ManicureAnalysis;
  promptHint: string;
}): Promise<ExternalImageReference[]> {
  const endpoint =
    env.BING_IMAGE_SEARCH_ENDPOINT ??
    "https://api.bing.microsoft.com/v7.0/images/search";
  const searchUrl = new URL(endpoint);
  searchUrl.searchParams.set("q", buildImageSearchQuery(input));
  searchUrl.searchParams.set("count", "6");
  searchUrl.searchParams.set("safeSearch", "Moderate");

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "Ocp-Apim-Subscription-Key": env.BING_IMAGE_SEARCH_KEY ?? ""
      },
      next: {
        revalidate: 60 * 60
      }
    });

    if (!response.ok) {
      throw new Error(
        `Bing Image Search returned ${response.status}: ${await readSafeErrorBody(response)}`
      );
    }

    const payload = (await response.json()) as BingImageResponse;
    const references = (payload.value ?? [])
      .slice(0, 6)
      .map(toBingReference)
      .filter((reference): reference is ExternalImageReference =>
        Boolean(reference)
      );

    console.info("External image references loaded", {
      provider: "bing",
      count: references.length
    });

    return references;
  } catch (error) {
    throw new PipelineError(
      "external_image_search",
      `Bing Image Search failed: ${getErrorMessage(error)}`,
      error
    );
  }
}

function buildImageSearchQuery(input: {
  analysis: ManicureAnalysis;
  promptHint: string;
}): string {
  return [
    input.analysis.tone,
    input.analysis.searchText,
    input.promptHint,
    "manicure nails inspiration"
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

function toSerpApiReference(
  item: SerpApiImageResult
): ExternalImageReference | null {
  const id = item.original ?? item.thumbnail ?? item.link;

  if (!id) {
    return null;
  }

  return {
    id,
    title: item.title || "Google Images manicure reference",
    description: item.source,
    url: item.link,
    imageUrl: item.original ?? item.thumbnail,
    source: item.source ?? "Google Images"
  };
}

function toBingReference(item: BingImageResult): ExternalImageReference | null {
  const id = item.contentUrl ?? item.thumbnailUrl ?? item.hostPageUrl;

  if (!id) {
    return null;
  }

  return {
    id,
    title: item.name || "Bing manicure reference",
    description: item.hostPageDisplayUrl,
    url: item.hostPageUrl,
    imageUrl: item.contentUrl ?? item.thumbnailUrl,
    source: item.hostPageDisplayUrl ?? "Bing Images"
  };
}

function toSerpApiLensReference(
  item: SerpApiLensResult,
  matchedFromImageUrl: string
): ExternalImageReference | null {
  const id = item.link ?? item.image ?? item.thumbnail;

  if (!id) {
    return null;
  }

  return {
    id,
    title: item.title || "Similar manicure reference",
    description: item.source,
    url: item.link,
    imageUrl: item.image ?? item.thumbnail,
    source: item.source ?? "Google Lens",
    matchedFromImageUrl
  };
}

async function readSafeErrorBody(response: Response): Promise<string> {
  const body = await response.text();

  return body.replaceAll(env.SERPAPI_API_KEY ?? "", "[redacted]").slice(0, 500);
}
