-- Anonymous/authenticated clients can INSERT analytics events, nothing else
create policy "analytics_public_insert_only"
on public.analytics_events
for insert
to anon, authenticated
with check (
  -- Guard against PII/location leakage at the DB layer as a defense-in-depth measure
  metadata is null
  or (
    not (metadata ? 'latitude')
    and not (metadata ? 'longitude')
    and not (metadata ? 'device_id')
    and not (metadata ? 'user_email')
  )
);

-- No select/update/delete policy is created for anon/authenticated on analytics_events.
-- This means: RLS enabled + no matching policy = access denied by default for those operations.
-- Only service_role (which bypasses RLS) can read this table — reserved for a future authenticated admin analytics view.
