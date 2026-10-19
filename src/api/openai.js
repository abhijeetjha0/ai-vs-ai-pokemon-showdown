/**
 * OpenAI-Compatible API Client for Pokémon Battle
 * Supports OpenAI, Groq, DeepSeek, OpenRouter, and LocalAI
 */

export class OpenAiClient {
  static async fetchModels({ baseUrl = 'https://api.openai.com/v1', apiKey = '' }) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBase}/models`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const headers = { 'Accept': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, error: `Server returned status ${res.status}` };
      }

      const data = await res.json();
      const rawList = data.data || data.models || [];
      const models = rawList
        .filter(m => {
          const id = (m.id || m.name || '').toLowerCase();
          // Filter out whisper, embedding, tts, dall-e, moderation, and functional-calling specific models
          return !id.includes('whisper') &&
                 !id.includes('embedding') &&
                 !id.includes('tts') &&
                 !id.includes('dall-e') &&
                 !id.includes('moderation') &&
                 !id.includes('function') &&
                 !id.includes('rerank');
        })
        .map(m => ({
          id: m.id || m.name,
          name: m.id || m.name,
          provider: 'openai'
        }));

      return {
        success: true,
        models,
        chatModels: models,
        decisionModels: []
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to fetch models from OpenAI endpoint' };
    }
  }

  static async chat({
    baseUrl = 'https://api.openai.com/v1',
    apiKey = '',
    model,
    messages,
    temperature = 0.7,
    maxTokens = 200
  }) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const url = `${cleanBase}/chat/completions`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const body = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI endpoint returned ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        success: true,
        content
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to call OpenAI chat completion'
      };
    }
  }
}
