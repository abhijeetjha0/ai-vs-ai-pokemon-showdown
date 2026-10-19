import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { Dex } from '@pkmn/sim';
import { getDetailSpriteUrl } from '../pokemon/sprites.js';

export default function PokemonDetailModal({
  show,
  onHide,
  pokemon
}) {
  if (!pokemon) return null;

  const pokeName = pokemon.species || pokemon.name || '';
  const spriteSrc = getDetailSpriteUrl(pokeName, 0);

  const speciesData = Dex.species.get(pokemon.species || pokemon.name);
  const types = pokemon.types || speciesData.types || ['Normal'];
  const hpPct = pokemon.hpPercent ?? 100;
  const isFainted = Boolean(pokemon.fainted);

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="md"
      className="glass-modal theme-dark"
      contentClassName="glass-panel text-light border border-secondary border-opacity-25"
    >
      <Modal.Header closeButton closeVariant="white" className="border-bottom border-white border-opacity-10 py-2.5">
        <Modal.Title className="d-flex align-items-center gap-2 fs-6 min-w-0 flex-grow-1 me-3">
          <span className="material-symbols-rounded text-info fs-5 flex-shrink-0">info</span>
          <span className="fw-bold text-truncate" title={pokeName}>{pokeName}</span>
          <span className="badge bg-dark border border-secondary text-secondary font-monospace flex-shrink-0" style={{ fontSize: '0.72rem' }}>
            Lv.{pokemon.level || 100}
          </span>
          {pokemon.active && (
            <Badge bg="info" className="text-dark fw-bold ms-auto flex-shrink-0" style={{ fontSize: '0.68rem' }}>
              ACTIVE
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        {/* Top Overview: Sprite & Core Attributes */}
        <div className="d-flex align-items-center gap-3 mb-3 p-2 rounded bg-black bg-opacity-30 border border-white border-opacity-5">
          <div className="detail-sprite-container d-flex align-items-center justify-content-center bg-dark bg-opacity-40 rounded p-2" style={{ width: '80px', height: '80px' }}>
            <img
              src={spriteSrc}
              alt={pokeName}
              style={{ maxHeight: '70px', maxWidth: '70px', objectFit: 'contain' }}
              onError={(e) => {
                const stage = parseInt(e.target.dataset.fallbackStage || '0', 10) + 1;
                if (stage <= 4) {
                  e.target.dataset.fallbackStage = stage;
                  e.target.src = getDetailSpriteUrl(pokeName, stage);
                }
              }}
            />
          </div>

          <div className="flex-grow-1 min-w-0">
            {/* Pokemon Name & Level Header */}
            <div className="d-flex align-items-center gap-2 mb-1.5 min-w-0">
              <span className="fw-bold fs-5 text-light text-truncate" title={pokeName}>
                {pokeName}
              </span>
              <span className="badge bg-dark bg-opacity-75 border border-secondary border-opacity-50 text-secondary font-monospace flex-shrink-0" style={{ fontSize: '0.75rem' }}>
                Lv.{pokemon.level || 100}
              </span>
            </div>

            <div className="d-flex align-items-center gap-1.5 mb-1.5 flex-wrap">
              {types.map((t) => (
                <span key={t} className={`type-badge type-${t.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                  {t}
                </span>
              ))}
              {pokemon.status ? (
                <span className={`status-badge status-${pokemon.status.toLowerCase()}`}>
                  {pokemon.status.toUpperCase()}
                </span>
              ) : (
                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50" style={{ fontSize: '0.7rem' }}>
                  HEALTHY
                </span>
              )}
            </div>

            {/* HP Gauge */}
            <div className="mb-1">
              <div className="d-flex justify-content-between small font-monospace text-secondary mb-0.5">
                <span>HP Status</span>
                <span className={isFainted ? 'text-danger fw-bold' : 'text-light'}>
                  {isFainted ? 'FAINTED (0%)' : `${pokemon.hp || hpPct}/${pokemon.maxhp || 100} (${hpPct}%)`}
                </span>
              </div>
              <div className="hp-bar-track" style={{ height: '7px' }}>
                <div
                  className={`hp-bar-fill ${isFainted ? 'hp-fainted' : hpPct > 50 ? 'hp-high' : hpPct > 20 ? 'hp-med' : 'hp-low'}`}
                  style={{ width: `${isFainted ? 0 : hpPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ability & Item Info */}
        <div className="row g-2 mb-3">
          <div className="col-6">
            <div className="p-2 rounded bg-black bg-opacity-20 border border-white border-opacity-5 h-100">
              <div className="text-secondary small font-monospace mb-0.5">ABILITY</div>
              <div className="text-info fw-semibold small text-truncate">
                {pokemon.ability || 'Standard Ability'}
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="p-2 rounded bg-black bg-opacity-20 border border-white border-opacity-5 h-100">
              <div className="text-secondary small font-monospace mb-0.5">HELD ITEM</div>
              <div className="text-warning fw-semibold small text-truncate">
                {pokemon.item || 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Moveset */}
        <div>
          <div className="text-secondary small font-monospace mb-1.5 d-flex justify-content-between align-items-center">
            <span>MOVESET</span>
            <span style={{ fontSize: '0.7rem' }}>4 SLOTS</span>
          </div>
          <div className="row g-2">
            {(pokemon.moves && pokemon.moves.length > 0 ? pokemon.moves : ['Tackle', 'Protect']).map((move, idx) => {
              const moveData = Dex.moves.get(move);
              const moveType = moveData?.type || 'Normal';
              return (
                <div key={idx} className="col-6">
                  <div className="p-2 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-25 d-flex flex-column gap-0.5">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-light fw-medium small text-truncate" title={moveData.name || move}>
                        {moveData.name || move}
                      </span>
                      <span className={`type-badge type-${moveType.toLowerCase()}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                        {moveType}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between small text-secondary font-monospace" style={{ fontSize: '0.68rem' }}>
                      <span>PWR: {moveData.basePower || '-'}</span>
                      <span>ACC: {moveData.accuracy === true ? '100%' : moveData.accuracy ? `${moveData.accuracy}%` : '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-top border-white border-opacity-10 py-2">
        <Button variant="secondary" size="sm" onClick={onHide} className="px-3">
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
