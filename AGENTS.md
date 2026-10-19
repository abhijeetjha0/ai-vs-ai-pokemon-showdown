# Project Agent Guidelines: AI vs AI Pokémon Showdown Battle

## Project Overview
**AI vs AI Pokémon Showdown** is an automated multi-model Pokémon Showdown battle web application featuring AI player models (Trainer 1 vs Trainer 2) and a Middle Decision Strategy Arbiter model. It directly executes battles in the browser using the official Pokémon Showdown simulator (`@pkmn/sim`), supporting local Ollama models (with fast reasoning suppression and structured JSON schemas), OpenAI-compatible APIs, and an offline heuristic engine.

## Tech Stack
- **Language**: JavaScript (ES Modules, modern ES2022+)
- **Frontend Framework**: React 19 (`react`, `react-dom`)
- **UI Components & Styling**: React Bootstrap (`react-bootstrap` 2.10, `bootstrap` 5.3) & Custom Modular SCSS Design System (`src/styles/`)
- **Design Aesthetic**: Modern Cyber Dark Glassmorphism with HSL color tokens and Pokémon Type color accents
- **Typography & Icons**: Google Fonts (`Outfit`, `JetBrains Mono`) and Google Material Symbols Rounded (`Material Symbols Rounded`)
- **Showdown Engine**: `@pkmn/sim` (in-browser simulator), `@pkmn/randoms` (Gen 9 Random Battle teams), `@pkmn/dex`, and `@pkmn/img` (Showdown animated battle sprites)
- **Build & Dev Tooling**: Vite 5.4 (`@vitejs/plugin-react`, `vite-plugin-node-polyfills`, `sass`), Node.js built-in test runner (`node --test`)

## Global Conventions & Guidelines

### 1. Iconography — Strict Material Symbols Policy
- **NO Emojis or Unicode Glyphs in UI**: Never use raw emojis (e.g., ⚡, 🔥, 💧, 🌿, 🤖, ⚔️, 🏆, 🔄) in user-facing components.
- Always use Google Material Symbols via `<span className="material-symbols-rounded">symbol_name</span>`.
- Provide single-word action hover tooltips on all icon-only buttons via `ActionTooltipButton` with React Bootstrap's `OverlayTrigger` / `Tooltip`.

### 2. Layout & UI Continuity
- **2-Column Battle Layout**: Left stage features the 3D-perspective battle field (active Pokémon animated sprites, HP bars, Pokeball team tracker, field conditions, advantage bar, and manual action HUD); right column contains compact Player 1, Player 2, Middle Decision Arbiter, Controls card, and AI Thoughts stream card.
- **Top Header**: Single-row alignment featuring brand title/subtitle on the left, and provider status pill, battle format pill, Help manual button, and API settings icon on the right.
- **In-Card Model Selectors**: Model change dropdowns are built directly into Player 1, Player 2, and Arbiter cards, eliminating header dropdown clutter.
- **Controls Row**: Maintain a consistent, single-row layout inside the right sidebar card across both Automated and Manual modes with zero layout shift.
- **Mode Selection**: Render game mode toggling as a styled Bootstrap `Dropdown` with clear title, subtitle, and icons (`smart_toy` for Auto, `touch_app` for Manual).

### 3. Middle Decision Strategy Arbiter Filtering
- Middle decision models must strictly possess decision capability (`caps.includes('decision')`).
- If no decision models are available, the right-column `ArbiterCard` must automatically hide with zero broken UI.

### 4. Code Hygiene & Testing
- Run unit tests with `npm test` (`node --test test/*.test.js`).
- Verify production builds with `npm run build` (`vite build`).
- Keep components focused and modular under `src/components/`.

### 5. In-App UI Manual Sync
- **Mandatory Manual Synchronization Rule**: Whenever adding, removing, or updating a UI feature, agents MUST automatically update the in-app UI manual (`src/data/help-sections.json` and help components) to keep the documentation accurate and in-sync.

## Modular Guidelines
| Directory | Scope & Guidelines |
|---|---|
| [`src/components/`](file:///Users/abhijit/Documents/Projects/Learning/AI/poke-showdown-ai/src/components/AGENTS.md) | React UI components, Bootstrap integration, tooltips, and state visualization |
| [`src/api/`](file:///Users/abhijit/Documents/Projects/Learning/AI/poke-showdown-ai/src/api/AGENTS.md) | LLM provider integration, Ollama capabilities, structured decision schemas, and mock engine |
| [`src/pokemon/`](file:///Users/abhijit/Documents/Projects/Learning/AI/poke-showdown-ai/src/pokemon/AGENTS.md) | Pokémon Showdown battle streams, game rules, damage evaluation, advantage metrics, and prompt builder |

## Directory Guide
```
poke-showdown-ai/
├── index.html               # Entry HTML with Google Fonts & Material Symbols
├── package.json             # Dependencies and scripts (dev, build, test)
├── vite.config.js           # Vite build configuration with React plugin & polyfills
├── src/
│   ├── main.jsx             # React entry point mounting <App />
│   ├── App.jsx              # Main application orchestrator & turn loop
│   ├── styles/              # Modular SCSS design system (abstracts, base, layout, components, responsive)
│   ├── components/          # React components (Controls, BattleStage, Arbiter, etc.)
│   ├── api/                 # Model Manager, Ollama & OpenAI clients, Mock personas
│   ├── arbiter/             # Decision engine orchestration & prompt templates
│   ├── pokemon/             # Pokémon engine rules, evaluation engine, prompt builder
│   └── data/                # In-app help manual sections
└── test/
    └── engine.test.js       # Node.js unit tests for pokemon battle engine & evaluator
```
