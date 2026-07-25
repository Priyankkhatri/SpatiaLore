import { getDb } from './db';
import { poiToLatLng } from '../poisApi';

/**
 * Saves/updates a tour, its POIs, and audio scripts in local SQLite.
 * Uses flattened lat/lng columns so geofence checks avoid parsing GeoJSON at runtime.
 */
export async function saveTourToCache({ tour, pois = [], scripts = [] }) {
  try {
    const db = await getDb();
    const downloadedAt = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Upsert Tour row
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_tours (id, name, description, city, country, downloaded_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          tour.id,
          tour.name,
          tour.description || null,
          tour.city || null,
          tour.country || null,
          downloadedAt,
        ]
      );

      // 2. Clean slate for POIs and Scripts associated with this tour
      // Select existing POI IDs for script deletion
      const existingPois = await db.getAllAsync(
        `SELECT id FROM cached_pois WHERE tour_id = ?;`,
        [tour.id]
      );
      if (existingPois && existingPois.length > 0) {
        const poiIds = existingPois.map((p) => p.id);
        const placeholders = poiIds.map(() => '?').join(',');
        await db.runAsync(
          `DELETE FROM cached_scripts WHERE poi_id IN (${placeholders});`,
          poiIds
        );
      }

      await db.runAsync(`DELETE FROM cached_pois WHERE tour_id = ?;`, [tour.id]);

      // 3. Insert POIs with flattened coordinates
      for (const poi of pois) {
        const coords = poiToLatLng(poi);
        await db.runAsync(
          `INSERT INTO cached_pois (id, tour_id, name, category, lat, lng, trigger_radius_m, prefetch_radius_m, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            poi.id,
            tour.id,
            poi.name,
            poi.category || 'landmark',
            coords.lat,
            coords.lng,
            poi.trigger_radius_m || 30,
            poi.prefetch_radius_m || 100,
            poi.display_order || 0,
          ]
        );
      }

      // 4. Insert Scripts
      for (const script of scripts) {
        await db.runAsync(
          `INSERT OR REPLACE INTO cached_scripts (poi_id, content, language_code, word_count)
           VALUES (?, ?, ?, ?);`,
          [
            script.poi_id,
            script.content,
            script.language_code || 'en',
            script.word_count || 0,
          ]
        );
      }
    });

    console.log(`✅ Successfully cached tour "${tour.name}" in SQLite`);
    return { data: true, error: null };
  } catch (err) {
    console.error('Error saving tour to SQLite cache:', err);
    return { data: null, error: err };
  }
}

/**
 * Loads a cached tour, its POIs, and scripts from local SQLite.
 */
export async function loadCachedTour(tourId) {
  try {
    const db = await getDb();

    // 1. Query Tour
    const tour = await db.getFirstAsync(
      `SELECT id, name, description, city, country, downloaded_at FROM cached_tours WHERE id = ?;`,
      [tourId]
    );

    if (!tour) {
      return { data: null, error: null };
    }

    // 2. Query POIs
    const pois = await db.getAllAsync(
      `SELECT id, tour_id, name, category, lat, lng, trigger_radius_m, prefetch_radius_m, display_order
       FROM cached_pois WHERE tour_id = ? ORDER BY display_order ASC;`,
      [tourId]
    );

    // 3. Query Scripts for these POIs
    let scripts = [];
    if (pois && pois.length > 0) {
      const poiIds = pois.map((p) => p.id);
      const placeholders = poiIds.map(() => '?').join(',');
      scripts = await db.getAllAsync(
        `SELECT poi_id, content, language_code, word_count FROM cached_scripts WHERE poi_id IN (${placeholders});`,
        poiIds
      );
    }

    return {
      data: {
        tour,
        pois: pois || [],
        scripts: scripts || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Error loading cached tour from SQLite:', err);
    return { data: null, error: err };
  }
}

/**
 * Retrieves the single most-recently downloaded tour from local SQLite.
 */
export async function getMostRecentCachedTour() {
  try {
    const db = await getDb();
    const recent = await db.getFirstAsync(
      `SELECT id FROM cached_tours ORDER BY downloaded_at DESC LIMIT 1;`
    );

    if (!recent) {
      return { data: null, error: null };
    }

    return await loadCachedTour(recent.id);
  } catch (err) {
    console.error('Error fetching most recent cached tour:', err);
    return { data: null, error: err };
  }
}

/**
 * Removes a specific tour and its associated POIs/scripts from SQLite.
 */
export async function clearTourCache(tourId) {
  try {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      const pois = await db.getAllAsync(
        `SELECT id FROM cached_pois WHERE tour_id = ?;`,
        [tourId]
      );
      if (pois && pois.length > 0) {
        const poiIds = pois.map((p) => p.id);
        const placeholders = poiIds.map(() => '?').join(',');
        await db.runAsync(
          `DELETE FROM cached_scripts WHERE poi_id IN (${placeholders});`,
          poiIds
        );
      }
      await db.runAsync(`DELETE FROM cached_pois WHERE tour_id = ?;`, [tourId]);
      await db.runAsync(`DELETE FROM cached_tours WHERE id = ?;`, [tourId]);
    });

    return { data: true, error: null };
  } catch (err) {
    console.error('Error clearing tour cache from SQLite:', err);
    return { data: null, error: err };
  }
}
