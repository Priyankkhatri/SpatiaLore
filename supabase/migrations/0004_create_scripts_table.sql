create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  poi_id uuid not null references public.pois(id) on delete cascade,
  language_code text not null default 'en', -- future multilingual support
  content text not null, -- the LLM-generated narrative text, consumed by on-device TTS
  llm_provider text, -- e.g. 'gemini-1.5-flash', 'groq-llama-3'
  llm_model text,
  generation_prompt text, -- store the prompt used, for regeneration/audit
  word_count integer,
  is_current boolean not null default true, -- allows versioning; only one current script per poi+language
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.scripts is 'LLM-generated narration text per POI, generated once at admin setup time and persisted. Never generated at runtime.';

create index if not exists idx_scripts_poi_id on public.scripts (poi_id);
create index if not exists idx_scripts_poi_lang_current on public.scripts (poi_id, language_code) where is_current = true;

-- Ensure only one "current" script per POI/language combination
create unique index if not exists uq_scripts_current_per_poi_lang
  on public.scripts (poi_id, language_code)
  where is_current = true;
