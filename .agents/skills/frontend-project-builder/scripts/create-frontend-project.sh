#!/usr/bin/env bash

# ==============================================================================
# Frontend Project Builder
# Interactive & automated CLI to scaffold modern frontend projects
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPERS_DIR="${SCRIPT_DIR}/helpers"

# Colors for UI output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default Configuration Values
PROJECT_NAME="my-frontend-app"
TARGET_DIR=""
NODE_VERSION="24"
USE_NVM="true"
FRAMEWORK="react"
BUILD_TOOL="vite"
USE_BABEL="false"
USE_TS="true"
USE_LINT="true"
STYLING="scss"
USE_STYLELINT="true"
USE_MATERIAL="true"
TESTING="vitest"
USE_I18N="true"
DOCS="none"
USE_AGENTS="false"
AUTO_INSTALL="true"
DRY_RUN="false"
INTERACTIVE="auto"

# ------------------------------------------------------------------------------
# Help Function
# ------------------------------------------------------------------------------
show_help() {
  echo -e "${BOLD}${CYAN}Frontend Project Builder CLI${NC}"
  echo -e "Scaffold modern, production-grade frontend applications with best practices."
  echo ""
  echo -e "${BOLD}USAGE:${NC}"
  echo -e "  bash create-frontend-project.sh [OPTIONS]"
  echo ""
  echo -e "${BOLD}OPTIONS:${NC}"
  echo -e "  -n, --name <name>            Project name (default: ${PROJECT_NAME})"
  echo -e "  -d, --target-dir <dir>       Target directory (default: Projects/\$NAME)"
  echo -e "  --node-version <ver>         Node.js base version for .nvmrc and engines (default: 24)"
  echo -e "  --nvm                        Use nvm setup (creates .nvmrc and uses nvm in scripts) (default: true)"
  echo -e "  --no-nvm                     Do not use nvm setup"
  echo -e "  -f, --framework <name>       Framework: react, vue, next, angular, svelte, ember, vanilla (default: react)"
  echo -e "  -b, --build-tool <tool>      Build tool: vite, webpack, rollup (default: vite)"
  echo -e "  --babel                      Enable Babel transpilation"
  echo -e "  --no-babel                   Disable Babel transpilation (default for Vite)"
  echo -e "  --ts, --typescript           Use TypeScript (default: true)"
  echo -e "  --no-ts, --javascript        Use JavaScript instead of TypeScript"
  echo -e "  --lint                       Enable ESLint + Prettier (default: true)"
  echo -e "  --no-lint                    Disable ESLint and Prettier"
  echo -e "  -s, --styling <option>       Styling: scss, tailwind, bootstrap, css (default: scss)"
  echo -e "  --stylelint                  Enable Stylelint for CSS/SCSS (default: true)"
  echo -e "  --no-stylelint               Disable Stylelint"
  echo -e "  --material-symbols           Add Material Symbols & Google Fonts to HTML (default: true)"
  echo -e "  --no-material-symbols        Skip Material Symbols"
  echo -e "  -t, --testing <tool>         Testing framework: vitest, jest, none (default: vitest)"
  echo -e "  --docs <tool>                Documentation tool: jsdoc, typedoc, none (default: none)"
  echo -e "  --i18n                       Enable Internationalization with locales (default: true)"
  echo -e "  --no-i18n                    Disable Internationalization"
  echo -e "  --agents                     Add .agents/ directory and AGENTS.md (default: false)"
  echo -e "  --no-agents                  Skip agents directory"
  echo -e "  --install                    Run 'npm install' after scaffolding"
  echo -e "  --no-install                 Skip 'npm install' (default: false)"
  echo -e "  --interactive                Force interactive wizard prompt"
  echo -e "  --dry-run                    Preview planned setup without creating files"
  echo -e "  -h, --help                   Show this help message and exit"
  echo ""
  echo -e "${BOLD}EXAMPLES:${NC}"
  echo -e "  # Interactive prompt wizard:"
  echo -e "  bash create-frontend-project.sh"
  echo ""
  echo -e "  # Fast non-interactive React + Vite + TypeScript + SCSS + Vitest + i18n:"
  echo -e "  bash create-frontend-project.sh --name my-app --framework react --styling scss --testing vitest"
  echo ""
  echo -e "  # Next.js + Tailwind + TypeScript:"
  echo -e "  bash create-frontend-project.sh --name next-app --framework next --styling tailwind"
  exit 0
}

