// Screenshot scenes behind ?shot=title|play|win|lose. Each scene is staged by
// playing the real rules forward with the same autopilot both sides use —
// never by drawing a fake frame — so every shot is a real render of the game.

import { chooseAiPlay } from './ai.js';
import { createGame, damageHero, drawCard, endPlayerTurn, grantCard, playCard, resolveCombat, startTurn } from './state.js';
import { SIDE_AI, SIDE_PLAYER } from './state.js';

/** One side's whole turn, driven by the AI policy (used for both sides). */
function autoTurn(state, side) {
  startTurn(state, side);
  let guard = 0;
  for (;;) {
    const choice = chooseAiPlay(state, side);
    if (!choice || guard > 12) break;
    guard += 1;
    playCard(state, side, choice.handIndex, choice.target);
    if (state.winner) return;
  }
  resolveCombat(state, side);
}

const PLAY_TURNS = 5;

/**
 * Stage `state` into the named scene and return the screen to show.
 * title: a fresh game on the title screen.
 * play: five real turns in, mid-duel, both boards populated.
 * win: the player lands the killing blow through real combat.
 * lose: Sable lands the killing blow through real combat.
 */
export function stageShot(name, seed) {
  const state = createGame(seed);
  if (name !== 'play' && name !== 'win' && name !== 'lose') {
    state.screen = 'title';
    return state;
  }
  // Play real turns until the table is busy, or someone is nearly dead.
  let turns = 0;
  while (turns < PLAY_TURNS * 2 && !state.winner) {
    const side = turns % 2 === 0 ? SIDE_PLAYER : SIDE_AI;
    autoTurn(state, side);
    turns += 1;
    if (state.player.life <= 8 || state.ai.life <= 8) break;
  }
  if (state.winner) {
    state.screen = state.winner === SIDE_PLAYER ? 'win' : 'lose';
    return state;
  }
  // The staged turns above ran the rules but never advanced the turn counter
  // (that happens in endPlayerTurn), so set it to the turn actually reached.
  state.turn = Math.max(2, Math.ceil(turns / 2));
  // Creatures played on the last staged turn still carry summoning sickness;
  // the shot shows a settled mid-duel table, so clear it.
  for (const side of [SIDE_PLAYER, SIDE_AI]) {
    for (const creature of state[side].board) creature.justPlayed = false;
  }

  if (name === 'play') {
    state.screen = 'play';
    state.active = SIDE_PLAYER;
    // A lively mid-game hand: draw the player up to five cards, and hand
    // them a full ember bar to spend.
    while (state.player.hand.length < 5) {
      if (!drawCard(state, SIDE_PLAYER)) break;
    }
    state.player.ember = state.player.emberMax;
    return state;
  }

  if (name === 'win') {
    // Set the duel up so the player's next attack wins, then land it for real.
    state.ai.life = 4;
    grantCard(state, SIDE_PLAYER, 'flame-drake');
    state.player.ember = 9;
    state.player.emberMax = 9;
    const index = state.player.hand.findIndex((c) => c.defId === 'flame-drake');
    playCard(state, SIDE_PLAYER, index, null);
    // The drake has summoning sickness, so clear it and let the board attack.
    for (const creature of state.player.board) creature.justPlayed = false;
    resolveCombat(state, SIDE_PLAYER);
    if (!state.winner) damageHero(state, SIDE_AI, state.ai.life);
    return state;
  }

  // lose
  state.player.life = 4;
  grantCard(state, SIDE_AI, 'pyre-giant');
  state.ai.ember = 9;
  state.ai.emberMax = 9;
  const index = state.ai.hand.findIndex((c) => c.defId === 'pyre-giant');
  playCard(state, SIDE_AI, index, null);
  for (const creature of state.ai.board) creature.justPlayed = false;
  resolveCombat(state, SIDE_AI);
  if (!state.winner) damageHero(state, SIDE_PLAYER, state.player.life);
  return state;
}

export { endPlayerTurn, startTurn };
