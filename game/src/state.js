// The game state and its rules: turns, ember, drawing, playing cards, combat,
// resonance combos and win/loss detection. Pure logic, no DOM: render.js draws
// whatever this module computes, and shots.js stages scenes through it.

import { buildDeck, makeCardInstance, MAX_BOARD, MAX_EMBER, MAX_HAND, START_LIFE } from './cards.js';
import { mulberry32, shuffleInPlace } from './rng.js';

export const SIDE_PLAYER = 'player';
export const SIDE_AI = 'ai';

export function otherSide(side) {
  return side === SIDE_PLAYER ? SIDE_AI : SIDE_PLAYER;
}

function makeSide(rng) {
  return {
    life: START_LIFE,
    maxLife: START_LIFE,
    ember: 0,
    emberMax: 0,
    deck: buildDeck(rng, shuffleInPlace),
    hand: [],
    board: [],
    playedElements: [],
  };
}

/** A fresh game: both sides draw 3 cards, the player takes the first turn. */
export function createGame(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    screen: 'title',
    turn: 1,
    active: SIDE_PLAYER,
    player: makeSide(rng),
    ai: makeSide(rng),
    log: [],
    winner: null,
    turnsPlayed: 0,
    cardsPlayed: 0,
  };
  for (let i = 0; i < 3; i += 1) {
    drawCard(state, SIDE_PLAYER);
    drawCard(state, SIDE_AI);
  }
  logLine(state, 'Welcome to Ember Duel. You move first — spend your ember wisely.');
  return state;
}

export function logLine(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.shift();
}

export function sideState(state, side) {
  return side === SIDE_PLAYER ? state.player : state.ai;
}

export function sideName(side) {
  return side === SIDE_PLAYER ? 'You' : 'Sable';
}

/** Draw the top card of a side's deck into its hand (max 7). Returns the card or null. */
export function drawCard(state, side) {
  const me = sideState(state, side);
  if (me.deck.length === 0) return null;
  if (me.hand.length >= MAX_HAND) return null;
  const card = me.deck.pop();
  me.hand.push(card);
  return card;
}

/** Begin a side's turn: ember grows by one (cap 10), refills, draw a card. */
export function startTurn(state, side) {
  const me = sideState(state, side);
  me.emberMax = Math.min(MAX_EMBER, me.emberMax + 1);
  me.ember = me.emberMax;
  me.playedElements = [];
  for (const creature of me.board) creature.justPlayed = false;
  const drawn = drawCard(state, side);
  state.active = side;
  state.turnsPlayed += 1;
  logLine(state, `${sideName(side)} begin${side === SIDE_PLAYER ? '' : 's'} turn ${state.turn} — ${me.emberMax} ember.`);
  if (drawn) logLine(state, `${sideName(side)} draw${side === SIDE_PLAYER ? '' : 's'} ${drawn.name}.`);
}

/** Whether a hand card can be played right now (ember, board room for creatures). */
export function canPlayCard(state, side, handIndex) {
  const me = sideState(state, side);
  const card = me.hand[handIndex];
  if (!card) return false;
  if (card.cost > me.ember) return false;
  if (card.kind === 'creature' && me.board.length >= MAX_BOARD) return false;
  return true;
}

/**
 * Resonance: playing two cards of the same element in one turn powers the
 * second one up (+2 attack for a creature, +2 power for a spell).
 */
function resonanceBonus(state, side, card) {
  const me = sideState(state, side);
  return me.playedElements.includes(card.element) ? 2 : 0;
}

function removeDeadCreatures(state, side) {
  const me = sideState(state, side);
  const before = me.board.length;
  me.board = me.board.filter((c) => c.health > 0);
  return before - me.board.length;
}

/** Damage a hero; returns true when that hero falls. */
export function damageHero(state, side, amount) {
  const me = sideState(state, side);
  me.life = Math.max(0, me.life - amount);
  if (me.life === 0) {
    state.winner = otherSide(side);
    state.screen = state.winner === SIDE_PLAYER ? 'win' : 'lose';
  }
  return me.life === 0;
}

export function healHero(state, side, amount) {
  const me = sideState(state, side);
  me.life = Math.min(me.maxLife, me.life + amount);
}

/** Damage one creature on a side's board; it dies at 0 health. */
export function damageCreature(state, side, uid, amount) {
  const me = sideState(state, side);
  const creature = me.board.find((c) => c.uid === uid);
  if (!creature) return false;
  creature.health -= amount;
  if (creature.health <= 0) {
    logLine(state, `${creature.name} is destroyed.`);
    removeDeadCreatures(state, side);
    return true;
  }
  return false;
}

/**
 * Play a hand card. For spells, `target` is { kind: 'hero', side } or
 * { kind: 'creature', side, uid }. Returns a list of events for the renderer
 * (floaters and sounds): { type, text, side, uid }.
 */
