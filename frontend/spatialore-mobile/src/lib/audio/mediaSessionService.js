/**
 * Media Session & OS Hardware Control Bridge for SpatiaLore.
 *
 * Dual-Library Architecture Note:
 * react-native-tts (Phase 5.1) performs the actual on-device speech synthesis and audio playback.
 * react-native-track-player is used strictly as a lightweight Media Session / Now-Playing metadata bridge.
 * It registers OS capabilities (Play/Pause/SkipToNext) so physical headphone buttons, smartwatches,
 * and lock-screen widgets trigger SpatiaLore narration controls without playing separate audio files.
 */

import TrackPlayer, {
  Capability,
  Event,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

let isPlayerSetup = false;
let eventSubscriptions = [];

/**
 * Configures the OS media session, registers hardware button event listeners, and sets capabilities.
 *
 * @param {Object} params
 * @param {Function} params.onPlay - Callback when user presses Play hardware button / lockscreen control
 * @param {Function} params.onPause - Callback when user presses Pause hardware button / lockscreen control
 * @param {Function} params.onSkip - Callback when user presses Skip/Next hardware button / lockscreen control
 * @returns {Promise<boolean>} True if setup succeeded
 */
export async function setupMediaSession({ onPlay, onPause, onSkip } = {}) {
  try {
    if (!isPlayerSetup) {
      await TrackPlayer.setupPlayer({
        autoHandleAudioEvents: false,
      });

      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndClearNotification,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
      });

      isPlayerSetup = true;
      console.log('✅ OS Media Session player initialized');
    }

    // Clear existing event subscriptions before registering new callbacks
    teardownListeners();

    if (typeof onPlay === 'function') {
      const subPlay = TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('🎧 [Hardware Control] RemotePlay event received from headphones/lockscreen');
        onPlay();
      });
      eventSubscriptions.push(subPlay);
    }

    if (typeof onPause === 'function') {
      const subPause = TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('🎧 [Hardware Control] RemotePause event received from headphones/lockscreen');
        onPause();
      });
      eventSubscriptions.push(subPause);
    }

    if (typeof onSkip === 'function') {
      const subSkip = TrackPlayer.addEventListener(Event.RemoteNext, () => {
        console.log('🎧 [Hardware Control] RemoteNext/Skip event received from headphones/lockscreen');
        onSkip();
      });
      eventSubscriptions.push(subSkip);
    }

    return true;
  } catch (err) {
    console.warn('Media session setup notice (using fallbacks if un-prebuilt):', err?.message || err);
    return false;
  }
}

/**
 * Updates the lock-screen & OS notification "Now Playing" metadata.
 *
 * @param {Object} params
 * @param {string} params.title - POI name (e.g., "Amber Fort - Sun Gate")
 * @param {string} params.artist - Tour name (e.g., "Jaipur Heritage Walk")
 */
export async function updateNowPlayingMetadata({ title, artist }) {
  if (!isPlayerSetup) return;

  try {
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: 'spatialore_current_poi',
      url: 'silence.mp3', // Placeholder for metadata display without playing actual file
      title: title || 'SpatiaLore Audio Guide',
      artist: artist || 'Offline Mobile Tour',
      album: 'SpatiaLore Tour',
      duration: 60,
    });
    await TrackPlayer.play();
  } catch (err) {
    // Non-critical metadata update failure
  }
}

/**
 * Unsubscribes event listeners.
 */
function teardownListeners() {
  eventSubscriptions.forEach((sub) => {
    if (sub && typeof sub.remove === 'function') {
      sub.remove();
    }
  });
  eventSubscriptions = [];
}

/**
 * Resets the media session state on tour exit.
 */
export async function teardownMediaSession() {
  teardownListeners();
  if (isPlayerSetup) {
    try {
      await TrackPlayer.reset();
    } catch (err) {
      // Ignore
    }
  }
}
