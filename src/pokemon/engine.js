/**
 * Pokémon Showdown Battle Engine
 * Wraps @pkmn/sim and @pkmn/randoms to run Gen 9 Random Battles in the browser
 */

import { BattleStreams, Teams, Dex } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';

// Initialize TeamGenerators factory
try {
  Teams.setGeneratorFactory(TeamGenerators);
} catch (e) {
  console.warn('[Engine] Generator factory already set or failed:', e);
}

export class PokemonBattleEngine {
  constructor() {
    this.streams = null;
    this.format = 'gen9randombattle';
    this.p1Name = 'Trainer 1';
    this.p2Name = 'Trainer 2';
    this.p1Team = null;
    this.p2Team = null;

    this.turn = 1;
    this.winner = null;
    this.isGameOver = false;

    this.p1Request = null;
    this.p2Request = null;

    this.p1PendingChoice = null;
    this.p2PendingChoice = null;

    this.p1Active = null;
    this.p2Active = null;
    this.p1TeamState = [];
    this.p2TeamState = [];

    this.weather = 'none';
    this.terrain = 'none';
    this.p1Hazards = [];
    this.p2Hazards = [];

    this.log = [];
    this.listeners = new Set();
    this.logListeners = new Set();

    // Turn pacing & visual move action tracking
    this.activeMoveAction = null;
    this.pacingDelay = 350; // ms per animation step (0 for instant execution in tests)
    this.actionQueue = [];
    this.isProcessingQueue = false;
    this.turnWaitResolvers = [];
    this.readyResolvers = [];
    this.isReady = false;
    this.isDestroyed = false;
    this.abortController = null;
  }

  setPacingDelay(delayMs) {
    this.pacingDelay = Math.max(0, delayMs);
  }

