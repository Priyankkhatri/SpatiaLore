create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  full_name text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Extends auth.users with app-specific role info. Every authenticated dashboard user must have a row here to pass admin RLS checks.';

alter table public.profiles enable row level security;

-- A logged-in user can read their own profile row (needed for dashboard to check its own role)
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Helper function: returns true if the currently authenticated user has a row in profiles (i.e. is a recognized admin)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid()
  );
$$;
