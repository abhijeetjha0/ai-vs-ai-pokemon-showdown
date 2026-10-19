import React from 'react';

export default function AdvantageBar({
  evalData = { p1WinChance: 50, p2WinChance: 50, formatted: '0.0', label: 'Even Match' },
  p1Name = 'Trainer 1',
  p2Name = 'Trainer 2',
  flipped = false
}) {
  const p1Pct = evalData.p1WinChance ?? 50;
  const p2Pct = evalData.p2WinChance ?? 50;

  const leftName = flipped ? p2Name : p1Name;
  const rightName = flipped ? p1Name : p2Name;
  const leftPct = flipped ? p2Pct : p1Pct;
  const rightPct = flipped ? p1Pct : p2Pct;
  const leftAccentClass = flipped ? 'p2-accent' : 'p1-accent';
  const rightAccentClass = flipped ? 'p1-accent' : 'p2-accent';
  const leftDotClass = flipped ? 'p2-dot' : 'p1-dot';
  const rightDotClass = flipped ? 'p1-dot' : 'p2-dot';

  return (
    <div
      className="advantage-bar-horizontal-wrapper"
      title={`Battle Advantage: ${evalData.formatted} (${evalData.label}) - ${leftName}: ${leftPct}%, ${rightName}: ${rightPct}%`}
      role="progressbar"
      aria-label="Battle Advantage Bar"
      aria-valuenow={leftPct}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      {/* Dynamic advantage fill */}
      <div
        className={`advantage-bar-horizontal-fill ${flipped ? 'flipped' : ''}`}
        style={{ width: `${leftPct}%` }}
      />

      {/* Content overlay */}
      <div className="advantage-bar-horizontal-content">
        <span className="advantage-bar-tag advantage-bar-tag-left">
          <span className={`advantage-bar-dot ${leftDotClass}`} />
          <span className={`fw-bold ${leftAccentClass} text-truncate`} style={{ maxWidth: '140px' }}>
            {leftName}
          </span>
          <span className="font-monospace text-light text-opacity-90">{leftPct}%</span>
        </span>

        <span className="advantage-bar-score-badge">
          {evalData.formatted} <span className="text-light text-opacity-75 ms-1">({evalData.label})</span>
        </span>

        <span className="advantage-bar-tag advantage-bar-tag-right">
          <span className="font-monospace text-light text-opacity-90">{rightPct}%</span>
          <span className={`fw-bold ${rightAccentClass} text-truncate`} style={{ maxWidth: '140px' }}>
            {rightName}
          </span>
          <span className={`advantage-bar-dot ${rightDotClass}`} />
        </span>
      </div>
    </div>
  );
}
