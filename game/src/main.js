// Boots Ember Duel: wires the table, the hand, the keyboard and the turn flow.
// The player's turn is interactive; Sable's turn runs itself with short pauses
// so each play can be watched. ?shot=title|play|win|lose stages a screenshot
// scene instead of starting a live game.

import { chooseAiPlay } from './ai.js';
import { soundAttack, soundDraw, soundHurt, soundLose, soundPlayCard, soundResonance, soundWin, toggleMute, isMuted } from './audio.js';
import { createGame, damageHero, endPlayerTurn, playCard, resolveCombat, startTurn, SIDE_AI, SIDE_PLAYER, canPlayCard, sideState } from './state.js';
import { createLayout, renderAll, showFloater } from './render.js';
import { stageShot } from './shots.js';
import { randomSeed } from './rng.js';

const AI_THINK_MS = 650;
const AI_PLAY_MS = 550;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function playEventsSound(events) {
  for (const event of events) {
    if (event.type === 'resonance') soundResonance();
    else if (event.type === 'summon') soundPlayCard();
    else if (event.type === 'attack-hero' || event.type === 'attack-creature') soundAttack();
    else if (event.type === 'damage-hero' || event.type === 'damage-creature') soundHurt();
  }
}

function main() {
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  const seed = Number(params.get('seed') ?? '') || randomSeed();
  const staged = shotName ? stageShot(shotName, seed) : createGame(seed);

  const state = staged;
  const ui = {
    selectedHandIndex: null,
    targeting: null,
    targetingKinds: [],
    targetingSide: null,
    targetingHint: '',
    busy: false,
    onHandCardClick,
    onBoardCardClick,
    onEndTurn,
  };

  const refs = createLayout(document.getElementById('app'), {
    onStart: startGame,
    onRestart: restartGame,
    onEndTurn,
    onMute: () => {
      toggleMute();
      refs.muteButton.textContent = isMuted() ? '🔇 Muted' : '🔊 Sound';
    },
  });
  refs.muteButton.textContent = '🔊 Sound';

  // Screenshot scenes: no animations, no waiting — the frame is the render.
  if (shotName) document.body.classList.add('shot-mode');

  function render() {
    renderAll(state, ui, refs);
  }

  function clearSelection() {
    ui.selectedHandIndex = null;
    ui.targeting = null;
    ui.targetingKinds = [];
    ui.targetingSide = null;
    ui.targetingHint = '';
  }

  function startGame() {
    state.screen = 'play';
    state.active = SIDE_PLAYER;
    state.player.emberMax = 1;
    state.player.ember = 1;
    render();
  }

  function restartGame() {
    const fresh = createGame(randomSeed());
    Object.assign(state, fresh);
    state.screen = 'title';
    clearSelection();
    ui.busy = false;
    render();
  }

  function onHandCardClick(index) {
    if (state.screen !== 'play' || state.active !== SIDE_PLAYER || ui.busy) return;
    const card = state.player.hand[index];
    if (!card) return;
    if (!canPlayCard(state, SIDE_PLAYER, index)) {
      ui.targetingHint = card.cost > state.player.ember
        ? `Not enough ember — ${card.name} costs ${card.cost}.`
        : 'Your board is full (5 creatures).';
      ui.targeting = 'blocked';
      render();
      setTimeout(() => { if (ui.targeting === 'blocked') { clearSelection(); render(); } }, 1400);
      return;
    }
    if (card.kind === 'creature') {
      const events = playCard(state, SIDE_PLAYER, index, null);
      soundPlayCard();
      playEventsSound(events);
      clearSelection();
      afterPlayerAction(events);
      return;
    }
    // Spell: pick a target.
    if (card.defId === 'fireball') {
      ui.selectedHandIndex = index;
      ui.targeting = card.defId;
      ui.targetingKinds = ['hero', 'creature'];
      ui.targetingSide = SIDE_AI;
      ui.targetingHint = 'Fireball: click Sable or one of their creatures.';
    } else if (card.defId === 'frostbite') {
      ui.selectedHandIndex = index;
      ui.targeting = card.defId;
      ui.targetingKinds = ['creature'];
      ui.targetingSide = SIDE_AI;
      ui.targetingHint = 'Frostbite: click an enemy creature to freeze it.';
    } else {
      const events = playCard(state, SIDE_PLAYER, index, null);
      playEventsSound(events);
      clearSelection();
      afterPlayerAction(events);
    }
    render();
  }

  function onBoardCardClick(side, uid) {
    if (!ui.targeting || ui.targeting === 'blocked') return;
    if (ui.targetingSide !== side || !ui.targetingKinds.includes('creature')) return;
    const index = ui.selectedHandIndex;
    const target = { kind: 'creature', side, uid };
    const events = playCard(state, SIDE_PLAYER, index, target);
    playEventsSound(events);
    clearSelection();
    afterPlayerAction(events);
  }

  function onHeroClick(side) {
    if (!ui.targeting || ui.targeting === 'blocked') return;
    if (side !== SIDE_AI || !ui.targetingKinds.includes('hero')) return;
    const index = ui.selectedHandIndex;
    const events = playCard(state, SIDE_PLAYER, index, { kind: 'hero', side });
    playEventsSound(events);
    clearSelection();
    afterPlayerAction(events);
  }

  refs.aiHero.addEventListener('click', () => onHeroClick(SIDE_AI));

  function afterPlayerAction(events) {
    for (const event of events) showFloater(refs, event);
    render();
    if (state.winner) return endGame();
  }

  async function onEndTurn() {
    if (state.screen !== 'play' || state.active !== SIDE_PLAYER || ui.busy) return;
    ui.busy = true;
    clearSelection();
    render();
    await sleep(250);
    const combatEvents = endPlayerTurn(state);
    playEventsSound(combatEvents);
    for (const event of combatEvents) showFloater(refs, event);
    render();
    if (state.winner) { ui.busy = false; return endGame(); }
    await sleep(700);
    await runAiTurn();
    ui.busy = false;
    render();
  }

  async function runAiTurn() {
    startTurn(state, SIDE_AI);
    soundDraw();
    render();
    await sleep(AI_THINK_MS);
    let guard = 0;
    while (!state.winner && guard < 12) {
      const choice = chooseAiPlay(state, SIDE_AI);
      if (!choice) break;
      guard += 1;
      const events = playCard(state, SIDE_AI, choice.handIndex, choice.target);
      playEventsSound(events);
      for (const event of events) showFloater(refs, event);
      render();
      await sleep(AI_PLAY_MS);
    }
    if (state.winner) return endGame();
    await sleep(400);
    const combatEvents = resolveCombat(state, SIDE_AI);
    playEventsSound(combatEvents);
    for (const event of combatEvents) showFloater(refs, event);
    render();
    if (state.winner) return endGame();
    await sleep(500);
    startTurn(state, SIDE_PLAYER);
    soundDraw();
    render();
  }

  function endGame() {
    render();
    if (state.screen === 'win') soundWin();
    else if (state.screen === 'lose') soundLose();
  }

  document.addEventListener('keydown', (event) => {
    if (state.screen === 'title' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      startGame();
      return;
    }
    if (state.screen !== 'play' || state.active !== SIDE_PLAYER || ui.busy) return;
    if (event.key === 'Enter') {
      onEndTurn();
      return;
    }
    const number = Number(event.key);
    if (number >= 1 && number <= 7) onHandCardClick(number - 1);
  });

  // Expose a small debug handle for play-testing (not part of the rules).
  window.__emberDuel = { state, ui, refs };

  render();
}

main();
