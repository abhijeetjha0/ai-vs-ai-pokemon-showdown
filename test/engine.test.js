import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PokemonBattleEngine } from '../src/pokemon/engine.js';
import { evaluateBattlePosition } from '../src/pokemon/evaluator.js';
import { buildPlayerPromptContext, buildArbiterPromptContext } from '../src/pokemon/prompt-builder.js';
import { pickHeuristicChoice, evaluateOfflineArbiterVerdict } from '../src/api/mock.js';
import { ModelManager } from '../src/api/model-manager.js';
import { OllamaClient } from '../src/api/ollama.js';
import { OpenAiClient } from '../src/api/openai.js';
import { getBattleSpriteUrl, getRosterSpriteUrl, getDetailSpriteUrl, getCanonicalSpecies } from '../src/pokemon/sprites.js';

describe('PokemonBattleEngine Core Tests', () => {
  test('initializes and generates random teams', () => {
    const engine = new PokemonBattleEngine();
    engine.startBattle({ format: 'gen9randombattle' });
    const snapshot = engine.getSnapshot();

    assert.strictEqual(snapshot.turn, 1);
    assert.strictEqual(snapshot.format, 'gen9randombattle');
    assert.strictEqual(snapshot.winner, null);
    assert.strictEqual(snapshot.isGameOver, false);
    assert.strictEqual(snapshot.p1.team.length, 6);
    assert.strictEqual(snapshot.p2.team.length, 6);
  });

  test('extracts legal actions for players', async () => {
    const engine = new PokemonBattleEngine();
    engine.startBattle({ format: 'gen9randombattle' });

    // Allow event loop to process initial request
    await new Promise(r => setTimeout(r, 80));

    const p1Actions = engine.getLegalActions('p1');
    const p2Actions = engine.getLegalActions('p2');

    assert.ok(p1Actions.moves.length > 0 || p1Actions.switches.length > 0);
    assert.ok(p2Actions.moves.length > 0 || p2Actions.switches.length > 0);
  });
});

describe('Match Advantage Evaluator Tests', () => {
  test('returns 50% on even starting position', () => {
    const mirrorTeam = `Pikachu @ Light Ball\nAbility: Static\n- Thunderbolt`;
    const engine = new PokemonBattleEngine();
    engine.startBattle({ format: 'gen9randombattle', p1CustomTeam: mirrorTeam, p2CustomTeam: mirrorTeam });
    const snapshot = engine.getSnapshot();
    const evalData = evaluateBattlePosition(snapshot);

    assert.strictEqual(evalData.p1WinChance, 50);
    assert.strictEqual(evalData.p2WinChance, 50);
    assert.strictEqual(evalData.p1WinChance + evalData.p2WinChance, 100);
  });

  test('returns 100% when player 1 wins', () => {
    const snapshot = {
      isGameOver: true,
      winner: 'p1',
      p1: { team: [] },
      p2: { team: [] }
    };
    const evalData = evaluateBattlePosition(snapshot);
    assert.strictEqual(evalData.p1WinChance, 100);
    assert.strictEqual(evalData.p2WinChance, 0);
  });
});

describe('Heuristic Engine & Arbiter Tests', () => {
  test('pickHeuristicChoice chooses a valid legal move', async () => {
    const engine = new PokemonBattleEngine();
    engine.startBattle({ format: 'gen9randombattle' });
    await new Promise(r => setTimeout(r, 80));

    const snapshot = engine.getSnapshot();
    const legalActions = engine.getLegalActions('p1');

    const choice = pickHeuristicChoice({
      slot: 'p1',
      modelId: 'engine-tactical',
      legalActions,
      snapshot
    });

    assert.ok(choice.type === 'move' || choice.type === 'switch');
    assert.ok(typeof choice.choice === 'number');
    assert.ok(choice.reasoning.length > 0);
  });

  test('offline arbiter evaluates proposed action', async () => {
    const engine = new PokemonBattleEngine();
    engine.startBattle({ format: 'gen9randombattle' });
    await new Promise(r => setTimeout(r, 80));

    const snapshot = engine.getSnapshot();
    const legalActions = engine.getLegalActions('p1');
    const proposed = { type: 'move', choice: 1, targetName: legalActions.moves[0]?.name || 'Move' };

    const verdict = evaluateOfflineArbiterVerdict({
      proposedAction: proposed,
      playerReasoning: 'Testing arbiter evaluation',
      legalActions,
      snapshot,
      playerSlot: 'p1'
    });

    assert.ok(verdict.grade);
    assert.ok(verdict.commentary);
    assert.ok(verdict.finalAction);
  });
});

