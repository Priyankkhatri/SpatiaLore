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
        poi_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        language_code TEXT NOT NULL,
        word_count INTEGER
      );

      CREATE TABLE IF NOT EXISTS poi_trigger_state (
        poi_id TEXT PRIMARY KEY,
        tour_id TEXT NOT NULL,
        triggered_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cached_pois_tour_id ON cached_pois (tour_id);
      CREATE INDEX IF NOT EXISTS idx_poi_trigger_state_tour_id ON poi_trigger_state (tour_id);
    `);

    console.log('✅ SQLite local storage schema & trigger state table initialized');
  } catch (err) {
    console.error('Error initializing SQLite schema:', err);
    throw err;
  }
}
