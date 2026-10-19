import React, { useState } from 'react';
import { Offcanvas, Form, Button, Nav } from 'react-bootstrap';

export default function ApiDrawer({
  show,
  onHide,
  config,
  onSaveConfig,
  onRefreshModels,
  isRefreshing
}) {
  const [formData, setFormData] = useState({ ...config });

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onHide();
  };

  return (
    <Offcanvas
      show={show}
      onHide={onHide}
      placement="end"
      className="glass-panel text-light border-start border-glass"
      style={{ width: '420px', maxWidth: '100vw' }}
    >
      <Offcanvas.Header closeButton closeVariant="white" className="border-bottom border-glass">
        <Offcanvas.Title className="d-flex align-items-center gap-2">
          <span className="material-symbols-rounded text-info fs-5">settings</span>
          <span className="fw-bold">API & Battle Settings</span>
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="d-flex flex-column gap-3">
        {/* Provider Tabs */}
        <div>
          <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">
            Active Provider
          </Form.Label>
          <Nav
            variant="pills"
            activeKey={formData.provider}
            onSelect={(k) => handleChange('provider', k)}
            className="gap-1 bg-dark p-1 rounded border border-secondary border-opacity-25"
          >
            <Nav.Item className="flex-fill">
              <Nav.Link eventKey="ollama" className="text-center font-monospace py-1 small">
                Ollama
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="flex-fill">
              <Nav.Link eventKey="openai" className="text-center font-monospace py-1 small">
                OpenAI
              </Nav.Link>
            </Nav.Item>
            <Nav.Item className="flex-fill">
              <Nav.Link eventKey="offline" className="text-center font-monospace py-1 small">
                Offline
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        {/* Ollama Settings */}
        {formData.provider === 'ollama' && (
          <div className="p-3 rounded bg-dark bg-opacity-40 border border-secondary border-opacity-20 d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label className="small text-light">Ollama Host URL</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={formData.ollamaBaseUrl}
                onChange={(e) => handleChange('ollamaBaseUrl', e.target.value)}
                placeholder="http://localhost:11434"
                className="bg-dark text-light border-secondary border-opacity-50 font-monospace"
              />
              <Form.Text className="text-secondary small">
                Vite proxy maps <code>/ollama</code> to bypass CORS automatically.
              </Form.Text>
            </Form.Group>

            <Form.Check
              type="switch"
              id="fast-thinking-switch"
              label="Fast Reasoning Bypass (sub-2s turns)"
              checked={formData.fastThinking}
              onChange={(e) => handleChange('fastThinking', e.target.checked)}
              className="small text-light"
            />
          </div>
        )}

        {/* OpenAI Settings */}
        {formData.provider === 'openai' && (
          <div className="p-3 rounded bg-dark bg-opacity-40 border border-secondary border-opacity-20 d-flex flex-column gap-3">
            <Form.Group>
              <Form.Label className="small text-light">OpenAI-Compatible Endpoint</Form.Label>
              <Form.Control
                type="text"
                size="sm"
                value={formData.openaiBaseUrl}
                onChange={(e) => handleChange('openaiBaseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="bg-dark text-light border-secondary border-opacity-50 font-monospace"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="small text-light">API Key</Form.Label>
              <Form.Control
                type="password"
                size="sm"
                value={formData.openaiApiKey}
                onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                placeholder="sk-..."
                className="bg-dark text-light border-secondary border-opacity-50 font-monospace"
              />
            </Form.Group>
          </div>
        )}

        {/* Offline Engine Info */}
        {formData.provider === 'offline' && (
          <div className="p-3 rounded bg-dark bg-opacity-40 border border-secondary border-opacity-20">
            <div className="fw-semibold text-success small mb-1 d-flex align-items-center gap-1">
              <span className="material-symbols-rounded fs-6">check_circle</span>
              Offline Engine Active
            </div>
            <p className="text-secondary small mb-0">
              Runs purely in the browser with tactical and positional heuristic algorithms. No network or API keys required.
            </p>
          </div>
        )}

        {/* Model Parameters */}
        <div className="d-flex flex-column gap-2">
          <Form.Group>
            <div className="d-flex justify-content-between">
              <Form.Label className="small text-light">Temperature: {formData.temperature}</Form.Label>
            </div>
            <Form.Range
              min="0.0"
              max="1.0"
              step="0.05"
              value={formData.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            />
          </Form.Group>

          <Form.Group>
            <div className="d-flex justify-content-between">
              <Form.Label className="small text-light">Turn Delay: {formData.turnDelay / 1000}s</Form.Label>
            </div>
            <Form.Range
              min="500"
              max="5000"
              step="500"
              value={formData.turnDelay}
              onChange={(e) => handleChange('turnDelay', parseInt(e.target.value, 10))}
            />
          </Form.Group>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto d-flex gap-2 pt-3 border-top border-glass">
          <Button
            variant="outline-secondary"
            size="sm"
            className="flex-fill d-flex align-items-center justify-content-center gap-1"
            onClick={onRefreshModels}
            disabled={isRefreshing}
          >
            <span className="material-symbols-rounded fs-6">refresh</span>
            Refresh Models
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="flex-fill d-flex align-items-center justify-content-center gap-1"
            onClick={handleSave}
          >
            <span className="material-symbols-rounded fs-6">save</span>
            Save Settings
          </Button>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
