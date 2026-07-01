import { env } from "@/lib/env";
import { getErrorMessage, PipelineError } from "@/lib/pipeline-error";
import type { ManicureAnalysis } from "@/features/matching/ai";
import type { PinterestReference } from "@/types/nail-design";

type PinterestPin = {
  id?: string;
  title?: string;
  description?: string;
  link?: string;
  media?: {
    images?: {
      "150x150"?: { url?: string };
      "400x300"?: { url?: string };
      "600x"?: { url?: string };
      "1200x"?: { url?: string };
      original?: { url?: string };
    };
  };
};

type PinterestSearchResponse = {
  items?: PinterestPin[];
};

export function canUsePinterest(): boolean {
  return Boolean(env.PINTEREST_ACCESS_TOKEN);
}

export async function findPinterestReferences(input: {
  analysis: ManicureAnalysis;
  promptHint: string;
}): Promise<PinterestReference[]> {
  if (!env.PINTEREST_ACCESS_TOKEN) {
    return [];
  }

  const query = buildPinterestQuery(input);
  const searchUrl = new URL("https://api.pinterest.com/v5/pins/search");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("page_size", "6");

  try {
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${env.PINTEREST_ACCESS_TOKEN}`
      },
      next: {
        revalidate: 60 * 60
      }
    });

    if (!response.ok) {
      throw new Error(`Pinterest API returned ${response.status}`);
    }

    const payload = (await response.json()) as PinterestSearchResponse;

    return (payload.items ?? [])
      .map(toPinterestReference)
      .filter((reference): reference is PinterestReference =>
        Boolean(reference)
      );
  } catch (error) {
    throw new PipelineError(
      "pinterest_search",
      `Pinterest search failed: ${getErrorMessage(error)}`,
      error
    );
  }
}

function buildPinterestQuery(input: {
  analysis: ManicureAnalysis;
  promptHint: string;
}): string {
  return [
    input.analysis.tone,
    input.analysis.searchText,
    input.promptHint,
    "manicure nails"
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

function toPinterestReference(pin: PinterestPin): PinterestReference | null {
  if (!pin.id) {
    return null;
  }

  return {
    id: pin.id,
    title: pin.title || "Pinterest manicure reference",
    description: pin.description,
    url: pin.link,
    imageUrl:
      pin.media?.images?.["600x"]?.url ??
      pin.media?.images?.["400x300"]?.url ??
      pin.media?.images?.["1200x"]?.url ??
      pin.media?.images?.original?.url ??
      pin.media?.images?.["150x150"]?.url
  };
}
