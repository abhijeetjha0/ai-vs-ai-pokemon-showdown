# Pokémon Engine Guidelines: `src/pokemon/`

## Scope
This directory contains all battle simulation, rules execution, damage & state evaluation, and prompt-building logic for Pokémon Showdown battles.

## Modules
- `engine.js`: Wraps `@pkmn/sim` and `@pkmn/randoms` to instantiate and manage a Gen 9 Random Battle stream (`gen9randombattle`). Emits state updates, handles choice commands (`move 1`, `switch 2`, `terastallize`), and parses protocol streams (`|move|`, `|-damage|`, `|faint|`, `|switch|`, `|weather|`, `|win|`).
- `evaluator.js`: Computes real-time win probability and numerical advantage for Trainer 1 vs Trainer 2 based on remaining team HP%, alive vs fainted counts, active type matchups, and status condition/stat stage penalties.
- `prompt-builder.js`: Serializes the battle situation into clean, compact, structured prompt contexts for player LLMs and the Strategy Arbiter.

## Key Rules
1. **Never mutate external state**: Keep the battle engine interface decoupled from React components.
2. **Safe Action Validation**: Always ensure the selected move or switch index is valid before dispatching it to `@pkmn/sim`.
3. **Graceful Fallbacks**: If an AI outputs an invalid move or switch, automatically fall back to the first available legal action with an informative warning log.
