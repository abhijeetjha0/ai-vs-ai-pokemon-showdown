import React, { useState, useEffect } from 'react';
import { getBattleSpriteUrl } from '../pokemon/sprites.js';
import PokeballIcon from './PokeballIcon.jsx';

export default function BattleStage({
  snapshot,
  mode = 'auto',
  legalActions = { moves: [], switches: [], forceSwitch: false, canTerastallize: false },
  onManualChoice,
  terastallizeActive,
  onToggleTerastallize,
  flipped = false
}) {
  const p1 = snapshot?.p1;
  const p2 = snapshot?.p2;

  // Active trainers mapped by orientation
  const bottomTrainer = flipped ? p2 : p1;
  const topTrainer = flipped ? p1 : p2;

  const bottomActive = bottomTrainer?.active;
  const topActive = topTrainer?.active;

  const bottomSlot = flipped ? 'p2' : 'p1';
  const topSlot = flipped ? 'p1' : 'p2';

  // Fallback state trackers for sprite errors
  const [p1ImgFallback, setP1ImgFallback] = useState(0);
  const [p2ImgFallback, setP2ImgFallback] = useState(0);

  // Reset sprite fallbacks when active Pokémon changes
  useEffect(() => {
    setP1ImgFallback(0);
  }, [p1?.active?.species]);

  useEffect(() => {
    setP2ImgFallback(0);
  }, [p2?.active?.species]);

  // Retrieve sprite URLs with multi-tier fallback for all Pokemon and alternate forms
  const getSpriteSrc = (species, side = 'front', fallbackStage = 0) => {
    return getBattleSpriteUrl(species, side, fallbackStage);
  };

  const getHpClass = (pct) => {
    if (pct > 50) return 'hp-high';
    if (pct > 20) return 'hp-med';
    return 'hp-low';
  };

  const renderPokeHud = (active, trainerName, team, isBottom = false, slotTag = 'P1') => {
    if (!active) {
      return (
        <div className={`poke-hud-card glass-panel ${isBottom ? 'poke-hud-player' : 'poke-hud-opponent'} text-center py-2 px-3`}>
          <div className="text-secondary small fst-italic">Awaiting Pokémon...</div>
        </div>
      );
    }

    const hpPct = active.hpPercent ?? 100;
    const hpClass = getHpClass(hpPct);
    const isP1 = slotTag === 'P1';

    return (
      <div className={`poke-hud-card glass-panel ${isBottom ? 'poke-hud-player' : 'poke-hud-opponent'}`}>
        {/* Row 1: Pokémon Name, Level & Trainer Tag */}
        <div className="poke-hud-header">
          <div className="poke-hud-title-wrap">
            <span className="poke-name" title={active.species || active.name}>
              {active.species || active.name}
            </span>
            <span className="poke-level">Lv.{active.level || 100}</span>
          </div>

          <span className={`player-slot-badge ${isP1 ? 'badge-p1' : 'badge-p2'} flex-shrink-0`}>
            {slotTag}
          </span>
        </div>

        {/* Row 2: Types, Status Condition & Stat Boosts */}
        <div className="d-flex align-items-center flex-wrap gap-1 mb-2">
          {active.types && active.types.map((t, idx) => (
            <span key={idx} className={`type-badge type-${t.toLowerCase()}`}>
              {t}
            </span>
          ))}

          {active.status && (
            <span className={`status-badge status-${active.status.toLowerCase()}`}>
              {active.status.toUpperCase()}
            </span>
          )}

          {active.statBoosts && Object.entries(active.statBoosts).map(([stat, val]) => (
            val !== 0 ? (
              <span key={stat} className="stat-boost-pill">
                {stat.toUpperCase()} {val > 0 ? `+${val}` : val}
              </span>
            ) : null
          ))}
        </div>

        {/* Row 3: HP Gauge Bar & Real Numbers */}
        <div className="hp-gauge-container mb-2">
          <div className="d-flex justify-content-between align-items-center mb-0.5">
            <span className="hp-label">HP</span>
            <span className="hp-numbers font-monospace">
              {active.hp}/{active.maxhp} <span className="text-light text-opacity-50">({hpPct}%)</span>
            </span>
          </div>
          <div className="hp-bar-track">
            <div
              className={`hp-bar-fill ${hpClass}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* Row 4: Dedicated Team Health Tracker */}
        <div className="d-flex justify-content-between align-items-center pt-1.5 border-top border-white border-opacity-10">
          <span className="hud-team-label font-monospace">
            TEAM
          </span>
          <div className="pokeball-bar" title={`${trainerName}'s team`}>
            {team && team.map((p, idx) => (
              <div
                key={idx}
                className={`pokeball-item ${p.fainted ? 'pokeball-item-fainted' : ''}`}
                title={`${p.species || p.name}: ${p.fainted ? 'Fainted' : `${p.hpPercent}% HP`}`}
              >
                <PokeballIcon size={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="battle-stage-card">
      <div className="stadium-viewport">
        {/* Stadium Cyber Sky & Atmospheric Spotlights */}
        <div className="stadium-sky" />
        <div className="stadium-spotlight spotlight-player" />
        <div className="stadium-spotlight spotlight-opponent" />

        {/* 3D Stadium Field Floor with Holographic Center Circle */}
        <div className="stadium-battle-field">
          <div className="stadium-field-inner">
            <div className="field-center-circle">
              <div className="field-hologram-pokeball">
                <PokeballIcon size={64} />
              </div>
            </div>
            <div className="field-center-line" />
          </div>
        </div>

        {/* Floating Environment / Weather & Terrain HUD */}
        {(snapshot?.weather !== 'none' || snapshot?.terrain !== 'none') && (
          <div className="stadium-weather-pill">
            {snapshot?.weather !== 'none' && (
              <span className="badge bg-dark bg-opacity-90 border border-info border-opacity-50 text-info d-flex align-items-center gap-1 font-monospace px-2.5 py-1 shadow-sm">
                <span className="material-symbols-rounded fs-6">wb_sunny</span>
                {snapshot.weather.toUpperCase()}
              </span>
            )}
            {snapshot?.terrain !== 'none' && (
              <span className="badge bg-dark bg-opacity-90 border border-success border-opacity-50 text-success d-flex align-items-center gap-1 font-monospace px-2.5 py-1 shadow-sm">
                <span className="material-symbols-rounded fs-6">terrain</span>
                {snapshot.terrain.toUpperCase()}
              </span>
            )}
          </div>
        )}

        {/* Active Move Holographic Announcement Banner */}
        {snapshot?.activeMoveAction && snapshot.activeMoveAction.phase !== 'idle' && (
          <div className={`stadium-move-banner banner-${snapshot.activeMoveAction.attackerSlot}`}>
            <div className="move-banner-pill">
              <span className="material-symbols-rounded fs-5 text-warning">swords</span>
              <span className="attacker-slot-tag fw-bold">
                {snapshot.activeMoveAction.attackerSlot === 'p1' ? 'Trainer 1' : 'Trainer 2'}
              </span>
              <span className="attacker-poke-name text-info fw-bold">{snapshot.activeMoveAction.attackerName}</span>
              <span className="move-banner-action text-secondary">used</span>
              <span className={`type-badge type-${(snapshot.activeMoveAction.moveType || 'Normal').toLowerCase()} fw-bold text-uppercase px-2`}>
                {snapshot.activeMoveAction.moveName}
              </span>
              {snapshot.activeMoveAction.effectiveness === 'super' && (
                <span className="badge bg-danger text-light font-monospace ms-1">SUPER EFFECTIVE!</span>
              )}
              {snapshot.activeMoveAction.effectiveness === 'resisted' && (
                <span className="badge bg-secondary text-light font-monospace ms-1">NOT VERY EFFECTIVE</span>
              )}
              {snapshot.activeMoveAction.effectiveness === 'crit' && (
                <span className="badge bg-warning text-dark font-monospace ms-1">CRITICAL HIT!</span>
              )}
            </div>
          </div>
        )}

        {/* TOP SECTION (Top Dais Area): HUD on Left, Pokémon on Right Dais */}
        <div className="battle-hud-anchor hud-anchor-opponent">
          {renderPokeHud(topActive, topTrainer?.name || (topSlot === 'p1' ? 'Player 1' : 'Player 2'), topTrainer?.team, false, topSlot.toUpperCase())}
        </div>

        <div className="battle-sprite-anchor sprite-anchor-opponent">
          <div className="pokemon-pedestal pedestal-opponent">
            <div className="poke-sprite-wrap">
              {topActive && (
                <img
                  src={getSpriteSrc(topActive.species, 'front', topSlot === 'p1' ? p1ImgFallback : p2ImgFallback)}
                  alt={topActive.species}
                  className={`poke-sprite-front ${topActive.fainted ? 'poke-sprite-fainted' : ''} ${snapshot?.activeMoveAction?.attackerSlot === topSlot && snapshot?.activeMoveAction?.phase === 'attacking' ? 'poke-sprite-attacking-p2' : ''} ${snapshot?.activeMoveAction?.targetSlot === topSlot && snapshot?.activeMoveAction?.phase === 'hit' ? 'poke-sprite-hit' : ''}`}
                  onError={() => (topSlot === 'p1' ? setP1ImgFallback(prev => (prev < 6 ? prev + 1 : prev)) : setP2ImgFallback(prev => (prev < 6 ? prev + 1 : prev)))}
                />
              )}
            </div>
            <div className="pedestal-disc pedestal-disc-opponent" />
          </div>
        </div>

        {/* BOTTOM SECTION (Bottom Dais Area): Pokémon on Left Dais, HUD on Right */}
        <div className="battle-sprite-anchor sprite-anchor-player">
          <div className="pokemon-pedestal pedestal-player">
            <div className="poke-sprite-wrap">
              {bottomActive && (
                <img
                  src={getSpriteSrc(bottomActive.species, 'back', bottomSlot === 'p1' ? p1ImgFallback : p2ImgFallback)}
                  alt={bottomActive.species}
                  className={`poke-sprite-back ${bottomActive.fainted ? 'poke-sprite-fainted' : ''} ${snapshot?.activeMoveAction?.attackerSlot === bottomSlot && snapshot?.activeMoveAction?.phase === 'attacking' ? 'poke-sprite-attacking-p1' : ''} ${snapshot?.activeMoveAction?.targetSlot === bottomSlot && snapshot?.activeMoveAction?.phase === 'hit' ? 'poke-sprite-hit' : ''}`}
                  onError={() => (bottomSlot === 'p1' ? setP1ImgFallback(prev => (prev < 6 ? prev + 1 : prev)) : setP2ImgFallback(prev => (prev < 6 ? prev + 1 : prev)))}
                />
              )}
            </div>
            <div className="pedestal-disc pedestal-disc-player" />
          </div>
        </div>

        <div className="battle-hud-anchor hud-anchor-player">
          {renderPokeHud(bottomActive, bottomTrainer?.name || (bottomSlot === 'p1' ? 'Player 1' : 'Player 2'), bottomTrainer?.team, true, bottomSlot.toUpperCase())}
        </div>
      </div>

      {/* MANUAL MODE ACTION HUD (Docks smoothly at stage bottom) */}
      {mode === 'manual' && p1?.needsChoice && !snapshot?.isGameOver && (
        <div className="manual-action-hud">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              <span className="material-symbols-rounded text-info fs-5">sports_kabaddi</span>
              <span className="fw-bold small text-light">Choose Action for {p1?.active?.species || 'Player 1'}</span>
            </div>

            {legalActions.canTerastallize && (
              <button
                type="button"
                className={`btn btn-sm ${terastallizeActive ? 'btn-warning' : 'btn-outline-warning'} d-flex align-items-center gap-1 font-monospace`}
                onClick={onToggleTerastallize}
              >
                <span className="material-symbols-rounded fs-6">diamond</span>
                Terastallize
              </button>
            )}
          </div>

          {/* Legal Moves (if not forced switch) */}
          {!legalActions.forceSwitch && legalActions.moves.length > 0 && (
            <div className="row g-2 mb-2">
              {legalActions.moves.map(m => (
                <div key={m.index} className="col-12 col-sm-6">
                  <button
                    type="button"
                    className="btn btn-move-choice w-100"
                    onClick={() => onManualChoice({ type: 'move', choice: m.index, terastallize: terastallizeActive })}
                  >
                    <div className="d-flex justify-content-between align-items-center w-100 mb-1">
                      <span className="fw-bold">{m.name}</span>
                      <span className={`type-badge type-${m.type.toLowerCase()}`}>{m.type}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center w-100 text-secondary small font-monospace">
                      <span>Pwr: {m.basePower || '—'} / Acc: {m.accuracy}%</span>
                      <span>PP: {m.pp}/{m.maxpp}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bench Switches */}
          {legalActions.switches.length > 0 && (
            <div>
              <div className="text-secondary small mb-1 fw-semibold">
                {legalActions.forceSwitch ? '⚠️ Choose Replacement Pokémon:' : 'Or Switch to Bench:'}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {legalActions.switches.map(s => (
                  <button
                    key={s.index}
                    type="button"
                    className="btn btn-switch-choice"
                    onClick={() => onManualChoice({ type: 'switch', choice: s.index })}
                  >
                    <span className="fw-semibold small">{s.species}</span>
                    <div className="d-flex gap-1">
                      {s.types.map((t, idx) => (
                        <span key={idx} className={`type-badge type-${t.toLowerCase()} py-0 px-1`} style={{ fontSize: '0.62rem' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="badge bg-dark border border-secondary border-opacity-25 font-monospace">
                      {s.hpPercent}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
