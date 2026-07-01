import { describe, expect, it } from "vitest";
import { maxImageUploadSize } from "@/lib/upload-rules";
import { validateImageUpload } from "@/lib/upload-validation";

describe("validateImageUpload", () => {
  it("accepts a supported non-empty image file", () => {
    const file = new File(["image"], "nails.png", { type: "image/png" });

    expect(validateImageUpload(file).success).toBe(true);
  });

  it("rejects unsupported file types", () => {
    const file = new File(["not-image"], "notes.txt", { type: "text/plain" });

    const result = validateImageUpload(file);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Only JPG, PNG, WEBP, or HEIC uploads are supported."
    );
  });

  it("rejects files over the configured size limit", () => {
    const file = new File(
      [new Uint8Array(maxImageUploadSize + 1)],
      "huge.png",
      {
        type: "image/png"
      }
    );

    const result = validateImageUpload(file);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Image must be 8MB or smaller."
    );
  });
});
