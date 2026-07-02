export type NailMatch = {
  id: string;
  title: string;
  tone: string;
  similarity: number;
  reason: string;
  imageUrl?: string;
  thumbnailUrl?: string | null;
};

export type ExternalImageReference = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  source?: string;
};

export type UploadResponse = {
  uploadId: string;
  fileName: string;
  description: string;
  uploadedImageUrl?: string;
  generatedImageUrl?: string;
  generatedPrompt?: string;
  promptHint?: string;
  mode: "live" | "mock";
  matches: NailMatch[];
  externalReferences?: ExternalImageReference[];
};
