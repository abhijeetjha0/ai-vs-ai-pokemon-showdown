/**
 * Dynamic Ollama Local Client for Pokémon Battle
 * Handles model discovery, structured JSON responses, and fast thinking mode
 */

export class OllamaClient {
  static getDefaultHost() {
    return 'http://localhost:11434';
  }

  /**
   * Fetches real models from local Ollama and categorizes by capabilities:
   * - chatModels: models capable of completion/chat
   * - decisionModels: models specifically capable of decision
   */
  static async fetchModels(baseUrl = OllamaClient.getDefaultHost()) {
    const urlsToTry = [
      '/ollama/api/tags', // Vite proxy
      baseUrl.replace(/\/+$/, '') + '/api/tags'
    ];

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!res.ok) continue;

        const data = await res.json();
        const rawModels = data.models || [];

        // 1. Chat models: must support 'completion' or 'chat', exclude embedding, functional & decision-only
        const chatModels = rawModels
          .filter(m => {
            const nameLower = (m.name || '').toLowerCase();
            if (nameLower.includes('embed')) return false;
            if (nameLower.includes('function')) return false;
            if (nameLower.includes('rerank')) return false;
            if (m.capabilities && Array.isArray(m.capabilities)) {
              const canChat = m.capabilities.includes('completion') || m.capabilities.includes('chat');
              if (!canChat) return false;
            }
            return true;
          })
          .map(m => {
            const isMlx = m.details?.runner === 'mlx' || (m.name || '').toLowerCase().includes('-mlx');
            return {
              id: m.name,
              name: m.name,
              size: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : '',
              capabilities: m.capabilities || ['completion'],
              isMlx,
              provider: 'ollama'
            };
          });

        // 2. Decision models: must have 'decision' capability or reasoning flag
        const decisionModels = rawModels
          .filter(m => {
            const caps = m.capabilities || m.details?.capabilities;
            if (Array.isArray(caps)) {
              return caps.includes('decision');
            }
            return false;
          })
          .map(m => {
            const isMlx = m.details?.runner === 'mlx' || (m.name || '').toLowerCase().includes('-mlx');
            return {
              id: m.name,
              name: m.name,
              size: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : '',
              capabilities: m.capabilities || ['decision'],
              isMlx,
              provider: 'ollama'
            };
          });

        return {
          success: true,
          chatModels,
          decisionModels,
          models: chatModels,
          endpointUsed: url
        };
      } catch (err) {
        // Continue to try direct baseUrl
      }
    }

    return {
      success: false,
      error: 'Cannot reach Ollama at ' + baseUrl + '. Make sure Ollama is running (`ollama serve`).',
      chatModels: [],
      decisionModels: [],
      models: []
    };
  }

  /**
   * Calls /api/chat with JSON format enforcement, fast reasoning token stripping,
   * and fallback to /api/generate if chat is unsupported.
   */
  static async chat({
    baseUrl = OllamaClient.getDefaultHost(),
    model,
    messages,
    format = 'json',
    fastThinking = true,
    options = {}
  }) {
    const urlsToTry = [
      '/ollama/api/chat',
      baseUrl.replace(/\/+$/, '') + '/api/chat'
    ];

    let lastError = null;
    const isMlx = options.isMlx || (model || '').toLowerCase().includes('-mlx');
    const shouldThink = options.think !== undefined ? Boolean(options.think) : !fastThinking;

    const payload = {
      model,
      messages,
      stream: false,
      think: shouldThink, // suppress verbose CoT thinking tokens when fastThinking is true
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.num_predict ?? 250,
        num_ctx: options.num_ctx ?? 2048
      }
    };

    if (format && !isMlx) {
      payload.format = format;
    }

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        let res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        // If rejected because model does not support thinking or format, retry immediately
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          if (errText.includes('does not support thinking') && payload.think !== undefined) {
            delete payload.think;
            res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
          } else if (errText.includes('format json not supported') && payload.format) {
            delete payload.format;
            res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
          } else if (errText.includes('does not support chat')) {
            // Attempt fallback to /api/generate
            const genUrl = url.replace(/\/chat$/, '/generate');
            const promptText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';
            res = await fetch(genUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                prompt: promptText,
                stream: false,
                format: payload.format,
                options: payload.options
              }),
              signal: controller.signal
            });
            if (res.ok) {
              clearTimeout(timeoutId);
              const genData = await res.json();
              const genContent = genData.response?.trim() || genData.thinking?.trim() || '';
              return { success: true, content: genContent, raw: genData };
            }
          }
        }

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Ollama returned status ${res.status}: ${errText}`);
        }

        const data = await res.json();
        let content = data.message?.content || '';

        // If content is empty but model provided thinking (e.g. reasoning token overflow), extract from thinking
        if (!content && data.message?.thinking) {
          content = data.message.thinking;
        }

        // If fastThinking is enabled, strip verbose <think> reasoning blocks if any leaked
        if (fastThinking && content.includes('<think>')) {
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        }

        return {
          success: true,
          content,
          raw: data
        };
      } catch (err) {
        lastError = err;
        // If Ollama explicitly returned 400 Bad Request, trying direct URL with identical payload will also fail
        if (err.message && err.message.includes('Ollama returned status 400')) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to call Ollama chat endpoint'
    };
  }

  /**
   * Calls native Ollama /v1/systemone decision endpoint for decision models
   */
  static async decide({
    baseUrl = OllamaClient.getDefaultHost(),
    model,
    state,
    questions,
    timeoutMs = 8000
  }) {
    const urlsToTry = [
      '/ollama/v1/systemone',
      baseUrl.replace(/\/+$/, '') + '/v1/systemone'
    ];

    const body = {
      model,
      state,
      questions
    };

    let lastError = null;

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Ollama decision error (${res.status}): ${errText || res.statusText}`);
        }

        const data = await res.json();
        return {
          success: true,
          data
        };
      } catch (err) {
        lastError = err;
        if (err.message && err.message.includes('Ollama decision error (400)')) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to call decision endpoint'
    };
  }
}
