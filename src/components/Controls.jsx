import React from 'react';
import { Spinner, Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ActionTooltipButton from './ActionTooltipButton.jsx';

export default function Controls({
  mode = 'auto',
  onModeChange,
  isRunning = false,
  isPaused = false,
  turnInProgress = false,
  turnDelay = 2000,
  onSpeedChange,
  onStartAuto,
  onPauseResumeAuto,
  onStopAuto,
  onStepTurn,
  onResetBattle,
  onFlip,
  onCopyLog,
  onExportLog
}) {
  const [speedOpen, setSpeedOpen] = React.useState(false);

  return (
    <div className="controls-card glass-panel d-flex align-items-center justify-content-between gap-1">
      {/* LEFT: MODE DROPDOWN */}
      <div className="controls-mode-select-wrap">
        <Dropdown className="controls-mode-dropdown">
          <Dropdown.Toggle
            variant="dark"
            id="controls-mode-dropdown-toggle"
            className="controls-mode-toggle d-flex align-items-center justify-content-between"
            aria-label="Battle Mode Selection"
          >
            <span className="d-flex align-items-center gap-2">
              <span className="material-symbols-rounded mode-toggle-icon fs-5">
                {mode === 'auto' ? 'smart_toy' : 'touch_app'}
              </span>
              <span className="mode-toggle-label">
                {mode === 'auto' ? 'Automated Match' : 'Manual Mode'}
              </span>
            </span>
          </Dropdown.Toggle>

          <Dropdown.Menu className="controls-mode-menu glass-panel shadow-lg" align="start" renderOnMount>
            <Dropdown.Item
              as="button"
              active={mode === 'auto'}
              onClick={() => onModeChange('auto')}
              className="controls-mode-item"
            >
              <div className="d-flex align-items-center gap-2 py-1">
                <span className="material-symbols-rounded fs-5 text-primary">smart_toy</span>
                <div>
                  <div className="fw-semibold text-light">Automated Match</div>
                  <div className="text-secondary small">Continuous turn execution by AI models</div>
                </div>
              </div>
            </Dropdown.Item>

            <Dropdown.Divider className="border-secondary border-opacity-25 my-1" />

            <Dropdown.Item
              as="button"
              active={mode === 'manual'}
              onClick={() => onModeChange('manual')}
              className="controls-mode-item"
            >
              <div className="d-flex align-items-center gap-2 py-1">
                <span className="material-symbols-rounded fs-5 text-info">touch_app</span>
                <div>
                  <div className="fw-semibold text-light">Manual Mode</div>
                  <div className="text-secondary small">Interactive move selection & step-by-step turns</div>
                </div>
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* CENTER: PRIMARY ACTIONS & MODE CONTROLS */}
      <div className="controls-primary-actions d-flex align-items-center gap-1">
        {mode === 'auto' ? (
          <>
            {!isRunning ? (
              <ActionTooltipButton
                tooltip="Start"
                variant="primary"
                className="btn-control-icon btn-primary-play btn-glow"
                onClick={onStartAuto}
                aria-label="Start Match"
              >
                <span className="material-symbols-rounded fs-5">play_arrow</span>
              </ActionTooltipButton>
            ) : (
              <div className="d-flex align-items-center gap-1">
                <ActionTooltipButton
                  tooltip={isPaused ? 'Resume' : 'Pause'}
                  variant={isPaused ? 'success' : 'warning'}
                  className="btn-control-icon btn-pause-resume"
                  onClick={onPauseResumeAuto}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                >
                  <span className="material-symbols-rounded fs-5">
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                </ActionTooltipButton>
                <ActionTooltipButton
                  tooltip="Stop"
                  variant="danger"
                  className="btn-control-icon btn-stop"
                  onClick={onStopAuto}
                  aria-label="Stop Match"
                >
                  <span className="material-symbols-rounded fs-5">stop</span>
                </ActionTooltipButton>
              </div>
            )}
          </>
        ) : (
          <ActionTooltipButton
            tooltip="Step AI"
            variant="primary"
            className="btn-control-icon btn-primary-play btn-glow"
            onClick={onStepTurn}
            disabled={turnInProgress}
            aria-label="Step AI Move"
          >
            {turnInProgress ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <span className="material-symbols-rounded fs-5">play_arrow</span>
            )}
          </ActionTooltipButton>
        )}
      </div>

      {/* RIGHT: SECONDARY UTILITY ICON BUTTONS */}
      <div className="controls-secondary-actions d-flex align-items-center gap-1 ms-auto flex-shrink-0">
        <OverlayTrigger
          placement="top"
          delay={{ show: 150, hide: 50 }}
          show={speedOpen ? false : undefined}
          overlay={<Tooltip id="tt-speed">Speed</Tooltip>}
        >
          <div className="d-inline-flex position-relative">
            <Dropdown
              align="end"
              className="controls-speed-dropdown"
              show={speedOpen}
              onToggle={(isOpen) => setSpeedOpen(isOpen)}
            >
              <Dropdown.Toggle
                variant="outline-secondary"
                id="controls-speed-dropdown-toggle"
                className="btn-control-icon btn-utility"
                aria-label="Speed"
              >
                <span className="material-symbols-rounded fs-6">speed</span>
              </Dropdown.Toggle>

              <Dropdown.Menu className="controls-speed-menu glass-panel shadow-lg p-2" renderOnMount>
                <Dropdown.Header className="text-secondary small fw-bold px-2 py-1">Turn Delay</Dropdown.Header>
                {[1000, 2000, 3000, 5000].map(ms => (
                  <Dropdown.Item
                    as="button"
                    key={ms}
                    active={turnDelay === ms}
                    onClick={() => {
                      onSpeedChange(ms);
                      setSpeedOpen(false);
                    }}
                    className="controls-speed-item font-monospace small py-1 px-2"
                  >
                    {ms / 1000}s per turn
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </OverlayTrigger>

        <ActionTooltipButton
          tooltip="Reset"
          variant="outline-secondary"
          className="btn-control-icon btn-utility"
          onClick={onResetBattle}
          aria-label="Reset Match"
        >
          <span className="material-symbols-rounded fs-6">restart_alt</span>
        </ActionTooltipButton>

        <ActionTooltipButton
          tooltip="Flip"
          variant="outline-secondary"
          className="btn-control-icon btn-utility"
          onClick={onFlip}
          aria-label="Flip Battlefield"
        >
          <span className="material-symbols-rounded fs-6">swap_vert</span>
        </ActionTooltipButton>

        <ActionTooltipButton
          tooltip="Copy"
          variant="outline-secondary"
          className="btn-control-icon btn-utility"
          onClick={onCopyLog}
          aria-label="Copy Battle Log"
        >
          <span className="material-symbols-rounded fs-6">content_copy</span>
        </ActionTooltipButton>

        <ActionTooltipButton
          tooltip="Export"
          variant="outline-secondary"
          className="btn-control-icon btn-utility"
          onClick={onExportLog}
          aria-label="Export Battle Log"
        >
          <span className="material-symbols-rounded fs-6">download</span>
        </ActionTooltipButton>
      </div>
    </div>
  );
}
