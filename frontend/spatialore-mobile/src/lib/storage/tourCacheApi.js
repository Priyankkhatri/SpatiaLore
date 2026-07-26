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
 * Loads cached POIs for a specific tour from SQLite without fetching scripts.
 */
export async function loadCachedPoisForTour(tourId) {
  try {
    const db = await getDb();
    const pois = await db.getAllAsync(
      `SELECT id, tour_id, name, category, lat, lng, trigger_radius_m, prefetch_radius_m, display_order
       FROM cached_pois WHERE tour_id = ? ORDER BY display_order ASC;`,
      [tourId]
    );
    return pois || [];
  } catch (err) {
    console.error('Error loading cached POIs from SQLite:', err);
    return [];
  }
}

/**
 * Loads a cached tour, its POIs, and scripts for a specific language from local SQLite.
 */
export async function loadCachedTour(tourId, languageCode = 'en') {
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
    const pois = await loadCachedPoisForTour(tourId);

    // 3. Query Scripts for these POIs matching target languageCode
    let scripts = [];
    if (pois && pois.length > 0) {
      const poiIds = pois.map((p) => p.id);
      const placeholders = poiIds.map(() => '?').join(',');
      scripts = await db.getAllAsync(
        `SELECT poi_id, content, language_code, word_count FROM cached_scripts WHERE poi_id IN (${placeholders}) AND language_code = ?;`,
        [...poiIds, languageCode]
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
 * Marks a POI as triggered in SQLite for a tour session (idempotent).
 */
export async function markPoiTriggered(tourId, poiId) {
  try {
    const db = await getDb();
    const triggeredAt = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO poi_trigger_state (poi_id, tour_id, triggered_at) VALUES (?, ?, ?);`,
      [poiId, tourId, triggeredAt]
    );
    return true;
  } catch (err) {
    console.error('Error marking POI triggered in SQLite:', err);
    return false;
  }
}

/**
 * Returns an array of POI IDs that have already been triggered for this tour session.
 */
export async function getTriggeredPoiIds(tourId) {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT poi_id FROM poi_trigger_state WHERE tour_id = ?;`,
      [tourId]
    );
    return rows ? rows.map((r) => r.poi_id) : [];
  } catch (err) {
    console.error('Error getting triggered POI IDs:', err);
    return [];
  }
}

/**
 * Clears all persistent trigger history for a tour session (called when restarting a tour).
 */
export async function clearTriggerStateForTour(tourId) {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM poi_trigger_state WHERE tour_id = ?;`, [tourId]);
    console.log(`🧹 Cleared trigger state for tour ID ${tourId}`);
    return true;
  } catch (err) {
    console.error('Error clearing trigger state:', err);
    return false;
  }
}

/**
 * Marks a POI as prefetched in SQLite for a tour session (idempotent).
 */
export async function markPoiPrefetched(tourId, poiId) {
  try {
    const db = await getDb();
    const prefetchedAt = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO poi_prefetch_state (poi_id, tour_id, prefetched_at) VALUES (?, ?, ?);`,
      [poiId, tourId, prefetchedAt]
    );
    return true;
  } catch (err) {
    console.error('Error marking POI prefetched in SQLite:', err);
    return false;
  }
}

/**
 * Returns an array of POI IDs that have already been prefetched for this tour session.
 */
export async function getPrefetchedPoiIds(tourId) {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT poi_id FROM poi_prefetch_state WHERE tour_id = ?;`,
      [tourId]
    );
    return rows ? rows.map((r) => r.poi_id) : [];
  } catch (err) {
    console.error('Error getting prefetched POI IDs:', err);
    return [];
  }
}

/**
 * Clears all persistent prefetch history for a tour session (called when restarting a tour).
 */
export async function clearPrefetchStateForTour(tourId) {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM poi_prefetch_state WHERE tour_id = ?;`, [tourId]);
    console.log(`🧹 Cleared prefetch state for tour ID ${tourId}`);
    return true;
  } catch (err) {
    console.error('Error clearing prefetch state:', err);
    return false;
  }
}

/**
 * Clears both persistent trigger and prefetch history for a tour session (called when restarting a tour).
 */
export async function clearTourSessionState(tourId) {
  await clearTriggerStateForTour(tourId);
  await clearPrefetchStateForTour(tourId);
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
    return { data: null, error: null };
  }
}

/**
 * Removes a specific tour and its associated POIs/scripts/trigger/prefetch-state from SQLite.
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
      await db.runAsync(`DELETE FROM poi_trigger_state WHERE tour_id = ?;`, [tourId]);
      await db.runAsync(`DELETE FROM poi_prefetch_state WHERE tour_id = ?;`, [tourId]);
      await db.runAsync(`DELETE FROM cached_pois WHERE tour_id = ?;`, [tourId]);
      await db.runAsync(`DELETE FROM cached_tours WHERE id = ?;`, [tourId]);
    });

    return { data: true, error: null };
  } catch (err) {
    console.error('Error clearing tour cache from SQLite:', err);
    return { data: null, error: err };
  }
}

/**
 * Diagnostic integrity check for SQLite tour cache data.
 * Scope note: Checks structural validity (required non-null fields, valid coordinates)
 * rather than detecting missing optional scripts.
 *
 * @param {string} tourId - Tour ID to verify
 * @returns {Promise<{ isValid: boolean, issues: string[] }>}
 */
export async function verifyTourCacheIntegrity(tourId) {
  const issues = [];
  try {
    const db = await getDb();

    // 1. Verify Tour record
    const tour = await db.getFirstAsync(
      `SELECT id, name FROM cached_tours WHERE id = ?;`,
      [tourId]
    );
    if (!tour) {
      issues.push('Tour metadata record missing from local SQLite cache.');
      return { isValid: false, issues };
    }

    // 2. Verify POIs
    const pois = await db.getAllAsync(
      `SELECT id, name, lat, lng, trigger_radius_m FROM cached_pois WHERE tour_id = ?;`,
      [tourId]
    );

    if (!pois || pois.length === 0) {
      issues.push('No Points of Interest (POIs) cached for this tour.');
      return { isValid: false, issues };
    }

    // 3. Verify POI fields
    for (const poi of pois) {
      if (
        typeof poi.lat !== 'number' ||
        typeof poi.lng !== 'number' ||
        isNaN(poi.lat) ||
        isNaN(poi.lng) ||
        !poi.trigger_radius_m
      ) {
        issues.push(`POI "${poi.name || poi.id}" has corrupted latitude, longitude, or trigger radius.`);
      }
    }

    // 4. Verify Script entries
    const poiIds = pois.map((p) => p.id);
    const placeholders = poiIds.map(() => '?').join(',');
    const scripts = await db.getAllAsync(
      `SELECT poi_id, content FROM cached_scripts WHERE poi_id IN (${placeholders});`,
      poiIds
    );

    if (!scripts || scripts.length === 0) {
      issues.push('No narration scripts found for any POIs in local SQLite storage.');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  } catch (err) {
    console.error('Error verifying tour cache integrity:', err);
    return {
      isValid: false,
      issues: [`Database inspection error: ${err.message}`],
    };
  }
}