  delay(ms) {
    if (ms <= 0 || this.isDestroyed) return Promise.resolve();
    return new Promise((resolve) => {
      const signal = this.abortController?.signal;
      if (signal?.aborted) return resolve();
      let timer = null;
      const onAbort = () => {
        if (timer) clearTimeout(timer);
        resolve();
      };
      timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  destroy() {
    this.isDestroyed = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.actionQueue = [];
    this.isProcessingQueue = false;
    this.activeMoveAction = null;

    const waitResolvers = [...this.turnWaitResolvers];
    this.turnWaitResolvers = [];
    waitResolvers.forEach(r => r());

    const readyResolvers = [...this.readyResolvers];
    this.readyResolvers = [];
    readyResolvers.forEach(r => r());

    if (this.streams) {
      try {
        if (this.streams.p1?.destroy) this.streams.p1.destroy();
        if (this.streams.p2?.destroy) this.streams.p2.destroy();
        if (this.streams.omniscient?.destroy) this.streams.omniscient.destroy();
      } catch (e) {}
      this.streams = null;
    }
  }

  markReady() {
    if (!this.isReady) {
      this.isReady = true;
      const resolvers = [...this.readyResolvers];
      this.readyResolvers = [];
      resolvers.forEach(r => r());
    }
  }

  waitForReady(timeoutMs = 8000) {
    if (this.isReady && !this.isProcessingQueue) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let timer = null;
      const resolver = () => {
        if (timer) clearTimeout(timer);
        resolve();
      };
      timer = setTimeout(() => {
        const idx = this.readyResolvers.indexOf(resolver);
        if (idx !== -1) this.readyResolvers.splice(idx, 1);
        resolve();
      }, timeoutMs);
      this.readyResolvers.push(resolver);
    });
  }

  findTeamMember(teamState, identOrSpecies, rawSpecies) {
    if (!teamState || teamState.length === 0) return null;
    const cleanIdent = (identOrSpecies || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSpec = (rawSpecies || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Exact match on species or name
    let found = teamState.find(p => {
      const s = (p.species || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const n = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (cleanSpec && (s === cleanSpec || n === cleanSpec)) ||
             (cleanIdent && (s === cleanIdent || n === cleanIdent));
    });
    if (found) return found;

    // 2. Prefix / substring match for regional/form variations (e.g. Weezing-Galar vs Weezing)
    found = teamState.find(p => {
      const s = (p.species || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const n = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (cleanIdent && (s.startsWith(cleanIdent) || cleanIdent.startsWith(s) || n.startsWith(cleanIdent) || cleanIdent.startsWith(n))) ||
             (cleanSpec && (s.startsWith(cleanSpec) || cleanSpec.startsWith(s) || n.startsWith(cleanSpec) || cleanSpec.startsWith(n)));
    });
    return found || null;
  }

  updateTeamMember(slot, pokeName, updates) {
    const teamState = slot === 'p1' ? this.p1TeamState : this.p2TeamState;
    if (!teamState || teamState.length === 0) return;
    let member = this.findTeamMember(teamState, pokeName);
    if (!member) {
      member = teamState.find(p => p.active);
    }
    if (member) {
      Object.assign(member, updates);
    }
  }

  onStateChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onLogEvent(fn) {
    this.logListeners.add(fn);
    return () => this.logListeners.delete(fn);
  }

  notifyState() {
    for (const fn of this.listeners) {
      try {
        fn(this.getSnapshot());
      } catch (err) {
        console.error('[Engine] Error in state listener:', err);
      }
    }
  }

  notifyLog(entry) {
    for (const fn of this.logListeners) {
      try {
        fn(entry);
      } catch (err) {
        console.error('[Engine] Error in log listener:', err);
      }
    }
  }

  waitForTurnComplete(timeoutMs = 12000) {
    if (!this.isProcessingQueue && this.actionQueue.length === 0) {
      const p1NeedsChoice = Boolean(this.p1Request && !this.p1Request.wait);
      const p2NeedsChoice = Boolean(this.p2Request && !this.p2Request.wait);
      if (this.isGameOver || p1NeedsChoice || p2NeedsChoice) {
        return Promise.resolve();
      }
    }

    return new Promise((resolve) => {
      let timer = null;
      const resolver = () => {
        if (timer) clearTimeout(timer);
        resolve();
      };
      timer = setTimeout(() => {
        const idx = this.turnWaitResolvers.indexOf(resolver);
        if (idx !== -1) this.turnWaitResolvers.splice(idx, 1);
        resolve();
      }, timeoutMs);

      this.turnWaitResolvers.push(resolver);
    });
  }

  notifyTurnWaitersIfReady() {
    if (this.actionQueue.length === 0 && !this.isProcessingQueue) {
      if (this.turn >= 1 && this.p1Active && this.p2Active) {
        this.markReady();
      }
      const p1Needs = Boolean(this.p1Request && !this.p1Request.wait);
      const p2Needs = Boolean(this.p2Request && !this.p2Request.wait);
      if (this.isGameOver || p1Needs || p2Needs) {
        const resolvers = [...this.turnWaitResolvers];
        this.turnWaitResolvers = [];
        resolvers.forEach(r => r());
      }
    }
  }

  /**
   * Start or restart a battle
   */
  startBattle({
    format = 'gen9randombattle',
    p1Name = 'Trainer 1',
    p2Name = 'Trainer 2',
    p1CustomTeam = null,
    p2CustomTeam = null
  } = {}) {
    // Tear down and cancel any in-flight battle tasks
    this.destroy();
    this.isDestroyed = false;
    this.abortController = new AbortController();

    this.format = format;
    this.p1Name = p1Name;
    this.p2Name = p2Name;
    this.p1CustomTeam = p1CustomTeam;
    this.p2CustomTeam = p2CustomTeam;

    this.battleId = (this.battleId || 0) + 1;
    const currentBattleId = this.battleId;

    this.turn = 1;
    this.winner = null;
    this.isGameOver = false;
    this.isReady = false;

    this.activeMoveAction = null;
    this.actionQueue = [];
    this.isProcessingQueue = false;
    this.turnWaitResolvers = [];
    this.readyResolvers = [];

    this.p1Request = null;
    this.p2Request = null;
    this.p1PendingChoice = null;
    this.p2PendingChoice = null;

    this.p1Active = null;
    this.p2Active = null;
    this.p1TeamState = [];
    this.p2TeamState = [];

    this.weather = 'none';
    this.terrain = 'none';
    this.p1Hazards = [];
    this.p2Hazards = [];
    this.log = [];

    // Resolve P1 team (custom or random)
    let rawP1Team = null;
    if (p1CustomTeam) {
      try {
        rawP1Team = typeof p1CustomTeam === 'string' ? Teams.import(p1CustomTeam) : p1CustomTeam;
      } catch (e) {
        console.warn('[Engine] Failed to import P1 custom team:', e);
      }
    }
    if (!rawP1Team || rawP1Team.length === 0) {
      rawP1Team = Teams.generate(this.format);
    }

    // Resolve P2 team (custom or random)
    let rawP2Team = null;
    if (p2CustomTeam) {
      try {
        rawP2Team = typeof p2CustomTeam === 'string' ? Teams.import(p2CustomTeam) : p2CustomTeam;
      } catch (e) {
        console.warn('[Engine] Failed to import P2 custom team:', e);
      }
    }
    if (!rawP2Team || rawP2Team.length === 0) {
      rawP2Team = Teams.generate(this.format);
    }

    this.p1Team = Teams.pack(rawP1Team);
    this.p2Team = Teams.pack(rawP2Team);

    // Initial roster structure
    this.p1TeamState = rawP1Team.map(p => this.formatInitialPoke(p));
    this.p2TeamState = rawP2Team.map(p => this.formatInitialPoke(p));

    // Lead Pokémon is always index 0 in singles
    if (this.p1TeamState[0]) {
      this.p1TeamState[0].active = true;
      this.p1Active = this.p1TeamState[0];
    }
    if (this.p2TeamState[0]) {
      this.p2TeamState[0].active = true;
      this.p2Active = this.p2TeamState[0];
    }

    this.streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

    // Listen to p1 stream
    (async () => {
      try {
        for await (const chunk of this.streams.p1) {
          if (currentBattleId !== this.battleId) break;
          this.handlePlayerStreamChunk('p1', chunk, currentBattleId);
        }
      } catch (e) {
        console.warn('[Engine] P1 stream ended:', e);
      }
    })();

    // Listen to p2 stream
    (async () => {
      try {
        for await (const chunk of this.streams.p2) {
          if (currentBattleId !== this.battleId) break;
          this.handlePlayerStreamChunk('p2', chunk, currentBattleId);
        }
      } catch (e) {
        console.warn('[Engine] P2 stream ended:', e);
      }
    })();

    // Listen to omniscient battle stream
    (async () => {
      try {
        for await (const chunk of this.streams.omniscient) {
          if (currentBattleId !== this.battleId) break;
          this.handleOmniscientChunk(chunk, currentBattleId);
        }
      } catch (e) {
        console.warn('[Engine] Omniscient stream ended:', e);
      }
    })();

    // Start battle simulation
    const spec = { formatid: this.format };
    const p1spec = { name: this.p1Name, team: this.p1Team };
    const p2spec = { name: this.p2Name, team: this.p2Team };

    this.streams.omniscient.write(
      `>start ${JSON.stringify(spec)}\n>player p1 ${JSON.stringify(p1spec)}\n>player p2 ${JSON.stringify(p2spec)}`
    );

    this.notifyState();
  }

  formatInitialPoke(p) {
    const species = Dex.species.get(p.species || p.name);
    return {
      name: p.name || p.species,
      species: species.name || p.species,
      types: species.types || ['Normal'],
      level: p.level || 100,
      hp: 100,
      maxhp: 100,
      hpPercent: 100,
      status: '',
      fainted: false,
      item: p.item || '',
      ability: p.ability || '',
      moves: p.moves || [],
      statBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    };
  }

  handlePlayerStreamChunk(slot, chunk, battleId) {
    if (this.isDestroyed || (battleId && battleId !== this.battleId)) return;
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('|request|')) {
        const jsonStr = line.slice(9).trim();
        if (!jsonStr) continue;
        try {
          const req = JSON.parse(jsonStr);
          if (slot === 'p1') {
            this.p1Request = req;
            this.updateTeamFromRequest('p1', req);
          } else {
            this.p2Request = req;
            this.updateTeamFromRequest('p2', req);
          }
          this.notifyState();
        } catch (e) {
          console.error('[Engine] Failed to parse request JSON:', e, jsonStr);
        }
      }
    }
  }

  updateTeamFromRequest(slot, req) {
    if (!req.side || !req.side.pokemon) return;
    const teamState = slot === 'p1' ? this.p1TeamState : this.p2TeamState;

    req.side.pokemon.forEach((pkmn) => {
      // condition format: "280/280" or "0 fnt" or "150/280 par"
      const cond = pkmn.condition || '100/100';
      const parts = cond.split(' ');
      const hpParts = parts[0].split('/');
      const currentHp = parseInt(hpParts[0], 10) || 0;
      const maxHp = parseInt(hpParts[1], 10) || 100;
      const isFnt = cond.includes('fnt') || currentHp <= 0;
      const status = parts[1] || (isFnt ? 'fnt' : '');
      const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100))) : 0;

      const rawDetails = pkmn.details || '';
      const speciesName = rawDetails.split(',')[0].trim();
      const identName = pkmn.ident.split(': ')[1] || speciesName;

      // Match strictly by species/name to maintain stable roster order
      let member = this.findTeamMember(teamState, identName, speciesName);

      if (member) {
        if (pkmn.moves && pkmn.moves.length > 0) member.moves = pkmn.moves;
        if (pkmn.item) member.item = pkmn.item;
        if (pkmn.ability) member.ability = pkmn.ability;

        // When not processing action animations, safely sync live health and active status
        if (!this.isProcessingQueue) {
          member.hp = currentHp;
          member.maxhp = maxHp;
          member.hpPercent = hpPercent;
          member.status = status;
          member.fainted = isFnt;
          member.active = Boolean(pkmn.active);

          if (pkmn.active) {
            if (slot === 'p1') {
              this.p1Active = member;
            } else {
              this.p2Active = member;
            }
          }
        }
      } else if (!this.isProcessingQueue && teamState.length < 6) {
        const speciesData = Dex.species.get(speciesName);
        const newMember = {
          name: identName,
          species: speciesData.name || speciesName,
          types: speciesData.types || ['Normal'],
          level: parseInt(rawDetails.match(/L(\d+)/)?.[1], 10) || 100,
          hp: currentHp,
          maxhp: maxHp,
          hpPercent,
          status,
          fainted: isFnt,
          active: Boolean(pkmn.active),
          moves: pkmn.moves || [],
          item: pkmn.item || '',
          ability: pkmn.ability || '',
          statBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        };
        teamState.push(newMember);
        if (pkmn.active) {
          if (slot === 'p1') this.p1Active = newMember;
          else this.p2Active = newMember;
        }
      }
    });
  }

