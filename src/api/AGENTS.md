# API Integration Guidelines: `src/api/`

## Scope
This directory manages LLM provider connections (Local Ollama, OpenAI-compatible APIs, and the fallback Offline Heuristic Engine) for Player 1, Player 2, and the Strategy Arbiter.

## Modules
- `model-manager.js`: Central state & communication coordinator for all model requests. Separates chat models from decision-capable models.
- `ollama.js`: Fetches local Ollama models, enforces fast reasoning suppression (sub-2s turns), and parses structured JSON outputs.
- `openai.js`: Connects to OpenAI-compatible endpoints with custom base URLs and API keys.
- `mock.js`: Offline heuristic battle engine (Tactical Battler, Positional Battler, and Offline Strategy Arbiter) that requires zero network or API keys.

## Key Rules
1. **Never crash on LLM errors**: If an LLM returns non-JSON or fails to respond, gracefully fall back to the offline heuristic engine with a clear console notification.
2. **Decision Model Filtering**: Middle decision models must strictly be tagged with `decision` capabilities (`caps.includes('decision')`). OpenAI models are chat/completion only, so `decisionModels` is empty for OpenAI.
3. **No Functional Models Support**: Exclude whisper, embedding, tts, dall-e, moderation, rerank, and functional-calling specific models (`function` in model name) from player and arbiter model selection, matching the Chess Game implementation.
4. **Persist User Preferences**: Store endpoint URLs, selected model IDs, and turn delay preferences in `localStorage` (`ai_poke_battle_config_v1`).
