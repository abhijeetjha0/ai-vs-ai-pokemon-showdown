# UI Component Guidelines: `src/components/`

## Scope
This directory contains all React visual and interactive components for the AI vs AI Pokémon Showdown Battle Client, adhering to the Cyber Dark Glassmorphic design system.

## Components
- `ActionTooltipButton.jsx`: Wrapper for icon-only action buttons enforcing single-word action tooltips via Bootstrap `OverlayTrigger` and `Tooltip`.
- `BattleStage.jsx`: 3D-perspective battlefield rendering active Pokémon animated sprites (`@pkmn/img`), level, HP bars with smooth gradients, status badges, stat stage indicators, 6-pokeball team tracker, active field effects, floating damage text, and the interactive manual action HUD.
- `AdvantageBar.jsx`: Dynamic real-time match advantage and win probability bar.
- `PlayerCard.jsx`: Player status card (Trainer 1 & Trainer 2) with active Pokémon preview, remaining team count, and in-card model selector dropdown.
- `ArbiterCard.jsx`: Strategy Arbiter card showing live adjudication status, proposed vs final action, grade badge (`Best Move`, `Inaccuracy`, `Blunder`), and tactical commentary.
- `Controls.jsx`: Unified single-row controls card (mode selection dropdown, start/pause/step/reset, turn speed slider, battle log export).
- `AIThoughts.jsx`: Unified AI thoughts & combat events stream card matching the chess repo aesthetic, combining AI decision reasonings, arbiter verdicts, and real-time combat events into a single synchronized feed.
- `ApiDrawer.jsx`: Offcanvas drawer for Ollama URL, OpenAI endpoint & key configuration.
- `HelpModal.jsx`: In-app manual with searchable tabs.

## Key Rules
1. **NO RAW EMOJIS**: Strictly enforce Google Material Symbols Rounded (`<span className="material-symbols-rounded">name</span>`).
2. **Action Tooltips**: All icon-only buttons must use `ActionTooltipButton` with single-word verbs (`Start`, `Pause`, `Step`, `Reset`, `Copy`, `Export`, `Settings`, `Help`).
3. **Responsive Glassmorphism**: Use tokens from `src/styles/` (`--bg-card`, `--border-glass`, `--cyan-primary`, etc.).
