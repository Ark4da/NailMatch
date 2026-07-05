"use client";

import { useEffect, useId, useState } from "react";
import type {
  ExternalImageReference,
  ProfilePhoto,
  ProfileReferenceResponse
} from "@/types/nail-design";

type Locale = "ru" | "en";

type PreviewPhoto = {
  id: string;
  name: string;
  url: string;
};

const profileStorageKey = "nailmatch.photo-profile.v1";
const profileLimit = 48;

const copy = {
  ru: {
    badge: "Профиль маникюров без ИИ",
    title: "Загрузи много своих работ и найди похожие идеи в интернете.",
    subtitle:
      "NailMatch сохранит фото в локальном профиле, загрузит их в Supabase и подберёт визуально похожие референсы через Google Lens / SerpAPI. OpenAI сейчас не используется.",
    languageLabel: "Язык",
    uploadTitle: "Добавь фото в профиль",
    uploadText:
      "Можно выбрать сразу несколько фото. Лучше работают крупные кадры ногтей при хорошем свете.",
    chooseTitle: "Перетащи фото или нажми для выбора",
    chooseHint: "JPG, PNG, WEBP или HEIC, до 8MB на файл.",
    chooseButton: "Выбрать фото",
    selectedTitle: "Выбрано фото",
    noFileError: "Сначала выбери хотя бы одно фото маникюра.",
    submitIdle: "Загрузить в профиль и найти похожие",
    submitBusy: "Ищем похожие референсы...",
    profileTitle: "Мой профиль",
    profileText:
      "Эти фото хранятся в браузере как твоя локальная подборка. На другом устройстве профиль будет отдельный.",
    profileEmpty: "Профиль пока пустой. Загрузи несколько фото выше.",
    profileClear: "Очистить профиль",
    referencesTitle: "Похожие референсы из интернета",
    referencesText:
      "Результаты подбираются по загруженным фото, без генерации картинки и без OpenAI.",
    referencesEmpty:
      "Референсы появятся здесь после загрузки фото и успешного поиска.",
    openSource: "Открыть источник"
  },
  en: {
    badge: "No-AI manicure profile",
    title: "Upload many of your works and find similar ideas online.",
    subtitle:
      "NailMatch saves photos in a local profile, uploads them to Supabase, and finds visually similar references through Google Lens / SerpAPI. OpenAI is not used in this flow.",
    languageLabel: "Language",
    uploadTitle: "Add photos to profile",
    uploadText:
      "You can choose multiple photos at once. Clear close-up nail photos work best.",
    chooseTitle: "Drop photos or tap to choose",
    chooseHint: "JPG, PNG, WEBP, or HEIC, up to 8MB per file.",
    chooseButton: "Select photos",
    selectedTitle: "Selected photos",
    noFileError: "Choose at least one manicure photo first.",
    submitIdle: "Upload to profile and find similar",
    submitBusy: "Finding similar references...",
    profileTitle: "My profile",
    profileText:
      "These photos are saved in this browser as your local collection. Another device will have a separate profile.",
    profileEmpty: "Your profile is empty. Upload a few photos above.",
    profileClear: "Clear profile",
    referencesTitle: "Similar internet references",
    referencesText:
      "Results are matched from your uploaded photos, without image generation and without OpenAI.",
    referencesEmpty:
      "References will appear here after photos are uploaded and search succeeds.",
    openSource: "Open source"
  }
} satisfies Record<Locale, Record<string, string>>;

