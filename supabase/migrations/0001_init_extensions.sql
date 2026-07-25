-- Enable PostGIS for geospatial POI storage and radius queries
create extension if not exists postgis;

-- Enable pgcrypto for UUID generation
create extension if not exists pgcrypto;
