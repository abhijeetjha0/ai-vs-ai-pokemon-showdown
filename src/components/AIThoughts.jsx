import React, { useRef, useEffect } from 'react';
import { Card, Badge } from 'react-bootstrap';
import { renderGradeContent, getGradeClass } from '../ui/gradeUtils.jsx';

function getEventConfig(type = '') {
  switch (type) {
    case 'switch':
      return { icon: 'swap_horiz', classes: 'border-info border-opacity-25 text-info' };
    case 'move':
      return { icon: 'swords', classes: 'border-secondary border-opacity-25 text-light text-opacity-90' };
    case 'damage':
      return { icon: 'heart_minus', classes: 'border-warning border-opacity-25 text-warning' };
    case 'faint':
      return { icon: 'skull', classes: 'border-danger border-opacity-50 text-danger bg-danger bg-opacity-10' };
    case 'effectiveness':
      return { icon: 'auto_awesome', classes: 'border-info border-opacity-25 text-info' };
    case 'crit':
      return { icon: 'flash_on', classes: 'border-danger border-opacity-50 text-danger' };
    case 'status':
      return { icon: 'crisis_alert', classes: 'border-warning border-opacity-50 text-warning' };
    case 'weather':
      return { icon: 'cloud', classes: 'border-info border-opacity-25 text-info' };
    case 'win':
      return { icon: 'emoji_events', classes: 'border-warning border-opacity-75 text-warning fw-bold bg-warning bg-opacity-15' };
    default:
      return { icon: 'info', classes: 'border-secondary border-opacity-25 text-secondary' };
  }
}

function formatActionBadge(action, fallbackText) {
  if (fallbackText) return fallbackText;
  if (!action) return 'Action';
  if (action.type === 'switch') {
    const target = action.targetName || (action.choice ? `Bench #${action.choice}` : 'Switch');
    return `Switch to ${target}`;
  }
  const moveName = action.targetName || (action.choice ? `Move #${action.choice}` : 'Attack');
  return `${moveName}${action.terastallize ? ' [TERA]' : ''}`;
}