  handleOmniscientChunk(chunk, battleId) {
    if (this.isDestroyed || (battleId && battleId !== this.battleId)) return;
    const rawLines = chunk.split('\n');
    const validLines = [];
    for (const raw of rawLines) {
      const l = raw.trim();
      if (l && l.startsWith('|')) validLines.push(l);
    }

    if (validLines.length === 0) return;

    // In zero-pacing mode (e.g. unit tests / instant speed), process synchronously
    if (this.pacingDelay <= 0) {
      for (const line of validLines) {
        this.parseProtocolLine(line);
      }
      this.markReady();
      this.notifyState();
      this.notifyTurnWaitersIfReady();
      return;
    }

    // Parse into structured actions and queue for paced animation
    const actions = this.groupProtocolLinesIntoActions(validLines);
    this.actionQueue.push(...actions);
    this.processActionQueue();
  }

  groupProtocolLinesIntoActions(lines) {
    const actions = [];
    let currentMoveAction = null;

    for (const line of lines) {
      const parts = line.split('|');
      const type = parts[1];

      if (type === 'move') {
        if (currentMoveAction) {
          actions.push(currentMoveAction);
        }
        const attackerSlot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const attackerName = parts[2].split(': ')[1] || parts[2];
        const moveName = parts[3];
        const targetSlot = parts[4] ? (parts[4].startsWith('p1') ? 'p1' : 'p2') : (attackerSlot === 'p1' ? 'p2' : 'p1');
        const targetName = parts[4] ? (parts[4].split(': ')[1] || parts[4]) : '';
        const moveData = Dex.moves.get(moveName);

        currentMoveAction = {
          type: 'move',
          attackerSlot,
          attackerName,
          moveName,
          moveType: moveData?.type || 'Normal',
          targetSlot,
          targetName,
          effectLines: []
        };
      } else if (currentMoveAction && ['-damage', '-heal', '-supereffective', '-resisted', '-immune', '-crit', 'faint', '-status', '-curestatus', '-boost', '-unboost'].includes(type)) {
        currentMoveAction.effectLines.push(line);
      } else {
        if (currentMoveAction) {
          actions.push(currentMoveAction);
          currentMoveAction = null;
        }
        actions.push({
          type: 'other',
          line
        });
      }
    }

    if (currentMoveAction) {
      actions.push(currentMoveAction);
    }

    return actions;
  }

