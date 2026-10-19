import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Toast, ToastContainer, Badge } from 'react-bootstrap';
import { PokemonBattleEngine } from './pokemon/engine.js';
import { evaluateBattlePosition } from './pokemon/evaluator.js';
import { ModelManager } from './api/model-manager.js';
import { DecisionEngine } from './arbiter/decision-engine.js';

import BattleStage from './components/BattleStage.jsx';
import AdvantageBar from './components/AdvantageBar.jsx';
import PlayerCard from './components/PlayerCard.jsx';
import ArbiterCard from './components/ArbiterCard.jsx';
import Controls from './components/Controls.jsx';
import AIThoughts from './components/AIThoughts.jsx';
import ApiDrawer from './components/ApiDrawer.jsx';
import HelpModal from './components/HelpModal.jsx';
import TeamBuilderModal from './components/TeamBuilderModal.jsx';
import PokemonDetailModal from './components/PokemonDetailModal.jsx';
import ActionTooltipButton from './components/ActionTooltipButton.jsx';
import PokeballIcon from './components/PokeballIcon.jsx';

export default function App() {
  // Ref singletons
  const engineRef = useRef(new PokemonBattleEngine());
  const modelManagerRef = useRef(new ModelManager());
  const decisionEngineRef = useRef(null);

  // Battle state
  const [snapshot, setSnapshot] = useState(() => engineRef.current.getSnapshot());
  const [evalData, setEvalData] = useState(() => evaluateBattlePosition(engineRef.current.getSnapshot()));
  const [log, setLog] = useState([]);
  const [terastallizeActive, setTerastallizeActive] = useState(false);
  const [flipped, setFlipped] = useState(false);

  // Match control state
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [turnInProgress, setTurnInProgress] = useState(false);
  const [thinkingSlot, setThinkingSlot] = useState(null);
  const [turnDelay, setTurnDelay] = useState(() => modelManagerRef.current.config.turnDelay || 2000);

  // Model & Provider state
  const [config, setConfig] = useState(() => modelManagerRef.current.config);
  const [chatModels, setChatModels] = useState([]);
  const [decisionModels, setDecisionModels] = useState([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTeamBuilderOpen, setIsTeamBuilderOpen] = useState(false);
  const [selectedPokemonForDetail, setSelectedPokemonForDetail] = useState(null);

  // Custom team builder state
  const [customTeams, setCustomTeams] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_poke_custom_teams_v1');
      return saved ? JSON.parse(saved) : { p1Team: null, p2Team: null };
    } catch (e) {
      return { p1Team: null, p2Team: null };
    }
  });

  // Thought and Arbiter stream state
  const [p1Thought, setP1Thought] = useState({ action: null, reasoning: '' });
  const [p2Thought, setP2Thought] = useState({ action: null, reasoning: '' });
  const p1ReasoningRef = useRef('');
  const p2ReasoningRef = useRef('');
  const [arbiterState, setArbiterState] = useState({
    isEvaluating: false,
    proposedAction: null,
    finalAction: null,
    grade: '',
    commentary: ''
  });
  const [thoughtEntries, setThoughtEntries] = useState([]);
  const [streamEntries, setStreamEntries] = useState([]);

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Fetch models dynamically
  const fetchAvailableModels = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await modelManagerRef.current.refreshAvailableModels();
      setIsRefreshing(false);
      setChatModels(res.chatModels || []);
      setDecisionModels(res.decisionModels || []);
      setOllamaConnected(res.provider === 'ollama' && Boolean(res.success));
      setConfig({ ...modelManagerRef.current.config });
      return res;
    } catch (e) {
      setIsRefreshing(false);
      setOllamaConnected(false);
      return { success: false, error: e.message };
    }
  }, []);

  // Clickable refresh handler for Ollama provider pill
  const handleRefreshClick = async (e) => {
    if (e) e.stopPropagation();
    if (isRefreshing) return;
    const res = await fetchAvailableModels();
    if (res && res.success) {
      showToast(res.provider === 'ollama' ? `Loaded ${res.chatModels?.length || 0} Ollama models` : 'Models refreshed successfully');
    } else {
      showToast('Ollama offline — using offline engine');
    }
  };

  // Initialize decision engine and listeners on mount
  useEffect(() => {
    fetchAvailableModels();

    const engine = engineRef.current;
    const mm = modelManagerRef.current;
    decisionEngineRef.current = new DecisionEngine(engine, mm);

    // Setup state listener
    const unsubState = engine.onStateChange((s) => {
      setSnapshot(s);
      const ev = evaluateBattlePosition(s);
      setEvalData(ev);
    });

    // Setup battle log listener
    const unsubLog = engine.onLogEvent((entry) => {
      setLog((prev) => [...prev, entry]);
      setStreamEntries((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          kind: 'event',
          ...entry
        }
      ]);
    });

    // Start initial battle
    setStreamEntries([]);
    setLog([]);
    setThoughtEntries([]);
    engine.startBattle({
      format: 'gen9randombattle',
      p1Name: 'Player 1',
      p2Name: 'Player 2',
      p1CustomTeam: customTeams.p1Team,
      p2CustomTeam: customTeams.p2Team
    });

    return () => {
      unsubState();
      unsubLog();
      if (decisionEngineRef.current) {
        decisionEngineRef.current.stopAutoLoop();
      }
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [fetchAvailableModels]);

  // Turn Execution Callback Factory
  const buildTurnCallbacks = useCallback(() => {
    const mm = modelManagerRef.current;

    return {
      onPlayerThinking: ({ slot }) => {
        setTurnInProgress(true);
        setThinkingSlot(slot);
      },
      onPlayerProposed: ({ slot, action, turn }) => {
        const turnNum = turn || engineRef.current.turn;
        if (slot === 'p1') {
          p1ReasoningRef.current = action.reasoning || '';
          setP1Thought({ action, reasoning: action.reasoning });
        } else {
          p2ReasoningRef.current = action.reasoning || '';
          setP2Thought({ action, reasoning: action.reasoning });
        }

        // If no arbiter model is configured, record thought directly
        const hasArbiter = Boolean(mm.decisionModels.length > 0 && mm.config.arbiterModel);
        if (!hasArbiter) {
          const entry = {
            id: `th-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            kind: 'thought',
            turn: turnNum,
            trainer: slot === 'p1' ? 'Player 1' : 'Player 2',
            playerSlot: slot,
            model: slot === 'p1' ? mm.config.p1Model : mm.config.p2Model,
            action,
            reasoning: action.reasoning,
            grade: '',
            arbiterModel: null,
            arbiterCommentary: ''
          };
          setThoughtEntries((prev) => [...prev, entry]);
          setStreamEntries((prev) => [...prev, entry]);
        }
      },
      onArbiterEvaluating: ({ slot, proposed }) => {
        setArbiterState({
          isEvaluating: true,
          proposedAction: proposed,
          finalAction: null,
          grade: '',
          commentary: ''
        });
      },
      onArbiterVerdict: ({ slot, verdict, turn, playerReasoning }) => {
        const turnNum = turn || engineRef.current.turn;
        setArbiterState({
          isEvaluating: false,
          proposedAction: verdict.finalAction,
          finalAction: verdict.finalAction,
          grade: verdict.grade,
          commentary: verdict.commentary
        });

        const activeReasoning = playerReasoning || (slot === 'p1' ? p1ReasoningRef.current : p2ReasoningRef.current);

        // Add to thought stream history
        const entry = {
          id: `th-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          kind: 'thought',
          turn: turnNum,
          trainer: slot === 'p1' ? 'Player 1' : 'Player 2',
          playerSlot: slot,
          model: slot === 'p1' ? mm.config.p1Model : mm.config.p2Model,
          action: verdict.finalAction,
          reasoning: activeReasoning,
          grade: verdict.grade,
          arbiterModel: mm.config.arbiterModel,
          arbiterCommentary: verdict.commentary
        };
        setThoughtEntries((prev) => [...prev, entry]);
        setStreamEntries((prev) => [...prev, entry]);
      },
      onTurnExecuted: () => {
        setTurnInProgress(false);
        setThinkingSlot(null);
      },
      onGameOver: (finalSnapshot) => {
        setIsRunning(false);
        setTurnInProgress(false);
        setThinkingSlot(null);
        const winnerName = finalSnapshot.winner === 'p1' ? 'Player 1' : finalSnapshot.winner === 'p2' ? 'Player 2' : 'Nobody (Tie)';
        showToast(`Battle Finished! Winner: ${winnerName}`);
      }
    };
  }, []);

  // Controls Handlers
  const handleStartAuto = () => {
    setIsRunning(true);
    setIsPaused(false);
    decisionEngineRef.current.setSpeed(turnDelay);
    decisionEngineRef.current.startAutoLoop(buildTurnCallbacks());
  };

  const handlePauseResumeAuto = () => {
    if (isPaused) {
      setIsPaused(false);
      decisionEngineRef.current.resumeAutoLoop();
    } else {
      setIsPaused(true);
      decisionEngineRef.current.pauseAutoLoop();
    }
  };

  const handleStopAuto = () => {
    setIsRunning(false);
    setIsPaused(false);
    decisionEngineRef.current.stopAutoLoop();
  };

  const handleStepTurn = async () => {
    if (turnInProgress) return;
    setTurnInProgress(true);
    setThinkingSlot('p1');
    await decisionEngineRef.current.playSingleTurn(buildTurnCallbacks());
    setTurnInProgress(false);
    setThinkingSlot(null);
  };

  const handleResetBattle = () => {
    if (isRunning) {
      decisionEngineRef.current.stopAutoLoop();
      setIsRunning(false);
      setIsPaused(false);
    }
    setStreamEntries([]);
    setLog([]);
    setThoughtEntries([]);
    setP1Thought({ action: null, reasoning: '' });
    setP2Thought({ action: null, reasoning: '' });
    setArbiterState({ isEvaluating: false, proposedAction: null, finalAction: null, grade: '', commentary: '' });
    setTerastallizeActive(false);

    engineRef.current.startBattle({
      format: 'gen9randombattle',
      p1Name: 'Player 1',
      p2Name: 'Player 2',
      p1CustomTeam: customTeams.p1Team,
      p2CustomTeam: customTeams.p2Team
    });
    const msg = (customTeams.p1Team || customTeams.p2Team)
      ? 'Battle reset: Reloaded custom teams!'
      : 'Battle reset: Generated new balanced Gen 9 Random Teams!';
    showToast(msg);
  };

  const handleApplyTeams = ({ p1Team, p2Team }) => {
    if (isRunning) {
      decisionEngineRef.current.stopAutoLoop();
      setIsRunning(false);
      setIsPaused(false);
    }
    setCustomTeams({ p1Team, p2Team });
    try {
      localStorage.setItem('ai_poke_custom_teams_v1', JSON.stringify({ p1Team, p2Team }));
    } catch (e) {}

    setStreamEntries([]);
    setLog([]);
    setThoughtEntries([]);
    setP1Thought({ action: null, reasoning: '' });
    setP2Thought({ action: null, reasoning: '' });
    setArbiterState({ isEvaluating: false, proposedAction: null, finalAction: null, grade: '', commentary: '' });
    setTerastallizeActive(false);

    engineRef.current.startBattle({
      format: 'gen9randombattle',
      p1Name: 'Player 1',
      p2Name: 'Player 2',
      p1CustomTeam: p1Team,
      p2CustomTeam: p2Team
    });
    showToast('Custom teams applied to battle!');
  };

  const handleResetToRandom = () => {
    if (isRunning) {
      decisionEngineRef.current.stopAutoLoop();
      setIsRunning(false);
      setIsPaused(false);
    }
    setCustomTeams({ p1Team: null, p2Team: null });
    try {
      localStorage.removeItem('ai_poke_custom_teams_v1');
    } catch (e) {}

    setStreamEntries([]);
    setLog([]);
    setThoughtEntries([]);
    setP1Thought({ action: null, reasoning: '' });
    setP2Thought({ action: null, reasoning: '' });
    setArbiterState({ isEvaluating: false, proposedAction: null, finalAction: null, grade: '', commentary: '' });
    setTerastallizeActive(false);

    engineRef.current.startBattle({
      format: 'gen9randombattle',
      p1Name: 'Player 1',
      p2Name: 'Player 2'
    });
    showToast('Reverted to pure Random Battles!');
  };

  const handleSpeedChange = (ms) => {
    setTurnDelay(ms);
    modelManagerRef.current.saveConfig({ turnDelay: ms });
    if (decisionEngineRef.current) {
      decisionEngineRef.current.setSpeed(ms);
    }
  };

  const handleCopyLog = () => {
    const textLog = streamEntries.length > 0
      ? streamEntries.map(e => {
          if (e.kind === 'thought') {
            return `[T${e.turn} ${e.trainer} (${e.model})]: ${e.action?.type?.toUpperCase()} [${e.action?.targetName || e.action?.choice}] - "${e.reasoning}" ${e.grade ? `[Decision Model: ${e.grade}]` : ''}`;
          }
          return e.text;
        }).join('\n')
      : log.map(l => l.text).join('\n');
    navigator.clipboard.writeText(textLog);
    showToast('AI Thoughts & Battle Log copied to clipboard!');
  };

  const handleExportLog = () => {
    const textLog = streamEntries.length > 0
      ? streamEntries.map(e => {
          if (e.kind === 'thought') {
            return `[T${e.turn} ${e.trainer} (${e.model})]: ${e.action?.type?.toUpperCase()} [${e.action?.targetName || e.action?.choice}] - "${e.reasoning}" ${e.grade ? `[Decision Model: ${e.grade}]` : ''}`;
          }
          return e.text;
        }).join('\n')
      : log.map(l => l.text).join('\n');
    const blob = new Blob([textLog], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pokemon-battle-${Date.now()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('AI Thoughts & Battle Log downloaded!');
  };

  // Manual Mode: Player 1 click action
  const handleManualChoice = async (action) => {
    // Enrich action with targetName if available
    const legalP1 = engineRef.current.getLegalActions('p1');
    if (action.type === 'move' && !action.targetName) {
      const moveObj = legalP1.moves.find(m => m.index === action.choice);
      if (moveObj?.name) action.targetName = moveObj.name;
    } else if (action.type === 'switch' && !action.targetName) {
      const switchObj = legalP1.switches.find(s => s.index === action.choice);
      if (switchObj?.species || switchObj?.name) action.targetName = switchObj.species || switchObj.name;
    }

    const choiceStr = action.type === 'switch'
      ? `switch ${action.choice}`
      : `move ${action.choice}${action.terastallize ? ' terastallize' : ''}`;

    const currentTurn = engineRef.current.turn;
    const p1Entry = {
      id: `th-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      kind: 'thought',
      turn: currentTurn,
      trainer: 'Player 1',
      playerSlot: 'p1',
      model: 'Manual Player',
      action,
      reasoning: action.type === 'switch'
        ? `Switched to bench Pokémon ${action.targetName || `#${action.choice}`}`
        : `Executed ${action.targetName || `move #${action.choice}`}`,
      grade: 'Manual',
      arbiterCommentary: 'Manual player move'
    };
    setThoughtEntries(prev => [...prev, p1Entry]);
    setStreamEntries(prev => [...prev, p1Entry]);

    engineRef.current.submitChoice('p1', choiceStr);
    setTerastallizeActive(false);

    // If Player 2 needs a move, have Player 2 AI reply automatically
    if (snapshot.p2?.needsChoice) {
      setTurnInProgress(true);
      setThinkingSlot('p2');
      const legalP2 = engineRef.current.getLegalActions('p2');
      const p2Res = await modelManagerRef.current.requestPlayerAction({
        slot: 'p2',
        snapshot,
        legalActions: legalP2
      });

      const p2Entry = {
        id: `th-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        kind: 'thought',
        turn: currentTurn,
        trainer: 'Player 2',
        playerSlot: 'p2',
        model: modelManagerRef.current.config.p2Model,
        action: p2Res,
        reasoning: p2Res.reasoning,
        grade: '',
        arbiterCommentary: ''
      };
      setThoughtEntries(prev => [...prev, p2Entry]);
      setStreamEntries(prev => [...prev, p2Entry]);

      const p2Str = p2Res.type === 'switch'
        ? `switch ${p2Res.choice}`
        : `move ${p2Res.choice}${p2Res.terastallize ? ' terastallize' : ''}`;

      engineRef.current.submitChoice('p2', p2Str);
      setP2Thought({ action: p2Res, reasoning: p2Res.reasoning });
    }

    // Await paced visual battle animations and turn events to finish
    await engineRef.current.waitForTurnComplete();
    setTurnInProgress(false);
    setThinkingSlot(null);
  };

  const handleSaveConfig = (newConfig) => {
    modelManagerRef.current.saveConfig(newConfig);
    setConfig({ ...modelManagerRef.current.config });
    fetchAvailableModels();
    showToast('Settings saved successfully!');
  };

  const p1Legal = engineRef.current.getLegalActions('p1');

  return (
    <div className="d-flex flex-column min-vh-100 position-relative">
      {/* Background cyber grid & glow effects */}
      <div className="app-bg-grid" />
      <div className="app-bg-glow glow-cyan" />
      <div className="app-bg-glow glow-purple" />

      {/* APP HEADER */}
      <header className="app-header d-flex justify-content-between align-items-center">
        <div className="header-brand flex-shrink-0 d-flex align-items-center gap-2 gap-sm-3 min-w-0">
          <div className="brand-logo-icon">
            <PokeballIcon size={22} />
            <span className="material-symbols-rounded icon-sparkle">auto_awesome</span>
          </div>
          <div className="brand-text min-w-0">
            <h1 className="brand-title mb-0 text-truncate">
              AI vs AI <span className="gradient-text">Pokémon Showdown</span>
            </h1>
            <p className="brand-subtitle d-none d-sm-block mb-0 text-truncate">
              {decisionModels.length > 0 && config.arbiterModel && decisionModels.some((m) => m.id === config.arbiterModel)
                ? 'Automated Multi-Model Pokémon Showdown with Decision Model'
                : 'Automated Multi-Model Pokémon Showdown'}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {/* Format Badge */}
          <span className="badge bg-dark border border-secondary border-opacity-50 text-light font-monospace px-2 py-1 d-none d-md-flex align-items-center gap-2">
            <PokeballIcon size={15} />
            <span>Gen 9 Randoms</span>
          </span>

          {/* Custom Teams Active Badge */}
          {Boolean(customTeams.p1Team || customTeams.p2Team) && (
            <span className="badge bg-success bg-opacity-20 border border-success border-opacity-50 text-success font-monospace px-2 py-1 d-none d-lg-flex align-items-center gap-1">
              <span className="material-symbols-rounded fs-6">check_circle</span>
              <span>Custom Teams</span>
            </span>
          )}

          {/* Provider Pill (Matching Chess Repo UX & Clickable Refresh) */}
          <div
            className="compact-provider-pill d-flex align-items-center gap-1 px-2 py-1 rounded-pill"
            style={{ cursor: 'pointer' }}
            onClick={handleRefreshClick}
          >
            <span className={`status-dot ${ollamaConnected ? 'connected' : 'offline'}`} />
            <span className="provider-name small text-light text-opacity-90">
              {config.provider === 'ollama' ? 'Ollama' : config.provider === 'openai' ? 'OpenAI' : 'Offline'}
            </span>
            <ActionTooltipButton
              tooltip="Refresh"
              placement="bottom"
              variant="link"
              size="sm"
              className="btn-icon-refresh p-0 text-decoration-none"
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              aria-label="Refresh Models"
            >
              <span className={`material-symbols-rounded fs-6 align-middle ${isRefreshing ? 'spin' : ''}`}>
                refresh
              </span>
            </ActionTooltipButton>
          </div>

          {/* Edit Teams Button */}
          <ActionTooltipButton
            tooltip="Edit Teams"
            variant="dark"
            className="btn-control-icon border-secondary border-opacity-25"
            onClick={() => setIsTeamBuilderOpen(true)}
            aria-label="Edit Teams"
          >
            <span className="material-symbols-rounded fs-5 text-secondary">edit_note</span>
          </ActionTooltipButton>

          {/* Help Button */}
          <ActionTooltipButton
            tooltip="Manual"
            variant="dark"
            className="btn-control-icon border-secondary border-opacity-25"
            onClick={() => setIsHelpOpen(true)}
          >
            <span className="material-symbols-rounded fs-5 text-secondary">help</span>
          </ActionTooltipButton>

          {/* Settings Button */}
          <ActionTooltipButton
            tooltip="Settings"
            variant="dark"
            className="btn-control-icon border-secondary border-opacity-25"
            onClick={() => setIsDrawerOpen(true)}
          >
            <span className="material-symbols-rounded fs-5 text-secondary">settings</span>
          </ActionTooltipButton>
        </div>
      </header>

      {/* 2-COLUMN RESPONSIVE BATTLE GRID */}
      <main className="app-container flex-grow-1">
        <div className="battle-grid">
          {/* LEFT STAGE: 3D Battlefield & Advantage Bar */}
          <div className="stage-column">
            <BattleStage
              snapshot={snapshot}
              mode={mode}
              legalActions={p1Legal}
              onManualChoice={handleManualChoice}
              terastallizeActive={terastallizeActive}
              onToggleTerastallize={() => setTerastallizeActive(prev => !prev)}
              flipped={flipped}
            />

            <AdvantageBar
              evalData={evalData}
              p1Name={snapshot.p1?.name || 'Player 1'}
              p2Name={snapshot.p2?.name || 'Player 2'}
              flipped={flipped}
            />
          </div>

          {/* RIGHT SIDEBAR: Player Cards, Arbiter, Controls & Log */}
          <div className="sidebar-column">
            {/* Player 1 Card with Team Roster List */}
            <PlayerCard
              slot="p1"
              name="Player 1"
              selectedModel={config.p1Model}
              availableModels={chatModels}
              onModelChange={(mId) => {
                modelManagerRef.current.saveConfig({ p1Model: mId });
                setConfig({ ...modelManagerRef.current.config });
              }}
              isActiveTurn={turnInProgress ? thinkingSlot === 'p1' : true}
              isThinking={turnInProgress && thinkingSlot === 'p1'}
              team={snapshot?.p1?.team || []}
              onSelectPokemon={(p) => setSelectedPokemonForDetail(p)}
            />

            {/* Player 2 Card with Team Roster List */}
            <PlayerCard
              slot="p2"
              name="Player 2"
              selectedModel={config.p2Model}
              availableModels={chatModels}
              onModelChange={(mId) => {
                modelManagerRef.current.saveConfig({ p2Model: mId });
                setConfig({ ...modelManagerRef.current.config });
              }}
              isActiveTurn={turnInProgress ? thinkingSlot === 'p2' : false}
              isThinking={turnInProgress && thinkingSlot === 'p2'}
              team={snapshot?.p2?.team || []}
              onSelectPokemon={(p) => setSelectedPokemonForDetail(p)}
            />

            {/* Strategy Arbiter Card (Auto-hides if no decision models exist) */}
            {decisionModels.length > 0 && config.arbiterModel && decisionModels.some(m => m.id === config.arbiterModel) && (
              <ArbiterCard
                arbiterModel={config.arbiterModel}
                decisionModels={decisionModels}
                availableModels={decisionModels}
                onModelChange={(mId) => {
                  modelManagerRef.current.saveConfig({ arbiterModel: mId });
                  setConfig({ ...modelManagerRef.current.config });
                }}
                arbiterState={arbiterState}
              />
            )}

            {/* Controls Card */}
            <Controls
              mode={mode}
              onModeChange={(newMode) => {
                if (isRunning) handleStopAuto();
                setMode(newMode);
              }}
              isRunning={isRunning}
              isPaused={isPaused}
              turnInProgress={turnInProgress}
              turnDelay={turnDelay}
              onSpeedChange={handleSpeedChange}
              onStartAuto={handleStartAuto}
              onPauseResumeAuto={handlePauseResumeAuto}
              onStopAuto={handleStopAuto}
              onStepTurn={handleStepTurn}
              onResetBattle={handleResetBattle}
              onFlip={() => setFlipped(prev => !prev)}
              onCopyLog={handleCopyLog}
              onExportLog={handleExportLog}
            />

            {/* AI THOUGHTS STREAM LOG (COMBINED THOUGHTS & BATTLE LOG) */}
            <AIThoughts
              streamEntries={streamEntries}
              thoughtEntries={thoughtEntries}
              log={log}
            />
          </div>
        </div>
      </main>

      {/* DRAWERS & MODALS */}
      <ApiDrawer
        show={isDrawerOpen}
        onHide={() => setIsDrawerOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onRefreshModels={fetchAvailableModels}
        isRefreshing={isRefreshing}
      />

      <HelpModal
        show={isHelpOpen}
        onHide={() => setIsHelpOpen(false)}
      />

      <TeamBuilderModal
        show={isTeamBuilderOpen}
        onHide={() => setIsTeamBuilderOpen(false)}
        p1CustomTeam={customTeams.p1Team}
        p2CustomTeam={customTeams.p2Team}
        onApplyTeams={handleApplyTeams}
        onResetToRandom={handleResetToRandom}
      />

      <PokemonDetailModal
        show={Boolean(selectedPokemonForDetail)}
        onHide={() => setSelectedPokemonForDetail(null)}
        pokemon={selectedPokemonForDetail}
      />

      {/* TOAST CONTAINER */}
      <ToastContainer position="bottom-end" className="p-3">
        {toast && (
          <Toast className="glass-panel text-light border-info">
            <Toast.Body className="d-flex align-items-center gap-2">
              <span className="material-symbols-rounded text-info fs-5">info</span>
              <span>{toast}</span>
            </Toast.Body>
          </Toast>
        )}
      </ToastContainer>
    </div>
  );
}
