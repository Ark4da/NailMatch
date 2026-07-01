"use client";

import { useEffect, useId, useState } from "react";
import { mockMatches } from "@/lib/mock-matches";
import type { NailMatch, UploadResponse } from "@/types/nail-design";

export function HomeScreen(): React.JSX.Element {
  const inputId = useId();
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [matches, setMatches] = useState<NailMatch[]>(mockMatches);
  const [description, setDescription] = useState<string>("");
  const [responseMode, setResponseMode] =
    useState<UploadResponse["mode"]>("mock");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  async function handleSubmit(): Promise<void> {
    if (!selectedFile) {
      setError("Choose a manicure photo first.");
      return;
    }

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as Partial<UploadResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      setDescription(payload.description ?? "");
      setResponseMode(payload.mode ?? "mock");
      setMatches(payload.matches ?? []);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main style={{ padding: "32px 20px 72px" }}>
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 24
        }}
      >
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 32,
            boxShadow: "var(--shadow)",
            background: "rgba(255, 250, 245, 0.84)",
            backdropFilter: "blur(18px)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              padding: "28px 24px 12px",
              display: "grid",
              gap: 18
            }}
          >
            <div
              style={{
                display: "inline-flex",
                width: "fit-content",
                borderRadius: 999,
                border: "1px solid var(--line)",
                padding: "8px 12px",
                color: "var(--muted)",
                background: "rgba(255,255,255,0.65)"
              }}
            >
              AI manicure similarity search
            </div>
            <div style={{ display: "grid", gap: 14, maxWidth: 760 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2.4rem, 7vw, 5.8rem)",
                  lineHeight: 0.95
                }}
              >
                Upload a manicure you already made and get close design ideas in
                seconds.
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: "var(--muted)"
                }}
              >
                NailMatch saves every new work in a shared inspiration library
                and uses AI to find the nearest looks by shape, tone, finish,
                and decorative mood.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 28,
                padding: 20,
                display: "grid",
                gap: 16
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>
                  Start with one photo
                </h2>
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  For MVP we keep the flow simple: upload, process, then view
                  similar manicure ideas from the internal collection.
                </p>
              </div>

              <label
                htmlFor={inputId}
                style={{
                  borderRadius: 24,
                  border: "1.5px dashed var(--accent)",
                  background: "rgba(255,255,255,0.7)",
                  minHeight: 260,
                  padding: 20,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  <strong style={{ fontSize: 20 }}>
                    Drop image or tap to choose
                  </strong>
                  <span style={{ color: "var(--muted)" }}>
                    JPG, PNG, or HEIC. Recommended close-up hand photo with
                    clear lighting.
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      justifySelf: "center",
                      borderRadius: 999,
                      padding: "10px 16px",
                      background: "var(--accent)",
                      color: "#fff"
                    }}
                  >
                    Select photo
                  </span>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Selected manicure preview"
                      style={{
                        width: "min(100%, 320px)",
                        aspectRatio: "4 / 3",
                        objectFit: "cover",
                        borderRadius: 18,
                        justifySelf: "center",
                        border: "1px solid var(--line)"
                      }}
                    />
                  ) : null}
                  {fileName ? <span>Chosen file: {fileName}</span> : null}
                  {error ? (
                    <span style={{ color: "var(--accent-strong)" }}>
                      {error}
                    </span>
                  ) : null}
                </div>
              </label>

              <input
                id={inputId}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(event) => {
                  const nextFile = event.target.files?.[0];
                  setFileName(nextFile?.name ?? "");
                  setSelectedFile(nextFile ?? null);
                  setError("");
                }}
              />

              <button
                type="button"
                disabled={isUploading}
                onClick={handleSubmit}
                style={{
                  border: 0,
                  borderRadius: 18,
                  padding: "16px 18px",
                  background:
                    "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)",
                  color: "#fff",
                  fontSize: 16,
                  cursor: isUploading ? "wait" : "pointer",
                  opacity: isUploading ? 0.78 : 1
                }}
              >
                {isUploading ? "Processing photo..." : "Find similar manicures"}
              </button>

              {description ? (
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  <strong style={{ color: "var(--text)" }}>
                    {responseMode === "live"
                      ? "Live AI result:"
                      : "Mock result:"}
                  </strong>{" "}
                  {description}
                </p>
              ) : null}
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: 28,
                padding: 20,
                display: "grid",
                gap: 16
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>
                  What the AI will return
                </h2>
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  The API is wired for Supabase and OpenAI. It uses mock mode
                  only until the required environment variables are configured.
                </p>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {matches.map((match) => (
                  <article
                    key={match.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "92px 1fr",
                      gap: 14,
                      alignItems: "center",
                      borderRadius: 22,
                      border: "1px solid var(--line)",
                      padding: 12,
                      background:
                        "linear-gradient(180deg, #fffaf7 0%, #fff4ec 100%)"
                    }}
                  >
                    {match.imageUrl ? (
                      <img
                        src={match.thumbnailUrl ?? match.imageUrl}
                        alt={match.title}
                        style={{
                          width: 92,
                          height: 92,
                          borderRadius: 18,
                          objectFit: "cover"
                        }}
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: 92,
                          height: 92,
                          borderRadius: 18,
                          background:
                            "linear-gradient(135deg, rgba(237, 194, 180, 1) 0%, rgba(255, 228, 212, 1) 55%, rgba(212, 152, 122, 1) 100%)"
                        }}
                      />
                    )}
                    <div style={{ display: "grid", gap: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 12
                        }}
                      >
                        <strong>{match.title}</strong>
                        <span style={{ color: "var(--accent-strong)" }}>
                          {match.similarity}%
                        </span>
                      </div>
                      <span style={{ color: "var(--muted)" }}>
                        {match.tone}
                      </span>
                      <p style={{ margin: 0, lineHeight: 1.5 }}>
                        {match.reason}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
