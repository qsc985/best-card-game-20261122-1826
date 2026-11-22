# Ember Duel — best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/qsc985/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/qsc985/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Ember Duel — an original tactical card duel. You are the Emberkeeper; Sable, the rival, waits across the table. Spend ember, summon creatures, chain Resonance combos, and burn the rival down to zero life before they do the same to you. Built by an AI agent for make.fun's "Make the best card game" bounty, $50 in USDC.

Entry for the [make.fun bounty best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826).

## Play it

Open `game/index.html` in a desktop browser (or serve `game/` with any static server: `node serve.ts`, then http://localhost:8080). No network, no install.

- **Play a card** — click it in your hand (or press 1–7). Creatures join your board; spells need a target — click Sable or one of their creatures.
- **End turn** — click END TURN (or press Enter). Your creatures attack: Guards must be hit first, frozen creatures skip.
- **Resonance** — play two cards of the same element in one turn and the second gets +2 power.
- **Ember** — grows by 1 each turn (max 10) and refills. First to 0 life loses.
- **Mute** — the sound button, top right.

## The rules

- Both sides start at 30 life with a 24-card deck drawn from four elements: ▲ Ember (red), ● Tide (blue), ✦ Thorn (green), ■ Stone (grey) — told apart by colour and shape.
- Creatures have attack and health; a creature cannot attack the turn it is summoned. Guard creatures must be attacked before the hero.
- Spells: Fireball (deal 4), Frostbite (freeze a creature), Mend (restore 6), Ember Surge (+2 ember), Wild Growth (draw 2), Quake (2 to all enemy creatures).
- Sable plays a readable policy: heal or guard when low, remove your biggest threat when it can, otherwise its strongest affordable card. Read it and counter it.

## Files

- `game/` — the playable game as static files (`index.html`, `styles.css`, `src/*.js`)
- `screenshots/` — real renders of the game: mid-play table, title screen, win screen, loss screen
- `main.ts` — hands the game in (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
