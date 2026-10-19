import React from 'react';
import { Card, Form, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { getRosterSpriteUrl } from '../pokemon/sprites.js';

export default function PlayerCard({
  slot = 'p1',
  name,
  selectedModel,
  availableModels = [],
  onModelChange,
  isActiveTurn = false,
  isThinking = false,
  team = [],
  onSelectPokemon
}) {
  const isP1 = slot === 'p1';
  const accentClass = isP1 ? 'p1-card' : 'p2-card';
  const playerLabel = name || (isP1 ? 'Player 1' : 'Player 2');

  let statusText = 'WAITING';
  let statusClass = 'waiting';

  if (isActiveTurn) {
    if (isThinking) {
      statusText = 'THINKING...';
      statusClass = 'thinking';
    } else {
      statusText = 'TO MOVE';
      statusClass = 'active';
    }
  }

  return (
    <Card className={`player-card glass-panel compact-player-card ${accentClass} ${isActiveTurn ? 'turn-active' : ''}`}>
      <Card.Body className="p-0">
        <div className="player-header d-flex justify-content-between align-items-center gap-2 mb-0">
          {/* PLAYER IDENTITY */}
          <div className="player-identity d-flex align-items-center flex-shrink-0" style={{ minWidth: '105px' }}>
            <span className="player-name fw-bold text-light" style={{ fontSize: '0.85rem' }}>
              {playerLabel}
            </span>
          </div>

          {/* IN-CARD MODEL SELECTOR DROPDOWN */}
          <div className="player-model-select-wrap flex-grow-1 mx-2" style={{ maxWidth: '175px' }}>
            <Form.Select
              size="sm"
              className="compact-select in-card-select"
              value={selectedModel || ''}
              onChange={(e) => onModelChange && onModelChange(e.target.value)}
              disabled={availableModels.length === 0}
              title={selectedModel}
              aria-label={`${playerLabel} Model`}
            >
              {availableModels.length === 0 ? (
                <option value="">No models</option>
              ) : (
                availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))
              )}
            </Form.Select>
          </div>

          {/* TURN STATUS PILL */}
          <div className={`player-status-pill ${statusClass} d-flex align-items-center justify-content-center flex-shrink-0`} style={{ minWidth: '78px' }}>
            {isThinking && (
              <Spinner
                animation="border"
                size="sm"
                className="me-1"
                style={{ width: '10px', height: '10px', borderWidth: '1.5px' }}
              />
            )}
            <span style={{ fontSize: '0.7rem' }}>{statusText}</span>
          </div>
        </div>

        {/* FULL TEAM POKÉMON ROSTER LIST */}
        {team && team.length > 0 && (
          <div className="player-team-roster mt-2 pt-2 border-top border-white border-opacity-10">
            <div className="d-flex justify-content-between align-items-center mb-1 px-1">
              <span className="small text-secondary font-monospace" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                ROSTER ({team.filter(p => !p.fainted).length}/{team.length})
              </span>
            </div>

            <div className="team-roster-grid">
              {team.map((poke, idx) => {
                const hpPct = poke.hpPercent ?? 100;
                const hpClass = poke.fainted ? 'hp-fainted' : hpPct > 50 ? 'hp-high' : hpPct > 20 ? 'hp-med' : 'hp-low';
                const pokeName = poke.species || poke.name || '';
                const spriteSrc = getRosterSpriteUrl(pokeName, 0);

                const tooltipContent = (
                  <Tooltip id={`tt-poke-${slot}-${idx}`} className="poke-roster-tooltip">
                    <div className="text-start p-0.5">
                      <div className="fw-bold text-light mb-0.5">
                        {poke.species || poke.name} {poke.level ? `(Lv.${poke.level})` : ''}
                        {poke.active && <span className="ms-1.5 text-info fw-bold">[ACTIVE]</span>}
                      </div>
                      <div className="small text-secondary mb-1">
                        Types: {(poke.types || ['Normal']).join(' / ')}
                      </div>
                      <div className="small text-light mb-1">
                        HP: {poke.fainted ? 'Fainted' : `${poke.hp || hpPct}/${poke.maxhp || 100} (${hpPct}%)`}
                      </div>
                      {poke.ability && (
                        <div className="small text-info mb-0.5">
                          Ability: <span className="text-light">{poke.ability}</span>
                        </div>
                      )}
                      {poke.item && (
                        <div className="small text-warning mb-0.5">
                          Item: <span className="text-light">{poke.item}</span>
                        </div>
                      )}
                      {poke.moves && poke.moves.length > 0 && (
                        <div className="small text-secondary mt-1">
                          Moves: <span className="text-light">{(poke.moves || []).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </Tooltip>
                );

                return (
                  <OverlayTrigger key={idx} placement="top" delay={{ show: 100, hide: 50 }} overlay={tooltipContent}>
                    <div
                      className={`team-roster-chip ${poke.active ? 'active-chip' : ''} ${poke.fainted ? 'fainted-chip' : ''}`}
                      onClick={() => onSelectPokemon && onSelectPokemon(poke)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="chip-sprite-wrap">
                        <img
                          src={spriteSrc}
                          alt={pokeName}
                          className="chip-sprite"
                          loading="lazy"
                          onError={(e) => {
                            const stage = parseInt(e.target.dataset.fallbackStage || '0', 10) + 1;
                            if (stage <= 3) {
                              e.target.dataset.fallbackStage = stage;
                              e.target.src = getRosterSpriteUrl(pokeName, stage);
                            }
                          }}
                        />
                        {poke.active && <span className="chip-active-dot" />}
                      </div>

                      <div className="chip-details min-w-0">
                        <div className="d-flex justify-content-between align-items-center gap-1">
                          <span className="chip-name text-truncate">{poke.species || poke.name}</span>
                          <span className={`chip-hp-text font-monospace ${poke.fainted ? 'text-danger' : ''}`}>
                            {poke.fainted ? 'FNT' : `${hpPct}%`}
                          </span>
                        </div>
                        <div className="chip-hp-bar">
                          <div
                            className={`chip-hp-fill ${hpClass}`}
                            style={{ width: `${poke.fainted ? 0 : hpPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </OverlayTrigger>
                );
              })}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