  async processActionQueue() {
    if (this.isProcessingQueue || this.isDestroyed) return;
    this.isProcessingQueue = true;
    const battleId = this.battleId;

    while (this.actionQueue.length > 0) {
      if (this.isDestroyed || this.battleId !== battleId) {
        return;
      }
      const action = this.actionQueue.shift();

      if (action.type === 'move') {
        // Phase 1: Attacker announcement and lunge
        this.activeMoveAction = {
          attackerSlot: action.attackerSlot,
          attackerName: action.attackerName,
          moveName: action.moveName,
          moveType: action.moveType,
          targetSlot: action.targetSlot,
          targetName: action.targetName,
          effectiveness: null,
          phase: 'attacking'
        };

        this.notifyLog({
          type: 'move',
          attackerSlot: action.attackerSlot,
          text: `${action.attackerName} used ${action.moveName}${action.targetName ? ` on ${action.targetName}` : ''}!`
        });
        this.notifyState();

        if (this.pacingDelay > 0) {
          await this.delay(this.pacingDelay);
          if (this.isDestroyed || this.battleId !== battleId) return;
        }

        // Phase 2: Defender impact, hit shake, and damage application
        let hasFaint = false;
        let eff = null;

        for (const effectLine of action.effectLines) {
          const parts = effectLine.split('|');
          const eType = parts[1];
          if (eType === '-supereffective') eff = 'super';
          else if (eType === '-resisted') eff = 'resisted';
          else if (eType === '-crit') eff = 'crit';
          else if (eType === 'faint') hasFaint = true;

          this.parseProtocolLine(effectLine);
        }

        this.activeMoveAction = {
          ...this.activeMoveAction,
          effectiveness: eff,
          phase: 'hit'
        };
        this.notifyState();

        if (this.pacingDelay > 0) {
          await this.delay(this.pacingDelay);
          if (this.isDestroyed || this.battleId !== battleId) return;
        }

        // Phase 3: Faint sequence pause if target was knocked out
        if (hasFaint && this.pacingDelay > 0) {
          await this.delay(Math.round(this.pacingDelay * 0.8));
          if (this.isDestroyed || this.battleId !== battleId) return;
        }

        // Phase 4: Clear active move banner and reset to idle
        this.activeMoveAction = null;
        this.notifyState();

        if (this.pacingDelay > 0) {
          await this.delay(120);
          if (this.isDestroyed || this.battleId !== battleId) return;
        }
      } else {
        // Other discrete action (switch, turn, win, weather, etc.)
        this.parseProtocolLine(action.line);
        this.notifyState();

        if (this.pacingDelay > 0 && ['switch', 'drag', 'turn', 'win'].includes(action.line.split('|')[1])) {
          await this.delay(Math.round(this.pacingDelay * 0.75));
          if (this.isDestroyed || this.battleId !== battleId) return;
        }
      }
    }

    if (this.battleId === battleId) {
      this.isProcessingQueue = false;
      if (this.p1Request) this.updateTeamFromRequest('p1', this.p1Request);
      if (this.p2Request) this.updateTeamFromRequest('p2', this.p2Request);
      this.notifyState();
      this.notifyTurnWaitersIfReady();
    }
  }