describe('Model Manager JSON Parsing Tests', () => {
  test('parses clean JSON', () => {
    const mm = new ModelManager();
    const raw = '{"type":"move","choice":2,"reasoning":"Super effective hit"}';
    const parsed = mm.parseJsonFromResponse(raw);
    assert.strictEqual(parsed.type, 'move');
    assert.strictEqual(parsed.choice, 2);
  });

  test('strips markdown code blocks', () => {
    const mm = new ModelManager();
    const raw = '```json\n{"type":"switch","choice":3,"reasoning":"Defensive rotation"}\n```';
    const parsed = mm.parseJsonFromResponse(raw);
    assert.strictEqual(parsed.type, 'switch');
    assert.strictEqual(parsed.choice, 3);
  });

  test('extracts embedded JSON with preamble text', () => {
    const mm = new ModelManager();
    const raw = 'Here is my decision:\n{"type":"move","choice":1,"reasoning":"Fast KO"}';
    const parsed = mm.parseJsonFromResponse(raw);
    assert.strictEqual(parsed.type, 'move');
    assert.strictEqual(parsed.choice, 1);
  });
});

describe('Prompt Builder Tests', () => {
  test('builds valid player prompt context', async () => {
    const engine = new PokemonBattleEngine();
    engine.startBattle({ format: 'gen9randombattle' });
    await new Promise(r => setTimeout(r, 80));

    const snapshot = engine.getSnapshot();
    const legalActions = engine.getLegalActions('p1');

    const promptContext = buildPlayerPromptContext({
      slot: 'p1',
      snapshot,
      legalActions
    });

    assert.ok(promptContext.systemPrompt.includes('JSON OUTPUT FORMAT'));
    assert.ok(promptContext.userPrompt.includes('BATTLE STATE'));
  });

  test('builds valid arbiter prompt context', async () => {
    const engine = new PokemonBattleEngine();
    engine.startBattle({ format: 'gen9randombattle' });
    await new Promise(r => setTimeout(r, 80));

    const snapshot = engine.getSnapshot();
    const legalActions = engine.getLegalActions('p1');

    const arbiterContext = buildArbiterPromptContext({
      playerSlot: 'p1',
      proposedAction: { type: 'move', choice: 1, targetName: 'Tackle' },
      playerReasoning: 'Dealing damage',
      snapshot,
      legalActions
    });

    assert.ok(arbiterContext.systemPrompt.includes('GRADES'));
    assert.ok(arbiterContext.userPrompt.includes('ARBITER ADJUDICATION'));
  });
});

describe('Model Filtering & Functional Models Exclusion Tests', () => {
  test('OllamaClient.fetchModels excludes functional, embedding, and rerank models', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        models: [
          { name: 'llama3:8b', capabilities: ['completion', 'chat'] },
          { name: 'nomic-embed-text:latest', capabilities: ['embedding'] },
          { name: 'mistral-function-calling:latest', capabilities: ['completion', 'chat'] },
          { name: 'qwen-rerank:latest', capabilities: ['rerank'] },
          { name: 'decision-arbiter:latest', capabilities: ['decision'] }
        ]
      })
    });

    try {
      const res = await OllamaClient.fetchModels('http://localhost:11434');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.chatModels.length, 1);
      assert.strictEqual(res.chatModels[0].id, 'llama3:8b');
      // Verify functional model was completely excluded
      assert.ok(!res.chatModels.some(m => m.id.includes('function')));
      // Verify decision model
      assert.strictEqual(res.decisionModels.length, 1);
      assert.strictEqual(res.decisionModels[0].id, 'decision-arbiter:latest');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('OpenAiClient.fetchModels excludes functional, whisper, embedding, and rerank models and sets decisionModels to []', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        data: [
          { id: 'gpt-4o' },
          { id: 'text-embedding-3-small' },
          { id: 'whisper-1' },
          { id: 'gpt-3.5-turbo-function-call' },
          { id: 'dall-e-3' },
          { id: 'cohere-rerank-v3' }
        ]
      })
    });

    try {
      const res = await OpenAiClient.fetchModels({ baseUrl: 'https://api.openai.com/v1', apiKey: 'test' });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.models.length, 1);
      assert.strictEqual(res.models[0].id, 'gpt-4o');
      assert.ok(!res.models.some(m => m.id.includes('function')));
      assert.strictEqual(res.decisionModels.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Custom Teams & Teambuilder Presets Tests', () => {
  test('initializes battle with custom Showdown export team', async () => {
    const customP1 = `
Pikachu @ Light Ball
Ability: Static
Tera Type: Electric
- Thunderbolt
- Surf
- Volt Switch
- Grass Knot

Charizard @ Choice Specs
Ability: Blaze
Tera Type: Fire
- Flamethrower
- Air Slash
- Focus Blast
- Dragon Pulse
`;

    const engine = new PokemonBattleEngine();
    engine.startBattle({
      format: 'gen9randombattle',
      p1CustomTeam: customP1
    });

    const snapshot = engine.getSnapshot();
    assert.strictEqual(snapshot.customTeamsActive, true);
    assert.strictEqual(snapshot.p1.team.length, 2);
    assert.strictEqual(snapshot.p1.team[0].species, 'Pikachu');
    assert.strictEqual(snapshot.p1.team[1].species, 'Charizard');
  });

  test('all teambuilder presets import cleanly with 6 members', async () => {
    const { PRESET_TEAMS } = await import('../src/data/preset-teams.js');
    const { Teams } = await import('@pkmn/sim');

    assert.ok(PRESET_TEAMS.length >= 5);
    for (const preset of PRESET_TEAMS) {
      const parsed = Teams.import(preset.text);
      assert.strictEqual(parsed.length, 6, `Preset ${preset.name} must have 6 members`);
      assert.ok(parsed[0].species || parsed[0].name);
      assert.strictEqual(parsed[0].moves.length, 4);
    }
  });
});

