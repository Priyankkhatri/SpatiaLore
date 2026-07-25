-- TOURS: anyone (anon or authenticated) can read published tours
create policy "tours_public_read_published"
on public.tours
for select
to anon, authenticated
using (is_published = true);

-- POIS: anyone can read active POIs belonging to a published tour
create policy "pois_public_read_active"
on public.pois
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.tours t
    where t.id = pois.tour_id
      and t.is_published = true
  )
);

-- SCRIPTS: anyone can read the current script for an active POI on a published tour
create policy "scripts_public_read_current"
on public.scripts
for select
to anon, authenticated
using (
  is_current = true
  and exists (
    select 1 from public.pois p
    join public.tours t on t.id = p.tour_id
    where p.id = scripts.poi_id
      and p.is_active = true
      and t.is_published = true
  )
);