  parseProtocolLine(line) {
    const parts = line.split('|');
    const type = parts[1];

    switch (type) {
      case 'turn': {
        this.turn = parseInt(parts[2], 10) || this.turn + 1;
        this.notifyLog({ type: 'turn', text: `Turn ${this.turn}` });
        if (this.turn >= 1 && this.p1Active && this.p2Active) {
          this.markReady();
        }
        break;
      }
      case 'switch':
      case 'drag': {
        // |switch|p1a: Pikachu|Pikachu, L80, M|100/100
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const rawName = parts[3].split(',')[0].trim();
        const identName = parts[2].split(': ')[1] || rawName;
        const cond = parts[4] || '100/100';
        const speciesData = Dex.species.get(rawName);

        const currentHp = cond.includes('fnt') ? 0 : parseInt(cond.split('/')[0], 10) || 100;
        const maxHp = cond.includes('fnt') ? 100 : parseInt(cond.split('/')[1] || '100', 10);
        const hpPercent = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0;
        const status = cond.split(' ')[1] || '';
        const isFnt = cond.includes('fnt');

        const teamState = slot === 'p1' ? this.p1TeamState : this.p2TeamState;

        // Reset all active flags in roster
        teamState.forEach(p => { p.active = false; });

        // Find existing roster member
        let member = this.findTeamMember(teamState, identName, rawName);
        if (member) {
          member.active = true;
          member.hp = currentHp;
          member.maxhp = maxHp;
          member.hpPercent = hpPercent;
          member.status = status;
          member.fainted = isFnt;
          member.statBoosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        } else {
          // Fallback if not found in pre-generated roster
          member = {
            name: identName,
            species: speciesData.name || rawName,
            types: speciesData.types || ['Normal'],
            level: parseInt(parts[3].match(/L(\d+)/)?.[1], 10) || 100,
            hp: currentHp,
            maxhp: maxHp,
            hpPercent,
            status,
            fainted: isFnt,
            active: true,
            moves: [],
            statBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
          };
          teamState.push(member);
        }

        if (slot === 'p1') {
          this.p1Active = member;
        } else {
          this.p2Active = member;
        }

        if (this.p1Active && this.p2Active && this.turn >= 1) {
          this.markReady();
        }

        const trainer = slot === 'p1' ? this.p1Name : this.p2Name;
        this.notifyLog({ type: 'switch', text: `${trainer} sent out ${member.species || member.name}!` });
        break;
      }
      case 'move': {
        // Handled in processActionQueue if paced; fallback here if zero-pacing
        const attackerSlot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const attackerName = parts[2].split(': ')[1] || parts[2];
        const moveName = parts[3];
        const targetName = parts[4] ? (parts[4].split(': ')[1] || parts[4]) : '';
        this.notifyLog({
          type: 'move',
          attackerSlot,
          text: `${attackerName} used ${moveName}${targetName ? ` on ${targetName}` : ''}!`
        });
        break;
      }
      case '-damage': {
        // |-damage|p2a: Venusaur|45/260
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const cond = parts[3] || '0 fnt';
        const isFnt = cond.includes('fnt');
        const currentHp = isFnt ? 0 : parseInt(cond.split('/')[0], 10) || 0;
        const maxHp = isFnt ? 100 : parseInt(cond.split('/')[1] || '100', 10);
        const hpPercent = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0;
        const status = cond.split(' ')[1] || (isFnt ? 'fnt' : '');

        const active = slot === 'p1' ? this.p1Active : this.p2Active;
        if (active) {
          active.hp = currentHp;
          active.maxhp = maxHp;
          active.hpPercent = hpPercent;
          active.status = status;
          active.fainted = isFnt;
        }

        const pokeName = parts[2].split(': ')[1] || parts[2];
        this.updateTeamMember(slot, pokeName, {
          hp: currentHp,
          maxhp: maxHp,
          hpPercent,
          status,
          fainted: isFnt
        });

        this.notifyLog({
          type: 'damage',
          slot,
          text: `${pokeName} has ${hpPercent}% HP remaining!`
        });
        break;
      }
      case '-heal': {
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const cond = parts[3] || '100/100';
        const currentHp = parseInt(cond.split('/')[0], 10) || 100;
        const maxHp = parseInt(cond.split('/')[1] || '100', 10);
        const hpPercent = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 100;
        const active = slot === 'p1' ? this.p1Active : this.p2Active;
        if (active) {
          active.hp = currentHp;
          active.maxhp = maxHp;
          active.hpPercent = hpPercent;
        }
        const pokeName = parts[2].split(': ')[1] || parts[2];
        this.updateTeamMember(slot, pokeName, {
          hp: currentHp,
          maxhp: maxHp,
          hpPercent
        });
        break;
      }
      case '-status': {
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const status = parts[3];
        const active = slot === 'p1' ? this.p1Active : this.p2Active;
        if (active) active.status = status;
        const pokeName = parts[2].split(': ')[1] || parts[2];
        this.updateTeamMember(slot, pokeName, { status });
        this.notifyLog({ type: 'status', text: `${pokeName} was afflicted with ${status.toUpperCase()}!` });
        break;
      }
      case '-curestatus': {
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const active = slot === 'p1' ? this.p1Active : this.p2Active;
        if (active) active.status = '';
        const pokeName = parts[2].split(': ')[1] || parts[2];
        this.updateTeamMember(slot, pokeName, { status: '' });
        break;
      }
      case '-boost': {
        // |-boost|p1a: Dragonite|atk|1
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const stat = parts[3];
        const amount = parseInt(parts[4], 10) || 1;
        const active = slot === 'p1' ? this.p1Active : this.p2Active;
        if (active && active.statBoosts && active.statBoosts[stat] !== undefined) {
          active.statBoosts[stat] = Math.min(6, active.statBoosts[stat] + amount);
        }
        break;
      }
      case '-unboost': {
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const stat = parts[3];
        const amount = parseInt(parts[4], 10) || 1;
        const active = slot === 'p1' ? this.p1Active : this.p2Active;
        if (active && active.statBoosts && active.statBoosts[stat] !== undefined) {
          active.statBoosts[stat] = Math.max(-6, active.statBoosts[stat] - amount);
        }
        break;
      }
      case '-weather': {
        const w = parts[2];
        this.weather = (w === 'none' || !w) ? 'none' : w;
        if (this.weather !== 'none') {
          this.notifyLog({ type: 'weather', text: `Weather changed to ${this.weather}!` });
        }
        break;
      }
      case '-fieldstart': {
        const field = parts[2] || '';
        this.terrain = field.replace('move: ', '');
        break;
      }
      case '-fieldend': {
        this.terrain = 'none';
        break;
      }
      case '-supereffective': {
        this.notifyLog({ type: 'effectiveness', text: "It's super effective!" });
        break;
      }
      case '-resisted': {
        this.notifyLog({ type: 'effectiveness', text: "It's not very effective..." });
        break;
      }
      case '-immune': {
        this.notifyLog({ type: 'effectiveness', text: "It had no effect!" });
        break;
      }
      case '-crit': {
        this.notifyLog({ type: 'crit', text: "A critical hit!" });
        break;
      }
      case 'faint': {
        const slot = parts[2].startsWith('p1') ? 'p1' : 'p2';
        const active = slot === 'p1' ? this.p1Active : this.p2Active;
        if (active) {
          active.fainted = true;
          active.hp = 0;
          active.hpPercent = 0;
          active.status = 'fnt';
        }
        const pokeName = parts[2].split(': ')[1] || parts[2];
        this.updateTeamMember(slot, pokeName, {
          fainted: true,
          hp: 0,
          hpPercent: 0,
          status: 'fnt',
          active: false
        });
        this.notifyLog({ type: 'faint', text: `${pokeName} fainted!` });
        break;
      }
      case 'win': {
        const winnerName = parts[2];
        this.winner = (winnerName === this.p1Name) ? 'p1' : 'p2';
        this.isGameOver = true;
        this.notifyLog({ type: 'win', text: `${winnerName} won the battle!` });
        break;
      }
      case 'tie': {
        this.winner = 'tie';
        this.isGameOver = true;
        this.notifyLog({ type: 'win', text: `Battle ended in a tie!` });
        break;
      }
    }
  }

