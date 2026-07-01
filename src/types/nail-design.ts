export type NailMatch = {
  id: string;
  title: string;
  tone: string;
  similarity: number;
  reason: string;
  imageUrl?: string;
  thumbnailUrl?: string | null;
};

export type UploadResponse = {
  uploadId: string;
  fileName: string;
  description: string;
  generatedImageUrl?: string;
  generatedPrompt?: string;
  mode: "live" | "mock";
  matches: NailMatch[];
};
