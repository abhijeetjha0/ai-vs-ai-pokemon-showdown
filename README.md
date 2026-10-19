# AI vs AI Pokémon Showdown

> **Automated Multi-Model Pokémon Showdown with Decision Model** featuring real-time AI reasoning, animated battle sprites, dynamic advantage evaluation, and a Middle Decision Strategy Arbiter.

An open-source browser-based Pokémon battle platform that directly executes the official Pokémon Showdown battle simulator (`smogon/pokemon-showdown` via `@pkmn/sim`) completely in the browser. Pit local Ollama models or OpenAI-compatible LLMs head-to-head in **Gen 9 Random Battles** with an optional Strategy Arbiter supervising each turn, detecting blunders, and providing live tactical commentary.

---

## Key Features

- **Embedded In-Browser Showdown Simulator**: Runs `@pkmn/sim` and `@pkmn/randoms` directly in the browser with zero external server dependencies. Generates balanced, competitive Gen 9 Random Battle teams instantly.
- **Multi-Model AI Orchestration**:
  - **Local Ollama**: Supports local models (`llama3.2`, `deepseek-r1`, `qwen2.5-coder`, `mistral`) with automatic fast-reasoning token suppression for sub-2s turns and structured JSON schema enforcement.
  - **OpenAI-Compatible APIs**: Plug in OpenAI, Groq, DeepSeek, OpenRouter, or LocalAI endpoints.
  - **Offline Heuristic Battle Engine**: Instant, zero-latency fallback featuring tactical damage calculations and positional switching algorithms—works 100% offline with zero API keys or server setup.
- **Middle Decision Strategy Arbiter**:
  - Supervisory AI Grandmaster evaluating active player proposals.
  - Detects blunders (e.g., using Electric moves into Ground types or failing to switch from lethal 4x weaknesses).
  - Grades plays: `Best Move`, `Tactical Read`, `Inaccuracy`, `Blunder`, or `Risky Switch`.
  - Automatically hides with zero layout disruption if no decision-capable model is selected.
- **Cyber Dark Glassmorphic Design**:
  - 3D-perspective battle stadium with animated Pokémon sprites, back sprites, and type badges powered by `@pkmn/img`.
  - Smooth HP gauges with green/yellow/red gradient transitions, status ailment badges (BRN, PAR, SLP, FRZ, TOX), and 6-pokeball team tracker.
  - Real-time **Match Advantage Bar** displaying live win probabilities and score balance.
- **Game Modes**:
  - **Automated Battle**: Continuous AI-versus-AI competition with customizable deliberation speed (1s to 5s).
  - **Manual Mode**: Interactive play allowing human move selection, bench switching, Terastallization, or step-by-step AI turns.
- **Dual-View Battle Stream**:
  - Live Showdown announcer commentary protocol log.
  - Real-time expandable AI thoughts stream with player reasoning traces and arbiter critiques.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** (`react`, `react-dom`) | Modern component architecture and UI reactivity |
| **Vite 5.4** | Ultra-fast build tooling and development proxy |
| **@pkmn/sim & @pkmn/randoms** | In-browser Pokémon Showdown battle mechanics & Gen 9 team generator |
| **@pkmn/img** | Official Pokémon Showdown animated battle sprites and type assets |
| **React Bootstrap 2.10 & Bootstrap 5.3** | Responsive grid, dropdowns, modals, and tooltips |
| **Google Material Symbols Rounded** | Strict, clean iconography with single-word action tooltips |
| **Google Fonts (Outfit & JetBrains Mono)** | Premium cyber dark typography |

---

## Quick Start

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v20 & v24)
- (Optional) **Ollama** installed and running locally (`ollama serve`)

### 2. Installation
```bash
# Clone and enter the repository
cd poke-showdown-ai

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5175` in your browser.

### 3. Run Tests & Build
```bash
# Run unit test suite (Node built-in test runner)
npm test

# Build production bundle
npm run build
```

---

## Architecture Overview

```
poke-showdown-ai/
├── src/
│   ├── main.jsx                      # React 19 mounting root
│   ├── App.jsx                       # Master orchestrator & battle turn loop
│   ├── style.css                     # Cyber Dark Glassmorphism design tokens & styles
│   ├── pokemon/
│   │   ├── engine.js                 # Wraps @pkmn/sim & @pkmn/randoms BattleStream
│   │   ├── evaluator.js              # Real-time win probability & advantage evaluator
│   │   └── prompt-builder.js         # Contextual prompts for player LLMs & Arbiter
│   ├── api/
│   │   ├── model-manager.js          # Multi-provider coordinator (Ollama, OpenAI, Offline)
│   │   ├── ollama.js                 # Ollama client with fast reasoning & JSON schemas
│   │   ├── openai.js                 # OpenAI-compatible completions client
│   │   └── mock.js                   # Offline heuristic battle AI & arbiter
│   ├── arbiter/
│   │   └── decision-engine.js        # Adjudication loop & auto turn controller
│   ├── components/
│   │   ├── BattleStage.jsx           # 3D stadium, animated sprites, HP gauges & Action HUD
│   │   ├── AdvantageBar.jsx          # Live win probability & score differential bar
│   │   ├── PlayerCard.jsx            # Trainer card with in-card model selector & thoughts
│   │   ├── ArbiterCard.jsx           # Strategy Arbiter status, verdict & commentary
│   │   ├── Controls.jsx              # Mode dropdown, play/pause, step, speed & export
│   │   ├── BattleLog.jsx             # Dual-view protocol log & AI thoughts stream
│   │   ├── ApiDrawer.jsx             # Offcanvas provider configuration drawer
│   │   └── HelpModal.jsx             # In-app searchable user manual
│   └── data/
│       └── help-sections.json        # In-app manual content synced with UI features
└── test/
    └── engine.test.js                # Node test runner suite for battle mechanics
```

---

## Local Ollama Setup

1. Start your local Ollama daemon:
   ```bash
   ollama serve
   ```
2. Pull your favorite models (e.g. `llama3.2`, `qwen2.5-coder:7b`, `deepseek-r1:8b`):
   ```bash
   ollama pull llama3.2
   ollama pull deepseek-r1:8b
   ```
3. Open **Settings** (gear icon in the top right) in the Pokémon Showdown app:
   - Select **Ollama** as the active provider.
   - Click **Refresh Models** to detect your downloaded models.
   - Assign models directly to Trainer 1, Trainer 2, and the Strategy Arbiter!

---

## License
MIT
