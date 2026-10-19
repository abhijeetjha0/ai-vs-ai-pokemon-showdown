#!/usr/bin/env bash

# =============================================================================
# Pure Bash Interactive Menu Selector (Zero Dependencies / No Node.js needed)
#
# Usage:
#   ./interactive-prompt.sh "Menu Title" "Option 1" "Option 2" ...
# Output:
#   Prints 1-based index of chosen option to stdout (1, 2, 3, etc.)
# =============================================================================

title="$1"
shift
options=("$@")
total=${#options[@]}
selected=0

# Determine controlling TTY if available
HAS_TTY=0
if [ -r /dev/tty ] && { : < /dev/tty; } 2>/dev/null; then
  HAS_TTY=1
fi

# Fallback for non-interactive / CI / piped environments without TTY
if [[ "$HAS_TTY" -eq 0 && ! -t 0 ]]; then
  echo "1"
  exit 0
fi

# Restore terminal state & cursor on exit
cleanup() {
  printf "\033[?25h" >&2
}
trap cleanup EXIT INT TERM

# Hide cursor
printf "\033[?25l" >&2

render_menu() {
  printf "\033[1;36m%s\033[0m\n" "$title" >&2
  for i in "${!options[@]}"; do
    if [[ "$i" -eq "$selected" ]]; then
      printf "\033[32m❯ \033[4m%s\033[0m\n" "${options[$i]}" >&2
    else
      printf "  %s\n" "${options[$i]}" >&2
    fi
  done
}

clear_menu() {
  local lines=$((total + 1))
  printf "\033[%dA\033[J" "$lines" >&2
}

read_key() {
  if [[ "$HAS_TTY" -eq 1 ]]; then
    IFS= read -rsn1 "$1" < /dev/tty
  else
    IFS= read -rsn1 "$1"
  fi
}

read_seq() {
  if [[ "$HAS_TTY" -eq 1 ]]; then
    read -rsn2 -t 1 "$1" < /dev/tty
  else
    read -rsn2 -t 1 "$1"
  fi
}

render_menu

while true; do
  key=""
  read_key key

  if [[ "$key" == $'\x1b' ]]; then
    seq=""
    read_seq seq

    if [[ "$seq" == "[A" || "$seq" == "OA" ]]; then # Up arrow
      clear_menu
      selected=$(( (selected - 1 + total) % total ))
      render_menu
    elif [[ "$seq" == "[B" || "$seq" == "OB" ]]; then # Down arrow
      clear_menu
      selected=$(( (selected + 1) % total ))
      render_menu
    fi
  elif [[ "$key" == "k" || "$key" == "K" ]]; then # Vim Up
    clear_menu
    selected=$(( (selected - 1 + total) % total ))
    render_menu
  elif [[ "$key" == "j" || "$key" == "J" ]]; then # Vim Down
    clear_menu
    selected=$(( (selected + 1) % total ))
    render_menu
  elif [[ "$key" == "" ]]; then # Enter key
    clear_menu
    printf "\033[1;36m%s\033[0m \033[32m%s\033[0m\n" "$title" "${options[$selected]}" >&2
    cleanup
    echo "$((selected + 1))"
    exit 0
  elif [[ "$key" =~ ^[1-9]$ ]] && (( key <= total )); then # Direct number selection
    clear_menu
    selected=$((key - 1))
    printf "\033[1;36m%s\033[0m \033[32m%s\033[0m\n" "$title" "${options[$selected]}" >&2
    cleanup
    echo "$key"
    exit 0
  fi
done
