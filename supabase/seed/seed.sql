insert into public.tours (id, name, description, city, country, is_published)
values (
  '11111111-1111-1111-1111-111111111111',
  'Jaipur Heritage Walk',
  'A curated audio walk through Jaipur''s iconic forts and palaces.',
  'Jaipur', 'India', true
);

insert into public.pois (id, tour_id, name, description, category, location, trigger_radius_m, prefetch_radius_m, is_active)
values
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Amber Fort',
  'A majestic hilltop fort overlooking Maota Lake.',
  'fort',
  ST_SetSRID(ST_MakePoint(75.8513, 26.9855), 4326)::geography,
  40, 120, true
),
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Hawa Mahal',
  'The iconic Palace of Winds with its honeycomb facade.',
  'landmark',
  ST_SetSRID(ST_MakePoint(75.8267, 26.9239), 4326)::geography,
  30, 100, true
);

insert into public.scripts (poi_id, language_code, content, llm_provider, is_current)
values
(
  '22222222-2222-2222-2222-222222222222',
  'en',
  'Placeholder narration for Amber Fort — to be replaced by LLM-generated content in Phase 1.5.',
  'manual-seed',
  true
),
(
  '33333333-3333-3333-3333-333333333333',
  'en',
  'Placeholder narration for Hawa Mahal — to be replaced by LLM-generated content in Phase 1.5.',
  'manual-seed',
  true
);