export default function AIThoughts({
  streamEntries = [],
  thoughtEntries = [],
  log = []
}) {
  const streamEndRef = useRef(null);

  // If streamEntries is provided, use it; otherwise merge thoughtEntries and log
  const items = streamEntries.length > 0
    ? streamEntries
    : [
        ...thoughtEntries.map((t, idx) => ({ ...t, kind: 'thought', id: t.id || `th-${idx}`, timestamp: t.timestamp || idx * 10 })),
        ...log.map((l, idx) => ({ ...l, kind: 'event', id: l.id || `lg-${idx}`, timestamp: l.timestamp || idx * 10 + 1 }))
      ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const thoughtCount = items.filter(e => e.kind === 'thought').length;

  useEffect(() => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items.length]);

  return (
    <Card className="history-card glass-panel border border-secondary border-opacity-25">
      <Card.Header className="p-2.5 px-3 border-bottom border-secondary border-opacity-25 bg-transparent d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="material-symbols-rounded text-info fs-5 align-middle">psychology</span>
          <span className="fw-bold small text-light" style={{ fontSize: '0.85rem' }}>AI Thoughts</span>
        </div>
        <Badge
          bg="dark"
          className="border border-secondary border-opacity-50 text-info fw-bold px-2 py-1 font-monospace"
        >
          {thoughtCount}
        </Badge>
      </Card.Header>

      <Card.Body
        className="p-0 d-flex flex-column flex-grow-1 overflow-hidden"
        style={{ minHeight: 0, height: '100%' }}
      >
        <div
          className="thoughts-stream-container p-2 flex-grow-1"
          style={{ minHeight: 0, overflowY: 'auto' }}
        >
          {items.length === 0 ? (
            <div className="thoughts-empty text-center py-4 text-muted">
              <span className="material-symbols-rounded fs-2 d-block mb-1 text-secondary opacity-50">
                psychology
              </span>
              <span className="small">
                Model thoughts, combat events, and decision model commentary will appear here live during play.
              </span>
            </div>
          ) : (
            <>
              {items.map((entry) => {
                if (entry.kind === 'thought') {
                  const isP1 = entry.playerSlot === 'p1';
                  return (
                    <Card
                      key={entry.id}
                      className={`thought-stream-card mb-2 border-secondary border-opacity-25 bg-dark bg-opacity-50 ${
                        isP1
                          ? 'stream-white border-start border-3 border-info'
                          : 'stream-black border-start border-3 border-purple'
                      }`}
                    >
                      <Card.Body className="p-2">
                        {/* Header: Concise Player & Turn Indicator */}
                        <div className="stream-card-header d-flex justify-content-between align-items-center mb-1">
                          <Badge
                            bg={isP1 ? 'info' : 'purple-subtle'}
                            text={isP1 ? 'dark' : 'light'}
                            className="fw-semibold px-2 py-0.5 small d-inline-flex align-items-center gap-1.5 font-monospace"
                            style={{
                              background: !isP1 ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(147, 51, 234, 0.6))' : undefined,
                              border: !isP1 ? '1px solid rgba(168, 85, 247, 0.5)' : undefined
                            }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '11px' }}>circle</span>
                            {isP1 ? 'Player 1' : 'Player 2'} • Turn {entry.turn}
                          </Badge>
                        </div>

                        {/* Proposal Row: Action Badge + Reasoning */}
                        <div className="stream-proposal-row d-flex align-items-baseline gap-2 mb-1">
                          <Badge
                            bg={entry.action?.type === 'switch' ? 'warning' : 'primary'}
                            className="stream-move-badge font-monospace px-2 py-0.5 flex-shrink-0"
                            style={{ fontSize: '0.74rem' }}
                          >
                            {formatActionBadge(entry.action, entry.actionText)}
                          </Badge>
                          <div
                            className="stream-reasoning-text text-light text-opacity-90"
                            style={{ fontSize: '0.74rem', lineHeight: '1.3' }}
                          >
                            {entry.reasoning}
                          </div>
                        </div>

                        {/* Arbiter Verdict Box */}
                        {(entry.grade || (entry.arbiterCommentary && !entry.arbiterCommentary.toLowerCase().includes('manual player move'))) && (
                          <div className="stream-arbiter-verdict-box p-1.5 rounded bg-black bg-opacity-30 border border-secondary border-opacity-25 mt-1.5">
                            <div className="stream-arbiter-header d-flex justify-content-between align-items-center">
                              <span
                                className="text-warning fw-semibold d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '0.7rem' }}
                              >
                                <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>balance</span>
                                Decision Model
                              </span>
                              {entry.grade && (
                                <span
                                  className={`stream-grade-badge ${getGradeClass(entry.grade)}`}
                                  style={{ fontSize: '0.68rem' }}
                                >
                                  {renderGradeContent(entry.grade)}
                                </span>
                              )}
                            </div>
                            {entry.arbiterCommentary && !entry.arbiterCommentary.toLowerCase().includes('manual player move') && (
                              <div
                                className="stream-arbiter-commentary fst-italic text-light text-opacity-75 mt-1"
                                style={{ fontSize: '0.72rem', lineHeight: '1.25' }}
                              >
                                "{entry.arbiterCommentary}"
                              </div>
                            )}
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  );
                }

                // Kind === 'event' (Battle combat log event)
                if (entry.type === 'turn') {
                  return (
                    <div key={entry.id} className="stream-turn-divider d-flex align-items-center gap-2 my-2 opacity-75">
                      <div className="flex-grow-1 border-bottom border-secondary border-opacity-25"></div>
                      <span className="badge bg-dark border border-secondary border-opacity-50 text-light font-monospace small px-2 py-0.5">
                        {entry.text}
                      </span>
                      <div className="flex-grow-1 border-bottom border-secondary border-opacity-25"></div>
                    </div>
                  );
                }

                const cfg = getEventConfig(entry.type);
                return (
                  <div
                    key={entry.id}
                    className={`stream-event-item font-monospace small d-flex align-items-center gap-2 px-2 py-1 mb-1 rounded border ${cfg.classes}`}
                    style={{ background: 'rgba(0, 0, 0, 0.28)' }}
                  >
                    <span className="material-symbols-rounded flex-shrink-0" style={{ fontSize: '14px' }}>
                      {cfg.icon}
                    </span>
                    <span style={{ fontSize: '0.74rem' }}>{entry.text}</span>
                  </div>
                );
              })}
              <div ref={streamEndRef} />
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
