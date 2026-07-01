import { z } from "zod";
import { acceptedImageTypes, maxImageUploadSize } from "@/lib/upload-rules";

export const imageUploadSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Image file is required.")
  .refine(
    (file) => file.size <= maxImageUploadSize,
    "Image must be 8MB or smaller."
  )
  .refine(
    (file) => acceptedImageTypes.includes(file.type),
    "Only JPG, PNG, WEBP, or HEIC uploads are supported."
  );

export function validateImageUpload(
  candidate: unknown
): z.SafeParseReturnType<File, File> {
  return imageUploadSchema.safeParse(candidate);
}
