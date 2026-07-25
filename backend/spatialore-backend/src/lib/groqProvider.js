import OpenAI from 'openai';

/**
 * Fallback LLM Provider: Groq Cloud API (Free-tier llama-3.1-8b-instant)
 */
export async function generateWithGroq({ systemPrompt, userMessage }) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL_NAME || 'llama-3.1-8b-instant';

  if (!apiKey || apiKey === 'gsk_placeholder_key') {
    throw {
      type: 'groq_not_configured',
      message: 'Groq fallback not configured — GROQ_API_KEY missing in environment variables.',
    };
  }

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
    timeout: 20000,
  });

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 350,
    });

    const content = response.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw {
        type: 'invalid_response',
        message: 'Groq fallback returned an empty response.',
      };
    }

    return {
      content,
      llmProvider: 'groq-fallback',
      llmModel: model,
    };
  } catch (err) {
    if (err.type === 'groq_not_configured' || err.type === 'invalid_response') {
      throw err;
    }

    if (err.status === 429 || err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit')) {
      throw {
        type: 'rate_limited',
        message: 'The backup Groq provider is rate-limited — please wait a moment and try again.',
      };
    }

    if (err.name === 'APIConnectionTimeoutError' || err.message?.includes('timeout')) {
      throw {
        type: 'timeout',
        message: 'Groq fallback request timed out after 20 seconds.',
      };
    }

    throw {
      type: 'unknown',
      message: `Groq fallback failed: ${err.message || 'Unknown error'}`,
      rawError: err,
    };
  }
}
