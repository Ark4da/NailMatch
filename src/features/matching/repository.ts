import type { NailMatch } from "@/types/nail-design";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ManicureAnalysis } from "@/features/matching/ai";

const bucketName = "nail-designs";

type MatchRow = {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  title: string;
  tone: string;
  description: string;
  similarity: number;
};

export async function saveDesignAndFindMatches(input: {
  file: File;
  analysis: ManicureAnalysis;
  embedding: number[];
}): Promise<{ uploadId: string; matches: NailMatch[] }> {
  const supabase = createSupabaseAdminClient();
  const extension = getFileExtension(input.file);
  const storagePath = `${crypto.randomUUID()}.${extension}`;
  const fileBuffer = await input.file.arrayBuffer();

  const uploadResult = await supabase.storage
    .from(bucketName)
    .upload(storagePath, fileBuffer, {
      contentType: input.file.type,
      upsert: false
    });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const publicUrl = supabase.storage.from(bucketName).getPublicUrl(storagePath)
    .data.publicUrl;

  const insertResult = await supabase
    .from("nail_designs")
    .insert({
      storage_path: storagePath,
      image_url: publicUrl,
      thumbnail_url: publicUrl,
      title: input.analysis.title,
      tone: input.analysis.tone,
      description: input.analysis.description,
      embedding: input.embedding
    })
    .select("id")
    .single();

  if (insertResult.error) {
    throw insertResult.error;
  }

  const matchesResult = await supabase.rpc("match_nail_designs", {
    query_embedding: input.embedding,
    match_count: 8,
    exclude_design_id: insertResult.data.id
  });

  if (matchesResult.error) {
    throw matchesResult.error;
  }

  return {
    uploadId: insertResult.data.id,
    matches: ((matchesResult.data ?? []) as MatchRow[]).map(toNailMatch)
  };
}

function toNailMatch(row: MatchRow): NailMatch {
  return {
    id: row.id,
    title: row.title,
    tone: row.tone,
    similarity: Math.round(row.similarity * 100),
    reason: row.description,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url
  };
}

function getFileExtension(file: File): string {
  const fallback = file.type.split("/")[1] || "jpg";
  return file.name.split(".").pop()?.toLowerCase() || fallback;
}
