// Draws the game into the DOM: the table, the hands, the boards, the heroes,
// the log and the title/win/loss overlays. Cards are real DOM elements so they
// can slide, lift on hover and stay legible at thumbnail size.

import { ELEMENTS } from './cards.js';
import { SIDE_AI, SIDE_PLAYER, canPlayCard, otherSide, sideName, sideState } from './state.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function emberPips(container, current, max) {
  container.innerHTML = '';
  for (let i = 0; i < 10; i += 1) {
    const pip = el('span', 'pip' + (i < current ? ' filled' : '') + (i >= max ? ' locked' : ''));
    container.appendChild(pip);
  }
}

function lifeBar(container, life, maxLife) {
  container.innerHTML = '';
  const fill = el('span', 'life-fill');
  fill.style.width = `${Math.max(0, (life / maxLife) * 100)}%`;
  if (life <= 10) fill.classList.add('low');
  container.appendChild(fill);
  container.appendChild(el('span', 'life-text', `${life} / ${maxLife}`));
}

/** One card face: cost gem, name, element art, values and rules text. */
export function cardElement(card, options) {
  const { inHand = false, playable = false, selected = false, targetable = false, onClick = null } = options ?? {};
  const element = ELEMENTS[card.element];
  const node = el('div', `card el-${card.element}` + (inHand ? ' in-hand' : ' on-board') + (playable ? ' playable' : '') + (selected ? ' selected' : '') + (targetable ? ' targetable' : '') + (card.frozen ? ' frozen' : ''));
  node.dataset.uid = card.uid;
  node.style.setProperty('--el', element.color);
  node.style.setProperty('--el-dark', element.dark);
  node.style.setProperty('--el-light', element.light);

  const cost = el('div', 'cost', String(card.cost));
  cost.title = 'Ember cost';
  node.appendChild(cost);

  const art = el('div', 'art');
  art.appendChild(el('div', 'art-symbol', element.symbol));
  art.appendChild(el('div', 'art-element', element.name));
  node.appendChild(art);

  node.appendChild(el('div', 'card-name', card.name));
  node.appendChild(el('div', 'card-text', card.text));

  if (card.kind === 'creature') {
    const stats = el('div', 'stats');
    stats.appendChild(el('span', 'attack', `⚔ ${card.attack}`));
    stats.appendChild(el('span', 'health', `♥ ${card.health}`));
    node.appendChild(stats);
    if (card.ability === 'guard') node.appendChild(el('div', 'ability', '🛡 GUARD'));
    if (card.justPlayed) node.appendChild(el('div', 'sick', 'summoning…'));
  } else {
    const stats = el('div', 'stats spell-stats');
    stats.appendChild(el('span', 'power', card.defId === 'mend' || card.defId === 'wild-growth' || card.defId === 'ember-surge' ? `✦ ${card.power}` : `⚔ ${card.power}`));
    stats.appendChild(el('span', 'kind-label', 'SPELL'));
    node.appendChild(stats);
  }
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

function cardBackElement() {
  const node = el('div', 'card-back');
  node.appendChild(el('div', 'back-symbol', '▲'));
  node.appendChild(el('div', 'back-word', 'EMBER'));
  return node;
}

/** Build the static table skeleton once; returns handles for later renders. */
export function createLayout(root, callbacks) {
  const app = el('div', 'app');
  root.appendChild(app);

  const header = el('header');
  header.appendChild(el('div', 'brand', '🔥 EMBER DUEL'));
  const turnBadge = el('div', 'turn-badge', 'Your turn');
  header.appendChild(turnBadge);
  const headerButtons = el('div', 'header-buttons');
  const muteButton = el('button', 'icon-button', '🔊 Sound');
  muteButton.addEventListener('click', callbacks.onMute);
  const restartButton = el('button', 'icon-button', '↻ New game');
  restartButton.addEventListener('click', callbacks.onRestart);
  headerButtons.appendChild(muteButton);
  headerButtons.appendChild(restartButton);
  header.appendChild(headerButtons);
  app.appendChild(header);

  const table = el('div', 'table');
  app.appendChild(table);

  // ---- Opponent zone ----
  const aiZone = el('div', 'zone ai-zone');
  const aiHero = el('div', 'hero');
  aiHero.appendChild(el('div', 'hero-name', 'SABLE · THE RIVAL'));
  const aiLife = el('div', 'life-bar');
  aiHero.appendChild(aiLife);
  const aiEmber = el('div', 'ember-row');
  aiEmber.appendChild(el('span', 'ember-label', 'EMBER'));
  const aiPips = el('div', 'pips');
  aiEmber.appendChild(aiPips);
  aiHero.appendChild(aiEmber);
  aiZone.appendChild(aiHero);
  const aiBoard = el('div', 'board');
  aiZone.appendChild(aiBoard);
  const aiHandWrap = el('div', 'hand-backs-wrap');
  aiHandWrap.appendChild(el('div', 'hand-label', 'RIVAL HAND'));
  const aiHand = el('div', 'hand-backs');
  aiHandWrap.appendChild(aiHand);
  aiZone.appendChild(aiHandWrap);
  table.appendChild(aiZone);

  // ---- Middle strip: log, end turn, hint ----
  const mid = el('div', 'mid-strip');
  const logBox = el('div', 'log-box');
  const log = el('div', 'log');
  logBox.appendChild(log);
  mid.appendChild(logBox);
  const endTurn = el('button', 'end-turn', 'END TURN ⏎');
  endTurn.addEventListener('click', callbacks.onEndTurn);
  mid.appendChild(endTurn);
  const hint = el('div', 'hint', 'Click a card to play it.');
  mid.appendChild(hint);
  table.appendChild(mid);

  // ---- Player zone ----
  const playerZone = el('div', 'zone player-zone');
  const playerHero = el('div', 'hero');
  playerHero.appendChild(el('div', 'hero-name', 'YOU · EMBERKEEPER'));
  const playerLife = el('div', 'life-bar');
  playerHero.appendChild(playerLife);
  const playerEmber = el('div', 'ember-row');
  playerEmber.appendChild(el('span', 'ember-label', 'EMBER'));
  const playerPips = el('div', 'pips');
  playerEmber.appendChild(playerPips);
  playerHero.appendChild(playerEmber);
  playerZone.appendChild(playerHero);
  const playerBoard = el('div', 'board');
  playerZone.appendChild(playerBoard);
  const deckWrap = el('div', 'deck-wrap');
  deckWrap.appendChild(el('div', 'hand-label', 'YOUR DECK'));
  const deckCount = el('div', 'deck-count', '21');
  deckWrap.appendChild(deckCount);
  playerZone.appendChild(deckWrap);
  table.appendChild(playerZone);

  // ---- Player hand ----
  const handRow = el('div', 'hand-row');
  const playerHand = el('div', 'hand player-hand');
  handRow.appendChild(playerHand);
  table.appendChild(handRow);

  // ---- Title overlay ----
  const titleOverlay = el('div', 'overlay title-overlay');
  const titleCard = el('div', 'overlay-card title-card');
  titleCard.appendChild(el('div', 'title-kicker', 'AN ORIGINAL CARD DUEL'));
  titleCard.appendChild(el('h1', 'game-title', 'EMBER DUEL'));
  titleCard.appendChild(el('p', 'title-sub', 'Outwit Sable, the rival Emberkeeper. Spend ember, summon creatures, chain Resonance combos — and burn the rival down to zero.'));
  const rules = el('div', 'title-rules');
  rules.innerHTML =
    '<b>How to play</b><br>' +
    '• Each turn you gain +1 ember (max 10) and draw a card.<br>' +
    '• Click a card to play it. Creatures join your board; spells need a target.<br>' +
    '• Creatures attack when you end your turn — Guards must be hit first.<br>' +
    '• Play two cards of the same element in one turn for <b>Resonance +2</b>.<br>' +
    '• First to 0 life loses. Keys: <b>1–7</b> play a card, <b>Enter</b> ends the turn.';
  titleCard.appendChild(rules);
  const startButton = el('button', 'big-button', '▶  START THE DUEL');
  startButton.addEventListener('click', callbacks.onStart);
  titleCard.appendChild(startButton);
  const titleFoot = el('div', 'title-foot', 'Four elements · ▲ Ember ● Tide ✦ Thorn ■ Stone — told apart by colour and shape.');
  titleCard.appendChild(titleFoot);
  titleOverlay.appendChild(titleCard);
  app.appendChild(titleOverlay);

  // ---- Win / loss overlay ----
  const endOverlay = el('div', 'overlay end-overlay hidden');
  const endCard = el('div', 'overlay-card end-card');
  const endTitle = el('h1', 'end-title', '');
  const endText = el('p', 'end-text', '');
  const endStats = el('div', 'end-stats', '');
  const againButton = el('button', 'big-button', '↻  PLAY AGAIN');
  againButton.addEventListener('click', callbacks.onRestart);
  endCard.appendChild(endTitle);
  endCard.appendChild(endText);
  endCard.appendChild(endStats);
  endCard.appendChild(againButton);
  endOverlay.appendChild(endCard);
  app.appendChild(endOverlay);

  // Floating damage numbers layer.
  const floatLayer = el('div', 'float-layer');
  app.appendChild(floatLayer);

  return {
    app, turnBadge, muteButton,
    aiHero, aiLife, aiPips, aiBoard, aiHand,
    playerHero, playerLife, playerPips, playerBoard, playerHand, deckCount,
    log, endTurn, hint, titleOverlay, endOverlay, endTitle, endText, endStats, floatLayer,
  };
}

/** Re-render the whole table from the state and the UI selection. */
export function renderAll(state, ui, refs) {
  const player = sideState(state, SIDE_PLAYER);
  const ai = sideState(state, SIDE_AI);

  refs.turnBadge.textContent = state.screen === 'play'
    ? (state.active === SIDE_PLAYER ? `Your turn · Turn ${state.turn}` : `Sable's turn · Turn ${state.turn}`)
    : state.screen === 'title' ? 'Ember Duel' : state.screen === 'win' ? 'You win!' : 'You lose';
  refs.turnBadge.classList.toggle('ai-turn', state.active === SIDE_AI && state.screen === 'play');

  lifeBar(refs.aiLife, ai.life, ai.maxLife);
  lifeBar(refs.playerLife, player.life, player.maxLife);
  emberPips(refs.aiPips, ai.ember, ai.emberMax);
  emberPips(refs.playerPips, player.ember, player.emberMax);

  // Opponent hand: face-down backs + count.
  refs.aiHand.innerHTML = '';
  const backs = Math.min(ai.hand.length, 7);
  for (let i = 0; i < backs; i += 1) refs.aiHand.appendChild(cardBackElement());
  refs.aiHand.parentElement.querySelector('.hand-label').textContent = `RIVAL HAND · ${ai.hand.length}`;

  // Boards.
  renderBoard(state, SIDE_AI, refs.aiBoard, ui, refs);
  renderBoard(state, SIDE_PLAYER, refs.playerBoard, ui, refs);

  // Player hand.
  refs.playerHand.innerHTML = '';
  player.hand.forEach((card, index) => {
    const playable = state.screen === 'play' && state.active === SIDE_PLAYER && canPlayCard(state, SIDE_PLAYER, index);
    const node = cardElement(card, {
      inHand: true,
      playable,
      selected: ui.selectedHandIndex === index,
      onClick: () => ui.onHandCardClick(index),
    });
    node.style.setProperty('--hand-index', index);
    refs.playerHand.appendChild(node);
  });

  refs.deckCount.textContent = String(player.deck.length);

  // Log: last few lines.
  refs.log.innerHTML = '';
  for (const line of state.log.slice(-6)) refs.log.appendChild(el('div', 'log-line', line));

  // End turn button.
  refs.endTurn.disabled = !(state.screen === 'play' && state.active === SIDE_PLAYER && !ui.busy);
  refs.endTurn.classList.toggle('ready', refs.endTurn.disabled === false);

  // Hint.
  if (ui.targeting) {
    refs.hint.textContent = ui.targetingHint;
  } else if (state.screen === 'play' && state.active === SIDE_PLAYER) {
    refs.hint.textContent = 'Click a card to play it — creatures join your board, spells need a target.';
  } else if (state.screen === 'play') {
    refs.hint.textContent = 'Sable is thinking…';
  } else {
    refs.hint.textContent = '';
  }

  // Overlays.
  refs.titleOverlay.classList.toggle('hidden', state.screen !== 'title');
  const ended = state.screen === 'win' || state.screen === 'lose';
  refs.endOverlay.classList.toggle('hidden', !ended);
  if (ended) {
    const won = state.screen === 'win';
    refs.endTitle.textContent = won ? '🏆 VICTORY!' : '💀 DEFEAT';
    refs.endTitle.className = `end-title ${won ? 'win' : 'lose'}`;
    refs.endText.textContent = won
      ? 'Sable burns out — the table is yours. The Emberkeeper bows to a better duelist.'
      : 'Your embers gutter and die. Sable takes the table — demand a rematch and take it back.';
    refs.endStats.textContent = `Turns played: ${state.turnsPlayed} · Cards played: ${state.cardsPlayed} · Your life: ${player.life} · Sable's life: ${ai.life}`;
  }

  // Hero click targets (spells aimed at a hero).
  refs.aiHero.classList.toggle('targetable', Boolean(ui.targeting && ui.targetingKinds.includes('hero')));
  refs.playerHero.classList.toggle('targetable', Boolean(ui.targeting && ui.targetingKinds.includes('self-hero')));
}

function renderBoard(state, side, container, ui, refs) {
  const me = sideState(state, side);
  const foe = sideState(state, otherSide(side));
  container.innerHTML = '';
  if (me.board.length === 0) {
    container.appendChild(el('div', 'board-empty', side === SIDE_PLAYER ? 'Your creatures gather here' : 'Sable’s creatures gather here'));
    return;
  }
  for (const creature of me.board) {
    const isTarget = ui.targeting && ui.targetingKinds.includes('creature') && side === ui.targetingSide;
    const node = cardElement(creature, {
      targetable: isTarget,
      onClick: () => ui.onBoardCardClick(side, creature.uid),
    });
    container.appendChild(node);
  }
  void foe;
}

/** A floating damage/heal number over a hero panel or a board creature. */
export function showFloater(refs, event) {
  if (!event || !event.text) return;
  const target = event.type === 'damage-hero' || event.type === 'attack-hero' || event.type === 'heal'
    ? (event.side === SIDE_AI ? refs.aiHero : refs.playerHero)
    : null;
  let anchor = target;
  if (!anchor && event.uid) {
    anchor = refs.app.querySelector(`.card[data-uid="${event.uid}"]`);
  }
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();
  const appRect = refs.app.getBoundingClientRect();
  const floater = el('div', `floater ${event.type.includes('heal') ? 'heal' : 'damage'}`, event.text);
  floater.style.left = `${rect.left - appRect.left + rect.width / 2}px`;
  floater.style.top = `${rect.top - appRect.top}px`;
  refs.floatLayer.appendChild(floater);
  setTimeout(() => floater.remove(), 1100);
}

export { SIDE_AI, SIDE_PLAYER, sideName };
