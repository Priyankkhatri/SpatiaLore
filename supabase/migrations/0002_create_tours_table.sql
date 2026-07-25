create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  city text not null,
  country text,
  is_published boolean not null default false,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tours is 'A tour represents a curated collection of POIs for a given city/region.';

create index if not exists idx_tours_city on public.tours (city);
create index if not exists idx_tours_admin_id on public.tours (admin_id);
