---
name: frontend-project-builder
description: >-
  Interactive prompt generator for scaffolding for modern Node.js and JavaScript/TypeScript
  frameworks (React, Vue, Next.js, Angular, Svelte, Ember, Vanilla). Generates detailed markdown instructions for an AI to scaffold complete production-ready
  boilerplates with customizable Node engines/.nvmrc, build tools (Vite, Webpack, Rollup), Babel transpilation,
  TypeScript, ESLint + Prettier, Stylelint, Styling (SCSS, Tailwind CSS, Bootstrap), Material Symbols & Google Fonts,
  Testing frameworks (Jest, Vitest), Internationalization (i18n), and comprehensive generated READMEs.
author: "Abhijit Kumar Jha"
author_url: "https://github.com/abhijeetjha0"
version: "1.2.0"
---

# Frontend Project Builder Skill

This skill provides an interactive CLI and automated workflow to generate high-quality AI instruction prompts for scaffolding production-grade frontend applications with best practices, standardized tooling, and modular configuration.

## When to Activate This Skill
Activate this skill whenever:
- The user requests to create, scaffold, or initialize a new frontend project or boilerplate.
- The user asks for a project setup using React, Vue, Next.js, Angular, Svelte, Ember, or Vanilla JS.
- The user asks to configure build tools (Vite, Webpack, Rollup), Babel, TypeScript, ESLint, Prettier, Stylelint, SCSS, Tailwind CSS, Bootstrap, Material Symbols, Jest/Vitest, or i18n.
- The user wants a template or starter repo with full documentation and runnable scripts.

> [!CAUTION]
> **New Projects Only**: This skill is strictly designed for scaffolding **brand new frontend projects from scratch**. Do NOT use this skill inside established, existing project directories, as the generated scaffolding instructions will overwrite configurations and source files. Always scaffold into an empty or dedicated directory (e.g. `Projects/<project-name>`).

---

## Tooling & Architecture Overview

The skill is fully self-contained inside `.agents/skills/frontend-project-builder/` and powered by:
1. **Interactive Prompt Generator**: `scripts/create-frontend-project.sh`
   - Parses CLI flags or prompts the user interactively.
   - Instead of writing files to disk directly, it outputs a comprehensive Markdown prompt that the AI executes to scaffold the project.
2. **Helper Modules**:
   - `scripts/helpers/cli-prompts.sh`: Shell utility for managing interactive terminal input.
   - `scripts/helpers/interactive-prompt.sh`: Pure Bash arrow and menu selector (zero dependencies).

---

## Supported Options Matrix

| Option | Choices & Defaults | Configuration Applied |
| :--- | :--- | :--- |
| **Node Version** | `24.18.0` (LTS, default), `22.14.0`, `20.18.3`, custom | Generates `.nvmrc` and `"engines": { "node": ">=..." }` in `package.json` |
| **NVM Setup** | `true` (default), `false` | If `true`, writes `.nvmrc`, updates `engines.node` in `package.json`, and runs `nvm use` before auto-install |
| **Framework** | `react`, `vue`, `next`, `angular`, `svelte`, `ember`, `vanilla` | Canonical scaffolding CLI (`create-vite`, `create-next-app`, `@angular/cli`, `ember-cli`, etc.) |
| **Build Tool** | `vite` (recommended), `webpack`, `rollup`, framework native (`next`, `angular`) | Configures `vite.config.ts`/`webpack.config.js`/`rollup.config.js` |
| **TypeScript** | `true` (default), `false` | Configures `tsconfig.json`, types packages, `.ts`/`.tsx` file structure |
| **Babel** | `true`, `false` (default for Vite/Next/Angular) | `babel.config.json` with presets (`@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript`) and loader/plugin wiring |
| **Linting** | `eslint-prettier` (default), `none` | ESLint configuration, `.prettierrc`, scripts: `npm run lint`, `npm run format` |
| **Styling** | `scss` (with `sass-embedded`), `tailwind` (v3/v4), `bootstrap` (with `react-bootstrap` for React), `css` | Dependencies, style entry point, config files |
| **Stylelint** | `true`, `false` | `.stylelintrc.json` (SCSS / Tailwind / CSS variants), script: `npm run lint:css` |
| **Material Symbols & Fonts** | `true`, `false` | Injects Google Fonts (Roboto / Inter) and Material Symbols CDN links into HTML head |
| **Testing** | `vitest` (recommended for Vite), `jest` (recommended for Webpack), `none` | `@testing-library/*`, config file, sample unit test, script: `npm test` |
| **Internationalization (i18n)**| `true`, `false` | Framework-tailored library (`react-i18next`, `vue-i18n`, `next-intl`, `svelte-i18n`, `@angular/localize`, `i18next`), starter locales (`en.json`, `fr.json`), and demo translation |
| **Documentation Tool** | `none` (default), `jsdoc`, `typedoc` | Configures `jsdoc.json` or `typedoc.json`, script: `npm run docs` |
| **Project Documentation** | Always generated | Generates a project-tailored `README.md` with instructions for all enabled options |

---

## Usage Instructions

### Mode 1: Direct AI Invocation (Recommended — Fully Automated)

Simply ask your AI assistant to scaffold a project using this skill. The AI will read this skill definition, run the generator script autonomously, and scaffold the complete project for you:

> *"Use the `frontend-project-builder` skill to scaffold a new React TypeScript project with Vite, Tailwind CSS, and Vitest."*

The AI picks the right flags, executes the script, reads the generated Markdown prompt, and implements the full scaffold — no manual steps required.

---

