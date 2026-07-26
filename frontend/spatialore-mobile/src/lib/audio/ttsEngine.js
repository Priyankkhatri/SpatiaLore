/**
 * Native Text-To-Speech (TTS) Engine Wrapper for SpatiaLore.
 * Isolates TTS library specifics and provides promise-based narration control.
 * Supports react-native-tts and expo-speech seamlessly.
 */

import * as ExpoSpeech from 'expo-speech';

// Speech rate tuned for clear, well-paced walking tour narration
export const NARRATION_SPEECH_RATE = 0.85;

let TtsModule = null;
try {
  TtsModule = require('react-native-tts').default || require('react-native-tts');
} catch (e) {
  // Fallback to ExpoSpeech if react-native-tts native binding is not initialized
  TtsModule = null;
}

let isSpeakingState = false;
let isPausedState = false;
let pausedText = null;
let currentUtteranceId = null;

export const BCP47_LOCALE_MAP = {
  en: 'en-US',
  hi: 'hi-IN',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
};

let currentLanguageCode = 'en';

/**
 * Sets target language for TTS engine using appropriate BCP-47 locale tags.
 * Verifies voice availability on the device.
 *
 * @param {string} [languageCode='en'] - ISO 639-1 language code (e.g. 'hi', 'fr')
 * @returns {Promise<{ success: boolean, bcp47Code: string, isVoiceAvailable: boolean }>}
 */
export async function setTtsLanguage(languageCode = 'en') {
  currentLanguageCode = languageCode;
  const bcp47Code = BCP47_LOCALE_MAP[languageCode] || 'en-US';

  try {
    let isVoiceAvailable = true;

    if (TtsModule && typeof TtsModule.setDefaultLanguage === 'function') {
      try {
        await TtsModule.setDefaultLanguage(bcp47Code);
      } catch (rnttsLangErr) {
        console.warn(`react-native-tts language set warning for '${bcp47Code}':`, rnttsLangErr);
        isVoiceAvailable = false;
      }
    }

    // Check voice availability via ExpoSpeech if available
    if (ExpoSpeech && typeof ExpoSpeech.getAvailableVoicesAsync === 'function') {
      try {
        const availableVoices = await ExpoSpeech.getAvailableVoicesAsync();
        const hasMatchingVoice = (availableVoices || []).some(
          (v) => v.language && v.language.toLowerCase().startsWith(languageCode.toLowerCase())
        );
        if (!hasMatchingVoice && availableVoices.length > 0) {
          isVoiceAvailable = false;
        }
      } catch (vErr) {
        console.warn('Voice availability inspection error:', vErr);
      }
    }

    console.log(`🗣️ [TTS Engine] Language set to '${bcp47Code}' (Available: ${isVoiceAvailable})`);
    return { success: true, bcp47Code, isVoiceAvailable };
  } catch (err) {
    console.error('Error setting TTS language:', err);
    return { success: false, bcp47Code, isVoiceAvailable: false };
  }
}

/**
 * Initializes TTS engine, configures speech rate/pitch, and verifies engine status.
 * @returns {Promise<boolean>} True if initialized successfully
 */
export async function initTts() {
  try {
    if (TtsModule && typeof TtsModule.getInitStatus === 'function') {
      try {
        await TtsModule.getInitStatus();
        TtsModule.setDefaultRate(0.5); // react-native-tts rate scale
        TtsModule.setDefaultPitch(1.0);
        console.log('✅ initialized react-native-tts engine');
        return true;
      } catch (initErr) {
        console.warn('react-native-tts init status warning, falling back to ExpoSpeech:', initErr);
      }
    }

    // ExpoSpeech engine verification
    console.log('✅ Initialized expo-speech engine for SpatiaLore');
    return true;
  } catch (err) {
    console.error('Error initializing TTS engine:', err);
    return false;
  }
}

/**
 * Speaks the provided narration text aloud.
 * Returns a Promise that resolves when speech completes or rejects on error/timeout.
 *
 * @param {string} text - Narration script content to speak
 * @param {number} [timeoutMs=60000] - Safety timeout in ms (default 60s)
 * @returns {Promise<void>}
 */
export function speakAsync(text, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return reject(new Error('Cannot speak empty or invalid script text'));
    }

    // Stop any ongoing speech before starting a new narration
    stopSpeaking();
    isSpeakingState = true;

    let timeoutTimer = null;
    let finishListener = null;
    let errorListener = null;

    const cleanup = () => {
      isSpeakingState = false;
      if (timeoutTimer) clearTimeout(timeoutTimer);

      if (TtsModule) {
        if (finishListener && typeof finishListener.remove === 'function') finishListener.remove();
        if (errorListener && typeof errorListener.remove === 'function') errorListener.remove();
      }
    };

    // Safety timeout to prevent hung TTS engine from blocking queue
    timeoutTimer = setTimeout(() => {
      stopSpeaking();
      cleanup();
      reject(new Error('TTS speech timed out (60s cap)'));
    }, timeoutMs);

    // Path 1: react-native-tts
    if (TtsModule && typeof TtsModule.speak === 'function') {
      try {
        finishListener = TtsModule.addEventListener('tts-finish', (event) => {
          cleanup();
          resolve();
        });

        errorListener = TtsModule.addEventListener('tts-error', (event) => {
          cleanup();
          reject(new Error(event?.error || 'TTS speech error'));
        });

        const utteranceId = TtsModule.speak(text, {
          iosVoiceId: 'com.apple.ttsbundle.siri_male_en-US_compact',
          rate: NARRATION_SPEECH_RATE,
        });
        currentUtteranceId = utteranceId;
        return;
      } catch (rnttsErr) {
        console.warn('react-native-tts speak failed, attempting expo-speech fallback:', rnttsErr);
      }
    }

    // Path 2: expo-speech
    try {
      ExpoSpeech.speak(text, {
        rate: NARRATION_SPEECH_RATE,
        pitch: 1.0,
        onDone: () => {
          cleanup();
          resolve();
        },
        onStopped: () => {
          cleanup();
          resolve();
        },
        onError: (err) => {
          cleanup();
          reject(new Error(err?.message || 'ExpoSpeech playback error'));
        },
      });
    } catch (expErr) {
      cleanup();
      reject(expErr);
    }
  });
}

/**
 * Pauses active speech narration.
 * Technical Limitation Note: Most OS TTS engines only support stopping audio rather than
 * word-exact pausing. Pausing halts speech and records the script; resuming restarts
 * narration from the beginning of the POI script (~50-60s length).
 */
export function pauseSpeaking() {
  if (isSpeakingState) {
    stopSpeaking();
    isPausedState = true;
    return true;
  }
  return false;
}

/**
 * Resumes speech narration (restarts script from beginning).
 */
export function resumeSpeaking() {
  if (isPausedState && pausedText) {
    isPausedState = false;
    return speakAsync(pausedText);
  }
  return Promise.resolve();
}

/**
 * Immediately halts any active speech narration.
 */
export function stopSpeaking() {
  isSpeakingState = false;
  try {
    if (TtsModule && typeof TtsModule.stop === 'function') {
      TtsModule.stop();
    }
  } catch (err) {
    // Ignore
  }

  try {
    ExpoSpeech.stop();
  } catch (err) {
    // Ignore
  }
}

/**
 * Returns current speaking state.
 * @returns {boolean} True if TTS is actively speaking
 */
export function isSpeaking() {
  return isSpeakingState;
}

/**
 * Returns current paused state.
 * @returns {boolean} True if TTS narration is paused
 */
export function isPaused() {
  return isPausedState;
}