describe('Roster Synchronization & Switch Integrity Tests', () => {
  test('findTeamMember matches regional variants and form prefixes', () => {
    const engine = new PokemonBattleEngine();
    const teamState = [
      { name: 'Scyther', species: 'Scyther' },
      { name: 'Weezing', species: 'Weezing-Galar' },
      { name: 'Tauros', species: 'Tauros-Paldea-Water' }
    ];

    const matchGalar = engine.findTeamMember(teamState, 'Weezing', 'Weezing-Galar');
    assert.strictEqual(matchGalar?.species, 'Weezing-Galar');

    const matchShort = engine.findTeamMember(teamState, 'Weezing');
    assert.strictEqual(matchShort?.species, 'Weezing-Galar');

    const matchTauros = engine.findTeamMember(teamState, 'Tauros-Paldea-Water');
    assert.strictEqual(matchTauros?.species, 'Tauros-Paldea-Water');
  });

  test('updateTeamFromRequest preserves roster order and does not auto-heal fainted lead', () => {
    const engine = new PokemonBattleEngine();
    engine.p1TeamState = [
      { name: 'Scyther', species: 'Scyther', hp: 0, maxhp: 250, hpPercent: 0, fainted: true, active: false },
      { name: 'Weezing', species: 'Weezing-Galar', hp: 221, maxhp: 221, hpPercent: 100, fainted: false, active: true }
    ];

    // Showdown sends request with active Pokemon (Weezing-Galar) re-ordered at index 0
    const showdownReq = {
      side: {
        pokemon: [
          { ident: 'p1: Weezing', details: 'Weezing-Galar, L82, M', condition: '221/221', active: true },
          { ident: 'p1: Scyther', details: 'Scyther, L80, M', condition: '0 fnt', active: false }
        ]
      }
    };

    engine.updateTeamFromRequest('p1', showdownReq);

    // Slot 0 MUST still be Scyther with 0 HP (NO AUTO-HEAL)
    assert.strictEqual(engine.p1TeamState[0].species, 'Scyther');
    assert.strictEqual(engine.p1TeamState[0].fainted, true);
    assert.strictEqual(engine.p1TeamState[0].hp, 0);

    // Slot 1 MUST still be Weezing-Galar with 221 HP and active: true
    assert.strictEqual(engine.p1TeamState[1].species, 'Weezing-Galar');
    assert.strictEqual(engine.p1TeamState[1].active, true);
    assert.strictEqual(engine.p1TeamState[1].hp, 221);
    assert.strictEqual(engine.p1Active, engine.p1TeamState[1]);
  });
});

