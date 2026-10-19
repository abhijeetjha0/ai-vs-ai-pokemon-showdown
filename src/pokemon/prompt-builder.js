/**
 * Contextual Prompt Builder for Pokémon Showdown AI Players & Strategy Arbiter
 */

/**
 * Builds prompt context for a player LLM
 */
export function buildPlayerPromptContext({
  slot,
  snapshot,
  legalActions,
  recentLog = []
}) {
  const isP1 = slot === 'p1';
  const player = isP1 ? snapshot.p1 : snapshot.p2;
  const opponent = isP1 ? snapshot.p2 : snapshot.p1;

  const myPoke = player.active || player.team?.[0];
  const oppPoke = opponent.active || opponent.team?.[0];

  // Format legal moves
  const movesList = (legalActions.moves || []).map(m =>
    `[Move ${m.index}] ${m.name} (${m.type} | ${m.category} | Power: ${m.basePower || 'Status'} | Acc: ${m.accuracy}% | PP: ${m.pp}/${m.maxpp})`
  ).join('\n') || 'None (Forced Switch)';

  // Format legal switches
  const switchesList = (legalActions.switches || []).map(s =>
    `[Switch ${s.index}] ${s.species} (Types: ${s.types.join('/')} | HP: ${s.hpPercent}%${s.status ? ` | Status: ${s.status.toUpperCase()}` : ''})`
  ).join('\n') || 'None';

  const isForceSwitch = legalActions.forceSwitch;

  const systemPrompt = `You are a Grandmaster Pokémon Showdown competitive battler playing Gen 9 Random Battles.
Your goal is to choose the most tactically optimal action for your turn.
CRITICAL RULES:
1. You must respond ONLY with a valid JSON object matching the schema below. No markdown backticks, no prose outside JSON.
2. If forced to switch (active Pokémon fainted), you MUST choose type="switch" with an available bench index.
3. If choosing a move, choose an available move index (1 to 4).
4. Provide a sharp, concise 1-2 sentence tactical reasoning explaining your play.

JSON OUTPUT FORMAT:
{
  "type": "move" | "switch",
  "choice": <number>,
  "targetName": "<name of move or pokemon>",
  "terastallize": <boolean>,
  "reasoning": "<1-2 sentence competitive analysis>"
}`;

  const userPrompt = `=== BATTLE STATE: TURN ${snapshot.turn} ===
Weather: ${snapshot.weather} | Terrain: ${snapshot.terrain}

--- YOUR ACTIVE POKÉMON (${player.name}) ---
Species: ${myPoke ? myPoke.species : 'Fainted / Needs Switch'}
Types: ${myPoke ? myPoke.types.join('/') : 'N/A'}
HP: ${myPoke ? myPoke.hpPercent : 0}% (${myPoke?.status ? myPoke.status.toUpperCase() : 'Healthy'})
Stat Boosts: ${myPoke && myPoke.statBoosts ? JSON.stringify(myPoke.statBoosts) : '{}'}

--- OPPONENT ACTIVE POKÉMON (${opponent.name}) ---
Species: ${oppPoke ? oppPoke.species : 'Unknown'}
Types: ${oppPoke ? oppPoke.types.join('/') : 'N/A'}
HP: ${oppPoke ? oppPoke.hpPercent : 0}% (${oppPoke?.status ? oppPoke.status.toUpperCase() : 'Healthy'})

--- YOUR LEGAL CHOICES ---
${isForceSwitch ? '[NOTICE] ACTIVE POKÉMON FAINTED! YOU MUST SWITCH TO A BENCH POKÉMON.' : `LEGAL MOVES:\n${movesList}`}

BENCH SWITCHES:
${switchesList}

${legalActions.canTerastallize ? '[NOTICE] Terastallization is available this turn!' : ''}

Choose your action now in pure JSON format:`;

  return { systemPrompt, userPrompt };
}

/**
 * Builds prompt context for the Decision Model
 */
export function buildArbiterPromptContext({
  playerSlot,
  proposedAction,
  playerReasoning,
  snapshot,
  legalActions
}) {
  const isP1 = playerSlot === 'p1';
  const player = isP1 ? snapshot.p1 : snapshot.p2;
  const opponent = isP1 ? snapshot.p2 : snapshot.p1;

  const myPoke = player.active || player.team?.[0];
  const oppPoke = opponent.active || opponent.team?.[0];

  const systemPrompt = `You are the Decision Model and Head Coach of the AI Pokémon Showdown Battle.
Your responsibility is to analyze the active player's proposed play, detect tactical blunders (such as using an immune/resisted move, failing to secure a free knockout, or staying in against an obvious OHKO threat), grade the play, and provide 1 sentence of expert commentary.

GRADES:
- "Best Move": Optimal play securing damage, KO, or positional advantage.
- "Tactical Read": High-level prediction or smart defensive switch.
- "Inaccuracy": Suboptimal move or minor damage loss.
- "Risky Switch": Risky switch into potential super effective damage.
- "Blunder": Disastrous move into an immunity (e.g. Electric vs Ground, Normal vs Ghost) or failing to switch from 4x weakness.

CRITICAL RULES:
1. Respond ONLY with a valid JSON object. No markdown backticks, no prose outside JSON.
2. If the proposed play is a Blunder, set approved=false and provide an override finalAction with the best legal move or switch. Otherwise set approved=true.

JSON OUTPUT FORMAT:
{
  "approved": <boolean>,
  "finalAction": {
    "type": "move" | "switch",
    "choice": <number>,
    "targetName": "<string>"
  },
  "grade": "Best Move" | "Tactical Read" | "Inaccuracy" | "Risky Switch" | "Blunder",
  "commentary": "<1 concise sentence commentary>"
}`;

  const userPrompt = `=== ARBITER ADJUDICATION: TURN ${snapshot.turn} ===
Trainer: ${player.name} (${playerSlot.toUpperCase()})
Active Pokémon: ${myPoke?.species} (${myPoke?.types.join('/')}, ${myPoke?.hpPercent}% HP)
Opponent Pokémon: ${oppPoke?.species} (${oppPoke?.types.join('/')}, ${oppPoke?.hpPercent}% HP)

Proposed Choice: ${proposedAction.type?.toUpperCase()} [${proposedAction.choice}] (${proposedAction.targetName || ''})
Player's Reasoning: "${playerReasoning}"

Available Moves:
${(legalActions.moves || []).map(m => `[Move ${m.index}] ${m.name} (${m.type}, Power: ${m.basePower})`).join('\n') || 'None'}

Available Switches:
${(legalActions.switches || []).map(s => `[Switch ${s.index}] ${s.species} (${s.types.join('/')}, ${s.hpPercent}% HP)`).join('\n') || 'None'}

Evaluate this play and deliver your verdict now in JSON format:`;

  return { systemPrompt, userPrompt };
}
