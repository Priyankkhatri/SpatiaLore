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
 *
 * RATIONALE FOR EXPO-SQLITE OVER ASYNCSTORAGE:
 * AsyncStorage is a flat key-value store, unsuitable for querying structured spatial relationships.
 * SQLite allows indexing and performing fast, low-latency coordinate checks in Phase 4's
 * background geofencing loop without loading/scanning entire JSON blobs into memory per check.
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

      CREATE INDEX IF NOT EXISTS idx_cached_pois_tour_id ON cached_pois (tour_id);
    `);

    console.log('✅ SQLite local storage schema initialized successfully');
  } catch (err) {
    console.error('Error initializing SQLite schema:', err);
    throw err;
  }
}
