-- Enable RLS on all tables. By default this blocks ALL access until explicit policies are added.
alter table public.tours enable row level security;
alter table public.pois enable row level security;
alter table public.scripts enable row level security;
alter table public.analytics_events enable row level security;
