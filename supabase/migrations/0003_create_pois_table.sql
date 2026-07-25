create table if not exists public.pois (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  osm_id text, -- original OpenStreetMap ID, nullable for manually added POIs
  name text not null,
  description text,
  category text, -- e.g. landmark, museum, fort, viewpoint
  location geography(Point, 4326) not null, -- lat/lng stored as PostGIS geography
  trigger_radius_m integer not null default 30 check (trigger_radius_m between 5 and 500),
  prefetch_radius_m integer not null default 100 check (prefetch_radius_m between 20 and 1000),
  is_active boolean not null default false,
  display_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prefetch_gte_trigger check (prefetch_radius_m >= trigger_radius_m)
);

comment on table public.pois is 'Points of Interest tied to a tour. location uses PostGIS geography for accurate radius/geofence queries.';

create index if not exists idx_pois_tour_id on public.pois (tour_id);
create index if not exists idx_pois_location on public.pois using gist (location);
create index if not exists idx_pois_is_active on public.pois (is_active);
