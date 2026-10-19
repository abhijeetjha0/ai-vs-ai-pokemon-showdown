import React from 'react';
import { Card, Badge, Spinner, Form } from 'react-bootstrap';

export default function ArbiterCard({
  model,
  arbiterModel,
  decisionModels,
  availableModels = [],
  onModelChange,
  isEvaluating: propIsEvaluating,
  arbiterState = { isEvaluating: false, proposedAction: null, finalAction: null, grade: '', commentary: '' }
}) {
  const currentModel = model || arbiterModel;
  const models = decisionModels || availableModels;
  if (!models || models.length === 0) return null;

  const isEvaluating = arbiterState?.isEvaluating;
  const hasVerdict = Boolean(arbiterState?.finalAction);

  const statusVariant = isEvaluating ? 'warning' : hasVerdict ? 'success' : 'secondary';
  const statusText = isEvaluating ? 'EVALUATING...' : hasVerdict ? 'ADJUDICATED' : 'STANDBY';

  return (
    <Card className="arbiter-card glass-panel compact-arbiter-card border border-secondary border-opacity-25">
      <Card.Body className="p-0">
        <div className="arbiter-header d-flex justify-content-between align-items-center gap-2 mb-0">
          {/* ARBITER IDENTITY */}
          <div className="arbiter-identity d-flex align-items-center gap-1.5 flex-shrink-0" style={{ minWidth: '125px' }}>
            <span className="material-symbols-rounded arbiter-badge-icon fs-5 text-warning">balance</span>
            <span className="arbiter-title small text-light fw-bold" style={{ fontSize: '0.85rem' }}>
              Decision Model
            </span>
          </div>

          {/* IN-CARD DECISION MODEL SELECTOR DROPDOWN */}
          <div className="arbiter-model-select-wrap flex-grow-1 mx-2" style={{ maxWidth: '175px' }}>
            <Form.Select
              size="sm"
              className="compact-select in-card-select"
              value={currentModel || ''}
              onChange={(e) => onModelChange && onModelChange(e.target.value)}
              disabled={models.length === 0}
              title={currentModel}
              aria-label="Decision Model"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </Form.Select>
          </div>

          {/* ARBITER STATUS PILL */}
          <Badge
            bg={statusVariant}
            className={`arbiter-status-pill ${isEvaluating ? 'evaluating' : hasVerdict ? 'approved' : 'standby'} d-flex align-items-center justify-content-center gap-1 text-light shadow-sm flex-shrink-0`}
            style={{ fontSize: '0.7rem', minWidth: '78px' }}
          >
            {isEvaluating && (
              <Spinner
                animation="border"
                size="sm"
                style={{ width: '10px', height: '10px', borderWidth: '1.5px' }}
              />
            )}
            {statusText}
          </Badge>
        </div>
      </Card.Body>
    </Card>
  );
}