describe('Alternate Forms & Pokemon Sprite Resolution Tests', () => {
  test('getCanonicalSpecies correctly resolves canonical form and base species', () => {
    const rotom = getCanonicalSpecies('Rotom-Wash');
    assert.strictEqual(rotom.canonical, 'Rotom-Wash');
    assert.strictEqual(rotom.baseSpecies, 'Rotom');

    const tauros = getCanonicalSpecies('Tauros-Paldea-Combat');
    assert.strictEqual(tauros.canonical, 'Tauros-Paldea-Combat');
    assert.strictEqual(tauros.baseSpecies, 'Tauros');

    const ogerpon = getCanonicalSpecies('Ogerpon-Wellspring, L50');
    assert.strictEqual(ogerpon.canonical, 'Ogerpon-Wellspring');
    assert.strictEqual(ogerpon.baseSpecies, 'Ogerpon');

    const nick = getCanonicalSpecies('Striker (Urshifu-Rapid-Strike)');
    assert.strictEqual(nick.canonical, 'Urshifu-Rapid-Strike');
    assert.strictEqual(nick.baseSpecies, 'Urshifu');
  });

  test('getBattleSpriteUrl resolves exact URLs for alternate forms and regional variants', () => {
    // Rotom forms
    assert.strictEqual(getBattleSpriteUrl('Rotom-Wash', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/rotom-wash.gif');
    assert.strictEqual(getBattleSpriteUrl('Rotom-Wash', 'back', 0), 'https://play.pokemonshowdown.com/sprites/ani-back/rotom-wash.gif');

    // Paldean forms
    assert.strictEqual(getBattleSpriteUrl('Tauros-Paldea-Combat', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/tauros-paldeacombat.gif');
    assert.strictEqual(getBattleSpriteUrl('Tauros-Paldea-Combat', 'back', 0), 'https://play.pokemonshowdown.com/sprites/ani-back/tauros-paldeacombat.gif');

    // Urshifu forms
    assert.strictEqual(getBattleSpriteUrl('Urshifu-Rapid-Strike', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/urshifu-rapidstrike.gif');

    // Gen 9 forms with Gen 5 sprites
    assert.strictEqual(getBattleSpriteUrl('Ogerpon-Wellspring', 'front', 0), 'https://play.pokemonshowdown.com/sprites/gen5/ogerpon-wellspring.png');
    assert.strictEqual(getBattleSpriteUrl('Ogerpon-Wellspring', 'back', 0), 'https://play.pokemonshowdown.com/sprites/gen5-back/ogerpon-wellspring.png');

    // Regional variants
    assert.strictEqual(getBattleSpriteUrl('Weezing-Galar', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/weezing-galar.gif');
    assert.strictEqual(getBattleSpriteUrl('Zoroark-Hisui', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/zoroark-hisui.gif');
    assert.strictEqual(getBattleSpriteUrl('Raichu-Alola', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/raichu-alola.gif');

    // Mega Evolutions & Primals
    assert.strictEqual(getBattleSpriteUrl('Charizard-Mega-Y', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/charizard-megay.gif');
    assert.strictEqual(getBattleSpriteUrl('Kyogre-Primal', 'front', 0), 'https://play.pokemonshowdown.com/sprites/ani/kyogre-primal.gif');
  });

  test('getBattleSpriteUrl fallback ladder handles missing stages gracefully', () => {
    // Stage 1 for back: falls back to front sprite
    assert.strictEqual(getBattleSpriteUrl('Rotom-Wash', 'back', 1), 'https://play.pokemonshowdown.com/sprites/ani/rotom-wash.gif');

    // Stage 2: Gen 5 static sprite
    assert.strictEqual(getBattleSpriteUrl('Rotom-Wash', 'front', 2), 'https://play.pokemonshowdown.com/sprites/gen5/rotom-wash.png');

    // Stage 3: Base species animated
    assert.strictEqual(getBattleSpriteUrl('Rotom-Wash', 'front', 3), 'https://play.pokemonshowdown.com/sprites/ani/rotom.gif');

    // Stage 4: Base species Gen 5 static
    assert.strictEqual(getBattleSpriteUrl('Rotom-Wash', 'front', 4), 'https://play.pokemonshowdown.com/sprites/gen5/rotom.png');

    // Stage 5: Dex Sugimori artwork
    assert.strictEqual(getBattleSpriteUrl('Rotom-Wash', 'front', 5), 'https://play.pokemonshowdown.com/sprites/dex/rotom.png');
  });

  test('getRosterSpriteUrl resolves crisp Gen 5 sprites for alternate forms', () => {
    assert.strictEqual(getRosterSpriteUrl('Rotom-Wash', 0), 'https://play.pokemonshowdown.com/sprites/gen5/rotom-wash.png');
    assert.strictEqual(getRosterSpriteUrl('Tauros-Paldea-Combat', 0), 'https://play.pokemonshowdown.com/sprites/gen5/tauros-paldeacombat.png');
    assert.strictEqual(getRosterSpriteUrl('Urshifu-Rapid-Strike', 0), 'https://play.pokemonshowdown.com/sprites/gen5/urshifu-rapidstrike.png');
    assert.strictEqual(getRosterSpriteUrl('Ogerpon-Wellspring', 0), 'https://play.pokemonshowdown.com/sprites/gen5/ogerpon-wellspring.png');
    assert.strictEqual(getRosterSpriteUrl('Weezing-Galar', 0), 'https://play.pokemonshowdown.com/sprites/gen5/weezing-galar.png');
    assert.strictEqual(getRosterSpriteUrl('Zoroark-Hisui', 0), 'https://play.pokemonshowdown.com/sprites/gen5/zoroark-hisui.png');
  });

  test('getDetailSpriteUrl resolves animated front and static fallbacks', () => {
    assert.strictEqual(getDetailSpriteUrl('Rotom-Wash', 0), 'https://play.pokemonshowdown.com/sprites/ani/rotom-wash.gif');
    assert.strictEqual(getDetailSpriteUrl('Rotom-Wash', 1), 'https://play.pokemonshowdown.com/sprites/gen5/rotom-wash.png');
    assert.strictEqual(getDetailSpriteUrl('Tauros-Paldea-Combat', 0), 'https://play.pokemonshowdown.com/sprites/ani/tauros-paldeacombat.gif');
    assert.strictEqual(getDetailSpriteUrl('Ogerpon-Wellspring', 0), 'https://play.pokemonshowdown.com/sprites/gen5/ogerpon-wellspring.png');
  });
});

describe('Ollama Decision Endpoint & Fast Reasoning Bypass Tests', () => {
  test('OllamaClient.decide sends state & questions to /v1/systemone', async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = null;
    let requestBody = null;

    globalThis.fetch = async (url, options) => {
      requestedUrl = url;
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          model: 'laya:421m-typed-decisions-mlx-fp16',
          answers: {
            evaluation: {
              type: 'choice',
              choice: 'best'
            }
          }
        })
      };
    };

    try {
      const res = await OllamaClient.decide({
        baseUrl: 'http://localhost:11434',
        model: 'laya:421m-typed-decisions-mlx-fp16',
        state: 'Trainer P1 Great Tusk vs Pikachu. Proposed Move 1 Earthquake.',
        questions: {
          evaluation: {
            type: 'choice',
            instructions: 'Evaluate move'
          }
        }
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(requestedUrl, '/ollama/v1/systemone');
      assert.strictEqual(requestBody.model, 'laya:421m-typed-decisions-mlx-fp16');
      assert.strictEqual(res.data.answers.evaluation.choice, 'best');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('ModelManager routes decision-capable models to OllamaClient.decide', async () => {
    const originalFetch = globalThis.fetch;
    let decided = false;

    globalThis.fetch = async (url, options) => {
      if (url.includes('/v1/systemone')) {
        decided = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: 'laya:421m-typed-decisions-mlx-fp16',
            answers: {
              evaluation: {
                type: 'choice',
                choice: 'good'
              }
            }
          })
        };
      }
      return { ok: false, status: 500 };
    };

    try {
      const mm = new ModelManager();
      mm.config.provider = 'ollama';
      mm.config.arbiterModel = 'laya:421m-typed-decisions-mlx-fp16';
      mm.decisionModels = [{ id: 'laya:421m-typed-decisions-mlx-fp16', capabilities: ['decision'] }];

      const verdict = await mm.requestArbiterVerdict({
        playerSlot: 'p1',
        proposedAction: { type: 'move', choice: 1, targetName: 'Earthquake' },
        playerReasoning: 'Super effective STAB attack against Electric type',
        snapshot: {
          turn: 1,
          p1: { name: 'Player 1', active: { species: 'Great Tusk', types: ['Ground', 'Fighting'], hpPercent: 100 } },
          p2: { name: 'Player 2', active: { species: 'Pikachu', types: ['Electric'], hpPercent: 100 } }
        },
        legalActions: { moves: [{ index: 1, name: 'Earthquake' }] }
      });

      assert.strictEqual(decided, true);
      assert.strictEqual(verdict.approved, true);
      assert.strictEqual(verdict.grade, 'Tactical Read');
      assert.ok(verdict.commentary.length > 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('OllamaClient.chat extracts thinking if content is empty', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        message: {
          content: '',
          thinking: '{"type":"move","choice":1,"targetName":"Earthquake"}'
        }
      })
    });

    try {
      const res = await OllamaClient.chat({
        model: 'qwen3.5:0.8b-mlx',
        messages: [{ role: 'user', content: 'test' }],
        fastThinking: false
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.content, '{"type":"move","choice":1,"targetName":"Earthquake"}');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

