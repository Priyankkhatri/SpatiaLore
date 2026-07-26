/**
 * Battery Drain Diagnostic Utility for SpatiaLore Mobile.
 * Measures real-device battery percentage consumption during active tour sessions.
 */

import * as Battery from 'expo-battery';

let startBatteryLevel = null;

/**
 * Retrieves the current device battery level (0.0 to 1.0 float).
 * Returns null if battery information is unavailable or running on a simulator/emulator.
 *
 * @returns {Promise<number|null>} Battery level float or null
 */
export async function getBatteryLevel() {
  try {
    const isAvailable = await Battery.isAvailableAsync();
    if (!isAvailable) {
      return null;
    }

    const level = await Battery.getBatteryLevelAsync();
    // Simulators and unsupported hardware often return -1 or invalid floats
    if (typeof level !== 'number' || level < 0 || level > 1) {
      return null;
    }

    return level;
  } catch (err) {
    console.warn('Error reading device battery level:', err?.message || err);
    return null;
  }
}

/**
 * Captures and stores the baseline battery level at tour start.
 */
export async function recordBatteryLevelAtTourStart() {
  startBatteryLevel = await getBatteryLevel();
  if (startBatteryLevel !== null) {
    console.log(
      `🔋 [Battery Monitor] Baseline battery level captured: ${(startBatteryLevel * 100).toFixed(1)}%`
    );
  } else {
    console.log('🔋 [Battery Monitor] Battery measurement unavailable in this environment.');
  }
}

/**
 * Calculates net battery percentage drained since tour start.
 *
 * @returns {Promise<{ drainPercent: number|null, startLevel: number|null, endLevel: number|null }>}
 */
export async function getBatteryDrainSinceTourStart() {
  if (startBatteryLevel === null) {
    return { drainPercent: null, startLevel: null, endLevel: null };
  }

  const endLevel = await getBatteryLevel();
  if (endLevel === null) {
    return { drainPercent: null, startLevel: startBatteryLevel, endLevel: null };
  }

  // Compute raw battery percentage points drained
  const drainDecimal = startBatteryLevel - endLevel;
  const drainPercent = Math.max(0, drainDecimal * 100);

  return {
    drainPercent: Number(drainPercent.toFixed(2)),
    startLevel: startBatteryLevel,
    endLevel,
  };
}
