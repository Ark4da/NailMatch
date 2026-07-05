# NailMatch

NailMatch is a Next.js MVP for building a manicure photo profile and finding similar internet references.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres, Storage, and pgvector
- SerpAPI Google Lens for visual internet references from uploaded manicure photos
- OpenAI legacy routes are still present, but the current main UI does not use AI generation
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

Copy `.env.example` to `.env.local` and fill the values when Supabase and SerpAPI are ready.

The current no-AI profile flow needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SERPAPI_API_KEY`

Legacy AI generation/search routes additionally use:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_EMBEDDING_MODEL`
- `OPENAI_VISION_MODEL`
- `OPENAI_IMAGE_MODEL`
- `BING_IMAGE_SEARCH_KEY`
- `BING_IMAGE_SEARCH_ENDPOINT`

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

The site is Russian-first with an English switcher. The current main flow accepts many manicure photos at once, uploads them to Supabase Storage, stores them in a local browser profile, and finds visually similar internet references through SerpAPI Google Lens. OpenAI image analysis and generation are not used in the current UI.
