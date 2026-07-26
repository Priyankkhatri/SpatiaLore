-- Migration 0012: Add supported_languages array column to public.tours

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS supported_languages text[] NOT NULL DEFAULT ARRAY['en'];

COMMENT ON COLUMN public.tours.supported_languages IS 'ISO 639-1 language codes this tour offers narration in, e.g. {en, hi, fr}. Admin-configurable; scripts table already supports per-language rows via its existing language_code column from Phase 0.1.';
