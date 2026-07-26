import { generateWithSelfHosted } from './selfHostedProvider.js';
import { generateWithGroq } from './groqProvider.js';

export const BASE_SYSTEM_PROMPT = `You are a professional audio-tour scriptwriter, writing narration to be read aloud by a voice actor for a walking tour. Write in second person, present tense, as if the listener is standing at this location right now. Use sensory, evocative language — sounds, light, texture, atmosphere — not just historical facts. Open with a hook that draws the listener's attention to something immediate and physical. Keep pacing natural for spoken delivery: short-to-medium sentences, no run-ons. Absolutely no markdown, no headers, no bullet points, no stage directions in brackets — output ONLY the spoken narration text itself, nothing else. Target 120-180 words.`;

export const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
};

/**
 * Strips markdown artifacts (asterisks, hashtags, bullet points, bracketed directions)
 * to ensure pure clean spoken audio narration for on-device TTS.
 */
function cleanNarrationText(text) {
  if (!text) return '';
  return text
    .replace(/\[.*?\]/g, '') // remove stage directions in brackets [Pause], [Music]
    .replace(/\(.*?\)/g, '') // remove directions in parentheses
    .replace(/[#*`_~]/g, '') // remove markdown symbols
    .replace(/^[•\-\*]\s+/gm, '') // remove leading bullet points
    .replace(/\s+/g, ' ') // collapse multi-spaces
    .trim();
}

/**
 * Primary & Fallback LLM Orchestrator
 */
export async function generateNarrationScript({ poiName, category, city, country, languageCode = 'en' }) {
  const targetLanguageName = LANGUAGE_NAMES[languageCode] || 'English';
  
  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (languageCode !== 'en' && targetLanguageName !== 'English') {
    systemPrompt += ` Write the narration entirely in ${targetLanguageName}, not English, unless the target language IS English.`;
  }

  const userMessage = `Location: ${poiName}, a ${category} in ${city}, ${country}. Language: ${targetLanguageName}. Write the narration.`;

  let selfHostedError = null;
  let result = null;

  // 1. Try Primary: Self-Hosted LLM
  try {
    result = await generateWithSelfHosted({
      systemPrompt,
      userMessage,
    });
  } catch (err) {
    selfHostedError = err;
    const isConnectionOrTimeout =
      err.type === 'connection_refused' || err.type === 'timeout';

    if (!isConnectionOrTimeout) {
      // Do not fall back automatically for validation/malformed errors from primary
      throw err;
    }

    console.warn(
      'Self-hosted LLM unavailable, falling back to Groq:',
      err.message
    );
  }

  // 2. Try Fallback: Groq Cloud API if primary failed due to timeout/connection
  if (!result) {
    try {
      result = await generateWithGroq({
        systemPrompt,
        userMessage,
      });
    } catch (groqError) {
      console.error('Groq fallback also failed:', groqError.message);
      throw {
        type: 'both_providers_failed',
        message:
          'Both the self-hosted model and the Groq fallback failed to generate a script.',
        selfHostedError,
        groqError,
      };
    }
  }

  const cleanedContent = cleanNarrationText(result.content);

  return {
    content: cleanedContent,
    llmProvider: result.llmProvider, // 'self-hosted' | 'groq-fallback'
    llmModel: result.llmModel,
    generationPrompt: userMessage,
  };
}
