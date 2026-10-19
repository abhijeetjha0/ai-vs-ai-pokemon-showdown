/**
 * Real-time Match Advantage & Win Probability Evaluator
 * Analogous to Chess evaluator.js
 */

import { Dex } from '@pkmn/sim';

/**
 * Evaluates the current battle state and returns win probability and advantage metric
 * @param {Object} snapshot - BattleEngine snapshot
 * @returns {Object} { p1WinChance: number, p2WinChance: number, formatted: string, label: string }
 */
export function evaluateBattlePosition(snapshot) {
  if (!snapshot) return { p1WinChance: 50, p2WinChance: 50, formatted: '0.0', label: 'Even Match' };

  if (snapshot.isGameOver) {
    if (snapshot.winner === 'p1') {
      return { p1WinChance: 100, p2WinChance: 0, formatted: '+99.0', label: 'Trainer 1 Victory' };
    }
    if (snapshot.winner === 'p2') {
      return { p1WinChance: 0, p2WinChance: 100, formatted: '-99.0', label: 'Trainer 2 Victory' };
    }
    return { p1WinChance: 50, p2WinChance: 50, formatted: '0.0', label: 'Draw / Stalemate' };
  }

  const p1Team = snapshot.p1?.team || [];
  const p2Team = snapshot.p2?.team || [];

  // 1. Team HP and Alive count
  let p1HpTotal = 0;
  let p1Alive = 0;
  p1Team.forEach(p => {
    if (!p.fainted && p.hpPercent > 0) {
      p1HpTotal += p.hpPercent;
      p1Alive += 1;
    }
  });

  let p2HpTotal = 0;
  let p2Alive = 0;
  p2Team.forEach(p => {
    if (!p.fainted && p.hpPercent > 0) {
      p2HpTotal += p.hpPercent;
      p2Alive += 1;
    }
  });

  // Score based on team HP (scaled 0-600)
  let score = (p1HpTotal - p2HpTotal) / 60; // range roughly -10 to +10

  // Bonus for alive count difference
  score += (p1Alive - p2Alive) * 1.5;

  // 2. Active Matchup Advantage
  const p1Active = snapshot.p1?.active;
  const p2Active = snapshot.p2?.active;

  if (p1Active && p2Active && !p1Active.fainted && !p2Active.fainted) {
    // Check type effectiveness
    const p1Types = p1Active.types || ['Normal'];
    const p2Types = p2Active.types || ['Normal'];

    // P1 offensive advantage
    let p1BestMult = 1;
    if (p1Active.moves && p1Active.moves.length > 0) {
      p1Active.moves.forEach(m => {
        const moveData = Dex.moves.get(m);
        if (moveData && moveData.category !== 'Status') {
          let mult = 1;
          p2Types.forEach(t => {
            const eff = Dex.getEffectiveness(moveData.type, t);
            if (eff > 0) mult *= 2;
            else if (eff < 0) mult *= 0.5;
            else if (Dex.getImmunity(moveData.type, t) === false) mult *= 0;
          });
          if (mult > p1BestMult) p1BestMult = mult;
        }
      });
    }

    // P2 offensive advantage
    let p2BestMult = 1;
    if (p2Active.moves && p2Active.moves.length > 0) {
      p2Active.moves.forEach(m => {
        const moveData = Dex.moves.get(m);
        if (moveData && moveData.category !== 'Status') {
          let mult = 1;
          p1Types.forEach(t => {
            const eff = Dex.getEffectiveness(moveData.type, t);
            if (eff > 0) mult *= 2;
            else if (eff < 0) mult *= 0.5;
            else if (Dex.getImmunity(moveData.type, t) === false) mult *= 0;
          });
          if (mult > p2BestMult) p2BestMult = mult;
        }
      });
    }

    score += (p1BestMult - p2BestMult) * 0.8;

    // Status penalties
    const statusPenalty = { slp: -1.2, frz: -1.2, tox: -0.8, brn: -0.6, par: -0.6 };
    if (p1Active.status && statusPenalty[p1Active.status]) score += statusPenalty[p1Active.status];
    if (p2Active.status && statusPenalty[p2Active.status]) score -= statusPenalty[p2Active.status];

    // Stat boosts
    if (p1Active.statBoosts) {
      Object.values(p1Active.statBoosts).forEach(v => { score += v * 0.2; });
    }
    if (p2Active.statBoosts) {
      Object.values(p2Active.statBoosts).forEach(v => { score -= v * 0.2; });
    }
  }

  // Convert raw score to 0 - 100 win probability using sigmoid curve
  // A score of +4 corresponds to ~80% win chance
  const p1WinChance = Math.round(100 / (1 + Math.exp(-score * 0.45)));
  const p2WinChance = 100 - p1WinChance;

  let formatted = '0.0';
  let label = 'Even Position';
  if (score > 0.3) {
    formatted = `+${score.toFixed(1)}`;
    label = p1WinChance > 75 ? 'Trainer 1 Dominating' : 'Trainer 1 Advantage';
  } else if (score < -0.3) {
    formatted = score.toFixed(1);
    label = p2WinChance > 75 ? 'Trainer 2 Dominating' : 'Trainer 2 Advantage';
  }

  return {
    p1WinChance,
    p2WinChance,
    formatted,
    label
  };
}
