create extension if not exists vector;

create table if not exists nail_designs (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  image_url text not null,
  thumbnail_url text,
  title text not null,
  tone text not null,
  description text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists nail_designs_embedding_idx
  on nail_designs
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function match_nail_designs(
  query_embedding vector(1536),
  match_count int default 8,
  exclude_design_id uuid default null
)
returns table (
  id uuid,
  image_url text,
  thumbnail_url text,
  title text,
  tone text,
  description text,
  similarity double precision
)
language sql
stable
as $$
  select
    nail_designs.id,
    nail_designs.image_url,
    nail_designs.thumbnail_url,
    nail_designs.title,
    nail_designs.tone,
    nail_designs.description,
    1 - (nail_designs.embedding <=> query_embedding) as similarity
  from nail_designs
  where exclude_design_id is null or nail_designs.id <> exclude_design_id
  order by nail_designs.embedding <=> query_embedding
  limit match_count;
$$;

insert into storage.buckets (id, name, public)
values ('nail-designs', 'nail-designs', true)
on conflict (id) do nothing;
