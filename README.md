# SpatiaLore — Zero-Hardware, Screen-Free Mobile Audio Tour Guide

SpatiaLore is an offline-first, zero-recurring-cost mobile audio tour guide platform for tourism. A traveler selects a tour, puts their phone in their pocket, and listens to location-triggered audio stories automatically as they physically walk near Points of Interest (POIs).

## Project Structure

```text
/SpatiaLore
├── /frontend           # Web Admin Dashboard (Vite + React) & Traveler Mobile App (React Native)
├── /backend            # Node.js/Express service for aggregate analytics ingestion
├── /supabase           # PostgreSQL + PostGIS database migrations, seed data, and RLS policies
│   ├── /migrations     # Chronological SQL migration files (0001 - 0011)
│   ├── /seed           # Sample tour & POI seed data
│   └── README.md       # Database setup guide & API Key strategy
├── .env.example        # Environment variable placeholders
├── .gitignore          # Root git exclusion rules
└── README.md           # Project documentation
```

## System Architecture

- **Admin Dashboard** (`/frontend/dashboard`): Vite + React web application for tourism boards to curate tours, map OpenStreetMap POIs, set trigger radiuses, and generate narration scripts ahead of time using free-tier LLMs.
- **Traveler Mobile App** (`/frontend/mobile` or `/mobile`): React Native mobile app utilizing background GPS + Pedestrian Dead Reckoning (PDR) for offline geofence triggering and on-device native Text-To-Speech (`react-native-tts`) playback.
- **Backend Service** (`/backend`): Lightweight Express API layer for ingesting anonymous, aggregate-only analytics events post-tour.
- **Database** (`/supabase`): Supabase PostgreSQL with PostGIS (`geography(Point, 4326)`) for spatial radius queries and strict Row-Level Security (RLS).

## Key Technical Rules

1. **Zero Recurring Cost**: All audio narration text is generated once ahead of time and persisted in Supabase. On-device TTS handles playback without cloud audio hosting or runtime LLM calls.
2. **JavaScript / JSX ONLY**: Strictly no TypeScript or `.tsx` files across web, mobile, and backend codebases.
3. **Strict Privacy (GDPR Compliance)**: Zero server-side user location tracking or PII storage. All analytics are ephemeral, client-generated session aggregates.

## Database & Setup

Refer to [`/supabase/README.md`](./supabase/README.md) for database migration instructions, PostGIS details, and RLS API Key strategy.
