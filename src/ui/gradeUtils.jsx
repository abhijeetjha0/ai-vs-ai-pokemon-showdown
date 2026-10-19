import React from 'react';

export function getGradeClass(gradeStr = '') {
  if (!gradeStr) return 'grade-best';
  const clean = gradeStr.replace(/[^\w\s-]/g, '').trim();
  if (clean.includes('Brilliant')) return 'grade-brilliant';
  if (clean.includes('Best')) return 'grade-best';
  if (clean.includes('Good') || clean.includes('Strong') || clean.includes('Tactical')) return 'grade-good';
  if (clean.includes('Inaccuracy')) return 'grade-inaccuracy';
  if (clean.includes('Blunder')) return 'grade-blunder';
  return 'grade-solid';
}

export function renderGradeContent(gradeStr = '') {
  if (!gradeStr) {
    return (
      <span className="d-inline-flex align-items-center gap-1">
        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>stars</span>
        Best Move
      </span>
    );
  }
  const clean = gradeStr.replace(/[^\w\s-]/g, '').trim() || gradeStr;
  let icon = 'stars';
  if (clean.includes('Brilliant')) icon = 'auto_awesome';
  else if (clean.includes('Best')) icon = 'stars';
  else if (clean.includes('Good') || clean.includes('Strong')) icon = 'thumb_up';
  else if (clean.includes('Tactical')) icon = 'psychology';
  else if (clean.includes('Inaccuracy')) icon = 'warning';
  else if (clean.includes('Blunder')) icon = 'error';
  else if (clean.includes('Manual')) icon = 'pan_tool_alt';

  return (
    <span className="d-inline-flex align-items-center gap-1">
      <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>{icon}</span>
      {clean}
    </span>
  );
}
