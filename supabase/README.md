# Supabase Configuration & Database Schema for SpatiaLore

This folder contains the database schema migrations and seed data for the **SpatiaLore** mobile audio tour platform.

## Overview
- **Database Engine**: PostgreSQL with PostGIS extension for high-precision geospatial radius and geofence queries (`geography(Point, 4326)`).
- **Directory Structure**:
  - `migrations/`: Idempotent SQL migration files (numbered chronologically).
  - `seed/`: Initial seed data for development and testing.

## Running Migrations

### Prerequisites
Make sure you have Node.js and the Supabase CLI installed.

```bash
npm install -g supabase
```

### Option A: Local Supabase Development
1. Initialize local Supabase stack:
   ```bash
   supabase init
   ```
2. Start local Supabase containers (Docker required):
   ```bash
   supabase start
   ```
3. Apply migrations and seed data:
   ```bash
   supabase db reset
   ```

### Option B: Remote Supabase Dashboard (Hosted Project)
1. Link your local directory to your Supabase project:
   ```bash
   supabase login
   supabase link --project-ref <YOUR_SUPABASE_PROJECT_REF>
   ```
2. Push migrations to your hosted database:
   ```bash
   supabase db push
   ```
3. Alternatively, copy and execute the SQL files in order (`0001` through `0006`, followed by `seed/seed.sql`) directly via the **SQL Editor** in the [Supabase Dashboard](https://supabase.com/dashboard).

## PostGIS & Geospatial Note
All location fields in `public.pois` use PostGIS `geography(Point, 4326)`. This enables meter-based radius calculations (`ST_DWithin`, `ST_Distance`) natively without SRID coordinate transformations.
