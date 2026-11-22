// Sable, the AI rival. A readable, counterable policy: heal or guard when low,
// remove a big threat when it can, otherwise play its strongest affordable
// card. It never hides information — every choice follows from the board.

import { canPlayCard, otherSide, sideState } from './state.js';

/** Score a hand card for the AI: higher means play it sooner. */
function scoreCard(state, side, card) {
  const me = sideState(state, side);
  const foe = sideState(state, otherSide(side));
  let score = card.cost * 2;
  if (card.kind === 'creature') {
    score += card.attack * 2 + card.health;
    if (card.ability === 'guard' && me.life <= 12) score += 12;
    if (card.ability === 'heal' && me.life <= 18) score += 8;
    if (card.ability === 'draw') score += 3;
    if (card.ability === 'zap') score += 2;
  } else if (card.defId === 'mend') {
    score = me.life <= 14 ? 20 : -10;
  } else if (card.defId === 'fireball') {
    const biggest = foe.board.reduce((best, c) => (c.attack > (best?.attack ?? 0) ? c : best), null);
    score = biggest && biggest.attack >= 4 ? 18 : (foe.life <= 4 ? 16 : 2);
  } else if (card.defId === 'frostbite') {
    const biggest = foe.board.reduce((best, c) => (c.attack > (best?.attack ?? 0) ? c : best), null);
    score = biggest && biggest.attack >= 4 ? 14 : -5;
  } else if (card.defId === 'quake') {
    score = foe.board.length >= 2 ? 12 + foe.board.length : -5;
  } else if (card.defId === 'wild-growth') {
    score = me.hand.length <= 3 ? 10 : 1;
  } else if (card.defId === 'ember-surge') {
    score = me.hand.some((c) => c.cost > me.ember && c.cost <= me.ember + 2) ? 9 : 1;
  }
  return score;
}

/** Pick the AI's next play, or null when it should stop. */
export function chooseAiPlay(state, side) {
  const me = sideState(state, side);
  let bestIndex = -1;
  let bestScore = 4; // only play cards worth playing
  for (let i = 0; i < me.hand.length; i += 1) {
    if (!canPlayCard(state, side, i)) continue;
    const score = scoreCard(state, side, me.hand[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) return null;
  const card = me.hand[bestIndex];
  let target = null;
  if (card.defId === 'fireball' || card.defId === 'frostbite') {
    const foe = sideState(state, otherSide(side));
    const biggest = foe.board.reduce((best, c) => (c.attack > (best?.attack ?? 0) ? c : best), null);
    if (biggest && biggest.attack >= 4 && card.defId === 'fireball') {
      target = { kind: 'creature', side: otherSide(side), uid: biggest.uid };
    } else if (biggest && biggest.attack >= 4 && card.defId === 'frostbite') {
      target = { kind: 'creature', side: otherSide(side), uid: biggest.uid };
    } else if (card.defId === 'fireball') {
      target = { kind: 'hero', side: otherSide(side) };
    }
  }
  return { handIndex: bestIndex, target };
}
