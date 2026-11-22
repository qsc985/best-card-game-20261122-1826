// Every card in Ember Duel: an original set of creatures and spells across four
// elements. Each element is told apart by colour AND shape, never by text alone:
// Ember is red triangles, Tide is blue circles, Thorn is green stars, Stone is
// grey squares.

export const ELEMENTS = {
  ember: { name: 'Ember', symbol: '▲', color: '#e2543e', dark: '#8f1f10', light: '#ff9a7a' },
  tide: { name: 'Tide', symbol: '●', color: '#3e8fe2', dark: '#144a80', light: '#8ec6ff' },
  thorn: { name: 'Thorn', symbol: '✦', color: '#4da34d', dark: '#1f5c22', light: '#9ed69a' },
  stone: { name: 'Stone', symbol: '■', color: '#8a7f72', dark: '#4a4238', light: '#c9bcab' },
};

export const ELEMENT_ORDER = ['ember', 'tide', 'thorn', 'stone'];

// Card definitions. kind: 'creature' | 'spell'.
// creature: attack / health. spell: effect text + numeric power.
// ability: 'guard' (must be attacked first), 'heal' (restore life on play),
//          'draw' (draw a card on play), 'zap' (deal 1 to the enemy hero on play).
export const CARD_DEFS = [
  // ---- Ember creatures ----
  { id: 'spark-imp', name: 'Spark Imp', element: 'ember', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'A quick little ember.' },
  { id: 'cinder-wolf', name: 'Cinder Wolf', element: 'ember', kind: 'creature', cost: 2, attack: 3, health: 2, text: 'Runs hot, bites harder.' },
  { id: 'flame-drake', name: 'Flame Drake', element: 'ember', kind: 'creature', cost: 4, attack: 5, health: 4, ability: 'zap', text: 'On play: deal 1 to the enemy.' },
  { id: 'pyre-giant', name: 'Pyre Giant', element: 'ember', kind: 'creature', cost: 6, attack: 7, health: 6, text: 'A walking bonfire.' },
  // ---- Tide creatures ----
  { id: 'dew-wisp', name: 'Dew Wisp', element: 'tide', kind: 'creature', cost: 1, attack: 1, health: 3, text: 'Hard to pop, easy to love.' },
  { id: 'coral-knight', name: 'Coral Knight', element: 'tide', kind: 'creature', cost: 3, attack: 2, health: 5, ability: 'guard', text: 'Guard: foes must hit it first.' },
  { id: 'river-serpent', name: 'River Serpent', element: 'tide', kind: 'creature', cost: 3, attack: 3, health: 4, text: 'Slips between the stones.' },
  { id: 'tidecaller', name: 'Tidecaller', element: 'tide', kind: 'creature', cost: 4, attack: 4, health: 5, ability: 'heal', text: 'On play: restore 3 life.' },
  // ---- Thorn creatures ----
  { id: 'briar-sprout', name: 'Briar Sprout', element: 'thorn', kind: 'creature', cost: 1, attack: 1, health: 1, ability: 'draw', text: 'On play: draw a card.' },
  { id: 'vine-lasher', name: 'Vine Lasher', element: 'thorn', kind: 'creature', cost: 2, attack: 2, health: 3, text: 'Whips twice, asks once.' },
  { id: 'thornwood-titan', name: 'Thornwood Titan', element: 'thorn', kind: 'creature', cost: 5, attack: 6, health: 6, text: 'The forest, standing up.' },
  // ---- Stone creatures ----
  { id: 'pebble-golem', name: 'Pebble Golem', element: 'stone', kind: 'creature', cost: 2, attack: 1, health: 4, ability: 'guard', text: 'Guard: foes must hit it first.' },
  { id: 'granite-brute', name: 'Granite Brute', element: 'stone', kind: 'creature', cost: 4, attack: 4, health: 5, text: 'Slow, heavy, certain.' },
  { id: 'mountain-colossus', name: 'Mountain Colossus', element: 'stone', kind: 'creature', cost: 6, attack: 7, health: 7, ability: 'guard', text: 'Guard: foes must hit it first.' },
  // ---- Spells ----
  { id: 'fireball', name: 'Fireball', element: 'ember', kind: 'spell', cost: 2, power: 4, target: 'enemy', text: 'Deal 4 damage to the enemy or one of their creatures.' },
  { id: 'frostbite', name: 'Frostbite', element: 'tide', kind: 'spell', cost: 2, power: 0, target: 'enemy-creature', text: 'Freeze an enemy creature: it skips its next attack.' },
  { id: 'mend', name: 'Mend', element: 'tide', kind: 'spell', cost: 2, power: 6, target: 'self', text: 'Restore 6 life.' },
  { id: 'ember-surge', name: 'Ember Surge', element: 'ember', kind: 'spell', cost: 1, power: 2, target: 'self', text: 'Gain 2 ember this turn.' },
  { id: 'wild-growth', name: 'Wild Growth', element: 'thorn', kind: 'spell', cost: 2, power: 2, target: 'self', text: 'Draw 2 cards.' },
  { id: 'quake', name: 'Quake', element: 'stone', kind: 'spell', cost: 3, power: 2, target: 'enemy-board', text: 'Deal 2 damage to all enemy creatures.' },
];

export const CARD_BY_ID = Object.fromEntries(CARD_DEFS.map((def) => [def.id, def]));

// A 24-card deck: two copies of most cards, one of each 6-cost giant.
const DECK_LIST = [
  'spark-imp', 'spark-imp', 'cinder-wolf', 'cinder-wolf', 'flame-drake', 'pyre-giant',
  'dew-wisp', 'dew-wisp', 'coral-knight', 'river-serpent', 'river-serpent', 'tidecaller',
  'briar-sprout', 'briar-sprout', 'vine-lasher', 'vine-lasher', 'thornwood-titan',
  'pebble-golem', 'pebble-golem', 'granite-brute', 'mountain-colossus',
  'fireball', 'fireball', 'mend',
];

export const MAX_HAND = 7;
export const MAX_BOARD = 5;
export const START_LIFE = 30;
export const MAX_EMBER = 10;

let nextUid = 1;

/** A fresh, playable copy of a card definition. */
export function makeCardInstance(defId) {
  const def = CARD_BY_ID[defId];
  return {
    uid: nextUid,
    defId: def.id,
    name: def.name,
    element: def.element,
    kind: def.kind,
    cost: def.cost,
    attack: def.attack ?? 0,
    health: def.health ?? 0,
    maxHealth: def.health ?? 0,
    power: def.power ?? 0,
    target: def.target ?? null,
    ability: def.ability ?? null,
    text: def.text,
    frozen: false,
    justPlayed: false,
  };
}

/** A shuffled 24-card deck of fresh card instances. */
export function buildDeck(rng, shuffle) {
  const deck = DECK_LIST.map((id) => makeCardInstance(id));
  nextUid += 1;
  return shuffle(deck, rng);
}

/** The element's display data for a card. */
export function elementOf(card) {
  return ELEMENTS[card.element];
}
