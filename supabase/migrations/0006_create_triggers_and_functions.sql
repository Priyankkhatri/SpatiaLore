-- Generic function to auto-update updated_at columns
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tours_updated_at
before update on public.tours
for each row execute function public.set_updated_at();

create trigger trg_pois_updated_at
before update on public.pois
for each row execute function public.set_updated_at();

create trigger trg_scripts_updated_at
before update on public.scripts
for each row execute function public.set_updated_at();

-- Function to unset previous "current" script when a new one is inserted for the same poi+language
create or replace function public.unset_previous_current_script()
returns trigger as $$
begin
  if new.is_current then
    update public.scripts
    set is_current = false
    where poi_id = new.poi_id
      and language_code = new.language_code
      and id <> new.id
      and is_current = true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_scripts_unset_previous_current
before insert or update on public.scripts
for each row execute function public.unset_previous_current_script();
