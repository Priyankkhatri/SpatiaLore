import OpenAI from 'openai';

/**
 * Primary LLM Provider: Self-Hosted OpenAI-Compatible Endpoint (vLLM / Ollama)
 */
export async function generateWithSelfHosted({ systemPrompt, userMessage }) {
  const baseURL = process.env.LLM_BASE_URL || 'http://localhost:8000/v1';
  const apiKey = process.env.LLM_API_KEY || 'not-needed-for-local';
  const model = process.env.LLM_MODEL_NAME || 'llama-3-8b-instruct';

  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout: 20000, // 20s timeout for fast primary attempt before fallback
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
        message: 'Self-hosted LLM returned an empty or invalid response payload.',
      };
    }

    return {
      content,
      llmProvider: 'self-hosted',
      llmModel: model,
    };
  } catch (err) {
    // Standardize typed error
    if (err.type === 'invalid_response') {
      throw err;
    }

    const code = err.code || err.cause?.code;
    const msg = err.message || '';

    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
      throw {
        type: 'connection_refused',
        message: `Self-hosted LLM server connection refused at ${baseURL}`,
      };
    }

    if (err.name === 'APIConnectionTimeoutError' || code === 'ETIMEDOUT' || msg.includes('timeout')) {
      throw {
        type: 'timeout',
        message: 'Self-hosted LLM server request timed out after 20 seconds.',
      };
    }

    throw {
      type: 'unknown',
      message: `Self-hosted LLM failed: ${msg}`,
      rawError: err,
    };
  }
}
