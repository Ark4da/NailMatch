"use client";

import { useEffect, useId, useState } from "react";
import { mockMatches } from "@/lib/mock-matches";
import type {
  ExternalImageReference,
  NailMatch,
  UploadResponse
} from "@/types/nail-design";

type Locale = "ru" | "en";

type ProfileItem = {
  id: string;
  createdAt: string;
  fileName: string;
  description: string;
  promptHint?: string;
  imageUrl?: string;
  uploadedImageUrl?: string;
  generatedImageUrl?: string;
  mode: UploadResponse["mode"];
};

const profileStorageKey = "nailmatch.profile.v1";
const profileLimit = 12;

const copy = {
  ru: {
    badge: "AI генератор маникюра",
    title:
      "Загрузи готовый маникюр и получи новый похожий дизайн, сгенерированный ИИ.",
    subtitle:
      "NailMatch сохраняет работы в общей библиотеке, находит близкие референсы и генерирует свежую идею маникюра на их основе.",
    startTitle: "Начни с одного фото",
    startText:
      "Загрузи фото маникюра. Сайт сохранит его, найдет похожие работы и создаст новый визуальный концепт.",
    chooseTitle: "Перетащи фото или нажми для выбора",
    chooseHint:
      "JPG, PNG или HEIC. Лучше всего работает крупное фото руки при хорошем свете.",
    chooseButton: "Выбрать фото",
    chosenFile: "Выбран файл",
    noFileError: "Сначала выбери фото маникюра.",
    promptLabel: "Дополнительный промт для генерации",
    promptPlaceholder:
      "Например: сделай более нежный нюд, добавь тонкий золотой декор, форма миндаль...",
    submitIdle: "Сгенерировать похожий маникюр",
    submitBusy: "Генерируем концепт...",
    liveLabel: "AI анализ:",
    mockLabel: "Mock результат:",
    resultTitle: "Сгенерированный концепт",
    resultText:
      "Новая картинка создается из загруженного фото, похожих работ из базы и твоего дополнительного промта.",
    emptyGenerated: "Сгенерированная картинка появится здесь после обработки.",
    referencesTitle: "Ближайшие референсы из базы",
    externalTitle: "Внешние референсы",
    noExternal:
      "Внешние референсы не подключены или не найдены. Добавь SerpAPI или Bing ключ в Railway, чтобы включить этот блок.",
    profileTitle: "Мой профиль",
    profileText:
      "Здесь сохраняются твои последние загрузки и генерации. Новые идеи будут учитывать этот стиль.",
    profileEmpty:
      "Профиль пока пустой. Загрузи первый маникюр, и он появится здесь.",
    profileClear: "Очистить профиль",
    profileGenerated: "Сгенерировано",
    profileUploaded: "Загружено",
    languageLabel: "Язык"
  },
  en: {
    badge: "AI manicure generator",
    title:
      "Upload a manicure you already made and generate a fresh similar design.",
    subtitle:
      "NailMatch saves every work in a shared library, finds close references, then generates a new manicure idea from them.",
    startTitle: "Start with one photo",
    startText:
      "Upload one manicure photo. The app stores it, finds similar saved works, and creates a new visual concept.",
    chooseTitle: "Drop image or tap to choose",
    chooseHint:
      "JPG, PNG, or HEIC. A close-up hand photo with clear lighting works best.",
    chooseButton: "Select photo",
    chosenFile: "Chosen file",
    noFileError: "Choose a manicure photo first.",
    promptLabel: "Extra prompt for generation",
    promptPlaceholder:
      "Example: make it softer nude, add thin gold details, almond shape...",
    submitIdle: "Generate similar manicure",
    submitBusy: "Generating concept...",
    liveLabel: "Live AI analysis:",
    mockLabel: "Mock result:",
    resultTitle: "Generated manicure concept",
    resultText:
      "The generated image is created from your uploaded manicure, closest saved references, and your extra prompt.",
    emptyGenerated: "Generated image will appear here after processing.",
    referencesTitle: "Closest uploaded references",
    externalTitle: "External references",
    noExternal:
      "External references are not connected or were not found. Add a SerpAPI or Bing key in Railway to enable this block.",
    profileTitle: "My profile",
    profileText:
      "Your recent uploads and generations are saved here. New ideas will use this style context.",
    profileEmpty:
      "Your profile is empty. Upload the first manicure and it will appear here.",
    profileClear: "Clear profile",
    profileGenerated: "Generated",
    profileUploaded: "Uploaded",
    languageLabel: "Language"
  }
} satisfies Record<Locale, Record<string, string>>;

