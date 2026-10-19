/**
 * Strategy Decision Engine: Orchestrates Player Proposals & Strategy Arbiter Adjudication
 * Analogous to Chess DecisionEngine
 */

export class DecisionEngine {
  constructor(battleEngine, modelManager) {
    this.engine = battleEngine;
    this.models = modelManager;
    this.isRunning = false;
    this.isPaused = false;
    this.turnDelay = 2000;
    this.turnInProgress = false;
    this.abortController = null;
  }

  setSpeed(delayMs) {
    this.turnDelay = Math.max(500, Math.min(10000, delayMs));
    if (this.engine && typeof this.engine.setPacingDelay === 'function') {
      const pacing = Math.max(180, Math.min(500, Math.round(this.turnDelay * 0.18)));
      this.engine.setPacingDelay(pacing);
    }
  }

  isExecuting() {
    return this.turnInProgress;
  }

  /**
   * Executes a single turn sequence:
   * 1. Player 1 & Player 2 Thinking Phase
   * 2. Middle Strategy Arbiter Adjudication Phase
   * 3. Submit choices into Pokémon Showdown stream
   * 4. Await visual move animations and state synchronization
   */
  async playSingleTurn(callbacks = {}) {
    // 1. Ensure engine has finished initial lead sendouts and is at turn 1+
    if (!this.engine.isReady || this.engine.isProcessingQueue) {
      await this.engine.waitForReady();
    }

    const snapshot = this.engine.getSnapshot();

    if (snapshot.isGameOver) {
      if (callbacks.onGameOver) callbacks.onGameOver(snapshot);
      return { success: false, reason: 'Battle over' };
    }

    if (this.turnInProgress) {
      return { success: false, reason: 'Turn already in progress' };
    }

    this.turnInProgress = true;

    try {
      const p1Needs = snapshot.p1.needsChoice;
      const p2Needs = snapshot.p2.needsChoice;
      const currentTurnNum = this.engine.turn;

      const hasArbiter = Boolean(
        this.models.decisionModels.length > 0 &&
        this.models.config.arbiterModel
      );

      let p1FinalChoiceStr = null;
      let p2FinalChoiceStr = null;

      // --- PLAYER 1 PHASE ---
      if (p1Needs) {
        const legalP1 = this.engine.getLegalActions('p1');
        if (callbacks.onPlayerThinking) callbacks.onPlayerThinking({ slot: 'p1', turn: currentTurnNum });

        const p1Res = await this.models.requestPlayerAction({
          slot: 'p1',
          snapshot,
          legalActions: legalP1
        });

        if (callbacks.onPlayerProposed) callbacks.onPlayerProposed({ slot: 'p1', action: p1Res, turn: currentTurnNum });

        let p1Final = p1Res;
        if (hasArbiter) {
          if (callbacks.onArbiterEvaluating) callbacks.onArbiterEvaluating({ slot: 'p1', proposed: p1Res, turn: currentTurnNum });
          const arbiterRes = await this.models.requestArbiterVerdict({
            playerSlot: 'p1',
            proposedAction: p1Res,
            playerReasoning: p1Res.reasoning,
            snapshot,
            legalActions: legalP1
          });
          if (callbacks.onArbiterVerdict) {
            callbacks.onArbiterVerdict({
              slot: 'p1',
              verdict: arbiterRes,
              turn: currentTurnNum,
              playerReasoning: p1Res.reasoning
            });
          }
          p1Final = arbiterRes.finalAction || p1Res;
        }

        // Format Showdown command: e.g. "move 1", "move 1 terastallize", "switch 2"
        p1FinalChoiceStr = p1Final.type === 'switch'
          ? `switch ${p1Final.choice}`
          : `move ${p1Final.choice}${p1Final.terastallize ? ' terastallize' : ''}`;
      }

      // --- PLAYER 2 PHASE ---
      if (p2Needs) {
        const legalP2 = this.engine.getLegalActions('p2');
        if (callbacks.onPlayerThinking) callbacks.onPlayerThinking({ slot: 'p2', turn: currentTurnNum });

        const p2Res = await this.models.requestPlayerAction({
          slot: 'p2',
          snapshot,
          legalActions: legalP2
        });

        if (callbacks.onPlayerProposed) callbacks.onPlayerProposed({ slot: 'p2', action: p2Res, turn: currentTurnNum });

        let p2Final = p2Res;
        if (hasArbiter) {
          if (callbacks.onArbiterEvaluating) callbacks.onArbiterEvaluating({ slot: 'p2', proposed: p2Res, turn: currentTurnNum });
          const arbiterRes = await this.models.requestArbiterVerdict({
            playerSlot: 'p2',
            proposedAction: p2Res,
            playerReasoning: p2Res.reasoning,
            snapshot,
            legalActions: legalP2
          });
          if (callbacks.onArbiterVerdict) {
            callbacks.onArbiterVerdict({
              slot: 'p2',
              verdict: arbiterRes,
              turn: currentTurnNum,
              playerReasoning: p2Res.reasoning
            });
          }
          p2Final = arbiterRes.finalAction || p2Res;
        }

        p2FinalChoiceStr = p2Final.type === 'switch'
          ? `switch ${p2Final.choice}`
          : `move ${p2Final.choice}${p2Final.terastallize ? ' terastallize' : ''}`;
      }

      // Submit choices into Showdown engine
      if (p1FinalChoiceStr) this.engine.submitChoice('p1', p1FinalChoiceStr);
      if (p2FinalChoiceStr) this.engine.submitChoice('p2', p2FinalChoiceStr);

      // Await paced visual battle animations and full turn event completion
      await this.engine.waitForTurnComplete();

      if (callbacks.onTurnExecuted) callbacks.onTurnExecuted();
      return { success: true };
    } catch (err) {
      console.error('[DecisionEngine] Error in playSingleTurn:', err);
      return { success: false, error: err.message };
    } finally {
      this.turnInProgress = false;
    }
  }

  /**
   * Start continuous battle loop
   */
  startAutoLoop(callbacks = {}) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.abortController = new AbortController();

    const loop = async () => {
      while (this.isRunning) {
        if (this.isPaused) {
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        const snapshot = this.engine.getSnapshot();
        if (snapshot.isGameOver) {
          this.isRunning = false;
          if (callbacks.onGameOver) callbacks.onGameOver(snapshot);
          break;
        }

        await this.playSingleTurn(callbacks);

        // Turn delay
        await new Promise(r => setTimeout(r, this.turnDelay));
      }
    };

    loop();
  }

  pauseAutoLoop() {
    this.isPaused = true;
  }

  resumeAutoLoop() {
    this.isPaused = false;
  }

  stopAutoLoop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