  /**
   * Get legal action choices for a given player
   */
  getLegalActions(slot) {
    const req = slot === 'p1' ? this.p1Request : this.p2Request;
    if (!req) return { moves: [], switches: [], forceSwitch: false, canTerastallize: false };

    const isForceSwitch = Boolean(req.forceSwitch && req.forceSwitch[0]);
    const moves = [];
    const switches = [];

    // Parse legal moves
    if (!isForceSwitch && req.active && req.active[0] && req.active[0].moves) {
      req.active[0].moves.forEach((m, idx) => {
        if (!m.disabled && m.pp > 0) {
          const moveData = Dex.moves.get(m.id || m.move);
          moves.push({
            index: idx + 1,
            name: m.move,
            id: m.id || m.move.toLowerCase().replace(/[^a-z0-9]/g, ''),
            type: moveData.type || 'Normal',
            category: moveData.category || 'Physical',
            basePower: moveData.basePower || 0,
            accuracy: moveData.accuracy === true ? 100 : (moveData.accuracy || 100),
            pp: m.pp,
            maxpp: m.maxpp,
            target: m.target
          });
        }
      });
    }

    // Parse legal switches
    if (req.side && req.side.pokemon) {
      req.side.pokemon.forEach((p, idx) => {
        const isFnt = p.condition ? p.condition.includes('fnt') : false;
        if (!p.active && !isFnt) {
          const rawName = p.details.split(',')[0].trim();
          const speciesData = Dex.species.get(rawName);
          const condParts = (p.condition || '100/100').split(' ');
          const hpParts = condParts[0].split('/');
          const curHp = parseInt(hpParts[0], 10) || 0;
          const maxHp = parseInt(hpParts[1], 10) || 100;
          const hpPercent = maxHp > 0 ? Math.round((curHp / maxHp) * 100) : 0;

          switches.push({
            index: idx + 1,
            name: p.ident.split(': ')[1] || rawName,
            species: speciesData.name || rawName,
            types: speciesData.types || ['Normal'],
            hpPercent,
            status: condParts[1] || ''
          });
        }
      });
    }

    const canTerastallize = Boolean(
      req.active && req.active[0] && req.active[0].canTerastallize
    );

    return {
      moves,
      switches,
      forceSwitch: isForceSwitch,
      canTerastallize,
      hasChoices: moves.length > 0 || switches.length > 0
    };
  }

