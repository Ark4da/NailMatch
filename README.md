# NailMatch

NailMatch is a Next.js MVP for generating manicure concepts from an uploaded photo.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres, Storage, and pgvector
- OpenAI for image understanding, embeddings, and generated manicure concepts
- Optional Pinterest API references for broader inspiration
- Railway for deployment

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm dev
```

Run the main checks:

```bash
pnpm check
```

## Environment

Copy `.env.example` to `.env.local` and fill the values when Supabase and OpenAI are ready.

Without these values, `/api/upload` stays in mock mode so the UI can still be developed locally:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_VISION_MODEL`
- `OPENAI_IMAGE_MODEL`
- `PINTEREST_ACCESS_TOKEN` (optional)

## Supabase Setup

Run the SQL in `supabase/migrations/0001_create_nail_designs.sql` against the Supabase project.
It creates:

- the `vector` extension;
- the `nail_designs` table;
- the vector similarity function `match_nail_designs`;
- the public storage bucket `nail-designs`.

## Railway

Railway should use:

- build command: `pnpm build`
- start command: `pnpm start`
- Node.js: `22.x`
- pnpm: `10.20.0`

The project also includes `/api/health` for a lightweight health check.

## Current State

The site is Russian-first with an English switcher. The upload flow accepts one manicure photo plus an optional extra prompt. The live pipeline uploads the image to Supabase Storage, analyzes it with OpenAI, stores an embedding, finds similar saved designs with pgvector, optionally fetches Pinterest references, generates a new manicure concept image, and stores that generated image in Supabase Storage.
