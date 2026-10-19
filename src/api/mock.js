/**
 * Offline Heuristic Battle Engine & Strategy Arbiter
 * Instant, zero-latency fallback that runs without any LLM server
 */

import { Dex } from '@pkmn/sim';

export const OFFLINE_MODELS = [
  { id: 'engine-tactical', name: 'Offline Engine (Tactical Battler)', provider: 'offline' },
  { id: 'engine-positional', name: 'Offline Engine (Strategic Battler)', provider: 'offline' }
];

export const OFFLINE_ARBITERS = [
  { id: 'engine-arbiter', name: 'Offline Decision Model', provider: 'offline', role: 'arbiter', capabilities: ['decision'] }
];

/**
 * Evaluates move damage multiplier against opponent types
 */
function getDamageMultiplier(moveType, opponentTypes = ['Normal']) {
  let mult = 1;
  for (const t of opponentTypes) {
    if (Dex.getImmunity(moveType, t) === false) return 0;
    const eff = Dex.getEffectiveness(moveType, t);
    if (eff > 0) mult *= 2;
    else if (eff < 0) mult *= 0.5;
  }
  return mult;
}

/**
 * Selects an intelligent heuristic move or switch
 */
export function pickHeuristicChoice({
  slot,
  modelId = 'engine-tactical',
  legalActions,
  snapshot
}) {
  const isP1 = slot === 'p1';
  const player = isP1 ? snapshot.p1 : snapshot.p2;
  const opponent = isP1 ? snapshot.p2 : snapshot.p1;

  const myPoke = player.active || player.team?.[0];
  const oppPoke = opponent.active || opponent.team?.[0];
  const oppTypes = oppPoke?.types || ['Normal'];
  const myTypes = myPoke?.types || ['Normal'];
  const oppName = oppPoke?.species || 'the opponent';
  const myName = myPoke?.species || 'active Pokémon';

  const { moves = [], switches = [], forceSwitch } = legalActions;

  // 1. If forced to switch, pick the best bench Pokémon
  if (forceSwitch || moves.length === 0) {
    if (switches.length === 0) return { type: 'switch', choice: 1, targetName: 'Bench' };

    // Score bench Pokémon based on remaining HP and defensive resistance against opponent
    let bestSwitch = switches[0];
    let bestScore = -999;

    for (const sw of switches) {
      let score = sw.hpPercent;
      // Bonus if resistant to opponent types
      for (const ot of oppTypes) {
        for (const st of sw.types) {
          const eff = Dex.getEffectiveness(ot, st);
          if (eff < 0) score += 20; // resisted
          if (eff > 0) score -= 25; // weak
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestSwitch = sw;
      }
    }

    return {
      type: 'switch',
      choice: bestSwitch.index,
      targetName: bestSwitch.species,
      terastallize: false,
      reasoning: `Sending out ${bestSwitch.species} with ${bestSwitch.hpPercent}% HP for defensive stability against ${oppName}.`
    };
  }

  // 2. Score all legal moves
  const scoredMoves = moves.map(m => {
    let score = 0;
    const mult = getDamageMultiplier(m.type, oppTypes);

    if (mult === 0) {
      score = -5000; // Complete immunity (e.g. Electric vs Ground, Normal vs Ghost)
    } else {
      const basePower = m.basePower || (m.category === 'Status' ? 20 : 50);
      score = basePower * mult;

      // STAB bonus (Same Type Attack Bonus)
      if (myTypes.includes(m.type)) {
        score *= 1.5;
      }

      // Accuracy weighting
      score *= (m.accuracy / 100);

      // If opponent HP is low, prioritize guaranteed accuracy and quick KO
      if (oppPoke && oppPoke.hpPercent <= 30 && mult >= 1 && basePower >= 40) {
        score += 80;
      }

      // Status moves in tactical mode vs positional mode
      if (m.category === 'Status') {
        if (modelId === 'engine-positional') score += 35; // setup/hazard boost
        else score -= 15;
      }
    }

    return { ...m, score, mult };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  const bestMove = scoredMoves[0];

  // 3. Strategic switch check: If active Pokémon is facing a severe 4x weakness and has low HP
  if (modelId === 'engine-positional' && myPoke && myPoke.hpPercent <= 40 && switches.length > 0) {
    let facingLethal = false;
    for (const ot of oppTypes) {
      const eff = Dex.getEffectiveness(ot, myTypes[0]);
      if (eff > 0) { facingLethal = true; break; }
    }
    if (facingLethal) {
      const healthySwitch = switches.find(s => s.hpPercent > 70);
      if (healthySwitch) {
        return {
          type: 'switch',
          choice: healthySwitch.index,
          targetName: healthySwitch.species,
          terastallize: false,
          reasoning: `Tactical switch to preserve ${myName}; bringing in ${healthySwitch.species} to absorb incoming pressure.`
        };
      }
    }
  }

  // 4. Return the highest-scoring move
  const effectivenessDesc = bestMove.mult >= 2 ? 'super effective' : bestMove.mult === 0 ? 'immune' : 'reliable';
  return {
    type: 'move',
    choice: bestMove.index,
    targetName: bestMove.name,
    terastallize: Boolean(legalActions.canTerastallize && bestMove.score > 120),
    reasoning: `Executing ${bestMove.name} for ${effectivenessDesc} damage against ${oppName}.`
  };
}

/**
 * Offline Strategy Arbiter Evaluator
 */
export function evaluateOfflineArbiterVerdict({
  proposedAction,
  playerReasoning,
  legalActions,
  snapshot,
  playerSlot
}) {
  const isP1 = playerSlot === 'p1';
  const opponent = isP1 ? snapshot.p2 : snapshot.p1;
  const oppPoke = opponent.active || opponent.team?.[0];
  const oppTypes = oppPoke?.types || ['Normal'];
  const oppName = oppPoke?.species || 'the opponent';

  const { moves = [], switches = [] } = legalActions;

  if (proposedAction.type === 'switch') {
    return {
      approved: true,
      finalAction: proposedAction,
      grade: 'Tactical Read',
      commentary: `Clean positional rotation to refresh momentum against ${oppName}.`
    };
  }

  // Proposed a move
  const chosenMove = moves.find(m => m.index === proposedAction.choice);
  if (!chosenMove) {
    const fallback = moves[0] || { index: 1, name: 'Default' };
    return {
      approved: false,
      finalAction: { type: 'move', choice: fallback.index, targetName: fallback.name },
      grade: 'Inaccuracy',
      commentary: 'Invalid move index substituted with default action.'
    };
  }

  const mult = getDamageMultiplier(chosenMove.type, oppTypes);

  // Check for complete immunity blunder (0x damage)
  if (mult === 0) {
    // Find non-immune move
    const safeMove = moves.find(m => getDamageMultiplier(m.type, oppTypes) > 0) || moves[0];
    return {
      approved: false,
      finalAction: { type: 'move', choice: safeMove.index, targetName: safeMove.name },
      grade: 'Blunder',
      commentary: `Blunder avoided! ${chosenMove.name} has zero effect on ${oppName}. Overridden with ${safeMove.name}.`
    };
  }

  if (mult >= 2) {
    return {
      approved: true,
      finalAction: proposedAction,
      grade: 'Best Move',
      commentary: `Excellent target selection: super effective ${chosenMove.name} maximizes damage against ${oppName}.`
    };
  }

  if (mult < 1 && moves.some(m => getDamageMultiplier(m.type, oppTypes) >= 1)) {
    return {
      approved: true,
      finalAction: proposedAction,
      grade: 'Inaccuracy',
      commentary: `Attacking into a resistant match-up; higher damage options were available.`
    };
  }

  return {
    approved: true,
    finalAction: proposedAction,
    grade: 'Best Move',
    commentary: `Solid play keeping the pressure on ${oppName}.`
  };
}
