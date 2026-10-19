#!/usr/bin/env bash

# =============================================================================
# Interactive CLI Prompts (Dynamic, Framework-Conditioned Wizard)
# =============================================================================

prompt_menu() {
  local title="$1"
  shift
  # Call pure Bash menu selector and capture output (1-based index)
  bash "${HELPERS_DIR}/interactive-prompt.sh" "$title" "$@"
}

echo ""
echo -e "${BOLD}${CYAN}====================================================${NC}"
echo -e "${BOLD}${CYAN}      ✨ Modern Frontend Project Builder ✨         ${NC}"
echo -e "${BOLD}${CYAN}====================================================${NC}"
echo ""

# 1. Project Name
read -r -p "$(echo -e "${BOLD}1. Project Name [${PROJECT_NAME}]: ${NC}")" input_name
if [[ -n "$input_name" ]]; then PROJECT_NAME="$input_name"; fi

# 1.1 Target Directory
echo ""
default_dir="Projects/${PROJECT_NAME}"
read -r -p "$(echo -e "${BOLD}1.1. Target Directory [${default_dir}]: ${NC}")" input_dir
if [[ -n "$input_dir" ]]; then
  TARGET_DIR="$input_dir"
else
  TARGET_DIR="$default_dir"
fi

# 2. Use NVM Setup
nvm_choice=$(prompt_menu "2. Use nvm setup (creates .nvmrc and updates engines in package.json)?" "Yes (Default)" "No")
if [[ "$nvm_choice" == "2" ]]; then USE_NVM="false"; else USE_NVM="true"; fi

# 2.1 Node Version
node_choice=$(prompt_menu "2.1. Select Base Node.js version:" "Node 24 (v24.18.0 - Latest Active LTS - Recommended)" "Node 22 (v22.14.0 - Maintenance LTS)" "Node 20 (v20.18.3 - Maintenance/EOL)" "Custom version")
case "$node_choice" in
  2) NODE_VERSION="22.14.0" ;;
  3) NODE_VERSION="20.18.3" ;;
  4) read -r -p "   Enter custom Node version (e.g. 24.18.0): " NODE_VERSION ;;
  *) NODE_VERSION="24.18.0" ;;
esac

# 3. Framework
fw_choice=$(prompt_menu "3. Select Frontend Framework / Library:" \
  "React (Modern UI library - Recommended)" \
  "Vue (v3 Composition API)" \
  "Next.js (React Fullstack App Router - Built-in Turbopack/Webpack)" \
  "Angular (Full-featured Enterprise Framework - Built-in CLI & esbuild)" \
  "Svelte (Compiler-based reactive framework)" \
  "Ember (Convention-over-configuration framework - Built-in Ember CLI)" \
  "Vanilla JS / TS (Lightweight starter)")

case "$fw_choice" in
  2) FRAMEWORK="vue" ;;
  3) FRAMEWORK="next" ;;
  4) FRAMEWORK="angular" ;;
  5) FRAMEWORK="svelte" ;;
  6) FRAMEWORK="ember" ;;
  7) FRAMEWORK="vanilla" ;;
  *) FRAMEWORK="react" ;;
esac

# 4. Build Tool & Transpilation (Conditioned by official framework conventions)
if [[ "$FRAMEWORK" == "next" || "$FRAMEWORK" == "angular" || "$FRAMEWORK" == "ember" ]]; then
  BUILD_TOOL="$FRAMEWORK"
  USE_BABEL="false"
  case "$FRAMEWORK" in
    next)
      echo -e "${CYAN}ℹ️  Next.js uses its built-in Turbopack/Webpack and SWC compiler (skipping build tool & Babel prompts).${NC}"
      ;;
    angular)
      echo -e "${CYAN}ℹ️  Angular uses its built-in Angular CLI with esbuild (skipping build tool & Babel prompts).${NC}"
      ;;
    ember)
      echo -e "${CYAN}ℹ️  Ember uses its built-in Ember CLI with Embroider (skipping build tool & Babel prompts).${NC}"
      ;;
  esac
elif [[ "$FRAMEWORK" == "svelte" ]]; then
  bt_choice=$(prompt_menu "4. Select Build Tool for Svelte:" \
    "Vite (Official Svelte recommendation - Lightning-fast ESM)" \
    "Rollup (Lightweight Svelte bundler)")
  case "$bt_choice" in
    2) BUILD_TOOL="rollup" ;;
    *) BUILD_TOOL="vite" ;;
  esac

  babel_choice=$(prompt_menu "5. Include Babel Transpiler?" \
    "No (Use native Vite/ESBuild transpiler - Recommended)" \
    "Yes (Add babel.config.json with smart presets)")
  if [[ "$babel_choice" == "2" ]]; then USE_BABEL="true"; else USE_BABEL="false"; fi
else
  # React, Vue, Vanilla
  bt_choice=$(prompt_menu "4. Select Build Tool:" \
    "Vite (Lightning-fast, modern ESM - Recommended)" \
    "Webpack (Standard bundler)" \
    "Rollup (Lightweight library/app bundler)")
  case "$bt_choice" in
    2) BUILD_TOOL="webpack" ;;
    3) BUILD_TOOL="rollup" ;;
    *) BUILD_TOOL="vite" ;;
  esac

  babel_choice=$(prompt_menu "5. Include Babel Transpiler?" \
    "No (Use native Vite/SWC/ESBuild transpiler - Recommended)" \
    "Yes (Add babel.config.json with smart presets)")
  if [[ "$babel_choice" == "2" ]]; then USE_BABEL="true"; else USE_BABEL="false"; fi
