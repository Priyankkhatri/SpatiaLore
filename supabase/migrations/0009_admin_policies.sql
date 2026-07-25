-- TOURS: admins can do everything
create policy "tours_admin_all"
on public.tours
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- POIS: admins can do everything
create policy "pois_admin_all"
on public.pois
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- SCRIPTS: admins can do everything
create policy "scripts_admin_all"
on public.scripts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
