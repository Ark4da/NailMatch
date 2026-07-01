export type NailMatch = {
  id: string;
  title: string;
  tone: string;
  similarity: number;
  reason: string;
  imageUrl?: string;
  thumbnailUrl?: string | null;
};

export type PinterestReference = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
};

export type UploadResponse = {
  uploadId: string;
  fileName: string;
  description: string;
  generatedImageUrl?: string;
  generatedPrompt?: string;
  promptHint?: string;
  mode: "live" | "mock";
  matches: NailMatch[];
  pinterestReferences?: PinterestReference[];
};