# ------------------------------------------------------------------------------
# Argument Parsing
# ------------------------------------------------------------------------------
CLI_ARGS_PASSED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--name)
      PROJECT_NAME="$2"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    -d|--target-dir)
      TARGET_DIR="$2"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    --node-version)
      NODE_VERSION="$2"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    --nvm)
      USE_NVM="true"
      CLI_ARGS_PASSED=true
      shift 1
      ;;
    --no-nvm)
      USE_NVM="false"
      CLI_ARGS_PASSED=true
      shift 1
      ;;
    -f|--framework)
      FRAMEWORK="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    -b|--build-tool)
      BUILD_TOOL="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    --babel)
      USE_BABEL="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-babel)
      USE_BABEL="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --ts|--typescript)
      USE_TS="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-ts|--javascript)
      USE_TS="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --lint)
      USE_LINT="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-lint)
      USE_LINT="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    -s|--styling)
      STYLING="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    --stylelint)
      USE_STYLELINT="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-stylelint)
      USE_STYLELINT="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --material-symbols)
      USE_MATERIAL="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-material-symbols)
      USE_MATERIAL="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    -t|--testing)
      TESTING="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    --docs)
      DOCS="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
      CLI_ARGS_PASSED=true
      shift 2
      ;;
    --i18n)
      USE_I18N="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-i18n)
      USE_I18N="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --agents)
      USE_AGENTS="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-agents)
      USE_AGENTS="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --install)
      AUTO_INSTALL="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --no-install)
      AUTO_INSTALL="false"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --dry-run)
      DRY_RUN="true"
      CLI_ARGS_PASSED=true
      shift
      ;;
    --interactive)
      INTERACTIVE="true"
      shift
      ;;
    -h|--help)
      show_help
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Run with --help for usage instructions."
      exit 1
      ;;
  esac
done

# If no arguments were passed and STDIN is a terminal, run interactively
if [[ "$INTERACTIVE" == "auto" ]]; then
  if [[ "$CLI_ARGS_PASSED" == "false" && -t 0 ]]; then
    INTERACTIVE="true"
  else
    INTERACTIVE="false"
  fi
fi

# ------------------------------------------------------------------------------
# Interactive Wizard
# ------------------------------------------------------------------------------
if [[ "$INTERACTIVE" == "true" ]]; then
  source "${HELPERS_DIR}/cli-prompts.sh"
fi

# Enforce conditional rules as per official framework documentation
resolve_node_version() {
  case "$1" in
    24|v24) echo "24.18.0" ;;
    22|v22) echo "22.14.0" ;;
    20|v20) echo "20.18.3" ;;
    *) echo "$1" ;;
  esac
}
NODE_VERSION="$(resolve_node_version "$NODE_VERSION")"

if [[ "$FRAMEWORK" == "next" || "$FRAMEWORK" == "angular" || "$FRAMEWORK" == "ember" ]]; then
  BUILD_TOOL="$FRAMEWORK"
  USE_BABEL="false"
fi

if [[ "$FRAMEWORK" == "angular" ]]; then
  USE_TS="true" # Angular strictly requires TypeScript
fi

# Set default target directory if empty
if [[ -z "$TARGET_DIR" ]]; then
  TARGET_DIR="Projects/${PROJECT_NAME}"
fi

# ------------------------------------------------------------------------------
# Summary & Confirmation
# ------------------------------------------------------------------------------
echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║                   Configuration Summary                      ║${NC}"
echo -e "${BOLD}${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Project Name" "$PROJECT_NAME"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Target Directory" "$TARGET_DIR"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "NVM Setup" "$([[ "$USE_NVM" == "true" ]] && echo "Enabled" || echo "Disabled")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Node Version" "${NODE_VERSION}"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Framework" "$FRAMEWORK"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Build Tool" "$BUILD_TOOL"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Language" "$([[ "$USE_TS" == "true" ]] && echo "TypeScript" || echo "JavaScript")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Babel" "$([[ "$USE_BABEL" == "true" ]] && echo "Enabled" || echo "Disabled")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Linting" "$([[ "$USE_LINT" == "true" ]] && echo "ESLint + Prettier" || echo "None")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Styling" "$STYLING"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Stylelint" "$([[ "$USE_STYLELINT" == "true" ]] && echo "Enabled" || echo "Disabled")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Material Symbols" "$([[ "$USE_MATERIAL" == "true" ]] && echo "Google Fonts + Icons" || echo "None")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Testing" "$TESTING"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Documentation" "$DOCS"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "i18n (Translations)" "$([[ "$USE_I18N" == "true" ]] && echo "Configured (en/fr)" || echo "None")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Agents Config" "$([[ "$USE_AGENTS" == "true" ]] && echo "Enabled" || echo "Disabled")"
printf "${BOLD}${BLUE}║${NC}  %-22s : %-33s ${BOLD}${BLUE}║${NC}\n" "Auto Install" "$AUTO_INSTALL"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "${YELLOW}🔍 [Dry-Run Mode] No prompt generated.${NC}"
  exit 0
