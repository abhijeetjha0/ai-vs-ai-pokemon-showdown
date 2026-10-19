import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Nav, Badge, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Dex, Teams } from '@pkmn/sim';
import { PRESET_TEAMS, POPULAR_ITEMS, POKEMON_TYPES } from '../data/preset-teams.js';
import { getRosterSpriteUrl } from '../pokemon/sprites.js';

export default function TeamBuilderModal({
  show,
  onHide,
  p1CustomTeam,
  p2CustomTeam,
  onApplyTeams,
  onResetToRandom
}) {
  const [activeTrainer, setActiveTrainer] = useState('p1'); // 'p1' | 'p2'
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'text'

  // Team state stored as standard Pokémon sets array for each trainer
  const [p1Team, setP1Team] = useState(() => {
    if (p1CustomTeam) {
      return typeof p1CustomTeam === 'string' ? Teams.import(p1CustomTeam) : p1CustomTeam;
    }
    return Teams.import(PRESET_TEAMS[3].text); // Paldea Titans default
  });

  const [p2Team, setP2Team] = useState(() => {
    if (p2CustomTeam) {
      return typeof p2CustomTeam === 'string' ? Teams.import(p2CustomTeam) : p2CustomTeam;
    }
    return Teams.import(PRESET_TEAMS[0].text); // Kanto Legends default
  });

  const [showdownText, setShowdownText] = useState('');
  const [importError, setImportError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (show) {
      if (p1CustomTeam) {
        setP1Team(typeof p1CustomTeam === 'string' ? Teams.import(p1CustomTeam) : p1CustomTeam);
      }
      if (p2CustomTeam) {
        setP2Team(typeof p2CustomTeam === 'string' ? Teams.import(p2CustomTeam) : p2CustomTeam);
      }
    }
  }, [show, p1CustomTeam, p2CustomTeam]);

  // Current team depending on active trainer tab
  const currentTeam = activeTrainer === 'p1' ? p1Team : p2Team;
  const setCurrentTeam = (newTeam) => {
    if (activeTrainer === 'p1') setP1Team(newTeam);
    else setP2Team(newTeam);
  };

  // Sync showdownText when active trainer changes or tab switches to text
  useEffect(() => {
    if (currentTeam && currentTeam.length > 0) {
      try {
        setShowdownText(Teams.export(currentTeam));
      } catch (e) {
        setShowdownText('');
      }
    } else {
      setShowdownText('');
    }
  }, [activeTrainer, activeTab, currentTeam]);

  // Load a preset team
  const handleLoadPreset = (presetText) => {
    try {
      const imported = Teams.import(presetText);
      if (imported && imported.length > 0) {
        setCurrentTeam(imported);
        setShowdownText(presetText);
        setImportError('');
      }
    } catch (err) {
      setImportError('Failed to load preset: ' + err.message);
    }
  };

  // Roll a fresh random battle team
  const handleRollRandom = () => {
    try {
      const rand = Teams.generate('gen9randombattle');
      setCurrentTeam(rand);
      setShowdownText(Teams.export(rand));
      setImportError('');
    } catch (err) {
      setImportError('Failed to generate random team: ' + err.message);
    }
  };

  // Swap P1 and P2 teams
  const handleSwapTeams = () => {
    const temp = [...p1Team];
    setP1Team([...p2Team]);
    setP2Team(temp);
  };

  // Import from textarea
  const handleImportText = () => {
    if (!showdownText.trim()) {
      setImportError('Please paste Showdown team export text first.');
      return;
    }
    try {
      const imported = Teams.import(showdownText);
      if (!imported || imported.length === 0) {
        throw new Error('No valid Pokémon found in text.');
      }
      setCurrentTeam(imported);
      setImportError('');
      setActiveTab('visual');
    } catch (err) {
      setImportError('Invalid Showdown export text: ' + err.message);
    }
  };

  // Copy team export to clipboard
  const handleCopyText = async () => {
    try {
      const exportString = Teams.export(currentTeam);
      await navigator.clipboard.writeText(exportString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (e) {
      setImportError('Could not copy to clipboard.');
    }
  };

  // Update a single slot in visual editor
  const handleUpdateSlot = (slotIdx, field, val) => {
    const updated = [...currentTeam];
    if (!updated[slotIdx]) {
      updated[slotIdx] = {
        name: 'Pikachu',
        species: 'Pikachu',
        item: 'Light Ball',
        ability: 'Static',
        moves: ['Thunderbolt', 'Volt Switch', 'Surf', 'Grass Knot'],
        teraType: 'Electric'
      };
    }

    if (field === 'species') {
      const cleanSpecies = val.trim();
      const spec = Dex.species.get(cleanSpecies);
      updated[slotIdx] = {
        ...updated[slotIdx],
        name: spec.name || cleanSpecies,
        species: spec.name || cleanSpecies,
        ability: spec.abilities ? Object.values(spec.abilities)[0] : updated[slotIdx].ability,
        teraType: spec.types ? spec.types[0] : 'Normal'
      };
    } else if (field.startsWith('move-')) {
      const moveIdx = parseInt(field.split('-')[1], 10);
      const moves = [...(updated[slotIdx].moves || [])];
      moves[moveIdx] = val;
      updated[slotIdx] = { ...updated[slotIdx], moves };
    } else {
      updated[slotIdx] = { ...updated[slotIdx], [field]: val };
    }

    setCurrentTeam(updated);
  };

  // Clear slot
  const handleClearSlot = (slotIdx) => {
    const updated = currentTeam.filter((_, idx) => idx !== slotIdx);
    setCurrentTeam(updated);
  };

  // Add empty slot
  const handleAddSlot = () => {
    if (currentTeam.length >= 6) return;
    const newPoke = {
      name: 'Great Tusk',
      species: 'Great Tusk',
      item: 'Booster Energy',
      ability: 'Protosynthesis',
      moves: ['Earthquake', 'Close Combat', 'Ice Spinner', 'Rapid Spin'],
      teraType: 'Ground'
    };
    setCurrentTeam([...currentTeam, newPoke]);
  };

  // Apply teams and restart battle
  const handleApply = () => {
    onApplyTeams({
      p1Team: p1Team.length > 0 ? p1Team : null,
      p2Team: p2Team.length > 0 ? p2Team : null
    });
    onHide();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      className="glass-modal theme-dark"
      contentClassName="glass-panel text-light border border-secondary border-opacity-25"
    >
      <Modal.Header closeButton closeVariant="white" className="border-bottom border-white border-opacity-10 py-2.5">
        <Modal.Title className="d-flex align-items-center gap-2 fs-6">
          <span className="material-symbols-rounded text-info fs-5">edit_note</span>
          <span className="fw-bold">Pokémon Teambuilder</span>
          <Badge bg="dark" className="border border-secondary text-secondary font-monospace ms-2" style={{ fontSize: '0.72rem' }}>
            Gen 9 Showdown
          </Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3">
        {/* TOP TRAINER TOGGLE & CONTROLS */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom border-white border-opacity-10">
          {/* Trainer Switcher Tabs */}
          <Nav variant="pills" activeKey={activeTrainer} onSelect={(k) => setActiveTrainer(k)} className="gap-1 bg-black bg-opacity-40 p-1 rounded border border-secondary border-opacity-25">
            <Nav.Item>
              <Nav.Link eventKey="p1" className="d-flex align-items-center gap-1.5 py-1 px-3 small font-monospace">
                <span className="material-symbols-rounded fs-6 text-info">sports_kabaddi</span>
                <span>Trainer 1 (P1)</span>
                <Badge bg="info" className="text-dark ms-1" style={{ fontSize: '0.65rem' }}>{p1Team.length}/6</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="p2" className="d-flex align-items-center gap-1.5 py-1 px-3 small font-monospace">
                <span className="material-symbols-rounded fs-6 text-warning">sports_kabaddi</span>
                <span>Trainer 2 (P2)</span>
                <Badge bg="warning" className="text-dark ms-1" style={{ fontSize: '0.65rem' }}>{p2Team.length}/6</Badge>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Utility Action Buttons */}
          <div className="d-flex align-items-center gap-1.5">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleSwapTeams}
              className="d-flex align-items-center gap-1 font-monospace"
              style={{ fontSize: '0.75rem' }}
              title="Swap Trainer 1 and Trainer 2 teams"
            >
              <span className="material-symbols-rounded fs-6">swap_horiz</span>
              <span className="d-none d-sm-inline">Swap P1/P2</span>
            </Button>

            {/* Mode Tabs (Visual vs Showdown Text) */}
            <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="gap-1 bg-black bg-opacity-40 p-0.5 rounded border border-secondary border-opacity-25">
              <Nav.Item>
                <Nav.Link eventKey="visual" className="py-1 px-2.5 small font-monospace" style={{ fontSize: '0.75rem' }}>
                  Visual Grid
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="text" className="py-1 px-2.5 small font-monospace" style={{ fontSize: '0.75rem' }}>
                  Showdown Text
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
        </div>

        {/* PRESET TEAMS QUICK-LOAD ROW */}
        <div className="mb-3 p-2 rounded bg-black bg-opacity-25 border border-white border-opacity-5">
          <div className="d-flex align-items-center justify-content-between mb-1.5">
            <span className="text-secondary small font-monospace" style={{ fontSize: '0.72rem' }}>
              ONE-CLICK COMPETITIVE PRESETS
            </span>
            <Button
              variant="outline-info"
              size="sm"
              onClick={handleRollRandom}
              className="d-flex align-items-center gap-1 py-0 px-2 font-monospace"
              style={{ fontSize: '0.72rem', height: '24px' }}
            >
              <span className="material-symbols-rounded fs-6">casino</span>
              <span>Roll Random Team</span>
            </Button>
          </div>

          <div className="d-flex flex-wrap gap-1.5">
            {PRESET_TEAMS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline-secondary"
                size="sm"
                onClick={() => handleLoadPreset(preset.text)}
                className="d-flex align-items-center gap-1 py-1 px-2 font-monospace border-opacity-50"
                style={{ fontSize: '0.75rem' }}
                title={preset.description}
              >
                <span className="material-symbols-rounded fs-6 text-warning">{preset.icon}</span>
                <span>{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {importError && (
          <Alert variant="danger" className="py-1.5 px-3 small mb-3 border-danger border-opacity-50 font-monospace">
            {importError}
          </Alert>
        )}

        {/* VISUAL 6-SLOT TEAM BUILDER */}
        {activeTab === 'visual' ? (
          <div>
            <div className="row g-2 mb-2">
              {currentTeam.map((poke, slotIdx) => {
                const specData = Dex.species.get(poke.species || poke.name);
                const types = specData.types || ['Normal'];
                const pokeName = poke.species || poke.name || '';
                const spriteSrc = getRosterSpriteUrl(pokeName, 0);

                return (
                  <div key={slotIdx} className="col-12 col-md-6 col-lg-4">
                    <div className="p-2.5 rounded bg-dark bg-opacity-50 border border-secondary border-opacity-25 h-100 d-flex flex-column gap-2 teambuilder-slot-card">
                      {/* Slot Header */}
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg="dark" className="border border-secondary text-secondary font-monospace">
                            #{slotIdx + 1}
                          </Badge>
                          <div className="slot-sprite-wrap" style={{ width: '32px', height: '32px' }}>
                            <img
                              src={spriteSrc}
                              alt={pokeName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => {
                                const stage = parseInt(e.target.dataset.fallbackStage || '0', 10) + 1;
                                if (stage <= 3) {
                                  e.target.dataset.fallbackStage = stage;
                                  e.target.src = getRosterSpriteUrl(pokeName, stage);
                                }
                              }}
                            />
                          </div>
                          <span className="fw-bold small text-light text-truncate" style={{ maxWidth: '120px' }}>
                            {poke.species || poke.name}
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-1">
                          {types.map((t) => (
                            <span key={t} className={`type-badge type-${t.toLowerCase()}`} style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                              {t}
                            </span>
                          ))}
                          <Button
                            variant="link"
                            className="p-0 text-secondary hover-danger ms-1"
                            onClick={() => handleClearSlot(slotIdx)}
                            title="Remove Pokémon"
                            style={{ textDecoration: 'none' }}
                          >
                            <span className="material-symbols-rounded fs-6">delete</span>
                          </Button>
                        </div>
                      </div>

                      {/* Species Input */}
                      <Form.Group>
                        <Form.Label className="text-secondary font-monospace mb-0.5" style={{ fontSize: '0.68rem' }}>
                          SPECIES
                        </Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={poke.species || poke.name || ''}
                          onChange={(e) => handleUpdateSlot(slotIdx, 'species', e.target.value)}
                          className="bg-dark text-light border-secondary border-opacity-50 font-monospace py-0.5"
                          style={{ fontSize: '0.78rem' }}
                        />
                      </Form.Group>

                      {/* Item & Ability Row */}
                      <div className="row g-1.5">
                        <div className="col-6">
                          <Form.Label className="text-secondary font-monospace mb-0.5" style={{ fontSize: '0.68rem' }}>
                            HELD ITEM
                          </Form.Label>
                          <Form.Control
                            size="sm"
                            type="text"
                            value={poke.item || ''}
                            onChange={(e) => handleUpdateSlot(slotIdx, 'item', e.target.value)}
                            placeholder="e.g. Leftovers"
                            className="bg-dark text-light border-secondary border-opacity-50 font-monospace py-0.5"
                            style={{ fontSize: '0.75rem' }}
                          />
                        </div>
                        <div className="col-6">
                          <Form.Label className="text-secondary font-monospace mb-0.5" style={{ fontSize: '0.68rem' }}>
                            ABILITY
                          </Form.Label>
                          <Form.Control
                            size="sm"
                            type="text"
                            value={poke.ability || ''}
                            onChange={(e) => handleUpdateSlot(slotIdx, 'ability', e.target.value)}
                            placeholder="e.g. Static"
                            className="bg-dark text-light border-secondary border-opacity-50 font-monospace py-0.5"
                            style={{ fontSize: '0.75rem' }}
                          />
                        </div>
                      </div>

                      {/* Tera Type Selector */}
                      <div>
                        <Form.Label className="text-secondary font-monospace mb-0.5" style={{ fontSize: '0.68rem' }}>
                          TERA TYPE
                        </Form.Label>
                        <Form.Select
                          size="sm"
                          value={poke.teraType || types[0] || 'Normal'}
                          onChange={(e) => handleUpdateSlot(slotIdx, 'teraType', e.target.value)}
                          className="bg-dark text-light border-secondary border-opacity-50 font-monospace py-0.5"
                          style={{ fontSize: '0.75rem' }}
                        >
                          {POKEMON_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </Form.Select>
                      </div>

                      {/* 4 Moves */}
                      <div>
                        <Form.Label className="text-secondary font-monospace mb-0.5" style={{ fontSize: '0.68rem' }}>
                          MOVESET (4 MOVES)
                        </Form.Label>
                        <div className="row g-1">
                          {[0, 1, 2, 3].map((mIdx) => (
                            <div key={mIdx} className="col-6">
                              <Form.Control
                                size="sm"
                                type="text"
                                value={poke.moves?.[mIdx] || ''}
                                onChange={(e) => handleUpdateSlot(slotIdx, `move-${mIdx}`, e.target.value)}
                                placeholder={`Move ${mIdx + 1}`}
                                className="bg-dark text-light border-secondary border-opacity-50 font-monospace py-0.5"
                                style={{ fontSize: '0.72rem' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Pokémon Slot (if under 6) */}
              {currentTeam.length < 6 && (
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    onClick={handleAddSlot}
                    className="p-3 rounded border border-dashed border-secondary border-opacity-50 h-100 d-flex flex-column align-items-center justify-content-center gap-1.5 cursor-pointer text-secondary hover-light"
                    style={{ minHeight: '220px', cursor: 'pointer' }}
                  >
                    <span className="material-symbols-rounded fs-3 text-info">add_circle</span>
                    <span className="font-monospace small">Add Pokémon Slot ({currentTeam.length}/6)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* SHOWDOWN TEXT IMPORT / EXPORT VIEW */
          <div>
            <div className="d-flex justify-content-between align-items-center mb-1.5">
              <span className="text-secondary small font-monospace" style={{ fontSize: '0.72rem' }}>
                STANDARD SHOWDOWN FORMAT (POKEPASTE COMPATIBLE)
              </span>
              <div className="d-flex gap-1.5">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleCopyText}
                  className="d-flex align-items-center gap-1 font-monospace py-0.5 px-2"
                  style={{ fontSize: '0.75rem' }}
                >
                  <span className="material-symbols-rounded fs-6">
                    {copySuccess ? 'check' : 'content_copy'}
                  </span>
                  <span>{copySuccess ? 'Copied!' : 'Copy to Clipboard'}</span>
                </Button>
                <Button
                  variant="info"
                  size="sm"
                  onClick={handleImportText}
                  className="d-flex align-items-center gap-1 font-monospace py-0.5 px-2 text-dark fw-bold"
                  style={{ fontSize: '0.75rem' }}
                >
                  <span className="material-symbols-rounded fs-6">download</span>
                  <span>Import Text to Team</span>
                </Button>
              </div>
            </div>

            <Form.Control
              as="textarea"
              rows={14}
              value={showdownText}
              onChange={(e) => setShowdownText(e.target.value)}
              placeholder="Paste Showdown team export here..."
              className="bg-dark text-light border-secondary border-opacity-50 font-monospace small"
              style={{ fontSize: '0.82rem', lineHeight: '1.45' }}
            />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top border-white border-opacity-10 py-2 d-flex justify-content-between align-items-center">
        <Button
          variant="outline-danger"
          size="sm"
          onClick={() => {
            onResetToRandom();
            onHide();
          }}
          className="d-flex align-items-center gap-1 font-monospace"
          style={{ fontSize: '0.78rem' }}
        >
          <span className="material-symbols-rounded fs-6">restart_alt</span>
          <span>Revert to Pure Random Battles</span>
        </Button>

        <div className="d-flex align-items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onHide} className="px-3">
            Cancel
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleApply}
            className="d-flex align-items-center gap-1 px-3 text-dark fw-bold"
          >
            <span className="material-symbols-rounded fs-6">sports_kabaddi</span>
            <span>Apply & Start Battle</span>
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
