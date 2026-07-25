create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references public.tours(id) on delete set null,
  poi_id uuid references public.pois(id) on delete set null,
  event_type text not null check (event_type in (
    'tour_started', 'tour_completed', 'poi_triggered', 'poi_skipped',
    'screen_off_duration', 'feedback_submitted'
  )),
  -- Aggregate/anonymous only. No user_id, no raw location, no device identifiers.
  session_id uuid not null, -- ephemeral, client-generated, not linked to any user account
  value_numeric numeric, -- e.g. duration in seconds, or feedback rating
  metadata jsonb, -- small aggregate payloads only, e.g. { "rating": 5 }
  synced_at timestamptz not null default now(),
  created_at_client timestamptz -- timestamp from device, sent post-tour when reconnected
);

comment on table public.analytics_events is 'Aggregate-only, anonymous analytics. No PII, no server-side location storage, GDPR-safe by design. Synced from mobile only when reconnected, post-tour.';

create index if not exists idx_analytics_tour_id on public.analytics_events (tour_id);
create index if not exists idx_analytics_poi_id on public.analytics_events (poi_id);
create index if not exists idx_analytics_event_type on public.analytics_events (event_type);
