/**
 * Model Manager: Coordinates AI Players (P1/P2) and the Strategy Arbiter
 * Supports Local Ollama, OpenAI-compatible APIs, and the Offline Heuristic Engine
 */

import { OllamaClient } from './ollama.js';
import { OpenAiClient } from './openai.js';
import { OFFLINE_MODELS, OFFLINE_ARBITERS, pickHeuristicChoice, evaluateOfflineArbiterVerdict } from './mock.js';
import { buildPlayerPromptContext, buildArbiterPromptContext } from '../pokemon/prompt-builder.js';

const STORAGE_KEY = 'ai_poke_battle_config_v1';

export class ModelManager {
  constructor() {
    this.config = this.loadConfig();
    this.chatModels = [];
    this.decisionModels = [];
    this.ollamaConnected = false;
  }

  getDefaultConfig() {
    return {
      provider: 'ollama', // 'ollama' | 'openai' | 'offline'
      ollamaBaseUrl: 'http://localhost:11434',
      openaiBaseUrl: 'https://api.openai.com/v1',
      openaiApiKey: '',
      p1Model: '',
      p2Model: '',
      arbiterModel: '',
      temperature: 0.7,
      fastThinking: true, // suppresses verbose CoT tokens in Ollama
      turnDelay: 2000, // pause delay between turns in Automated mode (ms)
      maxTokens: 200
    };
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...this.getDefaultConfig(), ...JSON.parse(saved) };
      }
    } catch (e) {}
    return this.getDefaultConfig();
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {}
  }

  /**
   * Refreshes real models from active provider
   */
  async refreshAvailableModels() {
    if (this.config.provider === 'ollama') {
      const res = await OllamaClient.fetchModels(this.config.ollamaBaseUrl);
      if (res.success && res.chatModels.length > 0) {
        this.chatModels = res.chatModels || [];
        this.decisionModels = res.decisionModels || [];
        this.ollamaConnected = true;

        const chatNames = this.chatModels.map(m => m.id);
        if (!chatNames.includes(this.config.p1Model)) {
          this.config.p1Model = chatNames[0] || '';
        }
        if (!chatNames.includes(this.config.p2Model)) {
          this.config.p2Model = chatNames.length > 1 ? chatNames[1] : (chatNames[0] || '');
        }

        const decisionNames = this.decisionModels.map(m => m.id);
        if (decisionNames.length === 0) {
          this.config.arbiterModel = '';
        } else if (!decisionNames.includes(this.config.arbiterModel)) {
          this.config.arbiterModel = decisionNames[0];
        }

        this.saveConfig(this.config);
        return {
          success: true,
          chatModels: this.chatModels,
          decisionModels: this.decisionModels,
          provider: 'ollama'
        };
      } else {
        // Fall back to offline provider when Ollama is unreachable
        this.ollamaConnected = false;
        this.chatModels = OFFLINE_MODELS;
        this.decisionModels = OFFLINE_ARBITERS;
        this.config.p1Model = OFFLINE_MODELS[0].id;
        this.config.p2Model = OFFLINE_MODELS[1].id;
        this.config.arbiterModel = OFFLINE_ARBITERS[0].id;
        this.saveConfig(this.config);

        return {
          success: false,
          error: res.error || 'Ollama offline, fallback to Offline Engine',
          chatModels: OFFLINE_MODELS,
          decisionModels: OFFLINE_ARBITERS,
          provider: 'offline'
        };
      }
    }

    if (this.config.provider === 'openai') {
      const res = await OpenAiClient.fetchModels({
        baseUrl: this.config.openaiBaseUrl,
        apiKey: this.config.openaiApiKey
      });
      if (res.success && res.models.length > 0) {
        this.chatModels = res.models;
        this.decisionModels = []; // OpenAI models are completion/chat
        const names = res.models.map(m => m.id);
        if (!names.includes(this.config.p1Model)) this.config.p1Model = names[0];
        if (!names.includes(this.config.p2Model)) this.config.p2Model = names.length > 1 ? names[1] : names[0];
        this.config.arbiterModel = '';
        this.saveConfig(this.config);
        return { success: true, chatModels: res.models, decisionModels: [], models: res.models, provider: 'openai' };
      } else {
        return { success: false, error: res.error || 'No models returned from OpenAI endpoint', chatModels: [], decisionModels: [], models: [], provider: 'openai' };
      }
    }

    // Offline provider
    this.chatModels = OFFLINE_MODELS;
    this.decisionModels = OFFLINE_ARBITERS;
    this.config.p1Model = OFFLINE_MODELS[0].id;
    this.config.p2Model = OFFLINE_MODELS[1].id;
    this.config.arbiterModel = OFFLINE_ARBITERS[0].id;
    return { success: true, chatModels: OFFLINE_MODELS, decisionModels: OFFLINE_ARBITERS, provider: 'offline' };
  }

  parseJsonFromResponse(rawText) {
    if (!rawText) return null;
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    try {
      return JSON.parse(clean);
    } catch (e) {
      const first = clean.indexOf('{');
      const last = clean.lastIndexOf('}');
      if (first !== -1 && last > first) {
        try {
          return JSON.parse(clean.slice(first, last + 1));
        } catch (e2) {}
      }
      return null;
    }
  }

  /**
   * Request player move or switch from selected model
   */
  async requestPlayerAction({
    slot,
    snapshot,
    legalActions,
    recentLog = []
  }) {
    const isP1 = slot === 'p1';
    const modelId = isP1 ? this.config.p1Model : this.config.p2Model;

    // Check if offline model
    const isOffline = this.config.provider === 'offline' || modelId?.startsWith('engine-');
    if (isOffline) {
      return pickHeuristicChoice({ slot, modelId, legalActions, snapshot });
    }

    const { systemPrompt, userPrompt } = buildPlayerPromptContext({
      slot,
      snapshot,
      legalActions,
      recentLog
    });

    try {
      let rawContent = '';

      if (this.config.provider === 'ollama') {
        const res = await OllamaClient.chat({
          baseUrl: this.config.ollamaBaseUrl,
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          fastThinking: this.config.fastThinking,
          options: {
            temperature: this.config.temperature,
            num_predict: Math.max(250, this.config.maxTokens || 250)
          }
        });
        if (!res.success) throw new Error(res.error);
        rawContent = res.content;
      } else if (this.config.provider === 'openai') {
        const res = await OpenAiClient.chat({
          baseUrl: this.config.openaiBaseUrl,
          apiKey: this.config.openaiApiKey,
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        });
        if (!res.success) throw new Error(res.error);
        rawContent = res.content;
      }

      const parsed = this.parseJsonFromResponse(rawContent);
      if (parsed && (parsed.type === 'move' || parsed.type === 'switch') && typeof parsed.choice === 'number') {
        // Validate choice index exists in legal actions
        const isValidMove = parsed.type === 'move' && legalActions.moves.some(m => m.index === parsed.choice);
        const isValidSwitch = parsed.type === 'switch' && legalActions.switches.some(s => s.index === parsed.choice);

        if (isValidMove || isValidSwitch) {
          const moveObj = parsed.type === 'move' ? legalActions.moves.find(m => m.index === parsed.choice) : null;
          const switchObj = parsed.type === 'switch' ? legalActions.switches.find(s => s.index === parsed.choice) : null;
          const fallbackTarget = moveObj?.name || switchObj?.species || switchObj?.name || '';
          return {
            type: parsed.type,
            choice: parsed.choice,
            targetName: parsed.targetName || fallbackTarget,
            terastallize: Boolean(parsed.terastallize && legalActions.canTerastallize),
            reasoning: parsed.reasoning || 'Executed strategy according to battle plan.'
          };
        }
      }

      console.warn(`[ModelManager] AI returned invalid action JSON for ${modelId}:`, rawContent);
    } catch (err) {
      console.warn(`[ModelManager] Failed to query model ${modelId}:`, err.message);
    }

    // Graceful fallback to heuristic choice
    return pickHeuristicChoice({ slot, modelId: 'engine-tactical', legalActions, snapshot });
  }

  /**
   * Request Decision Model adjudication
   */
  async requestArbiterVerdict({
    playerSlot,
    proposedAction,
    playerReasoning,
    snapshot,
    legalActions
  }) {
    const arbiterId = this.config.arbiterModel;
    const isOffline = this.config.provider === 'offline' || arbiterId?.startsWith('engine-') || !arbiterId;

    if (isOffline) {
      return evaluateOfflineArbiterVerdict({
        proposedAction,
        playerReasoning,
        legalActions,
        snapshot,
        playerSlot
      });
    }

    // 1. Check if model is a native decision model (e.g. laya:421m-typed-decisions-mlx-fp16)
    const isDecisionModel = this.decisionModels.some(m => m.id === arbiterId);
    if (isDecisionModel && this.config.provider === 'ollama') {
      try {
        const isP1 = playerSlot === 'p1';
        const player = isP1 ? snapshot.p1 : snapshot.p2;
        const opponent = isP1 ? snapshot.p2 : snapshot.p1;
        const myPoke = player.active || player.team?.[0];
        const oppPoke = opponent.active || opponent.team?.[0];

        const stateText = `Trainer ${isP1 ? 'P1' : 'P2'} (${myPoke?.species || 'Pokemon'}, ${myPoke?.types?.join('/') || ''}, ${myPoke?.hpPercent ?? 100}% HP) vs Opponent (${oppPoke?.species || 'Pokemon'}, ${oppPoke?.types?.join('/') || ''}, ${oppPoke?.hpPercent ?? 100}% HP). Proposed: ${proposedAction.type?.toUpperCase()} [${proposedAction.choice}] (${proposedAction.targetName || ''}). Analysis: ${playerReasoning || 'None'}.`;

        const decisionRes = await OllamaClient.decide({
          baseUrl: this.config.ollamaBaseUrl,
          model: arbiterId,
          state: stateText,
          questions: {
            evaluation: {
              type: 'choice',
              instructions: 'Evaluate the Pokémon battle play',
              criteria: {
                best: 'Best move securing tactical advantage',
                good: 'Good move maintaining pressure',
                inaccuracy: 'Suboptimal move with minor flaw',
                blunder: 'Blunder exposing weakness or immunity'
              }
            }
          },
          timeoutMs: 6000
        });

        if (decisionRes.success) {
          const outcome = decisionRes.data?.answers?.evaluation?.choice || decisionRes.data?.answers?.evaluation || 'good';
          const gradeMap = {
            best: 'Best Move',
            good: 'Tactical Read',
            inaccuracy: 'Inaccuracy',
            blunder: 'Blunder'
          };
          const grade = gradeMap[outcome] || 'Best Move';
          const commentaryMap = {
            'Best Move': 'Optimal play maximizing positional and tactical damage.',
            'Tactical Read': 'Smart proactive play maintaining tempo and pressure.',
            'Inaccuracy': 'Suboptimal move choice; a safer damage option was available.',
            'Blunder': 'High-risk mistake exposing defensive weakness or attacking into resistance.'
          };

          return {
            approved: outcome !== 'blunder',
            finalAction: proposedAction,
            grade,
            commentary: commentaryMap[grade] || 'Evaluated play according to battle dynamics.'
          };
        }
      } catch (err) {
        console.warn(`[ModelManager] Decision model query failed for ${arbiterId}:`, err.message);
      }
    }

    // 2. Chat / Completion LLM Arbiter Prompt
    const { systemPrompt, userPrompt } = buildArbiterPromptContext({
      playerSlot,
      proposedAction,
      playerReasoning,
      snapshot,
      legalActions
    });

    try {
      let rawContent = '';

      if (this.config.provider === 'ollama') {
        const res = await OllamaClient.chat({
          baseUrl: this.config.ollamaBaseUrl,
          model: arbiterId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          fastThinking: this.config.fastThinking,
          options: {
            temperature: 0.3,
            num_predict: Math.max(250, this.config.maxTokens || 250)
          }
        });
        if (res.success) rawContent = res.content;
      } else if (this.config.provider === 'openai') {
        const res = await OpenAiClient.chat({
          baseUrl: this.config.openaiBaseUrl,
          apiKey: this.config.openaiApiKey,
          model: arbiterId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          maxTokens: this.config.maxTokens
        });
        if (res.success) rawContent = res.content;
      }

      const parsed = this.parseJsonFromResponse(rawContent);
      if (parsed && typeof parsed.grade === 'string') {
        const finalAction = parsed.finalAction || proposedAction;
        return {
          approved: parsed.approved !== false,
          finalAction,
          grade: parsed.grade || 'Best Move',
          commentary: parsed.commentary || 'Solid play keeping the pressure on the opponent.'
        };
      }
    } catch (err) {
      console.warn(`[ModelManager] Arbiter query failed for ${arbiterId}:`, err.message);
    }

    return evaluateOfflineArbiterVerdict({
      proposedAction,
      playerReasoning,
      legalActions,
      snapshot,
      playerSlot
    });
  }
}