export function HomeScreen(): React.JSX.Element {
  const inputId = useId();
  const [locale, setLocale] = useState<Locale>("ru");
  const t = copy[locale];
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [promptHint, setPromptHint] = useState<string>("");
  const [matches, setMatches] = useState<NailMatch[]>(mockMatches);
  const [externalReferences, setExternalReferences] = useState<
    ExternalImageReference[]
  >([]);
  const [description, setDescription] = useState<string>("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [responseMode, setResponseMode] =
    useState<UploadResponse["mode"]>("mock");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [profileItems, setProfileItems] = useState<ProfileItem[]>([]);

  useEffect(() => {
    setProfileItems(readProfileItems());
  }, []);

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
      setError(t.noFileError);
      return;
    }

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("promptHint", promptHint);
    formData.append("profileContext", buildProfileContext(profileItems));

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
      setGeneratedImageUrl(payload.generatedImageUrl ?? "");
      setResponseMode(payload.mode ?? "mock");
      setMatches(payload.matches ?? []);
      setExternalReferences(payload.externalReferences ?? []);

      const profileItem = createProfileItem(payload, {
        fileName: selectedFile.name,
        promptHint
      });

      if (profileItem) {
        setProfileItems((currentItems) =>
          persistProfileItems(
            [profileItem, ...currentItems].slice(0, profileLimit)
          )
        );
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="home-page" style={{ padding: "32px 20px 72px" }}>
      <section
        className="home-container"
        style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 24 }}
      >
        <div
          className="home-shell"
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
            className="hero-header"
            style={{ padding: "28px 24px 12px", display: "grid", gap: 18 }}
          >
            <div
              className="hero-topbar"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap"
              }}
            >
              <div
                className="hero-badge"
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
                {t.badge}
              </div>

              <div
                aria-label={t.languageLabel}
                className="language-switch"
                style={{
                  display: "inline-flex",
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  padding: 4,
                  background: "rgba(255,255,255,0.7)"
                }}
              >
                {(["ru", "en"] as const).map((nextLocale) => (
                  <button
                    key={nextLocale}
                    type="button"
                    onClick={() => setLocale(nextLocale)}
                    style={{
                      border: 0,
                      borderRadius: 999,
                      padding: "8px 12px",
                      cursor: "pointer",
                      color: locale === nextLocale ? "#fff" : "var(--muted)",
                      background:
                        locale === nextLocale ? "var(--accent)" : "transparent"
                    }}
                  >
                    {nextLocale.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="hero-copy"
              style={{ display: "grid", gap: 14, maxWidth: 760 }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2.4rem, 7vw, 5.8rem)",
                  lineHeight: 0.95
                }}
              >
                {t.title}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: "var(--muted)"
                }}
              >
                {t.subtitle}
              </p>
            </div>
          </div>

          <div
            className="main-grid"
            style={{
              padding: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20
            }}
          >
            <div
              className="flow-card"
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
                <h2 style={{ margin: 0, fontSize: 24 }}>{t.startTitle}</h2>
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  {t.startText}
                </p>
              </div>

              <label
                htmlFor={inputId}
                className="upload-dropzone"
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
                  <strong style={{ fontSize: 20 }}>{t.chooseTitle}</strong>
                  <span style={{ color: "var(--muted)" }}>{t.chooseHint}</span>
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
                    {t.chooseButton}
                  </span>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Selected manicure preview"
                      className="upload-preview"
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
                  {fileName ? (
                    <span>
                      {t.chosenFile}: {fileName}
                    </span>
                  ) : null}
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

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{t.promptLabel}</span>
                <textarea
                  value={promptHint}
                  maxLength={800}
                  placeholder={t.promptPlaceholder}
                  onChange={(event) => setPromptHint(event.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 110,
                    resize: "vertical",
                    borderRadius: 18,
                    border: "1px solid var(--line)",
                    padding: 14,
                    background: "rgba(255,255,255,0.8)",
                    color: "var(--text)",
                    font: "inherit",
                    lineHeight: 1.5
                  }}
                />
              </label>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleSubmit}
                className="primary-action"
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
                {isUploading ? t.submitBusy : t.submitIdle}
              </button>

              {description ? (
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  <strong style={{ color: "var(--text)" }}>
                    {responseMode === "live" ? t.liveLabel : t.mockLabel}
                  </strong>{" "}
                  {description}
                </p>
              ) : null}

              <section
                className="profile-panel"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 24,
                  padding: 14,
                  background: "rgba(255,255,255,0.58)",
                  display: "grid",
                  gap: 12
                }}
              >
                <div style={{ display: "grid", gap: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 20 }}>
                      {t.profileTitle}
                    </h2>
                    {profileItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setProfileItems(persistProfileItems([]))}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: 999,
                          padding: "7px 10px",
                          background: "rgba(255,255,255,0.7)",
                          color: "var(--muted)",
                          cursor: "pointer"
                        }}
                      >
                        {t.profileClear}
                      </button>
                    ) : null}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--muted)",
                      lineHeight: 1.5
                    }}
                  >
                    {t.profileText}
                  </p>
                </div>

                {profileItems.length > 0 ? (
                  <div
                    className="profile-list"
                    style={{ display: "grid", gap: 10 }}
                  >
                    {profileItems.slice(0, 5).map((item) => (
                      <article
                        key={item.id}
                        className="profile-entry"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "64px 1fr",
                          gap: 10,
                          alignItems: "center",
                          borderRadius: 18,
                          padding: 10,
                          background: "rgba(255,250,247,0.86)",
                          border: "1px solid var(--line)"
                        }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.fileName}
                            style={{
                              width: 64,
                              height: 64,
                              objectFit: "cover",
                              borderRadius: 14
                            }}
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 14,
                              background:
                                "linear-gradient(135deg, rgba(237, 194, 180, 1) 0%, rgba(255, 228, 212, 1) 55%, rgba(212, 152, 122, 1) 100%)"
                            }}
                          />
                        )}
                        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                          <strong
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {item.fileName}
                          </strong>
                          <span style={{ color: "var(--accent-strong)" }}>
                            {item.generatedImageUrl
                              ? t.profileGenerated
                              : t.profileUploaded}
                          </span>
                          <p
                            style={{
                              margin: 0,
                              color: "var(--muted)",
                              lineHeight: 1.4,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden"
                            }}
                          >
                            {item.description}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--muted)",
                      lineHeight: 1.5
                    }}
                  >
                    {t.profileEmpty}
                  </p>
                )}
              </section>
            </div>

            <div
              className="result-card"
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
                <h2 style={{ margin: 0, fontSize: 24 }}>{t.resultTitle}</h2>
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  {t.resultText}
                </p>
              </div>

              {generatedImageUrl ? (
                <img
                  src={generatedImageUrl}
                  alt="Generated manicure concept"
                  className="generated-image"
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 24,
                    border: "1px solid var(--line)"
                  }}
                />
              ) : (
                <div
                  className="generated-placeholder"
                  style={{
                    minHeight: 260,
                    borderRadius: 24,
                    border: "1px solid var(--line)",
                    background:
                      "linear-gradient(135deg, #fff4ec 0%, #f8dcc8 45%, #fffaf7 100%)",
                    display: "grid",
                    placeItems: "center",
                    padding: 20,
                    textAlign: "center",
                    color: "var(--muted)"
                  }}
                >
                  {t.emptyGenerated}
                </div>
              )}

              <h3 style={{ margin: 0, fontSize: 18 }}>{t.referencesTitle}</h3>

              <div style={{ display: "grid", gap: 14 }}>
                {matches.map((match) => (
                  <article
                    key={match.id}
                    className="reference-card"
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
                        className="reference-thumb"
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
                        className="reference-thumb"
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

              <h3 style={{ margin: 0, fontSize: 18 }}>{t.externalTitle}</h3>

              {externalReferences.length > 0 ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {externalReferences.map((reference) => (
                    <article
                      key={reference.id}
                      className="reference-card"
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
                      {reference.imageUrl ? (
                        <img
                          src={reference.imageUrl}
                          alt={reference.title}
                          className="reference-thumb"
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
                          className="reference-thumb"
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
                        <strong>{reference.title}</strong>
                        {reference.description ? (
                          <p style={{ margin: 0, lineHeight: 1.5 }}>
                            {reference.description}
                          </p>
                        ) : null}
                        {reference.url ? (
                          <a
                            href={reference.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "var(--accent-strong)",
                              fontWeight: 700
                            }}
                          >
                            {reference.source ?? "Open reference"}
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  {t.noExternal}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function readProfileItems(): ProfileItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawItems = window.localStorage.getItem(profileStorageKey);

    if (!rawItems) {
      return [];
    }

    const parsedItems = JSON.parse(rawItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems.filter(isProfileItem).slice(0, profileLimit);
  } catch {
    return [];
  }
}

function persistProfileItems(items: ProfileItem[]): ProfileItem[] {
  const nextItems = items.slice(0, profileLimit);

  if (typeof window === "undefined") {
    return nextItems;
  }

  try {
    window.localStorage.setItem(profileStorageKey, JSON.stringify(nextItems));
  } catch {
    // If storage is full or blocked, keep the in-memory profile for this tab.
  }

  return nextItems;
}

function createProfileItem(
  payload: Partial<UploadResponse>,
  fallback: { fileName: string; promptHint: string }
): ProfileItem | null {
  if (!payload.uploadId || !payload.description) {
    return null;
  }

  const generatedImageUrl = payload.generatedImageUrl;
  const uploadedImageUrl = payload.uploadedImageUrl;

  return {
    id: payload.uploadId,
    createdAt: new Date().toISOString(),
    fileName: payload.fileName ?? fallback.fileName,
    description: payload.description,
    promptHint: payload.promptHint ?? fallback.promptHint,
    imageUrl: generatedImageUrl ?? uploadedImageUrl,
    uploadedImageUrl,
    generatedImageUrl,
    mode: payload.mode ?? "mock"
  };
}

function buildProfileContext(items: ProfileItem[]): string {
  return items
    .slice(0, 6)
    .map((item, index) => {
      const prompt = item.promptHint
        ? ` User direction: ${item.promptHint}`
        : "";
      return `${index + 1}. ${item.description}${prompt}`;
    })
    .join("\n")
    .slice(0, 1400);
}

function isProfileItem(value: unknown): value is ProfileItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<ProfileItem>;

  return (
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.fileName === "string" &&
    typeof item.description === "string" &&
    (item.mode === "live" || item.mode === "mock")
  );
}