fi

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}🚀 AI System Prompt Generated${NC}"
echo -e "${GREEN}==============================================================================\n${NC}"

cat <<EOF
# Frontend Project Scaffolding Prompt

Please scaffold a modern frontend project with the following requirements:

## Project Details
- **Project Name**: ${PROJECT_NAME}
- **Framework**: ${FRAMEWORK}
- **Build Tool**: ${BUILD_TOOL}
- **Language**: $([[ "$USE_TS" == "true" ]] && echo "TypeScript" || echo "JavaScript")
- **Styling**: ${STYLING}
- **Linting & Formatting**: $([[ "$USE_LINT" == "true" ]] && echo "ESLint + Prettier" || echo "None")
- **CSS Linting**: $([[ "$USE_STYLELINT" == "true" ]] && echo "Stylelint" || echo "None")
- **Testing**: ${TESTING}
- **Documentation**: ${DOCS}
- **Additional Features**:
  - Material Symbols & Google Fonts: $([[ "$USE_MATERIAL" == "true" ]] && echo "Yes" || echo "No")
  - i18n (Translations): $([[ "$USE_I18N" == "true" ]] && echo "Yes" || echo "No")
  - Babel: $([[ "$USE_BABEL" == "true" ]] && echo "Yes" || echo "No")
- **Node Version**: ${NODE_VERSION} $([[ "$USE_NVM" == "true" ]] && echo "(via .nvmrc)" || echo "")
- **Target Directory**: ${TARGET_DIR}

## Instructions for AI Agent
1. **Initialize the Project**: Create the directory \`${TARGET_DIR}\` if it doesn't exist.
2. **Configuration Files**: Generate a \`package.json\` with all necessary dependencies and \`devDependencies\` for the chosen stack. Add necessary npm scripts (\`dev\`, \`build\`, \`lint\`, \`test\`, etc).
3. **Build Setup**: Configure the build tool (\`${BUILD_TOOL}\`) properly.
$([[ "$USE_TS" == "true" ]] && echo "4. **TypeScript**: Create a \`tsconfig.json\` with strict mode enabled and appropriate compiler options.")
$([[ "$USE_LINT" == "true" ]] && echo "5. **Linting**: Create \`eslint.config.mjs\` (or equivalent) and \`.prettierrc\`.")
$([[ "$USE_STYLELINT" == "true" ]] && echo "6. **Stylelint**: Create a \`.stylelintrc.json\` configured for ${STYLING}.")
$([[ "$TESTING" != "none" ]] && echo "7. **Testing**: Set up \`${TESTING}\` configuration and create an initial sample test file.")
8. **App Structure**: Create the basic \`src/\` folder structure with a sample component/view to demonstrate that everything is wired up correctly (e.g., counter button, i18n switch if enabled).
$([[ "$USE_I18N" == "true" ]] && echo "9. **i18n**: Create basic locale files (\`en.json\`, \`fr.json\`) and wire them up in the app initialization.")
10. **Install Dependencies**: $([[ "$AUTO_INSTALL" == "true" ]] && echo "Run \`npm install\` after scaffolding." || echo "Do not run \`npm install\` automatically.")
$([[ "$USE_AGENTS" == "true" ]] && echo "11. **Agents Directory**: Create an \`.agents/AGENTS.md\` containing brief context about this project's architecture for AI assistants.")

Ensure you follow modern best practices for this specific stack. Avoid deprecated APIs. 
When you are done, print out the final command to start the development server.
EOF