fi

# 6. TypeScript (Angular strictly requires TypeScript)
if [[ "$FRAMEWORK" == "angular" ]]; then
  USE_TS="true"
  echo -e "${CYAN}ℹ️  Angular strictly requires TypeScript (TypeScript enabled automatically).${NC}"
else
  ts_choice=$(prompt_menu "6. Enable TypeScript?" \
    "Yes (TypeScript - Recommended)" \
    "No (Standard JavaScript)")
  if [[ "$ts_choice" == "2" ]]; then USE_TS="false"; else USE_TS="true"; fi
fi

# 7. Linting & Formatting
lint_choice=$(prompt_menu "7. Code Quality & Linting:" \
  "Yes (ESLint 9 + Prettier - Recommended)" \
  "No")
if [[ "$lint_choice" == "2" ]]; then USE_LINT="false"; else USE_LINT="true"; fi

# 8. Styling Architecture
style_choice=$(prompt_menu "8. Select Styling Architecture:" \
  "SCSS / Sass (Modular design tokens with sass-embedded - Recommended)" \
  "Tailwind CSS (Utility-first CSS framework)" \
  "Bootstrap (Component-based framework)" \
  "Plain CSS (Clean modern CSS)")
case "$style_choice" in
  2) STYLING="tailwind" ;;
  3) STYLING="bootstrap" ;;
  4) STYLING="css" ;;
  *) STYLING="scss" ;;
esac

# 9. Stylelint (Only applicable for CSS / SCSS)
if [[ "$STYLING" == "css" || "$STYLING" == "scss" ]]; then
  sl_choice=$(prompt_menu "9. Enable Stylelint for stylesheets?" \
    "Yes (Stylelint standard config - Recommended)" \
    "No")
  if [[ "$sl_choice" == "2" ]]; then USE_STYLELINT="false"; else USE_STYLELINT="true"; fi
else
  USE_STYLELINT="false"
  echo -e "${CYAN}ℹ️  Stylelint skipped (not applicable for ${STYLING}).${NC}"
fi

# 10. Material Symbols & Fonts
mat_choice=$(prompt_menu "10. Include Google Fonts (Inter/Roboto) and Material Symbols?" \
  "Yes (Recommended for modern UI)" \
  "No")
if [[ "$mat_choice" == "2" ]]; then USE_MATERIAL="false"; else USE_MATERIAL="true"; fi

# 11. Testing Framework (Conditioned on build tool / framework)
if [[ "$BUILD_TOOL" == "webpack" || "$FRAMEWORK" == "next" || "$FRAMEWORK" == "angular" || "$FRAMEWORK" == "ember" ]]; then
  test_choice=$(prompt_menu "11. Setup Unit Testing Framework:" \
    "Jest (Recommended for ${FRAMEWORK^} / Webpack)" \
    "Vitest" \
    "None")
  case "$test_choice" in
    2) TESTING="vitest" ;;
    3) TESTING="none" ;;
    *) TESTING="jest" ;;
  esac
else
  test_choice=$(prompt_menu "11. Setup Unit Testing Framework:" \
    "Vitest (Lightning-fast, Vite-native - Recommended)" \
    "Jest" \
    "None")
  case "$test_choice" in
    2) TESTING="jest" ;;
    3) TESTING="none" ;;
    *) TESTING="vitest" ;;
  esac
fi

# 12. Internationalization (i18n)
i18n_choice=$(prompt_menu "12. Enable Internationalization (i18n) with starter locales?" \
  "Yes (Pre-wires starter locales & framework translation helper - Recommended)" \
  "No")
if [[ "$i18n_choice" == "2" ]]; then USE_I18N="false"; else USE_I18N="true"; fi

# 13. Documentation Tool (TypeDoc only if TypeScript is enabled)
if [[ "$USE_TS" == "true" ]]; then
  doc_choice=$(prompt_menu "13. Documentation Tool:" \
    "None (Default)" \
    "TypeDoc (Recommended for TypeScript)" \
    "JSDoc")
  case "$doc_choice" in
    2) DOCS="typedoc" ;;
    3) DOCS="jsdoc" ;;
    *) DOCS="none" ;;
  esac
else
  doc_choice=$(prompt_menu "13. Documentation Tool:" \
    "None (Default)" \
    "JSDoc")
  case "$doc_choice" in
    2) DOCS="jsdoc" ;;
    *) DOCS="none" ;;
  esac
fi

# 14. Agents Config
agents_choice=$(prompt_menu "14. Add agents directory and AGENTS.md for AI assistants?" \
  "No (Default)" \
  "Yes")
if [[ "$agents_choice" == "2" ]]; then USE_AGENTS="true"; else USE_AGENTS="false"; fi

# 15. Auto Install
inst_choice=$(prompt_menu "15. Run 'npm install' automatically after scaffolding?" \
  "Yes (Default)" \
  "No (Scaffold files only)")
if [[ "$inst_choice" == "2" ]]; then AUTO_INSTALL="false"; else AUTO_INSTALL="true"; fi
