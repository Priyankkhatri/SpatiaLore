import * as SQLite from 'expo-sqlite';

let dbInstance = null;

/**
 * Lazily opens and memoizes the single SQLite database connection.
 */
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('spatialore.db');
  }
  return dbInstance;
}

/**
 * Initializes local SQLite tables and indexes.
 */
export async function initSchema() {
  try {
    const db = await getDb();

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_tours (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        city TEXT,
        country TEXT,
        downloaded_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cached_pois (
        id TEXT PRIMARY KEY,
        tour_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        trigger_radius_m INTEGER NOT NULL,
        prefetch_radius_m INTEGER NOT NULL,
        display_order INTEGER
      );

      CREATE TABLE IF NOT EXISTS cached_scripts (
        poi_id TEXT NOT NULL,
        language_code TEXT NOT NULL DEFAULT 'en',
        content TEXT NOT NULL,
        word_count INTEGER,
        PRIMARY KEY (poi_id, language_code)
      );

      CREATE TABLE IF NOT EXISTS poi_trigger_state (
        poi_id TEXT PRIMARY KEY,
        tour_id TEXT NOT NULL,
        triggered_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS poi_prefetch_state (
        poi_id TEXT PRIMARY KEY,
        tour_id TEXT NOT NULL,
        prefetched_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS analytics_queue (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        tour_id TEXT,
        poi_id TEXT,
        session_id TEXT NOT NULL,
        value_numeric REAL,
        metadata TEXT,
        created_at_client TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_cached_pois_tour_id ON cached_pois (tour_id);
      CREATE INDEX IF NOT EXISTS idx_poi_trigger_state_tour_id ON poi_trigger_state (tour_id);
      CREATE INDEX IF NOT EXISTS idx_poi_prefetch_state_tour_id ON poi_prefetch_state (tour_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_queue_synced ON analytics_queue (synced);
    `);

    console.log('✅ SQLite local storage schema, state & analytics tables initialized');
  } catch (err) {
    console.error('Error initializing SQLite schema:', err);
    throw err;
  }
}