export function HomeScreen(): React.JSX.Element {
  const inputId = useId();
  const [locale, setLocale] = useState<Locale>("ru");
  const t = copy[locale];
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewPhotos, setPreviewPhotos] = useState<PreviewPhoto[]>([]);
  const [profilePhotos, setProfilePhotos] = useState<ProfilePhoto[]>([]);
  const [references, setReferences] = useState<ExternalImageReference[]>([]);
  const [error, setError] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [inputResetKey, setInputResetKey] = useState<number>(0);

  useEffect(() => {
    setProfilePhotos(readProfilePhotos());
  }, []);

  useEffect(() => {
    const nextPreviews = selectedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file)
    }));

    setPreviewPhotos(nextPreviews);

    return () => {
      for (const preview of nextPreviews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [selectedFiles]);

  async function handleSubmit(): Promise<void> {
    if (selectedFiles.length === 0) {
      setError(t.noFileError);
      return;
    }

    setIsUploading(true);
    setError("");
    setStatusMessage("");

    const formData = new FormData();

    for (const file of selectedFiles) {
      formData.append("images", file);
    }

    try {
      const response = await fetch("/api/profile/references", {
        method: "POST",
        body: formData
      });
      const payload =
        (await response.json()) as Partial<ProfileReferenceResponse> & {
          error?: string;
        };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      const uploadedPhotos = payload.uploadedPhotos ?? [];
      const nextProfilePhotos = persistProfilePhotos([
        ...uploadedPhotos,
        ...profilePhotos
      ]);

      setProfilePhotos(nextProfilePhotos);
      setReferences(payload.references ?? []);
      setStatusMessage(
        payload.message ??
          `${uploadedPhotos.length} photo(s) added. Searched ${payload.searchedPhotoCount ?? 0} photo(s).`
      );
      setSelectedFiles([]);
      setInputResetKey((currentKey) => currentKey + 1);
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
              style={{ display: "grid", gap: 14, maxWidth: 820 }}
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
                <h2 style={{ margin: 0, fontSize: 24 }}>{t.uploadTitle}</h2>
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  {t.uploadText}
                </p>
              </div>

              <label
                htmlFor={inputId}
                className="upload-dropzone"
                style={{
                  borderRadius: 24,
                  border: "1.5px dashed var(--accent)",
                  background: "rgba(255,255,255,0.7)",
                  minHeight: 230,
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
                </div>
              </label>

              <input
                key={inputResetKey}
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(event) => {
                  setSelectedFiles(Array.from(event.target.files ?? []));
                  setError("");
                }}
              />

              {previewPhotos.length > 0 ? (
                <section style={{ display: "grid", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>
                    {t.selectedTitle}: {previewPhotos.length}
                  </h3>
                  <div
                    className="photo-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(92px, 1fr))",
                      gap: 10
                    }}
                  >
                    {previewPhotos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt={photo.name}
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "cover",
                          borderRadius: 16,
                          border: "1px solid var(--line)"
                        }}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

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

              {error ? (
                <p style={{ margin: 0, color: "var(--accent-strong)" }}>
                  {error}
                </p>
              ) : null}
              {statusMessage ? (
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}
                >
                  {statusMessage}
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "start"
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>
                      {t.profileTitle}
                    </h2>
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
                  {profilePhotos.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setProfilePhotos(persistProfilePhotos([]))}
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

                {profilePhotos.length > 0 ? (
                  <div
                    className="photo-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(92px, 1fr))",
                      gap: 10
                    }}
                  >
                    {profilePhotos.slice(0, 24).map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.imageUrl}
                        alt={photo.fileName}
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "cover",
                          borderRadius: 16,
                          border: "1px solid var(--line)"
                        }}
                      />
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
                <h2 style={{ margin: 0, fontSize: 24 }}>{t.referencesTitle}</h2>
                <p
                  style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}
                >
                  {t.referencesText}
                </p>
              </div>

              {references.length > 0 ? (
                <div style={{ display: "grid", gap: 14 }}>
                  {references.map((reference) => (
                    <article
                      key={reference.id}
                      className="reference-card"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "110px 1fr",
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
                            width: 110,
                            height: 110,
                            borderRadius: 18,
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="reference-thumb"
                          style={{
                            width: 110,
                            height: 110,
                            borderRadius: 18,
                            background:
                              "linear-gradient(135deg, rgba(237, 194, 180, 1) 0%, rgba(255, 228, 212, 1) 55%, rgba(212, 152, 122, 1) 100%)"
                          }}
                        />
                      )}
                      <div style={{ display: "grid", gap: 6 }}>
                        <strong>{reference.title}</strong>
                        {reference.description ? (
                          <span style={{ color: "var(--muted)" }}>
                            {reference.description}
                          </span>
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
                            {t.openSource}
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div
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
                  {t.referencesEmpty}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function readProfilePhotos(): ProfilePhoto[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawPhotos = window.localStorage.getItem(profileStorageKey);

    if (!rawPhotos) {
      return [];
    }

    const parsedPhotos = JSON.parse(rawPhotos);

    if (!Array.isArray(parsedPhotos)) {
      return [];
    }

    return parsedPhotos.filter(isProfilePhoto).slice(0, profileLimit);
  } catch {
    return [];
  }
}

function persistProfilePhotos(photos: ProfilePhoto[]): ProfilePhoto[] {
  const nextPhotos = dedupeProfilePhotos(photos).slice(0, profileLimit);

  if (typeof window === "undefined") {
    return nextPhotos;
  }

  try {
    window.localStorage.setItem(profileStorageKey, JSON.stringify(nextPhotos));
  } catch {
    // If storage is blocked, keep the in-memory profile for this tab.
  }

  return nextPhotos;
}

function dedupeProfilePhotos(photos: ProfilePhoto[]): ProfilePhoto[] {
  const photosById = new Map<string, ProfilePhoto>();

  for (const photo of photos) {
    if (!photosById.has(photo.id)) {
      photosById.set(photo.id, photo);
    }
  }

  return [...photosById.values()];
}

function isProfilePhoto(value: unknown): value is ProfilePhoto {
  if (!value || typeof value !== "object") {
    return false;
  }

  const photo = value as Partial<ProfilePhoto>;

  return (
    typeof photo.id === "string" &&
    typeof photo.fileName === "string" &&
    typeof photo.imageUrl === "string" &&
    typeof photo.createdAt === "string"
  );
}
