/**
 * High-Level Narration Player & Script Resolver for SpatiaLore.
 * Consumes geofence trigger events, resolves script content from memory caches,
 * and orchestrates TTS playback while enforcing performance & latency constraints.
 */

import { speakAsync, stopSpeaking, pauseSpeaking, resumeSpeaking } from './ttsEngine';

/**
 * Latency Measurement & Performance Note (<1 Second Latency KPI):
 * The PRD specifies a <1 second latency target from geofence entry (emitTriggerEvent)
 * to audio playback initiation.
 * By checking hotScripts (Phase 4.4 prefetch buffer) first, zero network or SQLite
 * I/O is performed in the critical path. The remaining latency is solely the OS TTS engine's
 * startup time (~100-300ms on modern iOS/Android devices).
 *
 * @param {Object} params
 * @param {Object} params.poi - Triggered POI object
 * @param {Object} [params.hotScripts={}] - In-memory hot script cache from ActiveTourContext
 * @param {Array} [params.scripts=[]] - Full tour script array fallback
 * @returns {Promise<{ status: string, poi: Object, error?: any }>}
 */
export async function playNarrationForPoi({ poi, hotScripts = {}, scripts = [] }) {
  if (!poi || !poi.id) {
    return { status: 'error', poi, error: new Error('Invalid POI parameter') };
  }

  // 1. Fast Path: Lookup in prefetch-primed hotScripts memory map (Phase 4.4)
  let scriptText = hotScripts[poi.id];
  let lookupSource = 'hotScripts';

  // 2. Fallback Path: Lookup in full scripts array loaded at tour download
  if (!scriptText) {
    const matchingScript = scripts.find((s) => s.poi_id === poi.id);
    if (matchingScript && matchingScript.content) {
      scriptText = matchingScript.content;
      lookupSource = 'scripts_array';
    }
  }

  // 3. Script Missing Defense: POI triggered but no script generated
  if (!scriptText || scriptText.trim().length === 0) {
    console.warn(`⚠️ [Narration Player] No script text available for POI "${poi.name}" (${poi.id})`);
    return {
      status: 'no_script_available',
      poi,
    };
  }

  console.log(
    `🔊 [Narration Player] Starting playback for POI "${poi.name}" (Resolved via ${lookupSource}, length: ${scriptText.length} chars)`
  );

  try {
    // 4. Initiate on-device TTS audio playback
    await speakAsync(scriptText);

    console.log(`✅ [Narration Player] Finished playback for POI "${poi.name}"`);
    return {
      status: 'played',
      poi,
    };
  } catch (err) {
    console.error(`❌ [Narration Player] Playback failed for POI "${poi.name}":`, err);
    return {
      status: 'error',
      poi,
      error: err,
    };
  }
}

/**
 * Pauses active narration playback.
 */
export function pauseCurrentNarration() {
  pauseSpeaking();
}

/**
 * Resumes paused narration playback.
 */
export function resumeCurrentNarration() {
  return resumeSpeaking();
}

/**
 * Skips current narration playback.
 */
export function skipCurrentNarration() {
  stopSpeaking();
}

/**
 * Halts active narration playback.
 */
export function stopNarration() {
  stopSpeaking();
}