### Mode 2: Interactive CLI → Copy Prompt → Paste to Any LLM

Run the wizard interactively in your terminal, inspect the generated prompt, then paste it into any LLM (ChatGPT, Claude, Gemini, Cursor, etc.):

```bash
bash .agents/skills/frontend-project-builder/scripts/create-frontend-project.sh
```

1. Follow the on-screen numbered prompts to configure your project.
2. **Copy the generated Markdown prompt** printed to your terminal.
3. **Paste it into your favourite LLM** to execute the scaffolding.

Useful when you want to review or edit the plan before handing it to an AI.

---

### Mode 3: Non-Interactive / CLI Execution (CI/CD & Scripted Automation)

Pass all options directly as flags — no prompts, no interaction. Ideal for repeatable, automated setups:

```bash
bash .agents/skills/frontend-project-builder/scripts/create-frontend-project.sh \
  --name "my-react-app" \
  --target-dir "./my-react-app" \
  --nvm \
  --node-version "24" \
  --framework "react" \
  --build-tool "vite" \
  --typescript \
  --lint \
  --styling "scss" \
  --stylelint \
  --material-symbols \
  --testing "vitest" \
  --i18n \
  --install
```

Use `--dry-run` to preview the planned setup without writing any files.

---

### Mode 4: Web UI (Browser-Based Config Form)

The skill ships a lightweight Express web server (`server.js`) and browser UI (`public/index.html`). Configure all options via a visual form — no terminal required.

**Prerequisites**: Node.js installed.

```bash
# 1. Navigate to the web/ subdirectory inside the skill
#    (adjust the base path to wherever the skill is installed)
cd .agents/skills/frontend-project-builder/web

# 2. Install the server dependency (express)
npm install

# 3. Start the web server (default port: 3847)
npm start
# → Web UI running on http://localhost:3847

# If port 3847 is already taken, override it:
PORT=4000 npm start
```

4. Open **http://localhost:3847** (or your custom port) in your browser.
5. Fill in the options form (framework, build tool, styling, testing, etc.).
6. Click **Generate** — the server spawns the shell script with your choices and streams the Markdown prompt back to the page.
7. **Copy the generated prompt** from the browser and paste it into your AI assistant to execute the scaffolding.

Useful when you prefer a GUI to the terminal wizard, or when sharing the builder with non-technical teammates.

---

### CLI Flags Reference

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-n, --name <name>` | Project name (e.g. `my-awesome-app`) | `my-frontend-app` |
| `-d, --target-dir <path>` | Destination directory path | `Projects/<name>` |
| `--node-version <ver>` | Node.js base version for `.nvmrc` and `engines` | `24` |
| `--nvm` / `--no-nvm` | Enable or disable nvm setup (`.nvmrc` creation) | `true` |
| `-f, --framework <name>` | `react`, `vue`, `next`, `angular`, `svelte`, `ember`, `vanilla` | `react` |
| `-b, --build-tool <tool>` | `vite`, `webpack`, `rollup` | `vite` |
| `--ts, --typescript` | Enable TypeScript support | Enabled by default |
| `--no-ts, --javascript` | Use JavaScript instead of TypeScript | Disabled |
| `--babel` | Enable Babel transpilation | `false` |
| `--no-babel` | Disable Babel transpilation | `true` (unless requested) |
| `--lint` | Enable ESLint + Prettier | `true` |
| `--no-lint` | Skip ESLint and Prettier | `false` |
| `-s, --styling <option>` | `scss`, `tailwind`, `bootstrap`, `css` | `scss` |
| `--stylelint` | Enable Stylelint for CSS/SCSS | `true` |
| `--no-stylelint` | Skip Stylelint | `false` |
| `--material-symbols` | Inject Material Symbols & Google Fonts into HTML | `true` |
| `--no-material-symbols` | Skip Material Symbols | `false` |
| `-t, --testing <tool>` | `vitest`, `jest`, `none` | `vitest` |
| `--docs <tool>` | `jsdoc`, `typedoc`, `none` | `none` |
| `--i18n` / `--no-i18n` | Enable multi-language support (en/fr) | `true` |
| `--agents` / `--no-agents`| Add `.agents/` directory and `AGENTS.md` | `false` |
| `--install` | Automatically run `npm install` after scaffolding | `true` |
| `--no-install` | Scaffold files only without running `npm install` | `false` |
| `--dry-run` | Print planned setup without creating files or running npm | `false` |
| `-h, --help` | Display help and usage information | — |

---

## Verifying Generated Projects
After generating a project:
1. Navigate to the project folder: `cd <project-folder>`
2. Ensure Node version matches: `nvm use`
3. Verify dependencies: `npm install`
4. Run tests: `npm test`
5. Run linters: `npm run lint` and `npm run lint:css` (if enabled)
6. Start dev server: `npm run dev` (or `npm start`)
7. Build bundle: `npm run build`

---

## Finalizing the Task

### Agent Requirements

1. **Information Extraction**: Pay close attention to exactly what the user wants. If they simply say "React app", choose React but ask or assume standard defaults for other options (Vite, TS, etc.).
2. **Prompt Execution**: After running the script, carefully read the Markdown prompt it generated. You MUST act on the prompt's instructions to scaffold the requested files. The script only outputs the plan; YOU are responsible for implementing it.
3. **Next Steps Handoff**: After a successfully scaffolding the project based on the prompt's instructions, you MUST provide instructions to the user on how to navigate to the project directory and run their development server.
4. **Handling Failures**: When updating a project because of any failure, remember to only touch files inside the specifically requested project directory.