export function playCard(state, side, handIndex, target) {
  const me = sideState(state, side);
  const foe = sideState(state, otherSide(side));
  const card = me.hand[handIndex];
  if (!card || !canPlayCard(state, side, handIndex)) return [];
  const events = [];
  const bonus = resonanceBonus(state, side, card);
  me.ember -= card.cost;
  me.hand.splice(handIndex, 1);
  me.playedElements.push(card.element);
  state.cardsPlayed += 1;

  if (bonus > 0) {
    logLine(state, `RESONANCE! A second ${card.element} card — +${bonus} power.`);
    events.push({ type: 'resonance', text: `RESONANCE +${bonus}`, side });
  }

  if (card.kind === 'creature') {
    const creature = { ...card, attack: card.attack + bonus, justPlayed: true };
    me.board.push(creature);
    logLine(state, `${sideName(side)} summon${side === SIDE_PLAYER ? '' : 's'} ${creature.name} (${creature.attack}/${creature.health}).`);
    events.push({ type: 'summon', text: creature.name, side, uid: creature.uid });
    if (creature.ability === 'zap') {
      damageHero(state, otherSide(side), 1);
      events.push({ type: 'damage-hero', text: '-1', side: otherSide(side) });
      logLine(state, `${creature.name} scorches the enemy for 1.`);
    } else if (creature.ability === 'heal') {
      healHero(state, side, 3);
      events.push({ type: 'heal', text: '+3', side });
      logLine(state, `${creature.name} restores 3 life.`);
    } else if (creature.ability === 'draw') {
      const drawn = drawCard(state, side);
      if (drawn) logLine(state, `${creature.name} draws ${drawn.name}.`);
    }
    return events;
  }

  // ---- Spells ----
  const power = card.power + bonus;
  if (card.defId === 'fireball') {
    if (target && target.kind === 'creature') {
      const died = damageCreature(state, target.side, target.uid, power);
      events.push({ type: 'damage-creature', text: `-${power}`, side: target.side, uid: target.uid });
      logLine(state, `Fireball hits for ${power}${died ? ' — destroyed!' : '.'}`);
    } else {
      damageHero(state, otherSide(side), power);
      events.push({ type: 'damage-hero', text: `-${power}`, side: otherSide(side) });
      logLine(state, `Fireball burns the enemy for ${power}.`);
    }
  } else if (card.defId === 'frostbite') {
    if (target && target.kind === 'creature') {
      const creature = foe.board.find((c) => c.uid === target.uid);
      if (creature) {
        creature.frozen = true;
        events.push({ type: 'freeze', text: 'FROZEN', side: target.side, uid: target.uid });
        logLine(state, `${creature.name} is frozen solid.`);
      }
    }
  } else if (card.defId === 'mend') {
    healHero(state, side, power);
    events.push({ type: 'heal', text: `+${power}`, side });
    logLine(state, `${sideName(side)} mend${side === SIDE_PLAYER ? '' : 's'} ${power} life.`);
  } else if (card.defId === 'ember-surge') {
    me.ember += power;
    logLine(state, `${sideName(side)} surge${side === SIDE_PLAYER ? '' : 's'} +${power} ember.`);
  } else if (card.defId === 'wild-growth') {
    for (let i = 0; i < power; i += 1) drawCard(state, side);
    logLine(state, `${sideName(side)} draw${side === SIDE_PLAYER ? '' : 's'} ${power} cards.`);
  } else if (card.defId === 'quake') {
    const victims = [...foe.board];
    for (const victim of victims) damageCreature(state, otherSide(side), victim.uid, power);
    events.push({ type: 'damage-board', text: `-${power}`, side: otherSide(side) });
    logLine(state, `The ground shakes — every enemy creature takes ${power}.`);
  }
  return events;
}

/**
 * Combat: every ready creature of `side` attacks. A creature with summoning
 * sickness or frozen skips. Attacks hit the leftmost Guard first, else the
 * enemy hero. Returns events for the renderer.
 */
export function resolveCombat(state, side) {
  const me = sideState(state, side);
  const foe = sideState(state, otherSide(side));
  const events = [];
  for (const creature of [...me.board]) {
    if (state.winner) break;
    if (creature.justPlayed) continue;
    if (creature.frozen) {
      creature.frozen = false;
      logLine(state, `${creature.name} thaws out and cannot attack.`);
      continue;
    }
    const guards = foe.board.filter((c) => c.ability === 'guard');
    if (guards.length > 0) {
      const guard = guards[0];
      const died = damageCreature(state, otherSide(side), guard.uid, creature.attack);
      events.push({ type: 'attack-creature', text: `-${creature.attack}`, side: otherSide(side), uid: guard.uid, attackerUid: creature.uid });
      logLine(state, `${creature.name} strikes ${guard.name} for ${creature.attack}${died ? ' — destroyed!' : '.'}`);
    } else {
      damageHero(state, otherSide(side), creature.attack);
      events.push({ type: 'attack-hero', text: `-${creature.attack}`, side: otherSide(side), attackerUid: creature.uid });
      logLine(state, `${creature.name} hits the enemy for ${creature.attack}.`);
    }
  }
  return events;
}

/** End the player's turn: combat, then hand over to the AI (caller runs it). */
export function endPlayerTurn(state) {
  const events = resolveCombat(state, SIDE_PLAYER);
  state.turn += 1;
  return events;
}

/** Staging helper for screenshots: put a fresh copy of a card into a hand. */
export function grantCard(state, side, defId) {
  const me = sideState(state, side);
  const card = makeCardInstance(defId);
  me.hand.push(card);
  return card;
}