  /**
   * Submit an action choice for a player slot
   * e.g., 'move 1', 'move 2 terastallize', 'switch 3'
   */
  submitChoice(slot, choice) {
    if (slot === 'p1') {
      this.p1PendingChoice = choice;
    } else {
      this.p2PendingChoice = choice;
    }

    this.checkAndDispatchChoices();
  }

  checkAndDispatchChoices() {
    const p1NeedsChoice = Boolean(this.p1Request && !this.p1Request.wait);
    const p2NeedsChoice = Boolean(this.p2Request && !this.p2Request.wait);

    const p1Ready = !p1NeedsChoice || Boolean(this.p1PendingChoice);
    const p2Ready = !p2NeedsChoice || Boolean(this.p2PendingChoice);

    if (p1Ready && p2Ready && (p1NeedsChoice || p2NeedsChoice)) {
      if (p1NeedsChoice && this.p1PendingChoice) {
        this.streams.p1.write(this.p1PendingChoice);
        this.p1PendingChoice = null;
      }
      if (p2NeedsChoice && this.p2PendingChoice) {
        this.streams.p2.write(this.p2PendingChoice);
        this.p2PendingChoice = null;
      }
      this.notifyState();
    }
  }

  getSnapshot() {
    return {
      turn: this.turn,
      format: this.format,
      winner: this.winner,
      isGameOver: this.isGameOver,
      activeMoveAction: this.activeMoveAction,
      customTeamsActive: Boolean(this.p1CustomTeam || this.p2CustomTeam),
      weather: this.weather,
      terrain: this.terrain,
      p1: {
        name: this.p1Name,
        active: this.p1Active,
        team: this.p1TeamState,
        needsChoice: Boolean(this.p1Request && !this.p1Request.wait),
        forceSwitch: Boolean(this.p1Request?.forceSwitch?.[0])
      },
      p2: {
        name: this.p2Name,
        active: this.p2Active,
        team: this.p2TeamState,
        needsChoice: Boolean(this.p2Request && !this.p2Request.wait),
        forceSwitch: Boolean(this.p2Request?.forceSwitch?.[0])
      }
    };
  }
}
